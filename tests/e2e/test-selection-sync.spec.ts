/**
 * E2E Test: Selection Sync — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/selection-sync.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * FIXME: 2026-03-06 — All tests marked fixme. Opening a .rep file via Quick
 * Open (Ctrl+P) opens it as plain text — it does NOT trigger the Debrief
 * extension's webview. Need debrief.openPlot or debrief.importRep.
 */
import { test, expect } from './fixtures/base';

test.describe('Selection Sync', () => {
  // openFile opens .rep as text, not via the Debrief webview
  test.fixme('clicking a track on the map selects it', async ({ codeServerPage }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const selected = frame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selected.count()).toBeGreaterThan(0);
  });

  test.fixme('feature list shows loaded features', async ({ codeServerPage }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const featureList = frame.locator('.debrief-feature-list');
    await featureList.waitFor({ state: 'visible', timeout: 10_000 });

    const rows = frame.locator('.debrief-feature-row');
    await rows.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test.fixme('clicking feature in list selects it on the map', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const rows = frame.locator('.debrief-feature-row');
    await rows.first().waitFor({ state: 'visible', timeout: 10_000 });
    await rows.first().click();

    const selectedRow = frame.locator('.debrief-feature-row--selected');
    await selectedRow.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selectedRow.count()).toBeGreaterThan(0);
  });

  test.fixme('selection persists after brief interaction', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const selected = frame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });

    // Wait briefly and verify selection still present
    await frame.locator('.leaflet-container').waitFor({ state: 'visible' });
    expect(await selected.count()).toBeGreaterThan(0);
  });

  test.fixme('clicking map background clears selection', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const selected = frame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });

    // Click on the map background to clear selection
    const mapContainer = frame.locator('.leaflet-container');
    await mapContainer.click({ position: { x: 10, y: 10 }, force: true });

    // Expect selection to be cleared
    await expect(selected).toHaveCount(0, { timeout: 5_000 });
  });
});
