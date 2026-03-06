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

test.describe('Capture Log Evidence', () => {
  test('capture empty log panel screenshot', async ({
    codeServerPage,
    page,
  }) => {
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const emptyState = frame.locator(
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
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const entries = frame.locator('.log-panel__entry');
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
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    const directionParam = frame.locator(
      '[data-testid="tune-param-direction"]',
    );
    await directionParam.waitFor({ state: 'visible', timeout: 10_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-tunable-params.png`,
      fullPage: false,
    });
  });

  test('capture edit card screenshot', async ({ codeServerPage, page }) => {
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    // Click the first edit icon
    const editIcon = frame.locator('[data-testid^="edit-icon-"]').first();
    await editIcon.waitFor({ state: 'visible', timeout: 10_000 });
    await editIcon.click();

    const editFace = frame.locator('[data-testid="edit-face"]');
    await editFace.waitFor({ state: 'visible', timeout: 5_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-edit-card.png`,
      fullPage: false,
    });
  });

  test('capture tuned entry screenshot', async ({ codeServerPage, page }) => {
    test.fixme();
    await codeServerPage.openPlotViaStacTree('Exercise Alpha');
    const frame = await codeServerPage.getWebviewFrame();

    // Switch to the Log tab
    const logTab = frame.locator('.lm_tab:has-text("Log")');
    await logTab.waitFor({ state: 'visible', timeout: 15_000 });
    await logTab.click();

    // Tune a parameter
    const slider = frame.locator('[data-testid="slider-input-direction"]');
    await slider.waitFor({ state: 'visible', timeout: 10_000 });
    await slider.fill('60');

    const entries = frame.locator('.log-panel__entry');
    await entries.first().waitFor({ state: 'visible', timeout: 5_000 });

    await page.screenshot({
      path: `${EVIDENCE_DIR}/vscode-log-tuned-entry.png`,
      fullPage: false,
    });
  });
});
