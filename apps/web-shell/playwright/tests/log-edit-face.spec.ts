/**
 * E2E tests for log panel edit face (flip card) — verifying that clicking
 * the edit icon on a log entry shows editable parameters, not a loading
 * skeleton that hangs indefinitely.
 *
 * Feature: 113-prov-card-flip
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

/** Helper: select the Weapons-Hold Zone Charlie rectangle via the feature list. */
async function selectRectangleViaFeatureList(page: import('@playwright/test').Page) {
  const featureRow = page.locator('.debrief-feature-row:has-text("Weapons-Hold Zone Charlie")');
  if ((await featureRow.count()) > 0) {
    await featureRow.click();
  } else {
    const fallbackRow = page.locator('.debrief-feature-row:has-text("rect-exercise-area")');
    await fallbackRow.click();
  }
  await page.waitForTimeout(200);
}

/** Helper: run the Move Shape tool from the tools panel. */
async function runMoveShapeTool(page: import('@playwright/test').Page) {
  const moveTool = page.locator(
    '.debrief-tools-panel__item--active:has-text("Move Shape")'
  );
  await expect(moveTool).toBeVisible({ timeout: 5000 });
  const runButton = moveTool.locator('button');
  await runButton.click();
}

test.describe('Log Panel Edit Face', () => {
  let catalogPage: CatalogPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    analysisPage = new AnalysisPage(page);

    await catalogPage.goto();
    await catalogPage.waitForLoad();
    analysisPage = await catalogPage.openFirstItem();
    await analysisPage.waitForLoad();
    await collapsePropertiesSection(page);
  });

  test('clicking edit icon shows parameter editors, not skeleton loader', async ({ page }) => {
    // Create a log entry by running move-shape
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    await expect(entry).toBeVisible();

    // Click the edit (pencil) icon to flip to edit face
    const editIcon = entry.locator('[data-testid^="edit-icon-"]');
    await editIcon.click();

    // The edit face should appear
    const editFace = page.getByTestId('edit-face');
    await expect(editFace).toBeVisible({ timeout: 3000 });

    // Parameter editors should load (not a skeleton loader)
    const params = page.getByTestId('edit-face-params');
    await expect(params).toBeVisible({ timeout: 3000 });

    // Skeleton loader should NOT be visible
    const skeleton = page.getByTestId('skeleton-loader');
    await expect(skeleton).not.toBeVisible();

    // At least one slider control should be present (move-shape has bounded
    // numeric params: direction and distance_km → rendered as SliderControl)
    const sliders = page.locator('[data-testid^="slider-"]');
    const sliderCount = await sliders.count();
    expect(sliderCount).toBeGreaterThan(0);

    // Done button should be available
    const doneButton = page.getByTestId('edit-face-done');
    await expect(doneButton).toBeVisible();
  });

  test('edit face sliders show correct initial values and can be closed', async ({ page }) => {
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await analysisPage.switchToLogTab();

    const entry = analysisPage.logEntries.first();
    const editIcon = entry.locator('[data-testid^="edit-icon-"]');
    await editIcon.click();

    // Wait for edit face with parameters
    const params = page.getByTestId('edit-face-params');
    await expect(params).toBeVisible({ timeout: 3000 });

    // Verify direction slider shows initial value (90)
    const directionSlider = page.getByTestId('slider-direction');
    await expect(directionSlider).toBeVisible();
    const directionReadout = page.getByTestId('slider-readout-direction');
    await expect(directionReadout).toContainText('90');

    // Verify distance_km slider shows initial value (5)
    const distanceSlider = page.getByTestId('slider-distance_km');
    await expect(distanceSlider).toBeVisible();
    const distanceReadout = page.getByTestId('slider-readout-distance_km');
    await expect(distanceReadout).toContainText('5');

    // Close the edit face
    const doneButton = page.getByTestId('edit-face-done');
    await doneButton.click();

    // Edit face should disappear after clicking Done
    const editFace = page.getByTestId('edit-face');
    await expect(editFace).not.toBeVisible({ timeout: 2000 });
  });
});
