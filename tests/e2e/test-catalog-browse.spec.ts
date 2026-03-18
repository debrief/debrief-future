/**
 * E2E Test: Catalog Browse — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/catalog-browse.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * NOTE: All tests skipped — webview #active-frame is not created in
 * openvscode-server, so catalog overview content is inaccessible.
 * These workflows are covered by the web-shell E2E suite.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

test.describe('Catalog Browse', () => {
  test.setTimeout(60_000);

  // Skip: webview #active-frame not created in openvscode-server (backlog #142)
  // Covered by web-shell E2E: apps/web-shell/playwright/tests/catalog-browse.spec.ts
  test.skip('catalog overview is visible after opening it', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(2_000);

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

  // Skip: webview #active-frame not created in openvscode-server (backlog #142)
  test.skip('catalog shows timeline bars from loaded file', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(2_000);

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

  // Skip: webview #active-frame not created in openvscode-server (backlog #142)
  test.skip('catalog overview shows timeline metadata', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(2_000);

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
