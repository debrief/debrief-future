/**
 * BriefingPreviewServer — ephemeral loopback HTTP server for live preview
 * (#273, US1). Serves the bundled briefing-renderer SPA at `/` and the
 * active storyboard's scoped features at `/features.geojson` so the system
 * browser can open the renderer in a new tab, loaded live (no zip step).
 *
 * Design constraints (contract host-integration §B / research Decision 4):
 *  - Binds `127.0.0.1` only on an OS-assigned port → fully offline (C-B5).
 *  - Read-only serving; no persistence, no provenance write (C-E2).
 *  - Enforces a `Host` header allowlist to defeat DNS-rebinding: only the
 *    literal loopback (`127.0.0.1[:<port>]`) the extension opened is served;
 *    any other Host gets 403 (C-B7). Loopback binding alone blocks remote
 *    network access but NOT rebinding, which arrives as an ordinary local
 *    request carrying a foreign Host.
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
    return `http://${LOOPBACK}:${this.port}/?features=/features.geojson`;
  }

  /** True iff `host` is the literal loopback the extension opened (C-B7). */
  public isAllowedHost(host: string | undefined): boolean {
    if (host === undefined) {return false;}
    if (this.port === null) {return false;}
    return host === LOOPBACK || host === `${LOOPBACK}:${this.port}`;
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
  }
}
