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
 * FIXME: 2026-03-06 — Tests marked fixme. Opening a .rep file via Quick Open
 * (Ctrl+P) opens it as plain text — it does NOT trigger the Debrief extension's
 * webview. These tests need to use debrief.openPlot or debrief.importRep.
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 2
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

test.describe('US2: Analysis Tool Execution Workflow', () => {
  test.fixme('T018: select track, run single-track tool, result appears in catalog', async ({
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
    expect(await frame.locator('.tool-result-item').count()).toBeGreaterThan(0);
  });

  test.fixme('T019: load two files, select both tracks, run multi-track tool, verify provenance', async ({
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
    expect(await frame.locator('.provenance-source').count()).toBeGreaterThanOrEqual(2);
  });

  test.fixme('T020: verify plot feature count increases after tool execution', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openFile('samples/boat1.rep');
    const frame = await codeServerPage.getWebviewFrame();
    await frame.locator('.leaflet-interactive').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    const countBefore = await frame.locator('.leaflet-interactive').count();
    await frame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Run Analysis Tool');
    await frame.locator('.tool-result-item').first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });
    const countAfter = await frame.locator('.leaflet-interactive').count();
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test.fixme('T021: capture evidence screenshot of analysis results', async ({
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
    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-analysis.png`,
      fullPage: false,
    });
  });
});
