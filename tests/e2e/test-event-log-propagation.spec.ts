/**
 * E2E Test: Event Log Propagation — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/event-log-propagation.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe.skip('Event Log Propagation', () => { // blocked: webview iframe (#143)

  test('amending first event re-applies subsequent events', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run a tool to create log entries with tunable parameters
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame
      .locator('.leaflet-interactive')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Find the tune parameter for direction on first entry
    const directionParam = logFrame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    const slider = logFrame.locator('[data-testid="slider-input-direction"]');
    await slider.waitFor({ state: 'visible', timeout: 5_000 });

    // Adjust the slider
    await slider.fill('45');

    // Verify subsequent log entries are still present (re-applied)
    const entries = logFrame.locator('.log-panel__entry');
    expect(await entries.count()).toBeGreaterThan(1);
  });

  test('log entries persist after tuning a parameter', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run a tool to create log entries with tunable parameters
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame
      .locator('.leaflet-interactive')
      .first()
      .waitFor({ state: 'visible', timeout: 15_000 });
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();

    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 10_000 });
    const initialCount = await entries.count();

    // Tune a parameter
    const directionParam = logFrame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    const slider = logFrame.locator('[data-testid="slider-input-direction"]');
    await slider.fill('90');

    // Entries should still be present
    expect(await entries.count()).toBeGreaterThanOrEqual(initialCount);
  });
});
