/**
 * E2E Test: Capture Log Evidence — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/capture-log-evidence.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

const EVIDENCE_DIR = 'specs/005-e2e-workflow-tests/evidence/screenshots';

// Skip: Log Panel webview doesn't load in openvscode-server (backlog #142)
test.describe.skip('Capture Log Evidence', () => {

  test('capture empty log panel screenshot', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const logFrame = await codeServerPage.getLogPanelFrame();

    const emptyState = logFrame.locator(
      '[data-testid="log-panel-empty-no-entries"]',
    );
    await emptyState.waitFor({ state: 'visible', timeout: 5_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-empty.png`,
      fullPage: false,
    });
  });

  test('capture log panel with entries screenshot', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a feature and run a tool to generate log entries
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await page.waitForTimeout(3_000);

    const logFrame = await codeServerPage.getLogPanelFrame();

    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 10_000 });
    expect(await entries.count()).toBeGreaterThan(0);

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-with-entries.png`,
      fullPage: false,
    });
  });

  test('capture tunable params screenshot', async ({
    codeServerPage,
    page,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a feature and run a tool to generate tunable params
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await page.waitForTimeout(3_000);

    const logFrame = await codeServerPage.getLogPanelFrame();

    const directionParam = logFrame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-tunable-params.png`,
      fullPage: false,
    });
  });

  test('capture edit card screenshot', async ({ codeServerPage, page }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a feature and run a tool to generate log entries
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await page.waitForTimeout(3_000);

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Click the first edit icon
    const editIcon = logFrame.locator('[data-testid^="edit-icon-"]').first();
    await editIcon.waitFor({ state: 'visible', timeout: 10_000 });
    await editIcon.click();

    const editFace = logFrame.locator('[data-testid="edit-face"]');
    await editFace.waitFor({ state: 'visible', timeout: 5_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-edit-card.png`,
      fullPage: false,
    });
  });

  test('capture tuned entry screenshot', async ({ codeServerPage, page }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a feature and run a tool to generate log entries with tunable params
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click();
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await page.waitForTimeout(3_000);

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Tune a parameter
    const slider = logFrame.locator('[data-testid="slider-input-direction"]');
    await slider.waitFor({ state: 'visible', timeout: 10_000 });
    await slider.fill('60');

    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 5_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-tuned-entry.png`,
      fullPage: false,
    });
  });
});
