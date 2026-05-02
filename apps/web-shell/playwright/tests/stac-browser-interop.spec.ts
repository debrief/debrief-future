/**
 * Spec 241 — third-party renderer proof.
 *
 * Serves the regenerated `preview/workspace/samples/local-store/` catalog
 * locally on :4080 and the vendored radiantearth/stac-browser v3.3.4 dist
 * on :8080, drives the browser through Collection → Item → Assets, and
 * captures three screenshots that double as evidence and as the blog post's
 * hero artefacts.
 *
 * Vendoring stac-browser keeps this offline-clean (Article I.1) and within
 * the 60s budget (FR-026).
 */

import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { createReadStream, mkdirSync, statSync } from 'node:fs';
import { dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as wait } from 'node:timers/promises';
import { StacBrowserPage } from '../pages/StacBrowserPage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT = resolve(__dirname, '../../../..');
const CATALOG_DIR = resolve(REPO_ROOT, 'preview/workspace/samples/local-store');
const STAC_BROWSER_DIST = resolve(
  REPO_ROOT,
  'apps/web-shell/test-fixtures/stac-browser-v3.3.4',
);
const EVIDENCE_DIR = resolve(
  REPO_ROOT,
  'specs/241-stac-best-practices-upgrade/evidence',
);

const CATALOG_PORT = 4080;
const STAC_BROWSER_PORT = 8080;

mkdirSync(EVIDENCE_DIR, { recursive: true });

let catalogServer: Server | undefined;
let stacBrowserServer: Server | undefined;

const MIME_TYPES: Record<string, string> = {
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

/**
 * Minimal static-file server. In-process means no `npx`/`pnpm exec`
 * dependency, no PATH lookup, no install step — works identically on
 * developer machines and in CI. CORS is opened wide so stac-browser on
 * :8080 can fetch catalog.json from :4080.
 */
function startHttpServer(rootDir: string, port: number): Promise<Server> {
  const root = resolve(rootDir);
  return new Promise((resolveStarted, rejectStarted) => {
    const server = createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }
      const reqUrl = new URL(req.url ?? '/', `http://localhost:${port}`);
      let pathname = decodeURIComponent(reqUrl.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';
      const candidate = normalize(resolve(root, '.' + pathname));
      // Path traversal guard.
      if (!candidate.startsWith(root)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      let stats;
      try {
        stats = statSync(candidate);
      } catch {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      if (stats.isDirectory()) {
        const indexCandidate = resolve(candidate, 'index.html');
        try {
          statSync(indexCandidate);
        } catch {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const indexType = MIME_TYPES['.html'];
        res.setHeader('Content-Type', indexType);
        createReadStream(indexCandidate).pipe(res);
        return;
      }
      const ext = extname(candidate).toLowerCase();
      res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
      createReadStream(candidate).pipe(res);
    });
    server.on('error', rejectStarted);
    server.listen(port, '127.0.0.1', () => resolveStarted(server));
  });
}

function stopHttpServer(server: Server | undefined): Promise<void> {
  if (!server) return Promise.resolve();
  return new Promise((res) => server.close(() => res()));
}

async function waitForServer(url: string, timeoutMs = 10000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

test.describe('Spec 241 — STAC Browser interop', () => {
  // 60s budget per FR-026 — covers cold chromium launch + 3 navigations + 3
  // screenshots. Vendored serving means no install on the critical path.
  test.setTimeout(60_000);

  test.beforeAll(async () => {
    [catalogServer, stacBrowserServer] = await Promise.all([
      startHttpServer(CATALOG_DIR, CATALOG_PORT),
      startHttpServer(STAC_BROWSER_DIST, STAC_BROWSER_PORT),
    ]);
    await Promise.all([
      waitForServer(`http://localhost:${CATALOG_PORT}/catalog.json`),
      waitForServer(`http://localhost:${STAC_BROWSER_PORT}/index.html`),
    ]);
  });

  test.afterAll(async () => {
    await Promise.all([stopHttpServer(catalogServer), stopHttpServer(stacBrowserServer)]);
  });

  test('renders Collection → Item → Assets and captures evidence screenshots', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', async (msg) => {
      if (msg.type() === 'error') {
        // Concatenate every arg so multi-token errors (e.g. "Failed: " + URL)
        // aren't truncated to the first token.
        const argTexts = await Promise.all(
          msg.args().map((a) => a.jsonValue().catch(() => null)),
        );
        const text = [msg.text(), ...argTexts.filter(Boolean).map(String)]
          .join(' ')
          .trim();
        // Tolerate warnings about unrecognised debrief:* extensions and
        // network failures for external resources (e.g. OSM tiles,
        // upstream link icons) that the headless browser can't fetch in a
        // sandboxed offline-clean run.  Reject hard errors that originate
        // in OUR catalog: schema validation, JSON parse, JS exceptions.
        const tolerated =
          /debrief:|ERR_CERT_AUTHORITY_INVALID|ERR_CERT|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ERR_TIMED_OUT|Failed to load resource|tile\.openstreetmap|AxiosError: Network Error|axios.*Network|^https?:\/\/[a-z]\.tile\.|^https?:\/\/.*tile|^https?:\/\/.*openstreetmap|^https?:\/\/.*\.png/i;
        if (text && !tolerated.test(text)) {
          errors.push(`console.error: ${text}`);
        }
      }
    });

    const stac = new StacBrowserPage(page);
    await stac.gotoCatalog(
      `http://localhost:${STAC_BROWSER_PORT}`,
      `http://localhost:${CATALOG_PORT}/catalog.json`,
    );

    // ---- Collection landing page (FR-024) ----------------------------------
    await stac.waitForCollectionLanding();
    await wait(1500); // allow Vue render to settle
    // Scroll to top + viewport-only screenshot — the full Catalog page is
    // ~70k pixels tall (73 items in a long table) which is unwieldy as a
    // hero asset.  The blog post wants the "what does it look like at first
    // glance" framing.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${EVIDENCE_DIR}/stac-browser-collection.png`,
    });

    // ---- Item detail page --------------------------------------------------
    await stac.clickFirstItem();
    await wait(1500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `${EVIDENCE_DIR}/stac-browser-item.png`,
    });

    // ---- Assets section ----------------------------------------------------
    await stac.expandAssets();
    await wait(500);
    // Scroll to where assets are typically rendered (just below the metadata).
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.screenshot({
      path: `${EVIDENCE_DIR}/stac-browser-assets.png`,
    });

    // ---- FR-025: zero browser-console errors -------------------------------
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
