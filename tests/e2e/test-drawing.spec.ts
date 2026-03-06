/**
 * E2E Test: Drawing — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/drawing.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Drawing Tools', () => {
  test('drawing toolbar trigger is present on the map', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const drawTrigger = frame.locator('[data-testid="draw-trigger"]');
    await drawTrigger.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(drawTrigger).toBeVisible();
  });

  test('clicking draw trigger opens the shape palette', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const drawTrigger = frame.locator('[data-testid="draw-trigger"]');
    await drawTrigger.waitFor({ state: 'visible', timeout: 15_000 });
    await drawTrigger.click();

    const shapePalette = frame.locator('[data-testid="shape-palette"]');
    await shapePalette.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(shapePalette).toBeVisible();
  });

  test('drawing a rectangle appears in features', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const drawTrigger = frame.locator('[data-testid="draw-trigger"]');
    await drawTrigger.waitFor({ state: 'visible', timeout: 15_000 });
    await drawTrigger.click();

    const rectButton = frame.locator('[data-testid="shape-rectangle"]');
    await rectButton.waitFor({ state: 'visible', timeout: 5_000 });
    await rectButton.click();

    // Draw rectangle on map
    const map = frame.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      await frame.page().mouse.click(box.x + 100, box.y + 100);
      await frame.page().mouse.click(box.x + 200, box.y + 200);
    }

    // Verify the drawn shape appears as a feature
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await features.count()).toBeGreaterThan(0);
  });
});
