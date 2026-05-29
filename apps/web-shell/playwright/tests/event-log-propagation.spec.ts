/**
 * E2E tests for event log propagation — verifying that amending an earlier
 * event causes all subsequent events to be re-applied.
 *
 * Scenario:
 *   1. Select an annotation shape, record its original coordinates
 *   2. Apply move-shape tool (5 km East) — first event
 *   3. Apply move-shape tool (5 km East) — second event
 *   4. Amend the first event via edit-face slider: change direction from
 *      90° (East) to 270° (West)
 *   5. Verify the second event was re-applied, so the shape ends up at
 *      approximately its original position (5 km West + 5 km East ≈ 0 net)
 *
 * If propagation is broken, only the first event is replayed and the second
 * is lost, leaving the shape ~5 km west of its original position.
 *
 * Feature: 076-replay-tune (event log propagation)
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
 * Helper: set a slider to a new value.
 */
async function setSliderValue(
  page: import('@playwright/test').Page,
  paramName: string,
  newValue: number
) {
  const sliderInput = page.getByTestId(`slider-input-${paramName}`);
  await sliderInput.fill(String(newValue));
  // Wait for debounce (300ms) + processing
  await page.waitForTimeout(500);
}

/**
 * Read the first coordinate of the rectangle feature from the plot state.
 * Returns [lon, lat] of the first vertex of the first ring.
 */
async function getRectangleFirstCoord(page: import('@playwright/test').Page): Promise<[number, number]> {
  return await page.evaluate(() => {
    const features = window.__currentPlotFeatures ?? [];
    const rect = features.find(
      (f: { properties?: Record<string, unknown> | null }) =>
        f.properties?.kind === 'RECTANGLE'
    );
    if (!rect) throw new Error('RECTANGLE feature not found');
    const geom = rect.geometry as { coordinates: number[][][] };
    const firstCoord = geom.coordinates[0]![0]!;
    return [firstCoord[0]!, firstCoord[1]!] as [number, number];
  });
}

test.describe('Event Log Propagation', () => {
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

  test('amending first move event re-applies subsequent move events', async ({ page }) => {
    // Step 1: Select the rectangle annotation and record original coordinates
    await selectRectangleViaFeatureList(page);
    const originalCoord = await getRectangleFirstCoord(page);

    // Step 2: Run move-shape tool (default: 5 km at 90° / East)
    await runMoveShapeTool(page);
    await page.waitForTimeout(300);

    // The shape is now selected; it was moved. Read moved coordinates.
    const afterFirstMove = await getRectangleFirstCoord(page);
    // Verify the shape actually moved East (longitude increased)
    expect(afterFirstMove[0]).toBeGreaterThan(originalCoord[0]);

    // Step 3: Re-select to ensure the moved shape is selected, then run again
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await page.waitForTimeout(300);

    const afterSecondMove = await getRectangleFirstCoord(page);
    // Should have moved further East
    expect(afterSecondMove[0]).toBeGreaterThan(afterFirstMove[0]);

    // Step 4: Switch to Log tab — should have 2 entries
    await analysisPage.switchToLogTab();
    const entryCount = await analysisPage.getLogEntryCount();
    expect(entryCount).toBe(2);

    // The older entry (first move) is at index 1 (entries are newest-first)
    const olderEntry = analysisPage.logEntries.nth(1);
    await expect(olderEntry).toBeVisible();

    // Step 5: Tune the older entry's direction from 90 (East) to 270 (West) via edit face
    await openEditFace(page, olderEntry);
    await setSliderValue(page, 'direction', 270);

    // Close edit face
    // Only one edit face is visible at a time (CSS backface-visibility).
    // Use the visible edit-face container to scope the Done button.
    await page.locator('.card-flip__inner--flipped [data-testid="edit-face-done"]').click();
    await page.waitForTimeout(200);

    // Verify parameter chip value updated on display face
    const directionChipValue = olderEntry.locator('[data-testid="tune-param-direction"]');
    await expect(directionChipValue).toContainText('270');

    // Allow time for the tune handler to re-execute and propagate
    await page.waitForTimeout(500);

    // Step 6: Switch back to Activity tab to ensure features are refreshed
    await analysisPage.switchToActivityTab();
    await page.waitForTimeout(200);

    // Step 7: Read the final coordinates
    const finalCoord = await getRectangleFirstCoord(page);

    // If propagation works correctly:
    //   First move: 5 km West (270°) from original
    //   Second move: 5 km East (90°) — re-applied
    //   Net displacement ≈ 0 — shape should be near original position
    //
    // If propagation is BROKEN:
    //   Only first move is re-applied (5 km West from original)
    //   Second move is lost
    //   Shape ends up ~5 km west of original
    //
    // Tolerance: 0.005° ≈ 0.5 km (accounts for spherical geometry imprecision)
    const lonDiff = Math.abs(finalCoord[0] - originalCoord[0]);
    const latDiff = Math.abs(finalCoord[1] - originalCoord[1]);

    expect(lonDiff).toBeLessThan(0.005);
    expect(latDiff).toBeLessThan(0.005);
  });

  test('both log entries remain after tuning first entry', async ({ page }) => {
    // Run two move operations
    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await page.waitForTimeout(300);

    await selectRectangleViaFeatureList(page);
    await runMoveShapeTool(page);
    await page.waitForTimeout(300);

    // Switch to Log tab
    await analysisPage.switchToLogTab();
    expect(await analysisPage.getLogEntryCount()).toBe(2);

    // Tune the older entry's direction via edit face
    const olderEntry = analysisPage.logEntries.nth(1);
    await openEditFace(page, olderEntry);
    await setSliderValue(page, 'direction', 0);
    // Only one edit face is visible at a time (CSS backface-visibility).
    // Use the visible edit-face container to scope the Done button.
    await page.locator('.card-flip__inner--flipped [data-testid="edit-face-done"]').click();
    await page.waitForTimeout(200);

    const directionChipValue = olderEntry.locator('[data-testid="tune-param-direction"]');
    await expect(directionChipValue).toContainText('0');

    // Both entries should still exist after tuning
    expect(await analysisPage.getLogEntryCount()).toBe(2);

    // The newer entry (second move) should still show its original params
    const newerEntry = analysisPage.logEntries.nth(0);
    const newerDirectionChip = newerEntry.locator('[data-testid="tune-param-direction"]');
    await expect(newerDirectionChip).toContainText('90');
  });
});
