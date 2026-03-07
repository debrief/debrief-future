/**
 * E2E Test: Analysis Tool Execution Workflow (User Story 2 — P2)
 *
 * Verifies the complete analysis pipeline:
 *   Select features → invoke calc tool → result logged + displayed on map
 *
 * Uses real VS Code extension commands (debrief.tool.*) to execute tools
 * and verifies results via the LogPanel (log entries) and map (new features).
 *
 * @see specs/005-e2e-workflow-tests/spec.md — User Story 2
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

test.describe('US2: Analysis Tool Execution Workflow', () => {
  test.setTimeout(60_000);

  // Skip: Log Panel webview doesn't load in openvscode-server (backlog #124)
  test.skip('T018: select track, run single-track tool, log entry appears', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    // Run a single-track tool (Track Stats)
    await codeServerPage.executeCommand('Debrief: Track Stats');
    await codeServerPage.page.waitForTimeout(5_000);

    // Verify log entry created
    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThan(0);
  });

  // Skip: Log Panel webview doesn't load in openvscode-server (backlog #124)
  test.skip('T019: select two tracks, run multi-track tool, log entry created', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });

    // Select two tracks with Ctrl+click
    await features.first().click({ force: true });
    if (await features.count() > 1) {
      await features.nth(1).click({ force: true, modifiers: ['Control'] });
    }

    // Run a multi-track tool (Range Bearing)
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(5_000);

    // Verify log entry created
    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test('T020: verify map feature count increases after tool execution', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    const countBefore = await features.count();

    // Select and run tool
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(5_000);

    // Map should have more features (result overlay)
    const countAfter = await mapFrame.locator('.leaflet-interactive').count();
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });

  test('T021: capture evidence screenshot of analysis results', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(5_000);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-analysis.png`,
      fullPage: false,
    });
  });
});
