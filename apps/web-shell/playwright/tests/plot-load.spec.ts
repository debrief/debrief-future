import { test } from '@playwright/test';

// STATUS: Skipped — requires web-shell app with STAC catalog and map rendering.
// See docs/web-shell-test-restoration-requirements.md for restoration plan.
test.describe.skip('Plot Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('double-click opens analysis view', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('.catalog-overview')).toBeVisible();

    // Double-click on first timeline bar to open plot
    const timelineBar = page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first();
    await timelineBar.dblclick();

    // Should switch to analysis view
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
  });

  test('analysis view shows back button', async ({ page }) => {
    // Navigate to analysis view via timeline bar
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();

    // Verify back button exists
    const backButton = page.locator('.web-shell__back-button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Catalog');
  });

  test('analysis view shows map', async ({ page }) => {
    // Navigate to analysis view via timeline bar
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();

    // Map container should be visible
    await expect(page.locator('.web-shell__map-container')).toBeVisible();

    // Leaflet container should be present
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('analysis view shows activity panel', async ({ page }) => {
    // Navigate to analysis view via timeline bar
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();

    // Activity panel should be visible
    await expect(page.locator('.web-shell__sidebar')).toBeVisible();
    await expect(page.locator('.debrief-activity-panel')).toBeVisible();
  });

  test('map renders tracks from loaded plot', async ({ page }) => {
    // Navigate to analysis view via timeline bar/point
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();

    // Wait for map to render
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Wait for GeoJSON features to render (Leaflet adds these as paths)
    // Note: Count may vary based on which item is first in the catalog
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
  });

  test('STAC Catalog section is collapsed by default', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();

    // Toggle button should exist and indicate collapsed state
    const toggle = page.getByTestId('file-tree-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // File tree should NOT be visible
    await expect(page.locator('#sidebar-file-tree')).not.toBeVisible();
  });

  test('STAC Catalog section expands on click', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();

    // Click toggle to expand
    const toggle = page.getByTestId('file-tree-toggle');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    // File tree should now be visible
    await expect(page.locator('#sidebar-file-tree')).toBeVisible();

    // Click again to collapse
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#sidebar-file-tree')).not.toBeVisible();
  });

  test('back button returns to catalog', async ({ page }) => {
    // Navigate to analysis view via timeline bar
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();

    // Click back button
    await page.locator('.web-shell__back-button').click();

    // Should return to welcome view
    await expect(page.locator('.web-shell--welcome')).toBeVisible();
    await expect(page.locator('.catalog-overview')).toBeVisible();
  });
});
