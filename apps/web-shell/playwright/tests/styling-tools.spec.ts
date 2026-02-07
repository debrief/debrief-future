/**
 * Playwright tests for styling tool integration (Feature #052).
 *
 * Verifies that the 4 TypeScript styling tools (set-track-color, apply-symbol-style,
 * label-interval, symbol-interval) are visible, activate on track selection,
 * and execute successfully in the web-shell.
 */

import { test, expect } from '@playwright/test';

const STYLING_TOOL_NAMES = [
  'Set Track Color',
  'Apply Symbol Style',
  'Label Interval',
  'Symbol Interval',
];

test.describe('Styling Tools Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open a plot via catalog timeline
    await page
      .locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point')
      .first()
      .dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    // Wait for map features to render
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('tools panel lists all 6 tools (2 built-in + 4 styling)', async ({ page }) => {
    const toolItems = page.locator('.debrief-tools-panel__item');
    await expect(toolItems).toHaveCount(6);
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
    // Select a track on the map
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await page.waitForTimeout(100);

    // All 4 styling tools should now be active
    for (const name of STYLING_TOOL_NAMES) {
      const tool = page.locator(
        `.debrief-tools-panel__item--active:has-text("${name}")`
      );
      await expect(tool).toBeVisible({ timeout: 2000 });
    }
  });

  test('running Set Track Color shows result message', async ({ page }) => {
    // Select a track
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await expect(
      page.locator('.debrief-tools-panel__item--active').first()
    ).toBeVisible({ timeout: 2000 });

    // Find and click the Set Track Color tool
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Set Track Color")'
    );
    await tool.click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Label Interval shows result message', async ({ page }) => {
    // Select a track
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await expect(
      page.locator('.debrief-tools-panel__item--active').first()
    ).toBeVisible({ timeout: 2000 });

    // Find and click the Label Interval tool
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Label Interval")'
    );
    await tool.click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Symbol Interval shows result message', async ({ page }) => {
    // Select a track
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await expect(
      page.locator('.debrief-tools-panel__item--active').first()
    ).toBeVisible({ timeout: 2000 });

    // Find and click the Symbol Interval tool
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Symbol Interval")'
    );
    await tool.click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('result');
  });

  test('running Apply Symbol Style shows result message', async ({ page }) => {
    // Select a track
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await expect(
      page.locator('.debrief-tools-panel__item--active').first()
    ).toBeVisible({ timeout: 2000 });

    // Find and click the Apply Symbol Style tool
    const tool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Apply Symbol Style")'
    );
    await tool.click();

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
    expect(title).toContain('track');
  });

  test('selecting via feature list also activates styling tools', async ({
    page,
  }) => {
    // Click on a feature row in the layers panel instead of the map
    const featureRow = page.locator('.debrief-feature-row').first();
    await featureRow.click();
    await page.waitForTimeout(100);

    // Styling tools should be active (feature row selects a track)
    const activeStylingTool = page.locator(
      '.debrief-tools-panel__item--active:has-text("Set Track Color")'
    );
    await expect(activeStylingTool).toBeVisible({ timeout: 2000 });
  });

  test('clearing selection deactivates styling tools', async ({ page }) => {
    // Select a track
    await page.locator('.leaflet-interactive').first().click({ force: true });
    await page.waitForTimeout(100);

    // Verify tools are active
    await expect(
      page.locator('.debrief-tools-panel__item--active:has-text("Set Track Color")')
    ).toBeVisible({ timeout: 2000 });

    // Clear selection by clicking map background
    await page.locator('.leaflet-container').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    // Styling tools should be inactive again
    await expect(
      page.locator('.debrief-tools-panel__item--inactive:has-text("Set Track Color")')
    ).toBeVisible({ timeout: 2000 });
  });
});
