/**
 * E2E Test: Catalog Browse — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/catalog-browse.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * FIXME: catalog-overview is rendered in a separate panel (CatalogOverviewPanel),
 * not inside the map webview. These tests need to target the correct webview.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Catalog Browse', () => {
  test.setTimeout(120_000);

  test.fixme('catalog overview is visible after loading a plot', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    const catalogOverview = frame.locator('.catalog-overview');
    await catalogOverview.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(catalogOverview).toBeVisible();
  });

  test.fixme('catalog shows plot items from loaded file', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    const plotItems = frame.locator('.catalog-plot-item');
    await plotItems.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await plotItems.count()).toBeGreaterThan(0);
  });

  test.fixme('catalog overview shows timeline metadata', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    const timeline = frame.locator('.catalog-overview__timeline');
    await timeline.waitFor({ state: 'visible', timeout: 15_000 });
    await expect(timeline).toBeVisible();
  });
});
