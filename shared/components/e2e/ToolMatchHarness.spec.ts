/**
 * Playwright e2e tests for ToolMatchHarness.
 *
 * Tests interaction flows and captures screenshots for documentation.
 */

import { test, expect } from '@playwright/test';

const STORY_URL = '/iframe.html?id=toolmatch-harness--default';
const TWO_TRACKS_URL = '/iframe.html?id=toolmatch-harness--two-tracks-selected';
const TRACK_AND_POINT_URL = '/iframe.html?id=toolmatch-harness--track-and-point';
const SHOW_INACTIVE_URL = '/iframe.html?id=toolmatch-harness--show-inactive';

test.describe('ToolMatchHarness', () => {
  test.describe('Initial State', () => {
    test('should show only Global Statistics as active', async ({ page }) => {
      await page.goto(STORY_URL);

      // Wait for the component to load
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Check that Global Statistics is active
      const globalStats = page.locator('[data-testid="tool-global-statistics"]');
      await expect(globalStats).toHaveAttribute('data-active', 'true');

      // Check that other tools are not visible (toggle is off by default)
      const rangeCalc = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalc).not.toBeVisible();
    });

    test('should show "0 selected" in features panel', async ({ page }) => {
      await page.goto(STORY_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      const countText = page.locator('.tool-match-harness__count').first();
      await expect(countText).toContainText('0 selected');
    });
  });

  test.describe('Selection Interaction', () => {
    test('selecting 2 tracks should activate Range Calculation', async ({ page }) => {
      await page.goto(STORY_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Enable show inactive to see all tools
      await page.click('[data-testid="show-inactive-checkbox"]');

      // Select two tracks
      await page.click('[data-testid="checkbox-track-1"]');
      await page.click('[data-testid="checkbox-track-2"]');

      // Check Range Calculation is active
      const rangeCalc = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalc).toHaveAttribute('data-active', 'true');

      // Check Track Summary is also active
      const trackSummary = page.locator('[data-testid="tool-track-summary"]');
      await expect(trackSummary).toHaveAttribute('data-active', 'true');
    });

    test('selecting 1 track + 1 point should activate Bearing to Point', async ({ page }) => {
      await page.goto(STORY_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Enable show inactive
      await page.click('[data-testid="show-inactive-checkbox"]');

      // Select one track and one point
      await page.click('[data-testid="checkbox-track-1"]');
      await page.click('[data-testid="checkbox-ref-1"]');

      // Check Bearing to Point is active
      const bearingToPoint = page.locator('[data-testid="tool-bearing-to-point"]');
      await expect(bearingToPoint).toHaveAttribute('data-active', 'true');
    });

    test('deselecting all should return to initial state', async ({ page }) => {
      await page.goto(TWO_TRACKS_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Verify initial state has 2 tracks selected
      const countText = page.locator('.tool-match-harness__count').first();
      await expect(countText).toContainText('2 selected');

      // Clear all tracks
      await page.click('[data-testid="clear-track"]');

      // Check count is back to 0
      await expect(countText).toContainText('0 selected');
    });
  });

  test.describe('Show Inactive Toggle', () => {
    test('toggling show inactive should reveal all tools with explanations', async ({ page }) => {
      await page.goto(STORY_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Initially, Range Calculation should not be visible
      const rangeCalcBefore = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalcBefore).not.toBeVisible();

      // Enable show inactive
      await page.click('[data-testid="show-inactive-checkbox"]');

      // Now Range Calculation should be visible
      const rangeCalcAfter = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalcAfter).toBeVisible();

      // Check it has an explanation
      const explanation = page.locator('[data-testid="explanation-range-calculation"]');
      await expect(explanation).toBeVisible();
      await expect(explanation).toContainText('track');
    });

    test('toggling off should hide inactive tools again', async ({ page }) => {
      await page.goto(SHOW_INACTIVE_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Initially all tools visible
      const rangeCalcBefore = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalcBefore).toBeVisible();

      // Disable show inactive
      await page.click('[data-testid="show-inactive-checkbox"]');

      // Range Calculation should be hidden (it's inactive with 1 track)
      const rangeCalcAfter = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalcAfter).not.toBeVisible();
    });
  });

  test.describe('Story Variants', () => {
    test('TwoTracksSelected story should have Range Calculation active', async ({ page }) => {
      await page.goto(TWO_TRACKS_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Enable show inactive to verify state
      await page.click('[data-testid="show-inactive-checkbox"]');

      const rangeCalc = page.locator('[data-testid="tool-range-calculation"]');
      await expect(rangeCalc).toHaveAttribute('data-active', 'true');
    });

    test('TrackAndPoint story should have Bearing to Point active', async ({ page }) => {
      await page.goto(TRACK_AND_POINT_URL);
      await page.waitForSelector('[data-testid="tool-match-harness"]');

      // Enable show inactive to verify state
      await page.click('[data-testid="show-inactive-checkbox"]');

      const bearingToPoint = page.locator('[data-testid="tool-bearing-to-point"]');
      await expect(bearingToPoint).toHaveAttribute('data-active', 'true');
    });
  });
});

test.describe('Screenshot Capture', () => {
  test('capture empty selection state', async ({ page }) => {
    await page.goto(STORY_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');
    await page.waitForTimeout(500); // Allow animations to settle

    await page.screenshot({
      path: 'screenshots/tool-match-empty-selection.png',
      fullPage: false,
    });
  });

  test('capture two tracks selected', async ({ page }) => {
    await page.goto(TWO_TRACKS_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/tool-match-two-tracks.png',
      fullPage: false,
    });
  });

  test('capture show inactive toggle enabled', async ({ page }) => {
    await page.goto(SHOW_INACTIVE_URL);
    await page.waitForSelector('[data-testid="tool-match-harness"]');
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'screenshots/tool-match-show-inactive.png',
      fullPage: false,
    });
  });
});
