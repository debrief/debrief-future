import { test, expect } from '@playwright/test';

// Plot load tests — verifies plot loading, map rendering, and back navigation.
test.describe('Plot Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking exercise opens analysis view', async ({ page }) => {
    // Wait for StacBrowser to load
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();

    // Click on first exercise list item to open plot
    const exerciseRow = page.locator('[data-testid="exercise-list-item-row"]').first();
    await exerciseRow.dblclick();

    // Should switch to analysis view
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
  });

  test('analysis view shows back button', async ({ page }) => {
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();

    // Verify back button exists
    const backButton = page.locator('.web-shell__back-button[aria-label="Back to catalog"]');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Catalog');
  });

  test('analysis view shows map', async ({ page }) => {
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();

    // Leaflet container should be present (within GoldenLayout map panel)
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('analysis view shows activity panel', async ({ page }) => {
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();

    // Activity panel should be visible (within GoldenLayout)
    await expect(page.locator('.debrief-activity-panel')).toBeVisible();
  });

  test('map renders tracks from loaded plot', async ({ page }) => {
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();

    // Wait for map to render
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Wait for GeoJSON features to render (Leaflet adds these as paths)
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
  });

  test('back button returns to catalog', async ({ page }) => {
    // Navigate to analysis view via exercise list
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();

    // Click back button
    await page.locator('.web-shell__back-button[aria-label="Back to catalog"]').click();

    // Should return to welcome view
    await expect(page.locator('.web-shell--welcome')).toBeVisible();
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();
  });
});
