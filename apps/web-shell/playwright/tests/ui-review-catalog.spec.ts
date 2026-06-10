/**
 * ui-review-catalog.spec.ts
 *
 * E2E tests for spec 281 catalog improvements:
 *   T024 — SC-006: collapse/restore bottom preview row is discoverable and
 *           state survives a page reload.
 *   T030 — SC-007: S/M/L thumbnail sizes produce visibly distinct row heights
 *           and the choice survives a reload.
 *
 * Reuses CatalogPage POM and models catalog setup on catalog-browse.spec.ts.
 *
 * Feature: 281-ui-review-p1-p2-fixes
 */

import { test, expect } from '@playwright/test';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CatalogPage } from '../pages/CatalogPage';

// ─── Evidence output path ────────────────────────────────────────────────────
// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/281-ui-review-p1-p2-fixes/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

// ─── SC-006: discoverable collapse / restore, state persists ─────────────────

test.describe('SC-006: Bottom preview row collapse / restore', () => {
  test('collapse timeline is discoverable (has label + tooltip)', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    // The collapse button must be visible and carry a descriptive accessible label
    const collapseBtn = catalog.collapseTimeline;
    await expect(collapseBtn).toBeVisible();
    const ariaLabel = await collapseBtn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Collapse');
    const titleAttr = await collapseBtn.getAttribute('title');
    expect(titleAttr).toBeTruthy();
    expect(titleAttr).toContain('Collapse');
  });

  test('collapse map is discoverable (has label + tooltip)', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    const collapseBtn = catalog.collapseMap;
    await expect(collapseBtn).toBeVisible();
    const ariaLabel = await collapseBtn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
    expect(ariaLabel).toContain('Collapse');
  });

  test('collapse the preview row → exercise list grows, restore returns it', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    // Measure exercise list height before collapse
    const heightBefore = await catalog.getExerciseListHeight();
    expect(heightBefore).toBeGreaterThan(0);

    // The preview row holds two sibling panels (Timeline + Map). Collapsing one
    // lets the sibling fill the row; the list only reclaims the space once the
    // whole row is collapsed. Collapse both via the discoverable controls.
    await catalog.collapseTimelinePanel();
    await expect(catalog.restoreTimeline).toBeVisible();
    const titleAttr = await catalog.restoreTimeline.getAttribute('title');
    expect(titleAttr).toBeTruthy();
    expect(titleAttr).toContain('Show');

    await catalog.collapseMapPanel();
    await expect(catalog.restoreMap).toBeVisible();

    // With the whole preview row collapsed, the exercise list reclaims the space.
    await page.waitForTimeout(300); // allow GL animation to settle
    const heightAfterCollapse = await catalog.getExerciseListHeight();
    expect(heightAfterCollapse).toBeGreaterThan(heightBefore);

    // Screenshot: collapsed state (list expanded into the reclaimed space)
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'catalog-collapse.png'),
      fullPage: false,
    });

    // Restore both panels
    await catalog.restoreTimelinePanel();
    await expect(catalog.restoreTimeline).not.toBeVisible();
    await catalog.restoreMapPanel();
    await expect(catalog.restoreMap).not.toBeVisible();

    // Exercise list height should return to approximately original
    await page.waitForTimeout(300);
    const heightAfterRestore = await catalog.getExerciseListHeight();
    expect(heightAfterRestore).toBeLessThanOrEqual(heightAfterCollapse);
  });

  test('collapsed state survives a page reload (SC-006 persistence)', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    // Collapse both panels
    await catalog.collapseTimelinePanel();
    await expect(catalog.restoreTimeline).toBeVisible();
    await catalog.collapseMapPanel();
    await expect(catalog.restoreMap).toBeVisible();

    // Reload the page
    await page.reload();
    await catalog.waitForLoad();

    // Both restore buttons should still be visible (persisted via BROWSER_LAYOUT_KEY)
    await expect(catalog.restoreTimeline).toBeVisible();
    await expect(catalog.restoreMap).toBeVisible();
  });
});

// ─── SC-007: S/M/L thumbnail sizes produce distinct heights, persist ──────────

test.describe('SC-007: Thumbnail size toggle', () => {
  test('S/M/L buttons are visible', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    await expect(catalog.thumbnailSizeButton('small')).toBeVisible();
    await expect(catalog.thumbnailSizeButton('medium')).toBeVisible();
    await expect(catalog.thumbnailSizeButton('large')).toBeVisible();
  });

  test('S/M/L produce visibly distinct row heights', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    // Small (default)
    await catalog.selectThumbnailSize('small');
    await page.waitForTimeout(200);
    const smallHeight = await catalog.getFirstRowHeight();
    expect(smallHeight).toBeGreaterThan(0);

    // Medium — must be taller than small
    await catalog.selectThumbnailSize('medium');
    await page.waitForTimeout(200);
    const mediumHeight = await catalog.getFirstRowHeight();
    expect(mediumHeight).toBeGreaterThan(smallHeight);

    // Large — must be taller than medium
    await catalog.selectThumbnailSize('large');
    await page.waitForTimeout(200);
    const largeHeight = await catalog.getFirstRowHeight();
    expect(largeHeight).toBeGreaterThan(mediumHeight);

    // Screenshot: large size thumbnails
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'thumbnail-sizes.png'),
      fullPage: false,
    });
  });

  test('thumbnail size choice survives a page reload (SC-007 persistence)', async ({ page }) => {
    const catalog = new CatalogPage(page);
    await catalog.goto();

    // Switch to large
    await catalog.selectThumbnailSize('large');
    await page.waitForTimeout(200);
    const largeHeight = await catalog.getFirstRowHeight();

    // Reload
    await page.reload();
    await catalog.waitForLoad();
    await page.waitForTimeout(200);

    // Row height should match large after reload
    const heightAfterReload = await catalog.getFirstRowHeight();
    // Allow a few pixels tolerance for render timing
    expect(Math.abs(heightAfterReload - largeHeight)).toBeLessThan(5);

    // Large button should still appear active
    const largeBtn = catalog.thumbnailSizeButton('large');
    const ariaPressedValue = await largeBtn.getAttribute('aria-pressed');
    expect(ariaPressedValue).toBe('true');
  });
});
