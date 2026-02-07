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
    const frame = await codeServerPage.getWebviewFrame();
    const webview = new DebriefWebview(frame);
    await use(webview);
  },
});

export { expect };
