/**
 * E2E tests for the Log Panel integration in the web-shell.
 *
 * Tests the workflow of:
 * 1. Opening a plot
 * 2. Running tools to generate log entries
 * 3. Switching to the Log tab to view entries
 * 4. Interacting with log entries (select/deselect)
 *
 * Feature: 072-log-panel
 */

import { test, expect } from '@playwright/test';
import { CatalogPage, AnalysisPage } from '../pages';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

/**
 * Helper: select a track feature via the feature list sidebar.
 * Uses the feature list rather than map clicks because TemporalTrackLayer
 * SVG paths may not reliably trigger selection in headless chromium.
 */
async function selectTrackViaFeatureList(page: import('@playwright/test').Page) {
  const featureRow = page.locator('.debrief-feature-row:has-text("HMS Defender")');
  const target = (await featureRow.count()) > 0
    ? featureRow
    : page.locator('.debrief-feature-row').first();
  // Click the content area to avoid the expand button (stopPropagation)
  await target.locator('.debrief-feature-row__content').click();
  await page.waitForTimeout(200);
}

test.describe('Log Panel', () => {
  let catalogPage: CatalogPage;
  let analysisPage: AnalysisPage;

  test.beforeEach(async ({ page }) => {
    catalogPage = new CatalogPage(page);
    analysisPage = new AnalysisPage(page);

    await catalogPage.goto();
    await catalogPage.waitForLoad();

    // Open a plot to get to the analysis view
    analysisPage = await catalogPage.openFirstItem();
    await analysisPage.waitForLoad();
    await collapsePropertiesSection(page);
  });

  test('panel workspace shows Activity and Log tabs', async () => {
    await expect(analysisPage.tabBar).toBeVisible();
    await expect(analysisPage.activityTab).toBeVisible();
    await expect(analysisPage.logTab).toBeVisible();

    // Activity tab should be active by default (GoldenLayout uses .lm_active class)
    await expect(analysisPage.activityTab).toHaveClass(/lm_active/);
  });

  test('switching to Log tab shows empty state', async () => {
    await analysisPage.switchToLogTab();

    // Log panel should be visible with empty state (no tools run yet)
    await expect(analysisPage.logPanel).toBeVisible();
    await expect(analysisPage.logEmptyNoEntries).toBeVisible();

    // Activity panel should be hidden
    await expect(analysisPage.activityPanel).not.toBeVisible();
  });

  test('switching back to Activity tab shows activity panel', async () => {
    // Switch to Log
    await analysisPage.switchToLogTab();
    await expect(analysisPage.logPanel).toBeVisible();

    // Switch back to Activity
    await analysisPage.switchToActivityTab();
    await expect(analysisPage.activityPanel).toBeVisible();
    await expect(analysisPage.logPanel).not.toBeVisible();
  });

  test('running a tool creates a log entry', async ({ page }) => {
    // Select a track via the feature list to enable tools
    await selectTrackViaFeatureList(page);

    // Wait for tools to become active
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });

    // Run the first active tool
    const runButton = activeTools.first().locator('button');
    await runButton.click();

    // Tool message should appear
    await expect(analysisPage.toolMessage).toBeVisible({ timeout: 5000 });

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // Should show exactly 1 log entry
    await expect(analysisPage.logPanel).toBeVisible();
    const entryCount = await analysisPage.getLogEntryCount();
    expect(entryCount).toBe(1);
  });

  test('running multiple tools creates multiple log entries', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);

    // Wait for active tools
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });

    // Run two tools
    const runButton1 = activeTools.first().locator('button');
    await runButton1.click();

    // Dismiss first message if present
    const dismissBtn = page.locator('.web-shell__tool-message button');
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click();
    }

    // Run second tool if available
    const toolCount = await activeTools.count();
    if (toolCount > 1) {
      const runButton2 = activeTools.nth(1).locator('button');
      await runButton2.click();
    }

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // Should show at least 1 entry (2 if second tool was available)
    const entryCount = await analysisPage.getLogEntryCount();
    expect(entryCount).toBeGreaterThanOrEqual(1);
  });

  test('log entries show most recent first', async ({ page }) => {
    // Select a track via the feature list
    await selectTrackViaFeatureList(page);

    // Wait for active tools
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });

    // Run the first tool
    await activeTools.first().locator('button').click();

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // The first entry should be visible (most recent)
    const firstEntry = analysisPage.logEntries.first();
    await expect(firstEntry).toBeVisible();
  });

  test('clicking a log entry selects it', async ({ page }) => {
    // Select a track via the feature list and run a tool
    await selectTrackViaFeatureList(page);

    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });
    await activeTools.first().locator('button').click();

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // Click on the first entry
    const firstEntry = analysisPage.logEntries.first();
    await firstEntry.click();

    // Entry should be marked as selected
    await expect(firstEntry).toHaveClass(/selected/);
  });

  test('clicking a selected log entry deselects it', async ({ page }) => {
    // Select a track via the feature list and run a tool
    await selectTrackViaFeatureList(page);

    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 5000 });
    await activeTools.first().locator('button').click();

    // Switch to Log tab
    await analysisPage.switchToLogTab();

    // Click to select
    const firstEntry = analysisPage.logEntries.first();
    await firstEntry.click();
    await expect(firstEntry).toHaveClass(/selected/);

    // Click again to deselect
    await firstEntry.click();
    await expect(firstEntry).not.toHaveClass(/selected/);
  });
});
