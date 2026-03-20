/**
 * CDN Request Interceptor for VS Code Webview E2E Tests
 *
 * VS Code loads webview content from `https://<hash>.vscode-cdn.net/...`
 * which is unreachable in sandboxed CI environments (no DNS, no TLS).
 * The service worker that normally intercepts these requests runs *inside*
 * the CDN iframe, so it never registers if the iframe itself can't load.
 *
 * This interceptor uses Playwright's `context.route()` to fulfill CDN
 * requests from the local openvscode-server installation, allowing the
 * webview iframe to load and create `#active-frame` for extension content.
 *
 * Must be installed on the BrowserContext (not Page) to intercept
 * cross-origin iframe requests.
 *
 * @see docs/project_notes/webview-e2e-research.md — Fix C
 */
import type { BrowserContext } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

/** Default openvscode-server webview pre directory */
const DEFAULT_PRE_DIR = '/opt/openvscode-server/out/vs/workbench/contrib/webview/browser/pre';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

/**
 * Install a route handler that intercepts `*.vscode-cdn.net` requests
 * and fulfills them from the local filesystem.
 *
 * @param context - Playwright BrowserContext (must be called before page.goto)
 * @param preDir - Path to the webview pre directory on disk
 */
export async function installCdnInterceptor(
  context: BrowserContext,
  preDir: string = DEFAULT_PRE_DIR
): Promise<void> {
  await context.route('**/*.vscode-cdn.net/**', async (route) => {
    const url = new URL(route.request().url());
    const pathname = url.pathname;

    // Extract the filename from the CDN path.
    // CDN URLs look like: /<channel>/<commit>/out/vs/workbench/contrib/webview/browser/pre/<file>
    const preIndex = pathname.indexOf('/pre/');
    if (preIndex === -1) {
      // Not a webview pre file — abort so the browser shows its normal error
      await route.abort('connectionfailed');
      return;
    }

    const relativePath = pathname.slice(preIndex + 5); // after "/pre/"
    const filename = relativePath || 'index.html';
    const localPath = join(preDir, filename);

    if (!existsSync(localPath)) {
      await route.abort('connectionfailed');
      return;
    }

    const ext = extname(localPath);
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    await route.fulfill({
      status: 200,
      contentType,
      body: readFileSync(localPath),
      headers: {
        'Access-Control-Allow-Origin': '*',
        // Needed for service worker registration scope
        'Service-Worker-Allowed': '/',
      },
    });
  });
}
