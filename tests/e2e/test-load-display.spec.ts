/**
 * E2E Test: Load and Display Workflow (User Story 1 — P1)
 *
 * Verifies the complete file-loading pipeline:
 *   Open REP file → io parses → stac stores → map displays tracks
 *
 * This is the most fundamental user workflow — the first thing every user does.
 * It exercises the full path from file open through io parsing, stac catalog
 * storage, and map rendering via the VS Code extension's orchestration layer.
 *
 * RESTORED: 2026-03-06 — Tests now active. Real Python services parse real
 * REP files. Tests use structural assertions (existence-based, not value-exact)
 * to accommodate real service output.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 1
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

test.describe('US1: Load and Display Workflow', () => {
  test('T014: open REP file shows track lines on map', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
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

  test('T015: STAC catalog panel shows new plot with features', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.catalog-overview').waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    const plotItems = frame.locator('.catalog-plot-item');
    await plotItems.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await plotItems.count()).toBeGreaterThan(0);
  });

  test('T016: select track on map highlights it and shows properties', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });
    await features.first().click({ force: true });
    const selectedTrack = frame.locator('.track--selected, .debrief-feature-row--selected');
    await selectedTrack.first().waitFor({ state: 'visible', timeout: 5_000 });
    expect(await selectedTrack.count()).toBeGreaterThan(0);
  });

  test('T017: capture evidence screenshot of map with tracks', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
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
      path: `${EVIDENCE_DIR}/vscode-map-tracks.png`,
      fullPage: false,
    });
  });
});
