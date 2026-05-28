import { test, expect } from '@playwright/test';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

/**
 * Helper: select a track feature via the feature list (more reliable than map clicks
 * since .leaflet-interactive.first() may be a polygon, not a track).
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

// Tool execution tests — verifies tool activation, execution, and result display.
test.describe('Tool Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    // Wait for map to render
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
    await collapsePropertiesSection(page);
  });

  test('tools panel shows available tools', async ({ page }) => {
    const toolsPanel = page.locator('.debrief-tools-panel');
    await expect(toolsPanel).toBeVisible();
  });

  test('tools are inactive without selection', async ({ page }) => {
    const inactiveTools = page.locator('.debrief-tools-panel__item--inactive');
    await expect(inactiveTools.first()).toBeVisible();
  });

  test('track length tool activates when track selected', async ({ page }) => {
    // Select a track via feature list (reliable targeting)
    await selectTrackViaFeatureList(page);

    // At least one tool should now be active
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 2000 });
  });

  test('running track length shows result message', async ({ page }) => {
    // Select a track via feature list
    await selectTrackViaFeatureList(page);

    // Wait for tool to become active
    await expect(page.locator('.debrief-tools-panel__item--active').first()).toBeVisible({ timeout: 2000 });

    // Click the run button on the Track Length tool (first active built-in)
    const runButton = page.locator('.debrief-tools-panel__item--active button').first();
    await runButton.click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('km');
  });

  test('bounding box tool works with any feature', async ({ page }) => {
    // Select any feature (click on content area to avoid expand button)
    const featureRow = page.locator('.debrief-feature-row').first();
    await featureRow.locator('.debrief-feature-row__content').click();
    await page.waitForTimeout(200);

    // At least one tool should be available
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    const count = await activeTools.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tool message can be dismissed', async ({ page }) => {
    // Select a track and run tool via feature list
    await selectTrackViaFeatureList(page);
    await expect(page.locator('.debrief-tools-panel__item--active').first()).toBeVisible({ timeout: 2000 });
    await page.locator('.debrief-tools-panel__item--active button').first().click();

    // Wait for message
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });

    // Click dismiss button
    await toolMessage.locator('button').click();

    // Message should disappear
    await expect(toolMessage).not.toBeVisible();
  });
});
