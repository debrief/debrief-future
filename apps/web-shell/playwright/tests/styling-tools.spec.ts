/**
 * Playwright tests for styling tool integration (Feature #052).
 *
 * Verifies that the 4 TypeScript styling tools (set-track-color, apply-symbol-style,
 * label-interval, symbol-interval) are visible, activate on track selection,
 * and execute successfully in the web-shell.
 */

import { test, expect } from '@playwright/test';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';
import { clickVirtualisedRow } from '../helpers/clickVirtualisedRow';

const STYLING_TOOL_NAMES = [
  'Set Track Color',
  'Apply Symbol Style',
  'Label Interval',
  'Symbol Interval',
];

/**
 * Helper: select a track feature via the feature list sidebar.
 * Uses the feature list rather than map clicks because the first
 * .leaflet-interactive element may be a non-track shape (polygon, circle).
 */
async function selectTrackViaFeatureList(page: import('@playwright/test').Page) {
  const featureRow = page.locator('.debrief-feature-row:has-text("HMS Defender")');
  // Fall back to first feature row if name not found
  const target = (await featureRow.count()) > 0
    ? featureRow
    : page.locator('.debrief-feature-row').first();
  // Click the content area to avoid the expand button (stopPropagation).
  // Scroll into view first — the virtualised list sits in a scrollable
  // ActivityPanel column, so the row may be out of view at short viewports.
  // Virtualised list in a scrollable column — centre + force-click (see helper).
  await clickVirtualisedRow(page, target.locator('.debrief-feature-row__content'));
  await page.waitForTimeout(200);
}

test.describe('Styling Tools Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open a plot via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    // Wait for map features to render
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({
      timeout: 5000,
    });
    await collapsePropertiesSection(page);
  });

  test('tools panel lists all 14 tools (2 built-in + 4 styling + 1 shape + 2 reference + 1 sensor + 1 track-manipulation + 3 analysis)', async ({ page }) => {
    const toolItems = page.locator('.debrief-tools-panel__item');
    await expect(toolItems).toHaveCount(14);
  });

  test('styling tools are listed by name', async ({ page }) => {
    for (const name of STYLING_TOOL_NAMES) {
      const tool = page.locator(`.debrief-tools-panel__item:has-text("${name}")`);
      await expect(tool).toBeVisible();
    }
  });

  test('styling tools are inactive without selection', async ({ page }) => {
    // With no track selected, styling tools should be inactive
    for (const name of STYLING_TOOL_NAMES) {
      const tool = page.locator(
        `.debrief-tools-panel__item--inactive:has-text("${name}")`
      );
      await expect(tool).toBeVisible();
    }
  });

  test('styling tools activate when a track is selected', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);

    // All 4 styling tools should now be active
    for (const name of STYLING_TOOL_NAMES) {
      const tool = page.locator(
        `.debrief-tools-panel__item--active:has-text("${name}")`
      );
      await expect(tool).toBeVisible({ timeout: 2000 });
    }
  });

  test('running Set Track Color shows result message', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Set Track Color")')
    ).toBeVisible({ timeout: 2000 });

    // Click the Set Track Color tool — opens ParameterCollector context menu
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Set Track Color")'
    );
    await tool.click();

    // Select the first color from the context menu
    const contextMenu = page.locator('.debrief-context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });
    await contextMenu.locator('.debrief-context-menu__item').first().click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Label Interval shows result message', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Label Interval")')
    ).toBeVisible({ timeout: 2000 });

    // Click the Label Interval tool — opens ParameterCollector context menu
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Label Interval")'
    );
    await tool.click();

    // Select the first duration preset from the context menu
    const contextMenu = page.locator('.debrief-context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });
    await contextMenu.locator('.debrief-context-menu__item').first().click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Symbol Interval shows result message', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Symbol Interval")')
    ).toBeVisible({ timeout: 2000 });

    // Click the Symbol Interval tool — opens ParameterCollector context menu
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Symbol Interval")'
    );
    await tool.click();

    // Select the first duration preset from the context menu
    const contextMenu = page.locator('.debrief-context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });
    await contextMenu.locator('.debrief-context-menu__item').first().click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Apply Symbol Style shows result message', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Apply Symbol Style")')
    ).toBeVisible({ timeout: 2000 });

    // Click the Apply Symbol Style tool — opens ParameterCollector context menu
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Apply Symbol Style")'
    );
    await tool.click();

    // Select the first symbol from the context menu
    const contextMenu = page.locator('.debrief-context-menu');
    await expect(contextMenu).toBeVisible({ timeout: 2000 });
    await contextMenu.locator('.debrief-context-menu__item').first().click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('styling tools show explanation when no tracks selected', async ({
    page,
  }) => {
    // Styling tools should show explanation for why they're inactive
    const inactiveTool = page.locator(
      '.debrief-tools-panel__item--inactive:has-text("Set Track Color")'
    );
    await expect(inactiveTool).toBeVisible();

    // The title attribute should contain the explanation
    const title = await inactiveTool.getAttribute('title');
    expect(title?.toLowerCase()).toContain('track');
  });

  test('selecting via feature list activates styling tools', async ({
    page,
  }) => {
    // Click on the first feature row (which is a track)
    await selectTrackViaFeatureList(page);

    // Styling tools should be active
    const activeStylingTool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Set Track Color")'
    );
    await expect(activeStylingTool).toBeVisible({ timeout: 2000 });
  });

  test('clearing selection deactivates styling tools', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);

    // Verify tools are active
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Set Track Color")')
    ).toBeVisible({ timeout: 2000 });

    // Clear selection by clicking map background
    await page.locator('.leaflet-container').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(200);

    // Styling tools should be inactive again
    await expect(
      page.locator('.debrief-tools-panel__item--inactive:has-text("Set Track Color")')
    ).toBeVisible({ timeout: 2000 });
  });
});
