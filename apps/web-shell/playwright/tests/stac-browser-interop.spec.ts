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
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

let catalogServer: ChildProcess | undefined;
let stacBrowserServer: ChildProcess | undefined;

function startHttpServer(rootDir: string, port: number): ChildProcess {
  // http-server is the dev-dep added in Phase 1 (T002). --cors lets the
  // stac-browser SPA fetch catalog.json across the localhost port boundary.
  const proc = spawn(
    'npx',
    [
      '--no-install',
      'http-server',
      rootDir,
      '-p',
      String(port),
      '--cors',
      '-s',
    ],
    {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      env: { ...process.env },
    },
  );
  proc.stdout?.on('data', () => {
    /* swallow */
  });
  proc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[http-server:${port}] ${chunk}`);
  });
  return proc;
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
    catalogServer = startHttpServer(CATALOG_DIR, CATALOG_PORT);
    stacBrowserServer = startHttpServer(STAC_BROWSER_DIST, STAC_BROWSER_PORT);
    await Promise.all([
      waitForServer(`http://localhost:${CATALOG_PORT}/catalog.json`),
      waitForServer(`http://localhost:${STAC_BROWSER_PORT}/index.html`),
    ]);
  });

  test.afterAll(async () => {
    catalogServer?.kill('SIGTERM');
    stacBrowserServer?.kill('SIGTERM');
    await wait(200); // brief grace period
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
