/**
 * Custom Playwright fixture that provides a codeServerPage instance.
 *
 * Usage in tests:
 *   import { test, expect } from '../fixtures/base';
 *   test('example', async ({ codeServerPage }) => { ... });
 */
import { test as base, expect } from '@playwright/test';
import { CodeServerPage } from '../models/code-server-page';
import { DebriefWebview } from '../models/debrief-webview';

/**
 * Extended test fixtures for code-server E2E tests.
 */
export const test = base.extend<{
  codeServerPage: CodeServerPage;
  debriefWebview: DebriefWebview;
}>({
  codeServerPage: async ({ page }, use) => {
    const csPage = new CodeServerPage(page);
    await csPage.waitForReady();
    await use(csPage);
  },

  debriefWebview: async ({ codeServerPage }, use) => {
    // Lazy: frame is resolved when test calls waitForMapReady() or
    // accesses the webview after opening a plot via STAC tree.
    // We still need to resolve the frame before passing to DebriefWebview,
    // but tests that use this fixture should open the plot first.
    const webview = new DebriefWebview(codeServerPage);
    await use(webview);
  },
});

export { expect };
