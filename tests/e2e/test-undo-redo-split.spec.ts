/**
 * E2E Test: Undo / Redo Split — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/undo-redo-split.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

// Skip: Activity Panel sidebar webview doesn't load in openvscode-server —
// getActivityPanelFrame() never finds .debrief-activity-panel (same issue as Log Panel #142).
test.describe.skip('Undo / Redo', () => {
  test.setTimeout(120_000);

  test('undo reverts the last selection', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();

    // Select a track on the map
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    // Verify selection in activity panel
    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await selected.count()).toBeGreaterThan(0);

    // Undo via VS Code command
    await codeServerPage.executeCommand('Debrief: Undo');

    // Selection should be reverted
    await expect(selected).toHaveCount(0, { timeout: 5_000 });
  });

  test('redo restores the undone selection', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();

    // Select a track on the map
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    // Verify selection in activity panel
    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 10_000 });

    // Undo then redo via VS Code commands
    await codeServerPage.executeCommand('Debrief: Undo');
    await expect(selected).toHaveCount(0, { timeout: 5_000 });

    await codeServerPage.executeCommand('Debrief: Redo');

    // Selection should be restored
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selected.count()).toBeGreaterThan(0);
  });
});
