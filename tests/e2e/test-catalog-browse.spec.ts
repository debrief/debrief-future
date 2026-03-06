/**
 * E2E Test: Catalog Browse — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/catalog-browse.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Catalog Browse', () => {
  // openFile opens .rep as text, not via the Debrief webview
  test.fixme('catalog overview is visible after loading a plot', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const catalogOverview = frame.locator('.catalog-overview');
    await catalogOverview.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(catalogOverview).toBeVisible();
  });

  test.fixme('catalog shows plot items from loaded file', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const plotItems = frame.locator('.catalog-plot-item');
    await plotItems.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await plotItems.count()).toBeGreaterThan(0);
  });

  test('catalog overview shows timeline metadata', async ({
    codeServerPage,
  }) => {
    test.fixme();
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();

    const timeline = frame.locator('.catalog-overview__timeline');
    await timeline.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(timeline).toBeVisible();
  });
});
