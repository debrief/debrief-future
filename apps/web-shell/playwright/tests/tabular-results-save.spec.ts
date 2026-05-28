import { test, expect } from '@playwright/test';
import { collapsePropertiesSection } from '../fixtures/properties-collapse';

/**
 * E2E test for the tabular results save flow (#177).
 *
 * Reproduces the user-reported scenario:
 * 1. Open a plot with two tracks (Exercise Alpha)
 * 2. Multi-select two tracks via the session store
 * 3. Run the Range Bearing tool — produces two chart datasets
 * 4. Click Save / Save As, give it a known filename
 * 5. Verify the saved file appears in the LayersToolbar Associated Files
 *    dropdown under the Results section
 *
 * Note: web-shell TypeScript Range Bearing requires TRACK+TRACK selection
 * (the Python MCP version accepts TRACK+SHAPE/POINT, but the local copy
 * is more restrictive).
 */
test.describe('Tabular Results Save Flow (#177)', () => {
  // The two tracks present in Exercise Alpha test data
  const TRACK_A = 'track-hms-defender';
  const TRACK_B = 'track-uss-freedom';
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    // Open Exercise Alpha (which has tracks AND points)
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible();
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
    await collapsePropertiesSection(page);
  });

  test('Range Bearing result saved via Save As appears in Layers dropdown', async ({ page }) => {
    // Multi-select two tracks via the session store
    await page.evaluate(([a, b]) => {
      // SAFETY: __sessionStore is exposed on window by App.tsx for E2E tests
      // and Playwright debug hooks. Cast through `unknown` to satisfy strict
      // mode without depending on the full SessionStoreApi type in test code.
      const store = (window as unknown as { __sessionStore?: { getState(): { setSelection: (ids: string[]) => void } } }).__sessionStore;
      if (!store) throw new Error('Session store not exposed on window');
      store.getState().setSelection([a, b]);
    }, [TRACK_A, TRACK_B]);
    // Allow tools panel to react to selection change
    await page.waitForTimeout(500);

    // Wait for Range Bearing to become active (needs 2 features)
    const rangeBearingTool = page.locator('.debrief-tools-panel__item--active:has-text("Range Bearing")');
    await expect(rangeBearingTool).toBeVisible({ timeout: 5000 });

    // Run Range Bearing
    await rangeBearingTool.locator('button').first().click();

    // Results panel should appear with chart tabs
    const resultsPanel = page.locator('[data-testid="panel-chart"]');
    await expect(resultsPanel).toBeVisible({ timeout: 5000 });

    // Save As button should be visible (active tab is unsaved)
    const saveAsButton = page.locator('button[aria-label="Save result as"]');
    await expect(saveAsButton).toBeVisible();
    await expect(saveAsButton).toBeEnabled();

    // Open the Save As inline form
    await saveAsButton.click();

    // Fill in a predictable filename
    const nameInput = page.locator('input[aria-label="Base filename"]');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('test-rb-result');

    const tagInput = page.locator('input[aria-label="Optional tag"]');
    await tagInput.fill('e2e');

    // Confirm the save
    await page.locator('button[aria-label="Confirm save"]').click();

    // Form closes and the form inputs are no longer visible
    await expect(nameInput).not.toBeVisible({ timeout: 2000 });

    // Save button is now disabled (saved state)
    await expect(page.locator('button[aria-label="Save result"]')).toBeDisabled();

    // Open the Associated Files dropdown
    const associatedFilesButton = page.locator('button[aria-label="Associated Files"]').first();
    await associatedFilesButton.click();

    // The Results section should now contain our saved file
    const resultsSection = page.locator('.debrief-associated-files__section').filter({ hasText: 'Results' });
    await expect(resultsSection).toBeVisible({ timeout: 2000 });

    const fileEntry = resultsSection.locator('.debrief-associated-files__file-name').first();
    await expect(fileEntry).toBeVisible({ timeout: 2000 });

    const fileName = await fileEntry.textContent();
    expect(fileName).toContain('test-rb-result');
    expect(fileName).toContain('e2e');
    expect(fileName).toMatch(/\.csv$/);
  });

  test('Save (quick) generates date-stamped filename in Layers dropdown', async ({ page }) => {
    // Multi-select two tracks via the session store
    await page.evaluate(([a, b]) => {
      // SAFETY: __sessionStore is exposed on window by App.tsx for E2E tests
      // and Playwright debug hooks. Cast through `unknown` to satisfy strict
      // mode without depending on the full SessionStoreApi type in test code.
      const store = (window as unknown as { __sessionStore?: { getState(): { setSelection: (ids: string[]) => void } } }).__sessionStore;
      if (!store) throw new Error('Session store not exposed on window');
      store.getState().setSelection([a, b]);
    }, [TRACK_A, TRACK_B]);
    // Allow tools panel to react to selection change
    await page.waitForTimeout(300);

    // Run Range Bearing
    const rangeBearingTool = page.locator('.debrief-tools-panel__item--active:has-text("Range Bearing")');
    await expect(rangeBearingTool).toBeVisible({ timeout: 3000 });
    await rangeBearingTool.locator('button').first().click();

    // Wait for results panel
    await expect(page.locator('[data-testid="panel-chart"]')).toBeVisible({ timeout: 5000 });

    // Click quick Save
    const saveButton = page.locator('button[aria-label="Save result"]');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Save button becomes disabled after save
    await expect(saveButton).toBeDisabled({ timeout: 2000 });

    // Open associated files dropdown
    await page.locator('button[aria-label="Associated Files"]').first().click();

    // Results section should contain a CSV file
    const resultsSection = page.locator('.debrief-associated-files__section').filter({ hasText: 'Results' });
    const fileEntry = resultsSection.locator('.debrief-associated-files__file-name').first();
    await expect(fileEntry).toBeVisible({ timeout: 2000 });

    const fileName = await fileEntry.textContent();
    expect(fileName).toMatch(/\.csv$/);
  });
});
