/**
 * E2E tests for #235 — web-shell Storyboard capture (US1).
 *
 * Visibility-invariant helper (T029) is exercised at every step so this
 * test alone produces partial SC-001/SC-002 evidence.
 */

import { test, expect } from '@playwright/test';
import { assertViewportControlsRemainAccessible } from '../helpers/viewport-invariants';

test.describe('Storyboard capture — web-shell (#235 US1)', () => {
  // Each test gets generous time to spin up Vite + load the plot +
  // wait for Leaflet's first moveend in headless mode.
  test.setTimeout(120_000);

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
    // Force a Leaflet moveend by panning the map a few px — the headless
    // browser sometimes misses the auto-fitBounds moveend round-trip.
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 10, box.y + box.height / 2);
      await page.mouse.up();
    }
    // Wait for the map to report a viewport into the session store and
    // for the time-controller to push currentTime.
    await page.waitForFunction(
      () =>
        window.__sessionStore?.getState().viewport !== null &&
        window.__sessionStore?.getState().currentTime !== null,
      { timeout: 60000 },
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

  test('subsequent capture at the same timestamp surfaces the collision banner with Replace / Offset / Cancel', async ({
    page,
  }) => {
    // First capture — creates Storyboard + Scene at the current playhead.
    await page.locator('[data-testid="capture-scene-button"]').click();
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="storyboard-naming-row-input"]')
      .fill('Exercise Alpha');
    await page.locator('[data-testid="storyboard-naming-row-confirm"]').click();
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).not.toBeVisible({ timeout: 5000 });
    await page.waitForFunction(
      () => {
        const fc = window.__currentPlotFeatures ?? [];
        return fc.some(
          (f) => (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        );
      },
      { timeout: 10000 },
    );

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-first-capture',
    });

    // Second capture — playhead unchanged, so the same timestamp collides.
    await page.locator('[data-testid="capture-button"]').click();

    // The inline collision banner should appear with all three buttons.
    await expect(
      page.locator('[data-testid="storyboard-collision-banner"]'),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="collision-replace"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="collision-offset"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="collision-cancel"]'),
    ).toBeVisible();

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'collision-banner-open',
    });

    // Cancel — banner dismisses, scene count unchanged.
    await page.locator('[data-testid="collision-cancel"]').click();
    await expect(
      page.locator('[data-testid="storyboard-collision-banner"]'),
    ).not.toBeVisible({ timeout: 3000 });
    const sceneCount = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      return fc.filter(
        (f) => (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
      ).length;
    });
    expect(sceneCount).toBe(1);
  });

  test('collision banner Offset advances the timestamp by 1 s and lands a second Scene', async ({
    page,
  }) => {
    // First capture.
    await page.locator('[data-testid="capture-scene-button"]').click();
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).toBeVisible({ timeout: 5000 });
    await page
      .locator('[data-testid="storyboard-naming-row-input"]')
      .fill('Exercise Bravo');
    await page.locator('[data-testid="storyboard-naming-row-confirm"]').click();
    await expect(
      page.locator('[data-testid="storyboard-naming-row"]'),
    ).not.toBeVisible({ timeout: 5000 });
    await page.waitForFunction(
      () => {
        const fc = window.__currentPlotFeatures ?? [];
        return fc.some(
          (f) => (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        );
      },
      { timeout: 10000 },
    );

    const firstTs = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      const scene = fc.find(
        (f) => (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
      );
      return (scene?.properties as { timestamp?: string })?.timestamp ?? null;
    });
    expect(firstTs).not.toBeNull();

    // Second capture — collision banner appears.
    await page.locator('[data-testid="capture-button"]').click();
    await expect(
      page.locator('[data-testid="storyboard-collision-banner"]'),
    ).toBeVisible({ timeout: 5000 });

    // Click Offset — should advance the timestamp by 1 s and create the Scene.
    await page.locator('[data-testid="collision-offset"]').click();

    // Wait for the second Scene to appear in plot features.
    await page.waitForFunction(
      () => {
        const fc = window.__currentPlotFeatures ?? [];
        return (
          fc.filter(
            (f) =>
              (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
          ).length === 2
        );
      },
      { timeout: 10000 },
    );

    // The new Scene's timestamp should be exactly firstTs + 1000 ms.
    const timestamps = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      return fc
        .filter(
          (f) =>
            (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        )
        .map((f) => (f.properties as { timestamp: string }).timestamp)
        .sort();
    });
    expect(timestamps).toHaveLength(2);
    const firstMs = new Date(timestamps[0]!).getTime();
    const secondMs = new Date(timestamps[1]!).getTime();
    expect(secondMs - firstMs).toBe(1000);

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-offset',
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
