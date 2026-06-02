import { test, expect } from '@playwright/test';

/**
 * #268 atomic save — web-shell happy-path smoke (FR-011 regression guard).
 *
 * The fault-injection guarantees (SC-001/002/003/005) are covered by
 * unit/integration tests — injecting a mid-write crash is reliable only at the
 * adaptor seam. This E2E proves the *normal* path is unchanged: a plot loads
 * coherently, and reopening it yields the same coherent state. Opening drives
 * `getPlotData`, which now runs `reconcilePlotSave` (a no-op on the IndexedDB
 * host) before the read — so this also guards that the reconcile-before-read
 * wiring did not regress normal loading.
 */
test.describe('#268 save atomicity — load/reopen coherence', () => {
  test('a plot loads coherently and reopening yields the same coherent state', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();

    // Open a plot — map + GeoJSON features must render (coherent read).
    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });

    // Back to catalog, then reopen the same plot — reconcile-before-read must
    // still produce the coherent plot (no torn state, features intact).
    await page.locator('.web-shell__back-button[aria-label="Back to catalog"]').click();
    await expect(page.locator('[data-testid="stac-browser"]')).toBeVisible();

    await page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 5000 });
  });
});
