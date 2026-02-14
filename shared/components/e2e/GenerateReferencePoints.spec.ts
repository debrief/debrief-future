/**
 * Playwright e2e test for generate-reference-points tool matching.
 *
 * Verifies that selecting a RECTANGLE activates the Generate Reference Points tool,
 * and that deselecting it returns the tool to inactive state.
 */

import { test, expect } from '@playwright/test';

const RECTANGLE_SELECTED_URL = '/iframe.html?id=toolmatch-harness--rectangle-selected';
const DEFAULT_URL = '/iframe.html?id=toolmatch-harness--default';

test.describe('Generate Reference Points Tool Matching', () => {
  test('selecting a rectangle should activate Generate Reference Points', async ({ page }) => {
    await page.goto(DEFAULT_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');

    // Enable show inactive to see all tools
    await page.click('[data-testid="show-inactive-checkbox"]');

    // Verify Generate Reference Points is initially inactive
    const genRefPoints = page.locator('[data-testid="tool-generate-reference-points"]');
    await expect(genRefPoints).toBeVisible();
    await expect(genRefPoints).toHaveAttribute('data-active', 'false');

    // Select the rectangle
    await page.click('[data-testid="checkbox-rect-1"]');

    // Verify Generate Reference Points is now active
    await expect(genRefPoints).toHaveAttribute('data-active', 'true');
  });

  test('RectangleSelected story should have Generate Reference Points active', async ({ page }) => {
    await page.goto(RECTANGLE_SELECTED_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');

    // Tool should be visible and active (show inactive is on in this story)
    const genRefPoints = page.locator('[data-testid="tool-generate-reference-points"]');
    await expect(genRefPoints).toBeVisible();
    await expect(genRefPoints).toHaveAttribute('data-active', 'true');

    // Global Statistics should also be active (no requirements)
    const globalStats = page.locator('[data-testid="tool-global-statistics"]');
    await expect(globalStats).toHaveAttribute('data-active', 'true');

    // Track-specific tools should be inactive
    const rangeCalc = page.locator('[data-testid="tool-range-calculation"]');
    await expect(rangeCalc).toHaveAttribute('data-active', 'false');
  });

  test('deselecting rectangle should deactivate Generate Reference Points', async ({ page }) => {
    await page.goto(RECTANGLE_SELECTED_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');

    // Verify initially active
    const genRefPoints = page.locator('[data-testid="tool-generate-reference-points"]');
    await expect(genRefPoints).toHaveAttribute('data-active', 'true');

    // Deselect the rectangle
    await page.click('[data-testid="checkbox-rect-1"]');

    // Verify now inactive
    await expect(genRefPoints).toHaveAttribute('data-active', 'false');
  });
});

test.describe('Screenshot Capture', () => {
  test('capture rectangle selected state', async ({ page }) => {
    await page.goto(RECTANGLE_SELECTED_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/tool-match-rectangle-selected.png',
      fullPage: false,
    });
  });
});
