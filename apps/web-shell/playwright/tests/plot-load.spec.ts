import { test, expect } from '@playwright/test';

test.describe('Plot Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('double-click opens analysis view', async ({ page }) => {
    // Wait for catalog to load
    await expect(page.locator('.debrief-catalog-overview')).toBeVisible();

    // Double-click on first item
    const item = page.locator('.debrief-catalog-overview__item').first();
    await item.dblclick();

    // Should switch to analysis view
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
  });

  test('analysis view shows back button', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.debrief-catalog-overview__item').first().dblclick();

    // Verify back button exists
    const backButton = page.locator('.web-shell__back-button');
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Catalog');
  });

  test('analysis view shows map', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.debrief-catalog-overview__item').first().dblclick();

    // Map container should be visible
    await expect(page.locator('.web-shell__map-container')).toBeVisible();

    // Leaflet container should be present
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('analysis view shows activity panel', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.debrief-catalog-overview__item').first().dblclick();

    // Activity panel should be visible
    await expect(page.locator('.web-shell__sidebar')).toBeVisible();
    await expect(page.locator('.debrief-activity-panel')).toBeVisible();
  });

  test('map renders tracks from loaded plot', async ({ page }) => {
    // Navigate to analysis view with Exercise Alpha
    await page.getByText('Exercise Alpha').dblclick();

    // Wait for map to render
    await expect(page.locator('.leaflet-container')).toBeVisible();

    // Wait for GeoJSON features to render (Leaflet adds these as paths)
    await expect(page.locator('.leaflet-interactive')).toHaveCount(2, { timeout: 5000 });
  });

  test('back button returns to catalog', async ({ page }) => {
    // Navigate to analysis view
    await page.locator('.debrief-catalog-overview__item').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();

    // Click back button
    await page.locator('.web-shell__back-button').click();

    // Should return to welcome view
    await expect(page.locator('.web-shell--welcome')).toBeVisible();
    await expect(page.locator('.debrief-catalog-overview')).toBeVisible();
  });
});
