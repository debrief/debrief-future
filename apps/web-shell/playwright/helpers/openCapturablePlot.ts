/**
 * Shared web-shell E2E helper: open a plot that supports the storyboard
 * capture flow (#235/#259/#273).
 *
 * Capture needs both a map viewport AND a `currentTime` (a Scene carries a
 * timestamp). The recency-sorted catalog `.first()` row is non-deterministic
 * and can be a non-temporal "areas" plot (e.g. `core--analysis1-areas`, three
 * RECTANGLE polygons with no per-position timestamps). For such a plot
 * `calculateTimeExtent` returns null, `currentTime` is never set, and the
 * capture-readiness wait (`viewport && currentTime`) hangs to the test
 * timeout — which is exactly how storyboard-capture / tied-timestamps /
 * storyboard-screenshots regressed when the first row became areas-only.
 *
 * It deep-links straight to a known track-bearing, temporal exercise
 * ("Saxon Warrior: Twin Cpa" — two vessel tracks) via the `?plot=` auto-open
 * path (#174). That is deterministic — unlike quick-search + double-click,
 * whose debounced filter race intermittently left the row un-clickable.
 */
import { expect, type Page } from '@playwright/test';

/** Catalog item path of a deterministic track-bearing, temporal plot. */
export const CAPTURABLE_PLOT_PATH = './core--twin-cpa/item.json';

export async function openCapturablePlot(page: Page): Promise<void> {
  // `?plot=` is handled after stacService.init() resolves, so the catalog is
  // ready before the auto-open fires; `?storyboardPanel=1` enables the rail.
  await page.goto(
    `/?storyboardPanel=1&plot=${encodeURIComponent(CAPTURABLE_PLOT_PATH)}`,
  );

  await expect(page.locator('.web-shell--analysis')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('.leaflet-container')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-testid="time-controller"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.locator('[data-testid="storyboard-panel-rail"]'),
  ).toBeVisible({ timeout: 15_000 });

  // Force a Leaflet moveend (the headless browser sometimes misses the
  // auto-fitBounds round-trip) so the viewport lands in the session store.
  const box = await page.locator('.leaflet-container').boundingBox();
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 12, cy, { steps: 6 });
    await page.mouse.up();
  }

  await page.waitForFunction(
    () =>
      window.__sessionStore?.getState().viewport !== null &&
      window.__sessionStore?.getState().currentTime !== null,
    { timeout: 60_000 },
  );
}
