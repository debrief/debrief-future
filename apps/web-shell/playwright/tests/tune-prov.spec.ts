/**
 * E2E tests for the PROV tuning workflow in the web-shell.
 *
 * Tests the end-to-end flow of:
 * 1. Loading a plot and selecting an annotation shape
 * 2. Running move-shape tool (defaults: 5 km at 90°)
 * 3. Switching to the Log tab to view the entry
 * 4. Tuning the distance parameter via inline parameter editor
 * 5. Tuning the direction parameter
 * 6. Verifying tune annotations appear on the log entry
 *
 * Feature: 076-replay-tune
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';

/**
 * Helper: select the Weapons-Hold Zone Charlie rectangle via the feature list.
 * This is a RECTANGLE annotation in exercise-alpha that move-shape can operate on.
 */
async function selectRectangleViaFeatureList(page: import('@playwright/test').Page) {
  const featureRow = page.locator('.debrief-feature-row:has-text("Weapons-Hold Zone Charlie")');
  if ((await featureRow.count()) > 0) {
    await featureRow.click();
  } else {
    // Fallback: try selecting by the id
    const fallbackRow = page.locator('.debrief-feature-row:has-text("rect-exercise-area")');
    await fallbackRow.click();
  }
  await page.waitForTimeout(200);
}

/**
 * Helper: run the Move Shape tool from the tools panel.
 */
async function runMoveShapeTool(page: import('@playwright/test').Page) {
  const moveTool = page.locator(
    '.debrief-tools-panel__item--active:has-text("Move Shape")'
  );
  await expect(moveTool).toBeVisible({ timeout: 5000 });
  const runButton = moveTool.locator('button');
  await runButton.click();
}

test.describe('PROV Tuning (move-shape)', () => {
  let catalogPage: CatalogPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    analysisPage = new AnalysisPage(page);

    await catalogPage.goto();
    await catalogPage.waitForLoad();

    // Open Exercise Alpha
    analysisPage = await catalogPage.openFirstItem();
    await analysisPage.waitForLoad();
  });

  test('move-shape tool appears when annotation is selected', async ({ page }) => {
    await selectRectangleViaFeatureList(page);

    // Move Shape should be listed as an active tool
    const moveTool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Move Shape")'
    );
    await expect(moveTool).toBeVisible({ timeout: 5000 });
  });

  test('running move-shape creates log entry with tunable parameters', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // Should have exactly 1 log entry
    const entryCount = await analysisPage.getLogEntryCount();
    expect(entryCount).toBe(1);

    // The entry should show 'move-shape' as the tool name
    const entry = analysisPage.logEntries.first();
    await expect(entry.locator('.log-panel__entry-tool')).toHaveText('move-shape');

    // Should show tunable parameters (distance_km and direction)
    const paramKeys = entry.locator('.log-panel__entry-param-key');
    await expect(paramKeys.first()).toBeVisible();
    const paramTexts = await paramKeys.allTextContents();
    expect(paramTexts).toContain('distance_km:');
    expect(paramTexts).toContain('direction:');

    // Parameter values should be clickable (tunable class applied)
    const tunableValues = entry.locator(
      '.log-panel__entry-param-value--tunable'
    );
    await expect(tunableValues.first()).toBeVisible();
    const tunableCount = await tunableValues.count();
    expect(tunableCount).toBe(2); // distance_km and direction
  });

  test('tuning distance parameter updates entry and shows annotation', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // Click the distance_km tunable parameter value to trigger tune
    const distanceParam = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceParam).toBeVisible();
    await expect(distanceParam).toHaveText('5');

    // Set up dialog handler BEFORE clicking — supply new value
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('distance_km');
      await dialog.accept('10');
    });

    await distanceParam.click();

    // After tuning, the parameter value should update to 10
    await expect(distanceParam).toHaveText('10');

    // A tune notification should appear
    const notification = page.getByTestId('log-panel-notification');
    await expect(notification).toBeVisible({ timeout: 3000 });
    await expect(notification).toContainText('Tuned');
    await expect(notification).toContainText('distance_km');

    // The entry should now have a tuned badge
    const tunedBadge = entry.locator('[data-testid="badge-tuned"]');
    await expect(tunedBadge).toBeVisible();
  });

  test('tuning direction parameter updates entry', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // Click the direction tunable parameter
    const directionParam = entry.locator('[data-testid="tune-param-direction"]');
    await expect(directionParam).toBeVisible();
    await expect(directionParam).toHaveText('90');

    // Supply new value via dialog
    page.once('dialog', async (dialog) => {
      await dialog.accept('180');
    });

    await directionParam.click();

    // After tuning, value should update to 180
    await expect(directionParam).toHaveText('180');

    // Tuned badge should appear
    const tunedBadge = entry.locator('[data-testid="badge-tuned"]');
    await expect(tunedBadge).toBeVisible();
  });

  test('repeated tuning updates the tune annotation', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // First tune: change distance to 10
    const distanceParam = entry.locator('[data-testid="tune-param-distance_km"]');
    page.once('dialog', async (dialog) => {
      await dialog.accept('10');
    });
    await distanceParam.click();
    await expect(distanceParam).toHaveText('10');

    // Tuned badge visible
    await expect(entry.locator('[data-testid="badge-tuned"]')).toBeVisible();

    // Second tune: change direction to 270
    const directionParam = entry.locator('[data-testid="tune-param-direction"]');
    page.once('dialog', async (dialog) => {
      await dialog.accept('270');
    });
    await directionParam.click();
    await expect(directionParam).toHaveText('270');

    // Tuned badge still visible
    await expect(entry.locator('[data-testid="badge-tuned"]')).toBeVisible();
  });

  test('cancelling tune prompt does not change the entry', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    const distanceParam = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceParam).toHaveText('5');

    // Dismiss the dialog (cancel)
    page.once('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await distanceParam.click();

    // Value should remain unchanged
    await expect(distanceParam).toHaveText('5');

    // No tuned badge should appear
    await expect(entry.locator('[data-testid="badge-tuned"]')).not.toBeVisible();
  });
});
