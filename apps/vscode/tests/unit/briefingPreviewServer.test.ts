/**
 * Vitest for the #273 loopback preview server. Exercises a real loopback
 * socket (Node, no VS Code host) per contract host-integration §B.
 */

import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import * as http from 'node:http';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BriefingPreviewServer } from '@/services/briefingPreviewServer';

let staticRoot: string;
let server: BriefingPreviewServer;
let port: number;

const FEATURES = JSON.stringify({
  type: 'FeatureCollection',
  features: [{ type: 'Feature', properties: { kind: 'STORYBOARD', id: 'SB1' } }],
});

beforeEach(async () => {
  staticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'briefing-preview-'));
  fs.writeFileSync(path.join(staticRoot, 'index.html'), '<!doctype html><title>Briefing</title>');
  fs.mkdirSync(path.join(staticRoot, 'assets'));
  fs.writeFileSync(path.join(staticRoot, 'assets', 'app.js'), 'console.log("briefing");');
  server = new BriefingPreviewServer({ staticRoot });
  server.setFeatures(FEATURES);
  port = await server.start();
});

afterEach(() => {
  server.dispose();
  fs.rmSync(staticRoot, { recursive: true, force: true });
});

/** Issue a raw request so we can set an arbitrary Host header (Node's fetch
 *  forbids overriding Host). */
function request(
  pathname: string,
  hostHeader?: string,
): Promise<{ status: number; body: string; contentType: string | undefined }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path: pathname,
        method: 'GET',
        ...(hostHeader !== undefined ? { headers: { Host: hostHeader } } : {}),
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            body,
            contentType: res.headers['content-type'],
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

describe('BriefingPreviewServer', () => {
  it('C-B3: serves the bundled renderer index.html at /', async () => {
    const res = await request('/');
    expect(res.status).toBe(200);
    expect(res.body).toContain('Briefing');
    expect(res.contentType).toMatch(/text\/html/);
  });

  it('C-B3: serves renderer assets with the right MIME type', async () => {
    const res = await request('/assets/app.js');
    expect(res.status).toBe(200);
    expect(res.body).toContain('briefing');
    expect(res.contentType).toMatch(/javascript/);
  });

  it('C-B2: serves the scoped features at /features.geojson', async () => {
    const res = await request('/features.geojson');
    expect(res.status).toBe(200);
    expect(res.contentType).toMatch(/geo\+json/);
    expect(JSON.parse(res.body)).toEqual(JSON.parse(FEATURES));
  });

  it('getPreviewUrl points the renderer at the served features (relative — proxy-safe)', () => {
    // Relative so it survives a proxy path-prefix (e.g. code-server
    // `/proxy/<port>/`); an absolute `/features.geojson` would escape it.
    expect(server.getPreviewUrl()).toBe(`http://127.0.0.1:${port}/?features=features.geojson`);
  });

  it('C-B7: accepts loopback names and rejects a foreign Host with 403', async () => {
    const ok = await request('/', `127.0.0.1:${port}`);
    expect(ok.status).toBe(200);

    const okLocalhost = await request('/', `localhost:${port}`);
    expect(okLocalhost.status).toBe(200);

    const rebind = await request('/features.geojson', 'evil.example.com');
    expect(rebind.status).toBe(403);

    const rebindBareName = await request('/', 'attacker.test');
    expect(rebindBareName.status).toBe(403);
  });

  it('C-B7: trusts the host asExternalUri produced under a tunnel (Heroku/code-server)', async () => {
    // Simulates `asExternalUri` rewriting the loopback to a code-server proxy
    // URL; the proxy forwards the public Host to this loopback server.
    server.trustExternalHost(`https://debrief-preview-pr-656.herokuapp.com/proxy/${port}/?features=features.geojson`);

    const proxied = await request('/', 'debrief-preview-pr-656.herokuapp.com');
    expect(proxied.status).toBe(200);

    // Port-tolerant (some proxies forward Host with an explicit :443).
    const withPort = await request('/features.geojson', 'debrief-preview-pr-656.herokuapp.com:443');
    expect(withPort.status).toBe(200);

    // Only the registered host is trusted — other foreign hosts still 403.
    const stillBlocked = await request('/', 'evil.example.com');
    expect(stillBlocked.status).toBe(403);
  });

  it('C-B7: a loopback external URL registers nothing (strict allowlist intact)', async () => {
    server.trustExternalHost(`http://127.0.0.1:${port}/?features=features.geojson`);
    const stillBlocked = await request('/', 'evil.example.com');
    expect(stillBlocked.status).toBe(403);
  });

  it('blocks path traversal outside the static root', async () => {
    const res = await request('/../../etc/passwd');
    expect([403, 404]).toContain(res.status);
  });

  it('returns 404 for an unknown static path', async () => {
    const res = await request('/does-not-exist.js');
    expect(res.status).toBe(404);
  });
});
