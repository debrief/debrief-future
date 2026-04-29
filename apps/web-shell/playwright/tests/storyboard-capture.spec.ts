/**
 * E2E tests for #235 — web-shell Storyboard capture (US1).
 *
 * Visibility-invariant helper (T029) is exercised at every step so this
 * test alone produces partial SC-001/SC-002 evidence.
 */

import { test, expect } from '@playwright/test';
import { assertViewportControlsRemainAccessible } from '../helpers/viewport-invariants';

test.describe('Storyboard capture — web-shell (#235 US1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?storyboardPanel=1');
    // Confirm welcome view loaded.
    await expect(page.locator('.web-shell--welcome')).toBeVisible({
      timeout: 10000,
    });
    await page
      .locator('[data-testid="exercise-list-item-row"]')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    await page
      .locator('[data-testid="exercise-list-item-row"]')
      .first()
      .dblclick();
    await expect(page.locator('.web-shell--analysis')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('[data-testid="time-controller"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('[data-testid="storyboard-panel-rail"]'),
    ).toBeVisible({ timeout: 10000 });
    // Wait for the map to report a viewport into the session store.
    // In headless browsers, Leaflet's first moveend event sometimes
    // misses the round-trip into App's mapViewProps wiring; force one
    // by panning the Leaflet instance directly. The map exposes itself
    // via the dom element's Leaflet `_leaflet_map` ref or via the
    // global; here we drag the .leaflet-pane to trigger a real moveend.
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 5, box.y + box.height / 2);
      await page.mouse.up();
    }
    await page.waitForFunction(
      () => window.__sessionStore?.getState().viewport !== null,
      { timeout: 10000 },
    );
  });

  test('first capture: empty state → naming row → confirm → Scene appears', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="storyboard-empty-state"]'),
    ).toBeVisible();

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'before-capture-press',
    });

    await page.locator('[data-testid="capture-scene-button"]').click();

    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).toBeVisible({ timeout: 5000 });

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'naming-row-open',
    });

    const input = page.locator('[data-testid="storyboard-naming-row-input"]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await input.fill('Exercise Alpha');

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'naming-row-typed',
    });

    await page.locator('[data-testid="storyboard-naming-row-confirm"]').click();

    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).not.toBeVisible({ timeout: 5000 });

    // Wait for the new Storyboard + Scene to land in plotFeatures.
    // The naming row dismisses on resolver fire (synchronous), but
    // createStoryboard + createScene + setCurrentPlot + the
    // window.__currentPlotFeatures effect chain takes a few ticks.
    await page.waitForFunction(
      () => {
        const fc = window.__currentPlotFeatures ?? [];
        let storyboards = 0;
        let scenes = 0;
        for (const f of fc) {
          const k = (f.properties as { kind?: string })?.kind;
          if (k === 'STORYBOARD') storyboards += 1;
          if (k === 'STORYBOARD_SCENE') scenes += 1;
        }
        return storyboards >= 1 && scenes >= 1;
      },
      { timeout: 10000 },
    );

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-confirm',
    });

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

    await expect(
      page.locator('[data-testid="storyboard-session-only-badge"]'),
    ).toBeVisible();
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
  });
});
