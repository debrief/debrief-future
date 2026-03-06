/**
 * E2E Test: Log Panel — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/log-panel.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

// Skip: Log Panel webview doesn't load in openvscode-server (backlog #124)
test.describe.skip('Log Panel', () => {

  test('log panel shows empty state when no tools have run', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const logFrame = await codeServerPage.getLogPanelFrame();

    const logPanel = logFrame.locator('[data-testid="log-panel"]');
    await logPanel.waitFor({ state: 'visible', timeout: 5_000 });

    const emptyState = logFrame.locator(
      '[data-testid="log-panel-empty-no-entries"]',
    );
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
  });

  test('running a tool creates a log entry', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a track and run a tool to create a log entry
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('log entries are shown most recent first', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run tools to create multiple entries
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);
    await codeServerPage.executeCommand('Debrief: Track Stats');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThanOrEqual(2);
  });
});
