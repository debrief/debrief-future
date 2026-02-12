/**
 * E2E Test: PROV Tuning Workflow (Feature 076-replay-tune)
 *
 * Verifies the provenance tuning pipeline in VS Code:
 *   Load file -> select annotation -> run move-shape -> switch to log panel ->
 *   tune parameter -> verify replay completes -> verify updated entry
 *
 * This exercises the full LogService.tuneEntry -> replayEngine -> STAC persist
 * round-trip through the extension UI.
 *
 * STATUS: Skipped — requires Debrief VS Code extension with analysis tools
 * and LogService registered. See docs/e2e-test-restoration-requirements.md
 * for prerequisites.
 *
 * @see specs/076-replay-tune/spec.md
 */
import { test, expect } from './fixtures/base';

// All tests in this file require:
//   - Debrief VS Code extension installed and activated
//   - debrief-calc Python service running (move-shape tool)
//   - debrief-stac Python service running (catalog operations)
//   - LogService with replay engine enabled
//   - Log Panel webview registered
//   - Extension command: 'Debrief: Run Move Shape' (or equivalent tool invocation)
//
// These tests are skipped until the full service stack is available.

test.describe.skip('US-Tune: PROV Tuning Workflow', () => {
  test('T-TUNE-01: run move-shape on annotation, log entry appears with tunable parameters', async ({
    codeServerPage,
    debriefWebview,
  }) => {
    // Load a file with annotation shapes
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();

    // Select an annotation feature (rectangle, circle, etc.)
    const features = debriefWebview.mapFeatures;
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });

    // Run move-shape tool via command palette
    await codeServerPage.executeCommand('Debrief: Move Shape');

    // Switch to Log Panel view (if it's in a separate panel)
    // The log panel should now show 1 entry
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await debriefWebview.getLogEntryCount()).toBe(1);

    // The entry should have tunable parameters (distance_nm, direction_deg)
    const distanceParam = debriefWebview.getTunableParam('distance_nm');
    await expect(distanceParam).toBeVisible({ timeout: 5_000 });

    const directionParam = debriefWebview.getTunableParam('direction_deg');
    await expect(directionParam).toBeVisible();
  });

  test('T-TUNE-02: tune distance parameter triggers replay and updates entry', async ({
    codeServerPage,
    debriefWebview,
    page,
  }) => {
    // Setup: load file, select annotation, run move-shape
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();
    await debriefWebview.mapFeatures.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Move Shape');
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });

    // Click the distance parameter to initiate tuning
    const distanceParam = debriefWebview.getTunableParam('distance_nm');
    await expect(distanceParam).toBeVisible();

    // The ParameterEditor should appear inline
    await distanceParam.click();

    // Edit the value in the inline parameter editor
    const paramInput = debriefWebview.frame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await expect(paramInput).toBeVisible();
    await paramInput.fill('10');

    // Commit the edit
    const commitBtn = debriefWebview.frame.locator('[data-testid="param-editor-commit"]');
    await commitBtn.click();

    // Replay progress should appear briefly
    // (may be too fast to catch — use soft check)
    // await debriefWebview.replayProgress.waitFor({ state: 'visible', timeout: 5_000 });

    // After replay completes, the parameter value should update
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Tuned badge should appear on the entry
    await expect(debriefWebview.tunedBadge.first()).toBeVisible();
  });

  test('T-TUNE-03: tune direction parameter triggers replay', async ({
    codeServerPage,
    debriefWebview,
  }) => {
    // Setup: load file, select annotation, run move-shape
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();
    await debriefWebview.mapFeatures.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Move Shape');
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });

    // Click the direction parameter
    const directionParam = debriefWebview.getTunableParam('direction_deg');
    await expect(directionParam).toBeVisible();
    await directionParam.click();

    // Edit value
    const paramInput = debriefWebview.frame.locator(
      '[data-testid="param-editor-input-direction_deg"]'
    );
    await expect(paramInput).toBeVisible();
    await paramInput.fill('180');

    // Commit
    const commitBtn = debriefWebview.frame.locator('[data-testid="param-editor-commit"]');
    await commitBtn.click();

    // After replay, direction should update
    await expect(directionParam).toHaveText('180', { timeout: 15_000 });
    await expect(debriefWebview.tunedBadge.first()).toBeVisible();
  });

  test('T-TUNE-04: repeated tuning replays correctly', async ({
    codeServerPage,
    debriefWebview,
  }) => {
    // Setup
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();
    await debriefWebview.mapFeatures.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Move Shape');
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });

    // First tune: distance to 10
    const distanceParam = debriefWebview.getTunableParam('distance_nm');
    await distanceParam.click();
    const paramInput = debriefWebview.frame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await paramInput.fill('10');
    await debriefWebview.frame.locator('[data-testid="param-editor-commit"]').click();
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Second tune: direction to 270
    const directionParam = debriefWebview.getTunableParam('direction_deg');
    await directionParam.click();
    const dirInput = debriefWebview.frame.locator(
      '[data-testid="param-editor-input-direction_deg"]'
    );
    await dirInput.fill('270');
    await debriefWebview.frame.locator('[data-testid="param-editor-commit"]').click();
    await expect(directionParam).toHaveText('270', { timeout: 15_000 });

    // Both tuned values should persist
    await expect(distanceParam).toHaveText('10');
    await expect(directionParam).toHaveText('270');
  });

  test('T-TUNE-05: cancelling parameter edit does not trigger replay', async ({
    codeServerPage,
    debriefWebview,
  }) => {
    // Setup
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();
    await debriefWebview.mapFeatures.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Move Shape');
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });

    // Start editing distance
    const distanceParam = debriefWebview.getTunableParam('distance_nm');
    const originalValue = await distanceParam.textContent();
    await distanceParam.click();

    // Cancel the edit (press Escape or click cancel button)
    const cancelBtn = debriefWebview.frame.locator('[data-testid="param-editor-cancel"]');
    await cancelBtn.click();

    // Value should remain unchanged
    await expect(distanceParam).toHaveText(originalValue ?? '5');

    // No tuned badge should appear
    await expect(debriefWebview.tunedBadge.first()).not.toBeVisible();
  });

  test('T-TUNE-06: capture evidence screenshot of tuned log entry', async ({
    codeServerPage,
    debriefWebview,
    page,
  }) => {
    // Setup and tune
    await codeServerPage.openFile('samples/boat1.rep');
    await debriefWebview.waitForMapReady();
    await debriefWebview.mapFeatures.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Move Shape');
    await debriefWebview.logPanel.waitFor({ state: 'visible', timeout: 10_000 });

    // Tune distance
    const distanceParam = debriefWebview.getTunableParam('distance_nm');
    await distanceParam.click();
    const paramInput = debriefWebview.frame.locator(
      '[data-testid="param-editor-input-distance_nm"]'
    );
    await paramInput.fill('10');
    await debriefWebview.frame.locator('[data-testid="param-editor-commit"]').click();
    await expect(distanceParam).toHaveText('10', { timeout: 15_000 });

    // Capture evidence
    await page.screenshot({
      path: 'test-results/tune-prov-evidence.png',
      fullPage: false,
    });
  });
});
