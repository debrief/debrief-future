/**
 * E2E tests for #235 — web-shell Storyboard capture (US1).
 *
 * Phase 3 ships only the happy path (T030 — first capture flow). The
 * remaining matrix (T031-T039: live-state-changes-mid-flow, subsequent
 * append, collision banner Replace/Offset/Cancel, FR-CAP-017a time-range
 * exceeded, thumbnail failure, out-of-range timestamp guard, pagehide
 * cleanup, session-only badge, keyboard shortcut) is deferred to a
 * follow-up PR alongside Phase 4 maintenance + Phase 5 storyboard-level
 * mgmt — see specs/235-storyboard-capture-ux/tasks.md.
 *
 * The visibility-invariant helper (`assertViewportControlsRemainAccessible`)
 * is exercised at every step so the happy-path test alone produces
 * partial SC-001/SC-002 evidence.
 */

import { test, expect } from '@playwright/test';
import { assertViewportControlsRemainAccessible } from '../helpers/viewport-invariants';

test.describe('Storyboard capture — web-shell (#235 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open the first plot to land in the Analysis view.
    await page
      .locator('[data-testid="exercise-list-item-row"]')
      .first()
      .dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({
      timeout: 10000,
    });
    // Wait for map and time controller to be present and ready.
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="time-controller"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="storyboard-panel-rail"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('first capture: empty state → naming row → confirm → Scene appears (visibility invariants hold throughout)', async ({
    page,
  }) => {
    // The empty-state Capture Scene affordance is the canonical entry
    // point when no Storyboards exist yet (T017 Phase 2 deliverable).
    await expect(
      page.locator('[data-testid="storyboard-empty-state"]'),
    ).toBeVisible();

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'before-capture-press',
    });

    // Press the empty-state Capture Scene button.
    await page.locator('[data-testid="capture-scene-button"]').click();

    // Naming row should appear inline (NOT a top-of-window quick-pick).
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).toBeVisible({ timeout: 5000 });

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'naming-row-open',
    });

    // The input should be auto-focused with the default name pre-filled.
    const input = page.locator('[data-testid="storyboard-naming-row-input"]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // Type a name, confirm.
    await input.fill('Exercise Alpha');
    await assertViewportControlsRemainAccessible(page, {
      checkId: 'naming-row-typed',
    });

    await page.locator('[data-testid="storyboard-naming-row-confirm"]').click();

    // The naming row should disappear; a Scene row should be in the rail.
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).not.toBeVisible({ timeout: 5000 });

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-confirm',
    });

    // The session-state should now contain a Storyboard + Scene.
    const counts = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      let storyboards = 0;
      let scenes = 0;
      for (const f of fc) {
        const k = (f.properties as { kind?: string })?.kind;
        if (k === 'STORYBOARD') storyboards += 1;
        if (k === 'STORYBOARD_SCENE') scenes += 1;
      }
      return { storyboards, scenes };
    });
    expect(counts.storyboards).toBe(1);
    expect(counts.scenes).toBe(1);

    // The session-only badge (FR-WEB-029a) should be visible because
    // the new captures live only in the tab session — web-shell has no
    // STAC write path yet (#236).
    await expect(
      page.locator('[data-testid="storyboard-session-only-badge"]'),
    ).toBeVisible();

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'final',
    });
  });

  test('cancel naming row leaves rail empty (no Storyboard, no Scene)', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="storyboard-empty-state"]'),
    ).toBeVisible();
    await page.locator('[data-testid="capture-scene-button"]').click();
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).toBeVisible();

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'before-cancel',
    });

    await page.locator('[data-testid="storyboard-naming-row-cancel"]').click();

    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).not.toBeVisible();

    // Empty state is back, no captures persisted.
    await expect(
      page.locator('[data-testid="storyboard-empty-state"]'),
    ).toBeVisible();

    const counts = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      let storyboards = 0;
      let scenes = 0;
      for (const f of fc) {
        const k = (f.properties as { kind?: string })?.kind;
        if (k === 'STORYBOARD') storyboards += 1;
        if (k === 'STORYBOARD_SCENE') scenes += 1;
      }
      return { storyboards, scenes };
    });
    expect(counts.storyboards).toBe(0);
    expect(counts.scenes).toBe(0);

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-cancel',
    });
  });
});
