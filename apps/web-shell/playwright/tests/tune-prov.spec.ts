/**
 * E2E tests for the PROV tuning workflow in the web-shell.
 *
 * Tests the end-to-end flow of:
 * 1. Loading a plot and selecting an annotation shape
 * 2. Running move-shape tool (defaults: 5 km at 90°)
 * 3. Switching to the Log tab to view the entry
 * 4. Opening the edit face and tuning via slider controls
 * 5. Verifying tune annotations appear on the log entry
 *
 * Feature: 076-replay-tune
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

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

/**
 * Helper: open the edit face for a log entry and wait for slider controls.
 */
async function openEditFace(
  page: import('@playwright/test').Page,
  entry: import('@playwright/test').Locator
) {
  const editIcon = entry.locator('[data-testid^="edit-icon-"]');
  await editIcon.click();
  const params = page.getByTestId('edit-face-params');
  await expect(params).toBeVisible({ timeout: 3000 });
}

/**
 * Helper: set a slider to a new value by evaluating on the input element.
 * Uses native input setter + React-compatible event dispatch.
 */
async function setSliderValue(
  page: import('@playwright/test').Page,
  paramName: string,
  newValue: number
) {
  const sliderInput = page.getByTestId(`slider-input-${paramName}`);
  await sliderInput.fill(String(newValue));
  // Wait for debounce (300ms) + processing time
  await page.waitForTimeout(500);
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
    await collapsePropertiesSection(page);
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

    // Should show parameter chips for distance_km and direction (Feature 176: rich card)
    const chips = entry.locator('.log-panel__chip');
    await expect(chips.first()).toBeVisible();
    const chipNames = entry.locator('.log-panel__chip-name');
    const chipTexts = await chipNames.allTextContents();
    expect(chipTexts).toContain('distance_km');
    expect(chipTexts).toContain('direction');

    // Both parameter chips should be visible
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);
  });

  test('tuning distance parameter via edit face updates entry and shows annotation', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // Open the edit face
    await openEditFace(page, entry);

    // Verify initial distance value
    const distanceReadout = page.getByTestId('slider-readout-distance_km');
    await expect(distanceReadout).toContainText('5');

    // Tune distance_km to 10 via slider
    await setSliderValue(page, 'distance_km', 10);

    // Close edit face
    await page.getByTestId('edit-face-done').click();
    await page.waitForTimeout(200);

    // After tuning, the display face parameter chip value should update to 10
    const distanceChipValue = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceChipValue).toContainText('10');

    // A tune notification should appear
    const notification = page.getByTestId('log-panel-notification');
    await expect(notification).toBeVisible({ timeout: 3000 });
    await expect(notification).toContainText('Tuned');
    await expect(notification).toContainText('distance_km');

    // The entry should now have a tuned badge
    const tunedBadge = entry.locator('[data-testid="badge-tuned"]');
    await expect(tunedBadge).toBeVisible();
  });

  test('tuning direction parameter via edit face updates entry', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // Open edit face
    await openEditFace(page, entry);

    // Verify initial direction value
    const directionReadout = page.getByTestId('slider-readout-direction');
    await expect(directionReadout).toContainText('90');

    // Tune direction to 180 via slider
    await setSliderValue(page, 'direction', 180);

    // Close edit face
    await page.getByTestId('edit-face-done').click();
    await page.waitForTimeout(200);

    // After tuning, display face chip value should update to 180
    const directionChipValue = entry.locator('[data-testid="tune-param-direction"]');
    await expect(directionChipValue).toContainText('180');

    // Tuned badge should appear
    const tunedBadge = entry.locator('[data-testid="badge-tuned"]');
    await expect(tunedBadge).toBeVisible();
  });

  test('repeated tuning via edit face updates the tune annotation', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();

    // First tune: change distance to 10
    await openEditFace(page, entry);
    await setSliderValue(page, 'distance_km', 10);
    await page.getByTestId('edit-face-done').click();
    await page.waitForTimeout(200);

    const distanceChipValue = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceChipValue).toContainText('10');

    // Tuned badge visible
    await expect(entry.locator('[data-testid="badge-tuned"]')).toBeVisible();

    // Second tune: change direction to 270
    await openEditFace(page, entry);
    await setSliderValue(page, 'direction', 270);
    await page.getByTestId('edit-face-done').click();
    await page.waitForTimeout(200);

    const directionChipValue = entry.locator('[data-testid="tune-param-direction"]');
    await expect(directionChipValue).toContainText('270');

    // Tuned badge still visible
    await expect(entry.locator('[data-testid="badge-tuned"]')).toBeVisible();
  });

  test('display face parameter click does not trigger tune', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    const distanceChipValue = entry.locator('[data-testid="tune-param-distance_km"]');
    await expect(distanceChipValue).toContainText('5');

    // Click the display face parameter chip — should NOT trigger tune
    await distanceChipValue.click();
    await page.waitForTimeout(500);

    // Value should remain unchanged
    await expect(distanceChipValue).toContainText('5');

    // No tuned badge should appear
    await expect(entry.locator('[data-testid="badge-tuned"]')).not.toBeVisible();
  });
});
