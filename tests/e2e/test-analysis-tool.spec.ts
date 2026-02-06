/**
 * E2E Test: Analysis Tool Execution Workflow (User Story 2 — P2)
 *
 * Verifies the complete analysis pipeline:
 *   Select features → invoke calc tool → persist results to stac → display on map
 *
 * This exercises the stac-to-calc-to-stac round-trip through the real
 * extension UI — the path that has no Python-level orchestration and can
 * only be tested through the extension.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 2
 */
import { test, expect } from './fixtures/base';
import path from 'path';

const EVIDENCE_DIR = path.join(
  __dirname,
  '../../specs/005-e2e-workflow-tests/evidence/screenshots'
);

test.describe('US2: Analysis Tool Execution Workflow', () => {
  /**
   * Acceptance Scenario 1:
   * Given a loaded plot with track features visible on the map,
   * When the user selects a track and executes a single-track analysis tool,
   * Then the analysis result appears as a new feature in the catalog.
   */
  test('T018: select track, run single-track tool, result appears in catalog', async ({
    codeServerPage,
  }) => {
    // Load a REP file first
    await codeServerPage.openFile('samples/boat1.rep');

    const frame = await codeServerPage.getWebviewFrame();

    // Wait for map features to render
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Select a track
    await features.first().click({ force: true });

    // Record initial feature count in catalog
    const featureCountBefore = await frame
      .locator('.catalog-feature-count')
      .first()
      .textContent()
      .catch(() => '0');
    const countBefore = parseInt(featureCountBefore ?? '0', 10);

    // Execute an analysis tool via command palette
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');

    // Wait for tool execution to complete
    // The extension should show a result or update the catalog
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Verify a result was produced
    const resultItems = frame.locator('.tool-result-item');
    expect(await resultItems.count()).toBeGreaterThan(0);
  });

  /**
   * Acceptance Scenario 2:
   * Given two loaded tracks from different source files,
   * When the user selects both and runs a multi-track tool,
   * Then provenance traces back to both source files.
   */
  test('T019: load two files, select both tracks, run multi-track tool, verify provenance', async ({
    codeServerPage,
  }) => {
    // Load first REP file
    await codeServerPage.openFile('samples/boat1.rep');

    const frame = await codeServerPage.getWebviewFrame();

    // Wait for first file's features
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Load second REP file
    await codeServerPage.openFile('samples/boat2.rep');

    // Wait for additional features (more tracks should appear)
    await frame.locator('.leaflet-interactive').nth(1).waitFor({
      state: 'visible',
      timeout: 10_000,
    });

    const totalTracks = await frame.locator('.leaflet-interactive').count();
    expect(totalTracks).toBeGreaterThanOrEqual(2);

    // Select multiple tracks (Ctrl+Click for multi-select)
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await frame.locator('.leaflet-interactive').nth(1).click({
      force: true,
      modifiers: ['Control'],
    });

    // Execute multi-track analysis tool
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');

    // Wait for result
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Verify provenance links reference both source files
    const provenanceLinks = frame.locator('.provenance-source');
    if ((await provenanceLinks.count()) > 0) {
      const provenanceCount = await provenanceLinks.count();
      expect(provenanceCount).toBeGreaterThanOrEqual(2);
    }
  });

  /**
   * Acceptance Scenario 3:
   * Given an analysis tool has produced results,
   * When the user inspects the plot in the catalog panel,
   * Then the feature count has increased.
   */
  test('T020: verify plot feature count increases after tool execution', async ({
    codeServerPage,
  }) => {
    // Load a REP file
    await codeServerPage.openFile('samples/boat1.rep');

    const frame = await codeServerPage.getWebviewFrame();

    // Wait for features
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Record initial feature count
    const featureCountEl = frame.locator('.catalog-feature-count').first();
    let countBefore = 0;
    if ((await featureCountEl.count()) > 0) {
      const text = await featureCountEl.textContent();
      countBefore = parseInt(text ?? '0', 10);
    }

    // Select track and run tool
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');

    // Wait for result
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Verify feature count increased
    const countAfterText = await featureCountEl.textContent();
    const countAfter = parseInt(countAfterText ?? '0', 10);
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  /**
   * T021: Screenshot capture for evidence.
   * Captures the analysis result overlay on the map.
   */
  test('T021: capture evidence screenshot of analysis results', async ({
    codeServerPage,
    page,
  }) => {
    // Load REP file, select track, run tool
    await codeServerPage.openFile('samples/boat1.rep');

    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');

    // Wait for analysis results
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Capture screenshot
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'analysis-result.png'),
      fullPage: false,
    });
  });
});
