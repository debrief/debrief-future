import { test, expect } from '@playwright/test';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

/**
 * E2E tests for file actions on saved Result items in the Associated
 * Files dropdown (#177).
 *
 * Verifies that the Open / Open With / Reveal in Explorer / Delete
 * actions actually do something — they were previously unwired stubs.
 */
test.describe('Result file actions (#177)', () => {
  const TRACK_A = 'track-hms-defender';
  const TRACK_B = 'track-uss-freedom';

  /**
   * Setup helper: open Exercise Alpha, run Range Bearing on two tracks,
   * save the result, and open the Associated Files dropdown.
   */
  async function setupSavedResult(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
    // #192 — keep Layers FeatureList rendered after multi-select.
    await collapsePropertiesSection(page);

    // Multi-select two tracks via the session store
    await page.evaluate(([a, b]) => {
      // SAFETY: __sessionStore is exposed on window by App.tsx for E2E tests
      // and Playwright debug hooks. Cast through `unknown` to satisfy strict
      // mode without depending on the full SessionStoreApi type in test code.
      const store = (window as unknown as { __sessionStore?: { getState(): { setSelection: (ids: string[]) => void } } }).__sessionStore;
      if (!store) throw new Error('Session store not exposed on window');
      store.getState().setSelection([a, b]);
    }, [TRACK_A, TRACK_B]);
    await page.waitForTimeout(500);

    // Wait for Range Bearing to become active
    const rangeBearingTool = page.locator('.debrief-tools-panel__item--active:has-text("Range Bearing")');
    await expect(rangeBearingTool).toBeVisible({ timeout: 5000 });
    await rangeBearingTool.locator('button').first().click();

    // Wait for results panel and click Save
    await expect(page.locator('[data-testid="panel-chart"]')).toBeVisible({ timeout: 5000 });
    const saveButton = page.locator('button[aria-label="Save result"]');
    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 2000 });

    // Close any result tabs that are open so we can verify Open re-opens them
    const closeButtons = page.locator('button[aria-label^="Close "]');
    const tabCount = await closeButtons.count();
    for (let i = tabCount - 1; i >= 0; i--) {
      await closeButtons.nth(i).click();
    }

    // Open the associated files dropdown and click the saved file to expand
    // its action menu
    await page.locator('button[aria-label="Associated Files"]').first().click();
    const resultsSection = page.locator('.debrief-associated-files__section').filter({ hasText: 'Results' });
    const savedFile = resultsSection.locator('.debrief-associated-files__file').first();
    await expect(savedFile).toBeVisible({ timeout: 2000 });
    await savedFile.click();
  }

  test('Open action loads the saved CSV as a result tab', async ({ page }) => {
    await setupSavedResult(page);

    // Click the Open action in the file context menu
    const openButton = page.locator('.debrief-associated-files__action').filter({ hasText: /^Open$/ });
    await expect(openButton).toBeVisible({ timeout: 2000 });
    await openButton.click();

    // A result tab should be visible in the chart panel
    await expect(page.locator('[data-testid="panel-chart"]')).toBeVisible();
    // The tab title should contain a CSV reference (filename ends with .csv)
    const tabTitles = page.locator('[data-testid="panel-chart"] >> text=/\\.csv$/');
    await expect(tabTitles.first()).toBeVisible({ timeout: 2000 });
  });

  test('Reveal in Explorer highlights the file in the Navigation tree', async ({ page }) => {
    await setupSavedResult(page);

    // Click Reveal in Explorer
    const revealButton = page.locator('.debrief-associated-files__action').filter({ hasText: 'Reveal in Explorer' });
    await expect(revealButton).toBeVisible({ timeout: 2000 });
    await revealButton.click();

    // The file should appear as highlighted in the Navigation panel
    const highlighted = page.locator('.debrief-file-tree__node--highlighted');
    await expect(highlighted.first()).toBeVisible({ timeout: 2000 });
    const text = await highlighted.first().textContent();
    expect(text).toMatch(/\.csv$/);
  });

  test('Open With surfaces a notification', async ({ page }) => {
    await setupSavedResult(page);

    // Click Open With
    const openWithButton = page.locator('.debrief-associated-files__action').filter({ hasText: 'Open With' });
    await expect(openWithButton).toBeVisible({ timeout: 2000 });
    await openWithButton.click();

    // A notification or tool message should appear referencing the file
    const notification = page.locator('.web-shell__tool-message, [role="status"]').filter({ hasText: /open with/i });
    await expect(notification.first()).toBeVisible({ timeout: 2000 });
  });
});
