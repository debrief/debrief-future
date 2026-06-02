/**
 * BriefingPreviewServer — ephemeral loopback HTTP server for live preview
 * (#273, US1). Serves the bundled briefing-renderer SPA at `/` and the
 * active storyboard's scoped features at `/features.geojson` so the system
 * browser can open the renderer in a new tab, loaded live (no zip step).
 *
 * Design constraints (contract host-integration §B / research Decision 4):
 *  - Binds `127.0.0.1` only on an OS-assigned port → fully offline (C-B5).
 *  - Read-only serving; no persistence, no provenance write (C-E2).
 *  - Enforces a `Host` header allowlist to defeat DNS-rebinding: by default
 *    only the loopback names (`127.0.0.1`/`localhost`/`[::1]`) are served;
 *    any other Host gets 403 (C-B7). Loopback binding alone blocks remote
 *    network access but NOT rebinding, which arrives as an ordinary local
 *    request carrying a foreign Host.
 *  - Under a Remote/Codespaces/code-server tunnel, `asExternalUri` rewrites
 *    the loopback to a *public* host and the proxy forwards that foreign Host
 *    here — so the strict allowlist would 403 the legitimate request (the
 *    reported "Forbidden" under Heroku code-server). The extension registers
 *    that host via {@link BriefingPreviewServer.trustExternalHost} so it is
 *    additionally accepted. This is safe: in a tunnel the server is bound to
 *    the *remote* host's loopback — unreachable from any browser except via
 *    the authenticated tunnel — so rebinding cannot reach it.
 *  - Single shared instance, lazily started, disposed on deactivation.
 *
 * This module has no `vscode` import — it is pure Node, which keeps it
 * unit-testable against a real loopback socket without a VS Code host.
 */

import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const LOOPBACK = '127.0.0.1';

/** Loopback host *names* (any port) — the strict, rebinding-safe allowlist. */
const LOOPBACK_NAMES: ReadonlySet<string> = new Set(['127.0.0.1', 'localhost', '[::1]']);

/**
 * Path the renderer fetches the scoped features from (this server serves them
 * at `/features.geojson`). *Relative* — no leading slash — so it resolves
 * against the renderer's document URL and survives a proxy path-prefix
 * (code-server's `/proxy/<port>/`).
 */
const PREVIEW_FEATURES_PATH = 'features.geojson';

/** Lower-cased hostname with any trailing `:port` removed (IPv6-bracket safe). */
function hostnameOf(hostHeader: string): string {
  return hostHeader.replace(/:\d+$/, '').toLowerCase();
}

/**
 * Inject the features location into the served renderer HTML as a global. The
 * launch URL also carries `?features=`, but code-server's `asExternalUri`
 * rewrite to `/proxy/<port>/` drops the query — without this the renderer
 * would see no `?features` and fall back to its dev fixture (showing the wrong
 * storyboard). The renderer reads this global when `?features` is absent.
 */
function injectPreviewFeaturesMarker(html: string): string {
  const marker = `<script>window.__BRIEFING_PREVIEW_FEATURES__=${JSON.stringify(PREVIEW_FEATURES_PATH)};</script>`;
  return html.includes('</head>') ? html.replace('</head>', `${marker}</head>`) : marker + html;
}

export interface BriefingPreviewServerOptions {
  /** Absolute path to the bundled renderer static root (index.html + assets). */
  readonly staticRoot: string;
  /** Injectable factory for tests; defaults to `http.createServer`. */
  readonly createServer?: typeof http.createServer;
}

export class BriefingPreviewServer {
  private server: http.Server | null = null;
  private port: number | null = null;
  private featuresJson: string | null = null;
  private readonly staticRoot: string;
  private readonly createServer: typeof http.createServer;
  /** Public hosts (from `asExternalUri`) trusted under a tunnel — see C-B7. */
  private readonly trustedProxyHostnames = new Set<string>();

  constructor(options: BriefingPreviewServerOptions) {
    this.staticRoot = options.staticRoot;
    this.createServer = options.createServer ?? http.createServer;
  }

  /** Replace the scoped features served at `/features.geojson`. */
  public setFeatures(featuresJson: string): void {
    this.featuresJson = featuresJson;
  }

  /** Start (or reuse) the loopback server; resolves with the bound port. */
  public async start(): Promise<number> {
    if (this.server !== null && this.port !== null) {
      return this.port;
    }
    const server = this.createServer((req, res) => this.handle(req, res));
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, LOOPBACK, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('BriefingPreviewServer failed to bind a loopback port');
    }
    this.port = address.port;
    return this.port;
  }

  /** The loopback launch URL pointing the renderer at the served features. */
  public getPreviewUrl(): string {
    if (this.port === null) {
      throw new Error('BriefingPreviewServer.getPreviewUrl called before start()');
    }
    // The `features` value is *relative* so it resolves against the renderer's
    // own document URL — correct both at the loopback root and behind a proxy
    // path-prefix (e.g. code-server's `/proxy/<port>/`). An absolute
    // `/features.geojson` would escape that prefix and hit the proxy root.
    // (Under code-server this query is dropped by `asExternalUri`; the served
    // index.html also injects the same path as a global — see serveStatic.)
    return `http://${LOOPBACK}:${this.port}/?features=${PREVIEW_FEATURES_PATH}`;
  }

  /**
   * Register the host that `vscode.env.asExternalUri` produced for the preview
   * URL so a tunneled/proxied browser request — which arrives bearing that
   * foreign `Host` — is accepted by {@link isAllowedHost}. A loopback external
   * URL (the non-tunneled local case) registers nothing, leaving the strict
   * allowlist intact. Idempotent; safe to call on every preview launch.
   */
  public trustExternalHost(externalUrl: string): void {
    let name: string;
    try {
      name = new URL(externalUrl).hostname.toLowerCase();
    } catch {
      return; // unparseable → trust nothing, keep the strict allowlist
    }
    if (name.length === 0 || LOOPBACK_NAMES.has(name)) {return;}
    this.trustedProxyHostnames.add(name);
  }

  /**
   * Host-header gate (C-B7). Two regimes:
   *
   *  - **Local launch** (desktop VS Code): the browser reaches this server
   *    directly at a loopback address, so DNS-rebinding is a real threat and
   *    the strict loopback-name allowlist is the defence. A rebinding page
   *    always presents its *own* foreign domain in `Host`, never a loopback
   *    literal, so allowing only loopback names blocks it.
   *  - **Tunneled launch** (Remote/Codespaces/code-server): `asExternalUri`
   *    rewrote the loopback to a public host the proxy forwards here; only the
   *    hosts registered via {@link trustExternalHost} are additionally
   *    allowed. Safe because the server is on the *remote* host's loopback,
   *    reachable only through the authenticated tunnel (rebinding cannot
   *    reach it).
   */
  public isAllowedHost(host: string | undefined): boolean {
    if (host === undefined) {return false;}
    if (this.port === null) {return false;}
    const name = hostnameOf(host);
    if (LOOPBACK_NAMES.has(name)) {return true;}
    return this.trustedProxyHostnames.has(name);
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    // DNS-rebinding defence — reject any foreign Host before serving (C-B7).
    if (!this.isAllowedHost(req.headers.host)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const rawPath = (req.url ?? '/').split('?')[0] ?? '/';

    if (rawPath === '/features.geojson') {
      if (this.featuresJson === null) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('No storyboard features set for preview');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.geojson']! });
      res.end(this.featuresJson);
      return;
    }

    this.serveStatic(rawPath, res);
  }

  private serveStatic(rawPath: string, res: http.ServerResponse): void {
    const relative = rawPath === '/' ? 'index.html' : decodeURIComponent(rawPath.replace(/^\/+/, ''));
    const resolved = path.resolve(this.staticRoot, relative);

    // Path-traversal guard — never serve outside the static root.
    const rootWithSep = this.staticRoot.endsWith(path.sep)
      ? this.staticRoot
      : this.staticRoot + path.sep;
    if (resolved !== this.staticRoot && !resolved.startsWith(rootWithSep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(resolved, (err, data) => {
      if (err !== null) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(resolved).toLowerCase();
      if (ext === '.html') {
        // Hand the features location to the renderer via an injected global,
        // immune to the proxy dropping the launch `?features=` query (C-B4).
        res.writeHead(200, { 'Content-Type': MIME_TYPES['.html']! });
        res.end(injectPreviewFeaturesMarker(data.toString('utf8')));
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
      res.end(data);
    });
  }

  /** Stop the server and release the port. Safe to call repeatedly. */
  public dispose(): void {
    if (this.server !== null) {
      this.server.close();
      this.server = null;
    }
    this.port = null;
    this.featuresJson = null;
    this.trustedProxyHostnames.clear();
  }
}
