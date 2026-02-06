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
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 1
 */
import { test, expect } from './fixtures/base';
import path from 'path';

const EVIDENCE_DIR = path.join(
  __dirname,
  '../../specs/005-e2e-workflow-tests/evidence/screenshots'
);

test.describe('US1: Load and Display Workflow', () => {
  /**
   * Acceptance Scenario 1:
   * Given a sample REP file in the workspace,
   * When the user opens the REP file,
   * Then the map panel displays track lines corresponding to the vessels.
   */
  test('T014: open REP file shows track lines on map', async ({
    codeServerPage,
  }) => {
    // Open a REP file via Quick Open
    await codeServerPage.openFile('samples/boat1.rep');

    // Get the webview frame containing Debrief components
    const frame = await codeServerPage.getWebviewFrame();

    // Wait for the map to render
    await frame.locator('.leaflet-container').waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Verify track features appear on the map
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });

    const trackCount = await features.count();
    expect(trackCount).toBeGreaterThan(0);
  });

  /**
   * Acceptance Scenario 2:
   * Given a REP file with multiple tracks has been opened,
   * When the user inspects the STAC catalog panel,
   * Then a new plot is listed with features for each track.
   */
  test('T015: STAC catalog panel shows new plot with features', async ({
    codeServerPage,
  }) => {
    // Open a REP file
    await codeServerPage.openFile('samples/boat1.rep');

    // Get the webview frame
    const frame = await codeServerPage.getWebviewFrame();

    // Wait for catalog to update
    await frame.locator('.catalog-overview').waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Verify plot items exist
    const plotItems = frame.locator('.catalog-plot-item');
    await plotItems.first().waitFor({ state: 'visible', timeout: 10_000 });

    const plotCount = await plotItems.count();
    expect(plotCount).toBeGreaterThan(0);

    // Verify feature count is displayed
    const featureCount = frame.locator('.catalog-feature-count');
    if ((await featureCount.count()) > 0) {
      const countText = await featureCount.first().textContent();
      expect(parseInt(countText ?? '0', 10)).toBeGreaterThan(0);
    }
  });

  /**
   * Acceptance Scenario 3:
   * Given a REP file has been loaded,
   * When the user selects a track on the map,
   * Then the track is visually highlighted and its properties are shown.
   */
  test('T016: select track on map highlights it and shows properties', async ({
    codeServerPage,
  }) => {
    // Open a REP file
    await codeServerPage.openFile('samples/boat1.rep');

    // Get the webview frame
    const frame = await codeServerPage.getWebviewFrame();

    // Wait for map features
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 10_000 });

    // Click on the first track feature (force: true to bypass SVG overlap checks)
    await features.first().click({ force: true });

    // Verify track is selected (highlighted)
    // The extension should add a selection class or visual indicator
    const selectedTrack = frame.locator('.track--selected, .debrief-feature-row--selected');
    await selectedTrack.first().waitFor({ state: 'visible', timeout: 5_000 });

    expect(await selectedTrack.count()).toBeGreaterThan(0);
  });

  /**
   * T017: Screenshot capture for evidence.
   * Captures the map with loaded tracks for the evidence directory.
   */
  test('T017: capture evidence screenshot of map with tracks', async ({
    codeServerPage,
    page,
  }) => {
    // Open a REP file
    await codeServerPage.openFile('samples/boat1.rep');

    // Get the webview frame
    const frame = await codeServerPage.getWebviewFrame();

    // Wait for map and features
    await frame.locator('.leaflet-container').waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 10_000,
    });

    // Capture full-page screenshot for evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'map-with-tracks.png'),
      fullPage: false,
    });
  });
});
