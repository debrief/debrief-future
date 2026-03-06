/**
 * E2E Test: Selection Sync — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/selection-sync.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * FIXME: All tests marked fixme — .debrief-feature-list / .debrief-feature-row
 * CSS classes not yet implemented in MapView components.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Selection Sync', () => {
  test.setTimeout(120_000);

  test.fixme('clicking a track on the map selects it', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    const selected = frame.locator('.track--selected');
    await expect(selected.first()).toBeVisible({ timeout: 5_000 });
  });

  test.fixme('feature list shows loaded features', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    const featureRows = frame.locator('.debrief-feature-row');
    await featureRows.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await featureRows.count()).toBeGreaterThan(0);
  });

  test.fixme('clicking feature in list selects it on the map', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    const featureRows = frame.locator('.debrief-feature-row');
    await featureRows.first().waitFor({ state: 'visible', timeout: 15_000 });
    await featureRows.first().click();
    const selected = frame.locator('.track--selected');
    await expect(selected.first()).toBeVisible({ timeout: 5_000 });
  });

  test.fixme('selection persists after brief interaction', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    const selected = frame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 5_000 });
    // Pan the map slightly
    const map = frame.locator('.leaflet-container');
    await map.click({ position: { x: 100, y: 100 } });
    // Selection should persist
    await expect(selected.first()).toBeVisible();
  });

  test.fixme('clicking map background clears selection', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    const selected = frame.locator('.debrief-feature-row--selected');
    await expect(selected.first()).toBeVisible({ timeout: 5_000 });
    // Click empty area on map
    const map = frame.locator('.leaflet-container');
    await map.click({ position: { x: 10, y: 10 } });
    await expect(selected).toHaveCount(0, { timeout: 5_000 });
  });
});
