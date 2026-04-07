import { test, expect } from '@playwright/test';

/**
 * Panel persistence tests — verifies sidebar panels survive navigation
 * and recover from corrupted localStorage layouts.
 * Feature: 177-tabular-results-panel (fix for disappearing panels)
 */
test.describe('Panel persistence across plot navigation', () => {
  test('activity panel visible after back-and-reopen', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    // First open
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('.debrief-activity-panel')).toBeVisible({ timeout: 5000 });

    // Navigate back
    await page.locator('.web-shell__back-button[aria-label="Back to catalog"]').click();
    await expect(page.locator('.web-shell--welcome')).toBeVisible();

    // Re-open
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('.debrief-activity-panel')).toBeVisible({ timeout: 5000 });
  });

  test('activity panel visible after three consecutive opens', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
      await expect(page.locator('.web-shell--analysis')).toBeVisible();
      await expect(page.locator('.debrief-activity-panel')).toBeVisible({ timeout: 5000 });

      if (i < 2) {
        await page.locator('.web-shell__back-button[aria-label="Back to catalog"]').click();
        await expect(page.locator('.web-shell--welcome')).toBeVisible();
      }
    }
  });

  test('recovers from corrupted layout with empty sidebar', async ({ page }) => {
    await page.goto('/');

    // Inject a corrupted layout — valid structure but sidebar panels missing
    await page.evaluate(() => {
      const corruptLayout = {
        version: 2,
        config: {
          root: {
            type: 'row',
            content: [
              { type: 'column', width: 25, content: [] },
              {
                type: 'column', width: 75,
                content: [{ type: 'stack', content: [{ type: 'component', componentType: 'map', title: 'Map' }] }]
              }
            ]
          },
          openPopouts: [],
          dimensions: {},
          header: {},
          resolved: true,
        }
      };
      localStorage.setItem('debrief-panel-layout', JSON.stringify(corruptLayout));
    });

    // Open a plot — should recover to default layout
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('.debrief-activity-panel')).toBeVisible({ timeout: 5000 });
  });
});
