/**
 * E2E Test: Catalog Browse — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/catalog-browse.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * The CatalogOverview is rendered in a separate editor panel (CatalogOverviewPanel),
 * opened via the "Debrief: Open Catalog Overview" command.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Catalog Browse', () => {
  test.setTimeout(60_000);

  test('catalog overview is visible after opening it', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(3_000);

    // The catalog overview opens as a webview panel
    const allFrames = codeServerPage.page.frames();
    let catalogVisible = false;
    for (const frame of allFrames) {
      for (const child of frame.childFrames()) {
        const has = await child.locator('.catalog-overview').isVisible().catch(() => false);
        if (has) { catalogVisible = true; break; }
      }
      if (catalogVisible) break;
    }
    expect(catalogVisible).toBe(true);
  });

  test('catalog shows timeline bars from loaded file', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(3_000);

    // Find the catalog overview webview frame
    const allFrames = codeServerPage.page.frames();
    for (const frame of allFrames) {
      for (const child of frame.childFrames()) {
        const bars = child.locator('.catalog-overview__timeline-bar');
        const count = await bars.count().catch(() => 0);
        if (count > 0) {
          expect(count).toBeGreaterThan(0);
          return;
        }
      }
    }
    throw new Error('No catalog timeline bars found in any webview frame');
  });

  test('catalog overview shows timeline metadata', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(3_000);

    const allFrames = codeServerPage.page.frames();
    let timelineVisible = false;
    for (const frame of allFrames) {
      for (const child of frame.childFrames()) {
        const has = await child.locator('.catalog-overview__timeline').isVisible().catch(() => false);
        if (has) { timelineVisible = true; break; }
      }
      if (timelineVisible) break;
    }
    expect(timelineVisible).toBe(true);
  });
});
