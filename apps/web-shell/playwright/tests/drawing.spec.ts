/**
 * E2E tests for Feature 094: Point and Rectangle Drawing
 *
 * Verifies that drawn shapes appear in the FeatureList (Layers) and are selectable.
 * After drawing, a naming dialog prompts the user — cancelling discards the shape.
 */
import { test, expect } from '@playwright/test';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

test.describe('Drawing — Feature 094', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open the first plot by clicking exercise list item
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 10000 });
    // Wait for map to be ready (Leaflet interactive elements)
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 10000 });
    // #192 — keep Layers FeatureList rendered after selection.
    await collapsePropertiesSection(page);
  });

  test('drawing toolbar is present', async ({ page }) => {
    await expect(page.locator('[data-testid="draw-trigger"]')).toBeVisible({ timeout: 5000 });
  });

  test('shape palette opens on click', async ({ page }) => {
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-palette"]')).toBeVisible({ timeout: 3000 });
  });

  test('draw rectangle with custom name appears in FeatureList', async ({ page }) => {
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // Accept the naming dialog with a custom name
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('prompt');
      expect(dialog.message()).toContain('Name this shape');
      await dialog.accept('Patrol Zone Alpha');
    });

    // Activate rectangle drawing
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-rectangle"]')).toBeVisible();
    await page.locator('[data-testid="shape-rectangle"]').click();
    await page.waitForTimeout(500);

    // Draw rectangle
    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25);
    await page.waitForTimeout(300);
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5, { steps: 5 });
    await page.waitForTimeout(300);
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Verify selection
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBeGreaterThan(0);

    // Scroll to reveal the new feature
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    // Feature should appear with the custom name
    await expect(page.locator('.debrief-feature-row__name', { hasText: 'Patrol Zone Alpha' })).toBeVisible({ timeout: 3000 });
  });

  test('draw point with custom name appears in FeatureList', async ({ page }) => {
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await expect(scrollContainer).toBeVisible({ timeout: 5000 });

    // Accept the naming dialog
    page.on('dialog', async dialog => {
      await dialog.accept('Observation Post Bravo');
    });

    // Activate point drawing
    await page.locator('[data-testid="draw-trigger"]').click();
    await expect(page.locator('[data-testid="shape-point"]')).toBeVisible();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(500);

    // Place a point
    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Verify selection
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBeGreaterThan(0);

    // Scroll and check
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    await expect(page.locator('.debrief-feature-row__name', { hasText: 'Observation Post Bravo' })).toBeVisible({ timeout: 3000 });
  });

  test('cancelling naming dialog discards the shape', async ({ page }) => {
    const featureRows = page.locator('.debrief-feature-row');
    const countBefore = await featureRows.count();

    // Dismiss the naming dialog (cancel)
    page.on('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Draw a rectangle
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-rectangle"]').click();
    await page.waitForTimeout(500);

    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.25, box!.y + box!.height * 0.25);
    await page.waitForTimeout(300);
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5, { steps: 5 });
    await page.waitForTimeout(300);
    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Selection should NOT change (shape was discarded)
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBe(0);

    // Feature count unchanged — scroll to be safe
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    const countAfter = await featureRows.count();
    expect(countAfter).toBe(countBefore);
  });

  test('drawing a shape creates a log entry', async ({ page }) => {
    // Accept the naming dialog
    page.on('dialog', async dialog => {
      await dialog.accept('Logged Point');
    });

    // Draw a point
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(500);

    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Switch to the Log tab (GoldenLayout tab)
    await page.locator('.lm_tab:has-text("Log")').click();
    await expect(page.getByTestId('log-panel')).toBeVisible({ timeout: 5000 });

    // Should show exactly 1 log entry for the drawing action
    const entries = page.locator('.log-panel__entry');
    await expect(entries).toHaveCount(1, { timeout: 3000 });

    // The entry should reference the draw tool
    await expect(entries.first()).toContainText('draw-point');
  });

  test('drawn feature is selectable via FeatureList', async ({ page }) => {
    // Accept naming dialog
    page.on('dialog', async dialog => {
      await dialog.accept('Test Marker');
    });

    // Draw a point
    await page.locator('[data-testid="draw-trigger"]').click();
    await page.locator('[data-testid="shape-point"]').click();
    await page.waitForTimeout(500);

    const mapContainer = page.locator('.leaflet-container').first();
    const box = await mapContainer.boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await page.waitForTimeout(2000);

    // Clear selection
    await page.evaluate(() => window.__sessionStore.getState().clearSelection());
    await page.waitForTimeout(200);

    // Scroll and click the drawn feature
    const scrollContainer = page.locator('.debrief-feature-list__scroll');
    await scrollContainer.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(500);

    const drawnRow = page.locator('.debrief-feature-row', { hasText: 'Test Marker' });
    await expect(drawnRow).toBeVisible({ timeout: 3000 });
    await drawnRow.click();
    await page.waitForTimeout(500);

    // Verify selected
    const sel = await page.evaluate(() => window.__sessionStore.getState().selection.featureIds);
    expect(sel.length).toBe(1);
  });
});
