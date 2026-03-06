/**
 * E2E Test: PROV Tuning Workflow (Feature 076-replay-tune)
 *
 * Verifies the provenance tuning pipeline in VS Code:
 *   Load file -> select annotation -> run Range Bearing -> switch to log panel ->
 *   tune parameter -> verify replay completes -> verify updated entry
 *
 * This exercises the full LogService.tuneEntry -> replayEngine -> STAC persist
 * round-trip through the extension UI.
 *
 * @see specs/076-replay-tune/spec.md
 */
import { test, expect } from './fixtures/base';

test.describe('US-Tune: PROV Tuning Workflow', () => {
  test.setTimeout(120_000);

  test('T-TUNE-01: run move-shape on annotation, log entry appears with tunable parameters', async ({
    codeServerPage,
  }) => {
    // Load a plot via STAC tree
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Get the map webview frame and click the first feature
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });

    // Run Range Bearing tool via command palette
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();

    // The log panel should now show 1 entry
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });
    const entryCount = await logFrame.locator('.log-panel__entry').count();
    expect(entryCount).toBe(1);

    // The entry should have tunable parameters (distance_nm, direction_deg)
    const distanceParam = logFrame.locator('[data-testid="tune-param-distance_nm"]');
    await expect(distanceParam).toBeVisible({ timeout: 5_000 });

    const directionParam = logFrame.locator('[data-testid="tune-param-direction_deg"]');
    await expect(directionParam).toBeVisible();
  });

  test('T-TUNE-02: tune distance parameter triggers replay and updates entry', async ({
    codeServerPage,
    page,
  }) => {
    // Setup: load file, select feature, run Range Bearing
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });

    // Click the distance parameter to initiate tuning
    const distanceParam = logFrame.locator('[data-testid="tune-param-distance_nm"]');
    await expect(distanceParam).toBeVisible();

    // The ParameterEditor should appear inline
    await distanceParam.click();

    // Edit the value in the inline parameter editor
    const paramInput = logFrame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await expect(paramInput).toBeVisible();
    await paramInput.fill('10');

    // Commit the edit
    const commitBtn = logFrame.locator('[data-testid="param-editor-commit"]');
    await commitBtn.click();

    // After replay completes, the parameter value should update
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Tuned badge should appear on the entry
    await expect(logFrame.locator('[data-testid="badge-tuned"]').first()).toBeVisible();
  });

  test('T-TUNE-03: tune direction parameter triggers replay', async ({
    codeServerPage,
  }) => {
    // Setup: load file, select feature, run Range Bearing
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });

    // Click the direction parameter
    const directionParam = logFrame.locator('[data-testid="tune-param-direction_deg"]');
    await expect(directionParam).toBeVisible();
    await directionParam.click();

    // Edit value
    const paramInput = logFrame.locator(
      '[data-testid="param-editor-input-direction_deg"]'
    );
    await expect(paramInput).toBeVisible();
    await paramInput.fill('180');

    // Commit
    const commitBtn = logFrame.locator('[data-testid="param-editor-commit"]');
    await commitBtn.click();

    // After replay, direction should update
    await expect(directionParam).toHaveText('180', { timeout: 15_000 });
    await expect(logFrame.locator('[data-testid="badge-tuned"]').first()).toBeVisible();
  });

  test('T-TUNE-04: repeated tuning replays correctly', async ({
    codeServerPage,
  }) => {
    // Setup: load file, select feature, run Range Bearing
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });

    // First tune: distance to 10
    const distanceParam = logFrame.locator('[data-testid="tune-param-distance_nm"]');
    await distanceParam.click();
    const paramInput = logFrame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await paramInput.fill('10');
    await logFrame.locator('[data-testid="param-editor-commit"]').click();
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Second tune: direction to 270
    const directionParam = logFrame.locator('[data-testid="tune-param-direction_deg"]');
    await directionParam.click();
    const dirInput = logFrame.locator(
      '[data-testid="param-editor-input-direction_deg"]'
    );
    await dirInput.fill('270');
    await logFrame.locator('[data-testid="param-editor-commit"]').click();
    await expect(directionParam).toHaveText('270', { timeout: 15_000 });

    // Both tuned values should persist
    await expect(distanceParam).toHaveText('10');
    await expect(directionParam).toHaveText('270');
  });

  test('T-TUNE-05: cancelling parameter edit does not trigger replay', async ({
    codeServerPage,
  }) => {
    // Setup: load file, select feature, run Range Bearing
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });

    // Start editing distance
    const distanceParam = logFrame.locator('[data-testid="tune-param-distance_nm"]');
    const originalValue = await distanceParam.textContent();
    await distanceParam.click();

    // Cancel the edit (press Escape or click cancel button)
    const cancelBtn = logFrame.locator('[data-testid="param-editor-cancel"]');
    await cancelBtn.click();

    // Value should remain unchanged
    await expect(distanceParam).toHaveText(originalValue ?? '5');

    // No tuned badge should appear
    await expect(logFrame.locator('[data-testid="badge-tuned"]').first()).not.toBeVisible();
  });

  test('T-TUNE-06: capture evidence screenshot of tuned log entry', async ({
    codeServerPage,
    page,
  }) => {
    // Setup: load file, select feature, run Range Bearing
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const mapFrame = await codeServerPage.getWebviewFrame();
    await mapFrame.locator('.leaflet-interactive').first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);

    // Get the log panel frame
    const logFrame = await codeServerPage.getLogPanelFrame();
    await logFrame.locator('[data-testid="log-panel"]').waitFor({ state: 'visible', timeout: 10_000 });

    // Tune distance
    const distanceParam = logFrame.locator('[data-testid="tune-param-distance_nm"]');
    await distanceParam.click();
    const paramInput = logFrame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await paramInput.fill('10');
    await logFrame.locator('[data-testid="param-editor-commit"]').click();
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Capture evidence
    await page.screenshot({
      path: 'test-results/tune-prov-evidence.png',
      fullPage: false,
    });
  });
});
