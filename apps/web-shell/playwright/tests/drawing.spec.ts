/**
 * E2E tests for Feature 094: Point and Rectangle Drawing
 *
 * Verifies that drawn shapes appear in the FeatureList (Layers) and are selectable.
 */
import { test, expect } from '@playwright/test';

test.describe('Drawing — Feature 094', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open the first plot by double-clicking timeline bar/point
    await page.locator('.catalog-overview__timeline-bar, .catalog-overview__timeline-point').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 10000 });
    // Wait for map to be ready (Leaflet interactive elements)
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 10000 });
  });

  test('drawing toolbar is present', async ({ page }) => {
    await expect(page.locator('[data-testid="draw-trigger"]')).toBeVisible({ timeout: 5000 });
  });

  test('shape palette opens on click', async ({ page }) => {
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-palette"]')).toBeVisible({ timeout: 3000 });
  });

  test('draw rectangle appears in FeatureList', async ({ page }) => {
    // Count features before drawing (via DOM + scroll)
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // Count initial feature rows via virtualizer total height
    const featureRows = page.locator('.debrief-feature-row');
    const countBefore = await featureRows.count();

    // Activate rectangle drawing
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-rectangle"]')).toBeVisible();
    await page.locator('[data-testid="shape-rectangle"]').click();
    await page.waitForTimeout(500);

    // Get the map container bounds
    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    // Draw rectangle: click first corner, move to second, click
    const x1 = box!.x + box!.width * 0.25;
    const y1 = box!.y + box!.height * 0.25;
    const x2 = box!.x + box!.width * 0.5;
    const y2 = box!.y + box!.height * 0.5;

    await page.mouse.click(x1, y1);
    await page.waitForTimeout(300);
    await page.mouse.move(x2, y2, { steps: 5 });
    await page.waitForTimeout(300);
    await page.mouse.click(x2, y2);
    await page.waitForTimeout(2000);

    // Feature was created — verify selection includes a UUID
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBeGreaterThan(0);

    // Scroll the feature list to the bottom to reveal the new item
    // (virtualizer only renders items in/near viewport)
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    // Now check for the drawn rectangle row
    const drawnRow = page.locator('.debrief-feature-row__name', { hasText: 'Drawn Rectangle' });
    await expect(drawnRow).toBeVisible({ timeout: 3000 });
  });

  test('draw point appears in FeatureList', async ({ page }) => {
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // Activate point drawing
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-point"]')).toBeVisible();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(500);

    // Click on the map to place a point
    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Verify selection was set
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBeGreaterThan(0);

    // Scroll to bottom to reveal new item
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    // Check for the drawn point row
    const drawnRow = page.locator('.debrief-feature-row__name', { hasText: 'Drawn Point' });
    await expect(drawnRow).toBeVisible({ timeout: 3000 });
  });

  test('drawn feature is selectable via FeatureList', async ({ page }) => {
    // Draw a point first
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(500);

    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Clear selection first
    await page.evaluate(() => window.__sessionStore.getState().clearSelection());
    await page.waitForTimeout(200);

    // Scroll feature list to bottom and click on the drawn point
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    const drawnRow = page.locator('.debrief-feature-row', { hasText: 'Drawn Point' });
    await expect(drawnRow).toBeVisible({ timeout: 3000 });
    await drawnRow.click();
    await page.waitForTimeout(500);

    // Verify the drawn point is now selected in session store
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBe(1);
  });
});
