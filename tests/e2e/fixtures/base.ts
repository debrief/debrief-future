/**
 * Custom Playwright fixtures for VS Code E2E tests.
 *
 * Provides two fixtures:
 * - codeServerPage: VS Code workbench with CDN interceptor + MessagePort injector
 * - debriefWebview: Lazy-loaded webview wrapper for Debrief component selectors
 *
 * The Hybrid A+D approach is used to render real extension content:
 * - CDN interceptor: serves pre/index.html from disk so webview iframe boots
 * - MessagePort injector: captures the webview-ready handshake and injects
 *   real extension HTML (with bundled JS inlined) via the MessagePort
 *
 * Usage in tests:
 *   import { test, expect } from '../fixtures/base';
 *   test('example', async ({ codeServerPage }) => { ... });
 *
 * @see docs/project_notes/webview-e2e-research.md — Hybrid A+D
 */
import { test as base, expect } from '@playwright/test';
import { CodeServerPage } from '../models/code-server-page';
import { DebriefWebview } from '../models/debrief-webview';
import { installCdnInterceptor } from '../helpers/cdn-interceptor';
import { installMultiWebviewInterceptor } from '../helpers/webview-injector';
import {
  generateWebviewHtml,
  hasWebviewBundle,
} from '../helpers/extension-content';

/**
 * Build the content queue for the MessagePort interceptor.
 * Returns HTML for all available webview bundles so that any
 * webview-ready event gets appropriate content.
 *
 * The queue order matters: first webview-ready gets [0], second gets [1], etc.
 * In typical usage:
 * - Sidebar reveal → activity panel (first)
 * - Plot open → map view (second)
 */
function buildContentQueue(): Array<{ html: string; allowScripts: boolean }> {
  const queue: Array<{ html: string; allowScripts: boolean }> = [];

  // Activity panel is the most common first webview (sidebar)
  if (hasWebviewBundle('activityPanel')) {
    queue.push({ html: generateWebviewHtml('activityPanel'), allowScripts: true });
  }

  // Map view is typically the second webview (opened via STAC tree)
  if (hasWebviewBundle('mapView')) {
    queue.push({ html: generateWebviewHtml('mapView'), allowScripts: true });
  }

  return queue;
}

/**
 * Extended test fixtures for code-server E2E tests.
 */
export const test = base.extend<{
  codeServerPage: CodeServerPage;
  debriefWebview: DebriefWebview;
}>({
  codeServerPage: async ({ page, context }, use) => {
    // Intercept vscode-cdn.net requests so webview iframes load from disk.
    // Must be installed before page.goto() triggers webview iframe creation.
    await installCdnInterceptor(context);

    const csPage = new CodeServerPage(page);
    await csPage.waitForReady();

    // Install the MessagePort interceptor with real extension content.
    // This captures webview-ready events and injects HTML so #active-frame
    // renders with the actual React components.
    const contentQueue = buildContentQueue();
    if (contentQueue.length > 0) {
      await installMultiWebviewInterceptor(page, contentQueue);
    }

    await use(csPage);
  },

  debriefWebview: async ({ codeServerPage }, use) => {
    // Lazy: frame is resolved when test calls waitForMapReady() or
    // accesses the webview after opening a plot via STAC tree.
    const webview = new DebriefWebview(codeServerPage);
    await use(webview);
  },
});

export { expect };
