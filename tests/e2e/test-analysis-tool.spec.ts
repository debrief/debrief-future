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
 * STATUS: Commented out — requires Debrief VS Code extension with analysis
 * tools registered. See docs/e2e-test-restoration-requirements.md for prerequisites.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 2
 */
import { test } from './fixtures/base';

// All tests in this file require:
//   - Debrief VS Code extension installed and activated
//   - debrief-calc Python service running (analysis tools)
//   - debrief-io Python service running (REP file parsing)
//   - debrief-stac Python service running (catalog operations)
//   - Extension commands registered: 'Debrief: Run Analysis Tool'
//
// These tests are commented out until the full service stack is available.

test.describe.skip('US2: Analysis Tool Execution Workflow', () => {
  test('T018: select track, run single-track tool, result appears in catalog', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    const features = frame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    // expect(await frame.locator('.tool-result-item').count()).toBeGreaterThan(0);
  });

  test('T019: load two files, select both tracks, run multi-track tool, verify provenance', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await codeServerPage.openFile('samples/boat2.rep');
    await frame.locator('.leaflet-interactive').nth(1).waitFor({
      state: 'visible',
      timeout: 10_000,
    });
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await frame.locator('.leaflet-interactive').nth(1).click({
      force: true,
      modifiers: ['Control'],
    });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    // expect(await frame.locator('.provenance-source').count()).toBeGreaterThanOrEqual(2);
  });

  test('T020: verify plot feature count increases after tool execution', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    // expect(countAfter).toBeGreaterThan(countBefore);
  });

  test('T021: capture evidence screenshot of analysis results', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    // await page.screenshot({ path: ..., fullPage: false });
  });
});
