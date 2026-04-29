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
 * The queue is consumed in order (queueIndex 0, 1, 2, ...) and falls
 * back to the LAST item once exhausted. With Patch 3 active, webviews
 * are disposed and re-created during the lifecycle, so each user
 * interaction can produce several webview-ready events. The fallback
 * therefore matters as much as the head-of-queue.
 *
 * Queue ordering:
 * 1. activityPanel — first sidebar webview when Debrief container reveals
 * 2. mapView       — editor webview when a plot opens
 * 3. resultsPanel  — bottom panel webview when results focus
 * 4. logPanel      — sidebar webview in the separate Debrief Log
 *                    container; also acts as the post-exhaustion
 *                    fallback for tests that re-mount webviews many
 *                    times (e.g. test-log-panel) so the LogPanel UI
 *                    eventually renders into a discoverable iframe.
 */
function buildContentQueue(): Array<{ html: string; allowScripts: boolean }> {
  const queue: Array<{ html: string; allowScripts: boolean }> = [];

  // Map view is the most common first webview to fire webview-ready
  // because the editor opens before any sidebar reveal — when a plot
  // opens via the STAC tree, the editor's MapPanel iframe is created
  // first.  Placed at the head of the queue so that test bodies that
  // call `getWebviewFrame()` (which returns the first
  // `iframe.webview.ready` in DOM order) land on a frame whose React
  // app actually renders the leaflet map.  See feature 233.
  if (hasWebviewBundle('mapView')) {
    queue.push({ html: generateWebviewHtml('mapView'), allowScripts: true });
  }

  // Activity panel is the typical second webview (sidebar reveal).
  if (hasWebviewBundle('activityPanel')) {
    queue.push({ html: generateWebviewHtml('activityPanel'), allowScripts: true });
  }

  // Results panel is the panel-area webview (Feature: 178).  Added to
  // the queue so tests that reveal the Debrief Results panel get real
  // bundle content injected.
  if (hasWebviewBundle('resultsPanel')) {
    queue.push({ html: generateWebviewHtml('resultsPanel'), allowScripts: true });
  }

  // Log panel lives in the separate `debrief-log` activity-bar
  // container.  Placed last so that (a) when a test reveals the
  // Debrief Log container after map/activity/results have already
  // mounted the 4th webview-ready receives the logPanel bundle, and
  // (b) it becomes the post-exhaustion fallback — every subsequent
  // re-mount during the test lifecycle gets logPanel content,
  // ensuring at least one frame exposes `[data-testid="log-panel"]`
  // for `findWebviewFrameByContent` to discover.  See feature 233.
  if (hasWebviewBundle('logPanel')) {
    queue.push({ html: generateWebviewHtml('logPanel'), allowScripts: true });
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

    // Stash bundle HTML by name on `window.__webviewBundles` so the
    // page-object helpers (`getLogPanelFrame`, `getWebviewFrame`) can
    // re-deliver the right bundle into a specific iframe whose
    // queue-assigned content was wrong.  See feature 233 fix for the
    // index-vs-iframe-identity race documented in
    // tests/e2e/helpers/webview-injector.ts.
    const bundleMap: Record<string, string> = {};
    for (const name of ['mapView', 'activityPanel', 'resultsPanel', 'logPanel'] as const) {
      if (hasWebviewBundle(name)) bundleMap[name] = generateWebviewHtml(name);
    }
    await page.evaluate((map) => {
      (window as any).__webviewBundles = map;
    }, bundleMap);

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
