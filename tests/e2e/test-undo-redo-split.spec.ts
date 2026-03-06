/**
 * E2E Test: Undo / Redo Split — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/undo-redo-split.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Undo / Redo', () => {
  test('undo reverts the last selection', async ({ codeServerPage, page }) => {
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Select a track
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const selected = frame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selected.count()).toBeGreaterThan(0);

    // Undo with Ctrl+Z
    await page.keyboard.press('Control+z');

    // Selection should be reverted
    await expect(selected).toHaveCount(0, { timeout: 5_000 });
  });

  test('redo restores the undone selection', async ({
    codeServerPage,
    page,
  }) => {
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Select a track
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const selected = frame.locator('.debrief-feature-row--selected');
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });

    // Undo then redo
    await page.keyboard.press('Control+z');
    await expect(selected).toHaveCount(0, { timeout: 5_000 });

    await page.keyboard.press('Control+y');

    // Selection should be restored
    await selected.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selected.count()).toBeGreaterThan(0);
  });
});
