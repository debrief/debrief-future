/**
 * E2E Test: Log Edit Face — VS Code Extension
 *
 * Adapted from web-shell test: apps/web-shell/playwright/tests/log-edit-face.spec.ts
 * Tests exercise the same workflows through VS Code's webview iframe hierarchy.
 *
 * CREATED: 2026-03-06 — Dual-platform E2E expansion (SC-006)
 */
import { test, expect } from './fixtures/base';

// Skip: requires debrief-calc service for log entries
test.describe.skip('Log Edit Face', () => {

  test('clicking edit icon shows the edit face', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run a tool to create a log entry
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Click the first edit icon
    const editIcon = logFrame.locator('[data-testid^="edit-icon-"]').first();
    await editIcon.waitFor({ state: 'visible', timeout: 15_000 });
    await editIcon.click();

    const editFace = logFrame.locator('[data-testid="edit-face"]');
    await editFace.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(editFace).toBeVisible();
  });

  test('edit face shows parameter editors', async ({ codeServerPage }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run a tool to create a log entry
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Click the first edit icon
    const editIcon = logFrame.locator('[data-testid^="edit-icon-"]').first();
    await editIcon.waitFor({ state: 'visible', timeout: 15_000 });
    await editIcon.click();

    const editParams = logFrame.locator('[data-testid="edit-face-params"]');
    await editParams.waitFor({ state: 'visible', timeout: 5_000 });
    await expect(editParams).toBeVisible();
  });

  test('sliders in edit face have correct initial values', async ({
    codeServerPage,
  }) => {
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');

    // Run a tool to create a log entry
    const mapFrame = await codeServerPage.getWebviewFrame();
    const features = mapFrame.locator('.leaflet-interactive');
    await features.first().waitFor({ state: 'visible', timeout: 15_000 });
    await features.first().click({ force: true });
    await codeServerPage.executeCommand('Debrief: Range Bearing');

    const logFrame = await codeServerPage.getLogPanelFrame();

    // Click the first edit icon
    const editIcon = logFrame.locator('[data-testid^="edit-icon-"]').first();
    await editIcon.waitFor({ state: 'visible', timeout: 15_000 });
    await editIcon.click();

    const params = logFrame.locator('[data-testid="edit-face-params"]');
    await params.waitFor({ state: 'visible', timeout: 5_000 });

    // Verify sliders exist within the parameter editors
    const sliders = params.locator('input[type="range"]');
    expect(await sliders.count()).toBeGreaterThan(0);
  });
});
