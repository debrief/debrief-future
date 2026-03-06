/**
 * E2E Test: Event Log Propagation — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/event-log-propagation.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Event Log Propagation', () => {
  test('amending first event re-applies subsequent events', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Navigate to log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    // Find the tune parameter for direction on first entry
    const directionParam = frame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    const slider = frame.locator('[data-testid="slider-input-direction"]');
    await slider.waitFor({ state: 'visible', timeout: 5_000 });

    // Adjust the slider
    await slider.fill('45');

    // Verify subsequent log entries are still present (re-applied)
    const entries = frame.locator('.log-panel__entry');
    expect(await entries.count()).toBeGreaterThan(1);
  });

  test('log entries persist after tuning a parameter', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    // Navigate to log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const entries = frame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 10_000 });
    const initialCount = await entries.count();

    // Tune a parameter
    const directionParam = frame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    const slider = frame.locator('[data-testid="slider-input-direction"]');
    await slider.fill('90');

    // Entries should still be present
    expect(await entries.count()).toBeGreaterThanOrEqual(initialCount);
  });
});
