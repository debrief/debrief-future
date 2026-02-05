import { test, expect } from '@playwright/test';

test.describe('Tool Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to analysis view via timeline bar/point
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    // Wait for map to render
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
  });

  test('tools panel shows available tools', async ({ page }) => {
    // Tools panel should be visible in activity panel
    const toolsPanel = page.locator('.debrief-tools-panel');
    await expect(toolsPanel).toBeVisible();
  });

  test('tools are inactive without selection', async ({ page }) => {
    // With no selection, tools should show as inactive
    const inactiveTools = page.locator('.debrief-tools-panel__item--inactive');
    await expect(inactiveTools.first()).toBeVisible();
  });

  test('track length tool activates when track selected', async ({ page }) => {
    // Select a track on the map (force: true bypasses SVG overlap check)
    const track = page.locator('.leaflet-interactive').first();
    await track.click({ force: true });

    // Wait for tools to update
    await page.waitForTimeout(100);

    // At least one tool should now be active (Track Length and/or Bounding Box)
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    await expect(activeTools.first()).toBeVisible({ timeout: 2000 });
  });

  test('running track length shows result message', async ({ page }) => {
    // Select a track (force: true bypasses SVG overlap check)
    const track = page.locator('.leaflet-interactive').first();
    await track.click({ force: true });

    // Wait for tool to become active
    await expect(page.locator('.debrief-tools-panel__item--active').first()).toBeVisible({ timeout: 2000 });

    // Click the run button on first active tool
    const runButton = page.locator('.debrief-tools-panel__item--active button').first();
    await runButton.click();

    // Result message should appear
    const toolMessage = page.locator('.web-shell__tool-message');
    await expect(toolMessage).toBeVisible({ timeout: 2000 });
    await expect(toolMessage).toContainText('km');
  });

  test('bounding box tool works with any feature', async ({ page }) => {
    // Select any feature (click on feature row)
    const featureRow = page.locator('.debrief-feature-row').first();
    await featureRow.click();

    // Wait for tools to update - bounding box should be active
    await page.waitForTimeout(100);

    // Both tools should potentially be available now
    const activeTools = page.locator('.debrief-tools-panel__item--active');
    const count = await activeTools.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('tool message can be dismissed', async ({ page }) => {
    // Select a track and run tool (force: true bypasses SVG overlap check)
    await page.locator('.leaflet-interactive').first().click({ force: true });
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
