/**
 * E2E test: Undo/Redo Split (073-undo-redo-split)
 *
 * Verifies that Ctrl+Z only reverts UI-state changes (selection, displayMode)
 * and does NOT revert data-reference changes (featureCollectionUri).
 *
 * Uses window.__sessionStore for direct state introspection.
 */

import { test, expect } from '@playwright/test';

/** Helper: read session store state from the browser */
async function getStoreState(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const s = window.__sessionStore.getState();
    return {
      featureCollectionUri: s.featureCollectionUri,
      selectionIds: s.selection.featureIds,
      displayMode: s.displayMode,
      canUndo: s.canUndo(),
      canRedo: s.canRedo(),
      dirty: s.dirty,
    };
  });
}

/** Helper: navigate from catalog to analysis view */
async function loadPlot(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.locator('.web-shell--welcome')).toBeVisible();

  // Wait for exercise rows to load (stacService.init is async)
  const exerciseRow = page.locator('[data-testid="exercise-list-item-row"]').first();
  await expect(exerciseRow).toBeVisible({ timeout: 10000 });
  await exerciseRow.click();

  // Wait for analysis view
  await expect(page.locator('.web-shell--analysis')).toBeVisible({ timeout: 10000 });
  // Wait for map tracks to render
  await expect(page.locator('.leaflet-interactive').first()).toBeVisible({ timeout: 10000 });
}

test.describe('Undo/Redo Split (073)', () => {
  test('featureCollectionUri is set on plot load and is not undoable', async ({ page }) => {
    await loadPlot(page);

    // After loading, featureCollectionUri should be set
    const initial = await getStoreState(page);
    expect(initial.featureCollectionUri).toBeTruthy();
    const savedUri = initial.featureCollectionUri;

    // featureCollectionUri alone should NOT create undo history
    expect(initial.canUndo).toBe(false);

    // Now make a UI change — select a feature via the store
    // (clicking .leaflet-interactive is unreliable in CI)
    await page.evaluate(() => {
      const s = window.__sessionStore.getState();
      s.setSelection(['feature-1'], 'feature-1');
    });

    // Selection should create undo history
    const afterSelect = await getStoreState(page);
    expect(afterSelect.selectionIds.length).toBeGreaterThan(0);
    expect(afterSelect.canUndo).toBe(true);

    // featureCollectionUri still the same
    expect(afterSelect.featureCollectionUri).toBe(savedUri);

    // Undo the selection
    await page.keyboard.press('Control+z');

    // Selection should be reverted (cleared)
    const afterUndo = await getStoreState(page);
    expect(afterUndo.selectionIds.length).toBe(0);

    // featureCollectionUri must NOT be reverted — this is the key assertion
    expect(afterUndo.featureCollectionUri).toBe(savedUri);
  });

  test('undo reverts selection but preserves featureCollectionUri across multiple changes', async ({ page }) => {
    await loadPlot(page);

    const initial = await getStoreState(page);
    const savedUri = initial.featureCollectionUri;

    // Make multiple selection changes via store (more reliable than clicking)
    await page.evaluate(() => {
      const s = window.__sessionStore.getState();
      s.setSelection(['feature-1'], 'feature-1');
    });
    await page.evaluate(() => {
      const s = window.__sessionStore.getState();
      s.setSelection(['feature-2'], 'feature-2');
    });

    const afterChanges = await getStoreState(page);
    expect(afterChanges.selectionIds).toEqual(['feature-2']);
    expect(afterChanges.canUndo).toBe(true);

    // Undo once — should go back to ['feature-1']
    await page.keyboard.press('Control+z');
    const afterUndo1 = await getStoreState(page);
    expect(afterUndo1.selectionIds).toEqual(['feature-1']);
    expect(afterUndo1.featureCollectionUri).toBe(savedUri);

    // Undo again — should go back to empty selection
    await page.keyboard.press('Control+z');
    const afterUndo2 = await getStoreState(page);
    expect(afterUndo2.selectionIds).toEqual([]);
    expect(afterUndo2.featureCollectionUri).toBe(savedUri);

    // Redo — should restore ['feature-1']
    await page.keyboard.press('Control+y');
    const afterRedo = await getStoreState(page);
    expect(afterRedo.selectionIds).toEqual(['feature-1']);
    expect(afterRedo.featureCollectionUri).toBe(savedUri);
  });

  test('changing only featureCollectionUri does not create undo history', async ({ page }) => {
    await loadPlot(page);

    // Verify initial state — no undo available (featureCollectionUri set doesn't count)
    const initial = await getStoreState(page);
    expect(initial.canUndo).toBe(false);

    // Change featureCollectionUri directly (simulates loading a different plot)
    await page.evaluate(() => {
      window.__sessionStore.getState().setFeatureCollectionUri('stac://different-plot');
    });

    // Still no undo history — featureCollectionUri is not undo-tracked
    const afterUriChange = await getStoreState(page);
    expect(afterUriChange.featureCollectionUri).toBe('stac://different-plot');
    expect(afterUriChange.canUndo).toBe(false);
  });

  test('displayMode changes are undoable but featureCollectionUri is not', async ({ page }) => {
    await loadPlot(page);

    const initial = await getStoreState(page);
    const savedUri = initial.featureCollectionUri;
    expect(initial.displayMode).toBe('normal');

    // Change display mode (UI-state — should be undoable)
    await page.evaluate(() => {
      window.__sessionStore.getState().setDisplayMode('snailTrail');
    });

    const afterMode = await getStoreState(page);
    expect(afterMode.displayMode).toBe('snailTrail');
    expect(afterMode.canUndo).toBe(true);

    // Also change featureCollectionUri (data — should NOT be undoable)
    await page.evaluate(() => {
      window.__sessionStore.getState().setFeatureCollectionUri('stac://new-data');
    });

    const afterBoth = await getStoreState(page);
    expect(afterBoth.featureCollectionUri).toBe('stac://new-data');

    // Undo — should revert displayMode but NOT featureCollectionUri
    await page.keyboard.press('Control+z');

    const afterUndo = await getStoreState(page);
    expect(afterUndo.displayMode).toBe('normal');
    expect(afterUndo.featureCollectionUri).toBe('stac://new-data');
  });
});
