/**
 * E2E Test: Selection Sync — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/selection-sync.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * Selection state is reflected in the Activity Panel sidebar via
 * .debrief-feature-row--selected CSS class. Map tracks are clicked in the
 * MapView webview; selection assertions happen in the Activity Panel webview.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Selection Sync', () => {
  test.setTimeout(120_000);

  test('clicking a track on the map selects it in the feature list', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    // Check selection in the Activity Panel feature list
    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 10_000 });
  });

  test('feature list shows loaded features', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const featureRows = activityFrame.locator('.debrief-feature-row');
    await featureRows.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await featureRows.count()).toBeGreaterThan(0);
  });

  test('clicking feature in list selects it', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const featureRows = activityFrame.locator('.debrief-feature-row');
    await featureRows.first().waitFor({ state: 'visible', timeout: 15_000 });
    await featureRows.first().click();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 5_000 });
  });

  test('selection persists after brief interaction', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 10_000 });
    // Pan the map slightly — selection should persist
    const map = mapFrame.locator('.leaflet-container');
    await map.click({ position: { x: 100, y: 100 } });
    await expect(selected.first()).toBeVisible();
  });

  test('clicking map background clears selection', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selected = activityFrame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 10_000 });
    // Click empty area on map to clear selection
    const map = mapFrame.locator('.leaflet-container');
    await map.click({ position: { x: 10, y: 10 } });
    await expect(selected).toHaveCount(0, { timeout: 5_000 });
  });
});
