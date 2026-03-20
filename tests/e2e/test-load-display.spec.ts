/**
 * E2E Test: Load and Display Workflow (User Story 1 — P1)
 *
 * Verifies the complete file-loading pipeline:
 *   Open plot via STAC tree → map displays tracks
 *
 * This is the most fundamental user workflow — the first thing every user does.
 * It exercises the path from STAC catalog through map rendering via the
 * VS Code extension's orchestration layer.
 *
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 1
 */
import { test, expect } from './fixtures/base';

test.describe.skip('US1: Load and Display Workflow', () => { // blocked: webview iframe (#143)
  test.setTimeout(60_000);

  test('T014: open plot via STAC tree shows track lines on map', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-container').waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    const trackCount = await features.count();
    expect(trackCount).toBeGreaterThan(0);
  });

  test('T015: STAC catalog overview shows plot timeline after loading', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    await codeServerPage.executeCommand('Debrief: Open Catalog Overview');
    await codeServerPage.page.waitForTimeout(3_000);

    const allFrames = codeServerPage.page.frames();
    let found = false;
    for (const frame of allFrames) {
      for (const child of frame.childFrames()) {
        const has = await child.locator('.catalog-overview').isVisible().catch(() => false);
        if (has) { found = true; break; }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });

  test('T016: select track on map highlights it in feature list', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });

    const activityFrame = await codeServerPage.getActivityPanelFrame();
    const selectedRow = activityFrame.locator('.debrief-feature-row--selected');
    await selectedRow.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await selectedRow.count()).toBeGreaterThan(0);
  });

  test('T017: capture evidence screenshot of map with tracks', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-container').waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 10_000,
    });
    await page.screenshot({
      path: 'specs/005-e2e-workflow-tests/evidence/screenshots/vscode-map-tracks.png',
      fullPage: false,
    });
  });
});
