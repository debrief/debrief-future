/**
 * E2E Test: Log Panel — VS Code Extension
 *
 * Exercises the LogPanel webview through the openvscode-server integration
 * path (code-server → VS Code extension host → sidebar webview iframe →
 * LogPanel DOM). Mirrors the user-observable behaviours covered by the
 * web-shell parity baseline at apps/web-shell/playwright/tests/log-panel.spec.ts.
 */
import { test, expect } from './fixtures/base';

test.describe('Log Panel', () => {

  test('log panel shows empty state when no tools have run', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const logFrame = await codeServerPage.getLogPanelFrame();

    const logPanel = logFrame.locator('[data-testid="log-panel"]');
    await logPanel.waitFor({ state: 'visible', timeout: 5_000 });

    const emptyState = logFrame.locator(
      '[data-testid="log-panel-empty-no-entries"]',
    );
    await expect(emptyState).toBeVisible({ timeout: 5_000 });
  });

  // Tests below require real extension state to flow into the webview
  // (tool execution → LogService append → `timeline:update` postMessage →
  // LogPanel re-renders).  The cloud E2E framework (Hybrid A+D —
  // see `docs/project_notes/webview-e2e-research.md` "Limitations")
  // injects only the bundled JS; extension ↔ webview message passing
  // does not flow naturally.  Driving these scenarios needs the test
  // bodies to dispatch `timeline:update` MessageEvents themselves —
  // which is a follow-up beyond this spec's §131 out-of-scope clause.
  // Tracked for follow-up; per spec §60 narrow-mute fallback the four
  // assertions below are per-test `test.fixme` so the suite stays
  // active for test #1 (the empty-state assertion).
  test.fixme('running a tool creates a log entry', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Select a track and run a tool to create a log entry
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThan(0);
  });

  test.fixme('log entries are shown most recent first', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run tools to create multiple entries
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');
    await codeServerPage.page.waitForTimeout(3_000);
    await codeServerPage.executeCommand('Debrief: Track Stats');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const entries = logFrame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 15_000 });
    expect(await entries.count()).toBeGreaterThanOrEqual(2);
  });

  test.fixme('clicking a log entry selects it', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const firstEntry = logFrame.locator('.log-panel__entry').first();
    await firstEntry.waitFor({ state: 'visible', timeout: 15_000 });

    await firstEntry.click();
    await expect(firstEntry).toHaveClass(/selected/);
  });

  test.fixme('clicking a selected log entry deselects it', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();
    const firstEntry = logFrame.locator('.log-panel__entry').first();
    await firstEntry.waitFor({ state: 'visible', timeout: 15_000 });

    await firstEntry.click();
    await expect(firstEntry).toHaveClass(/selected/);

    await firstEntry.click();
    await expect(firstEntry).not.toHaveClass(/selected/);
  });
});
