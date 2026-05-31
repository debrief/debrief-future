/**
 * E2E tests for #235 — web-shell Storyboard capture (US1).
 *
 * Visibility-invariant helper (T029) is exercised at every step so this
 * test alone produces partial SC-001/SC-002 evidence.
 */

import { test, expect } from '@playwright/test';
import { assertViewportControlsRemainAccessible } from '../helpers/viewport-invariants';
import { openCapturablePlot } from '../helpers/openCapturablePlot';

test.describe('Storyboard capture — web-shell (#235 US1)', () => {
  // Each test gets generous time to spin up Vite + load the plot +
  // wait for Leaflet's first moveend in headless mode.
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    // Open a track-bearing, temporal plot so capture has a viewport AND a
    // currentTime. (The recency-sorted .first() row can be a non-temporal
    // "areas" plot whose missing currentTime hangs this setup — see
    // helpers/openCapturablePlot.ts.)
    await openCapturablePlot(page);
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

    await page.locator('[data-testid="capture-button"]').click();

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

    // #236 — badge is now gated on the StacWriter's CapabilityReport,
    // not on the mere presence of storyboard content. With IndexedDB
    // available (the default in Playwright's chromium), captures
    // persist via the writer and the badge stays hidden. The previous
    // assertion (`toBeVisible`) reflected the pre-#236 reality where
    // the badge was unconditional once any storyboard content existed.
    // The badge-visible-when-IDB-unavailable behaviour is covered by
    // stac-writes.spec.ts ('before — IndexedDB unavailable').
    await expect(
      page.locator('[data-testid="storyboard-session-only-badge"]'),
    ).toBeHidden();
  });

  test('subsequent capture at the same timestamp now succeeds (#259 — relaxed constraint)', async ({
    page,
  }) => {
    // First capture — creates Storyboard + Scene at the current playhead.
    await page.locator('[data-testid="capture-button"]').click();
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

    // #259 — second capture at the same timestamp now succeeds silently.
    // No collision banner; the new Scene appends to the tied group.
    await page.locator('[data-testid="capture-button"]').click();

    // Wait for the second Scene to land (no banner to interact with).
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

    // The collision banner is structurally gone — assert it never appears.
    await expect(
      page.locator('[data-testid="storyboard-collision-banner"]'),
    ).not.toBeVisible();

    // Both Scenes share the timestamp; creation_order differs.
    const scenes = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      return fc
        .filter(
          (f) =>
            (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        )
        .map((f) => ({
          timestamp: (f.properties as { timestamp: string }).timestamp,
          creation_order: (f.properties as { creation_order: number })
            .creation_order,
        }));
    });
    expect(scenes).toHaveLength(2);
    expect(scenes[0]!.timestamp).toBe(scenes[1]!.timestamp);
    expect(scenes[0]!.creation_order).not.toBe(scenes[1]!.creation_order);

    await assertViewportControlsRemainAccessible(page, {
      checkId: 'after-tied-capture',
    });
  });

  // #259 — Offset / Replace / Cancel banner tests removed. The collision
  // banner is structurally gone now that captures unconditionally succeed
  // at the timestamp level.

  test('cancel naming row leaves rail empty (no Storyboard, no Scene)', async ({
    page,
  }) => {
    await expect(
      page.locator('[data-testid="storyboard-empty-state"]'),
    ).toBeVisible();
    await page.locator('[data-testid="capture-button"]').click();
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
