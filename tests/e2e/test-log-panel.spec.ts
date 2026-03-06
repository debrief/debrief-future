/**
 * E2E Test: Log Panel — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/log-panel.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Log Panel', () => {
  test('log panel shows empty state when no tools have run', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const logPanel = frame.locator('[data-testid="log-panel"]');
    await logPanel.waitFor({ state: 'visible', timeout: 5_000 });

    const emptyState = frame.locator(
      '[data-testid="log-panel-empty-no-entries"]',
    );
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
  });

  test('running a tool creates a log entry', async ({ codeServerPage }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const entries = frame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('log entries are shown most recent first', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const entries = frame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await entries.count()).toBeGreaterThanOrEqual(2);
  });
});
