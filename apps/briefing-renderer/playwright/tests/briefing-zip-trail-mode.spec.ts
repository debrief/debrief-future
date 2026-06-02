/**
 * #280 — Briefing renderer honours per-Scene `display_mode` (Full / Trail).
 *
 * Contract C (observable rendering behaviour), driven end-to-end against the
 * built `dist/index.html`:
 *
 *   C1–C3 (US1, T008): on a Trail Scene the rendered trail grows from
 *     near-zero at the window start to the full track at the end. Captures
 *     the evidence PNGs trail-start / trail-growth / trail-end.
 *   C4   (US2, T010): on a Full Scene the rendered track length is constant
 *     at start / middle / end.
 *   C5   (US2, T010): a legacy Scene (no `display_mode`) shows the full track
 *     and emits no console error.
 *   US3  (T012): a briefing mixing Trail and Full Scenes applies the right
 *     mode per Scene as the viewer navigates between them.
 *
 * Trail length is measured from a hidden, deterministic per-track node
 * (`[data-testid="trail-len-<id>"]` carrying `data-count`) — robust to
 * Leaflet's polyline simplification, which makes counting from the SVG path
 * `d` attribute unreliable.
 */

import { test, expect, type Page } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;
const evidenceRoot = resolve(
  __dirname,
  '../../../../specs/280-briefing-trail-mode/evidence/screenshots',
);

// Dev-fixture identifiers (see src/fixtures/dev-fixture.ts).
const TRACK_ALPHA_ID = '01HKVZ0DEVTRACKALPHA00000';
const TRAIL_SCENE_INDEX = 3; // "Trail scrub — the snail-trail grows (#280)"
const FULL_SCENE_INDEX = 0; // "Exercise overview" — display_mode: 'full'
const LEGACY_SCENE_INDEX = 1; // "Track-Alpha approaches" — no display_mode

/** Read the rendered vertex count for a track at the current playback time. */
async function trailVertexCount(page: Page, trackId: string): Promise<number> {
  const node = page.locator(`[data-testid="trail-len-${trackId}"]`);
  await expect(node).toHaveCount(1);
  const raw = await node.getAttribute('data-count');
  return Number(raw);
}

/** The active mode the renderer resolved for the current Scene. */
async function activeMode(page: Page): Promise<string | null> {
  return page.locator('[data-testid="trail-layer"]').getAttribute('data-mode');
}

/** Drive the store's playback clock directly (deterministic sampling). */
async function setTime(page: Page, epochMs: number): Promise<void> {
  await page.evaluate((ms) => {
    (
      window as unknown as { __briefingTestHelpers__?: { setTime: (ms: number) => void } }
    ).__briefingTestHelpers__?.setTime(ms);
  }, epochMs);
  await page.waitForTimeout(120); // settle React render
}

/** Jump the active Scene directly (bypasses transport clicks). */
async function gotoScene(page: Page, index: number): Promise<void> {
  await page.evaluate((i) => {
    (
      window as unknown as { __briefingTestHelpers__?: { gotoScene: (i: number) => void } }
    ).__briefingTestHelpers__?.gotoScene(i);
  }, index);
}

test.describe('#280 trail-mode rendering', () => {
  test('US1 — Trail Scene: track grows from start to full (C1–C3) + evidence', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

    // Advance to the Trail Scene (time-range, slider-driven).
    await page.locator('[data-testid="transport-next"]').click();
    await page.locator('[data-testid="transport-next"]').click();
    await page.locator('[data-testid="transport-next"]').click();
    await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('4 / 4');

    const slider = page.locator('[data-testid="briefing-time-slider-input"]');
    await expect(slider).toBeEnabled();
    // Let the entry auto-tween finish so it stops writing currentTime.
    await page.waitForTimeout(3000);

    // Confirm the renderer resolved Trail mode for this Scene.
    expect(await activeMode(page)).toBe('trail');

    const min = Number(await slider.getAttribute('min'));
    const max = Number(await slider.getAttribute('max'));
    const mid = Math.floor(min + (max - min) * 0.5);

    const driveSlider = async (value: number): Promise<void> => {
      await slider.evaluate((el: HTMLInputElement, v) => {
        const set = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        set?.call(el, String(v));
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, value);
      await page.waitForTimeout(250); // settle React + Leaflet
    };

    // C1 — window start: near-zero trail.
    await driveSlider(min);
    const startLen = await trailVertexCount(page, TRACK_ALPHA_ID);
    await page.screenshot({ path: `${evidenceRoot}/trail-start.png`, fullPage: false });

    // C2 — mid window: the trail has grown (the "after" hero shot).
    await driveSlider(mid);
    const midLen = await trailVertexCount(page, TRACK_ALPHA_ID);
    await page.screenshot({ path: `${evidenceRoot}/trail-growth.png`, fullPage: false });

    // C3 — window end: the full track is drawn.
    await driveSlider(max);
    const endLen = await trailVertexCount(page, TRACK_ALPHA_ID);
    await page.screenshot({ path: `${evidenceRoot}/trail-end.png`, fullPage: false });

    // SC-001 — visible length increases monotonically and ends at the full track.
    expect(startLen).toBeLessThan(midLen);
    expect(midLen).toBeLessThan(endLen);
    expect(startLen).toBeLessThanOrEqual(2); // near-zero at the start
  });

  test('US2 — Full Scene: track length constant at start/mid/end (C4)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

    await gotoScene(page, FULL_SCENE_INDEX);
    await page.waitForTimeout(800);
    expect(await activeMode(page)).toBe('full');

    // The exercise window (see dev-fixture T0 / T_END).
    const T0 = Date.UTC(2025, 0, 15, 12, 0, 0);
    const T_END = Date.UTC(2025, 0, 15, 16, 0, 0);
    const TMID = Math.floor((T0 + T_END) / 2);

    await setTime(page, T0);
    const atStart = await trailVertexCount(page, TRACK_ALPHA_ID);
    await setTime(page, TMID);
    const atMid = await trailVertexCount(page, TRACK_ALPHA_ID);
    await setTime(page, T_END);
    const atEnd = await trailVertexCount(page, TRACK_ALPHA_ID);

    expect(atStart).toBe(atMid);
    expect(atMid).toBe(atEnd);
    expect(atStart).toBeGreaterThan(2); // the whole track, not a trail
    expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0);
  });

  test('US2 — legacy Scene (no display_mode): full track, no error (C5)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

    await gotoScene(page, LEGACY_SCENE_INDEX);
    await page.waitForTimeout(800);
    // Absent display_mode is treated as Full (FR-003).
    expect(await activeMode(page)).toBe('full');

    const T0 = Date.UTC(2025, 0, 15, 12, 0, 0);
    await setTime(page, T0);
    const len = await trailVertexCount(page, TRACK_ALPHA_ID);
    expect(len).toBeGreaterThan(2); // full track from the first frame
    expect(errors, `console errors: ${errors.join('\n')}`).toHaveLength(0);
  });

  test('US3 — mixed briefing applies the right mode per Scene (FR-005)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

    const T0 = Date.UTC(2025, 0, 15, 12, 0, 0);

    // Trail Scene → grows: at T0 only the first vertex shows.
    await gotoScene(page, TRAIL_SCENE_INDEX);
    await page.waitForTimeout(3000); // let the entry tween settle
    expect(await activeMode(page)).toBe('trail');
    await setTime(page, T0);
    const trailAtStart = await trailVertexCount(page, TRACK_ALPHA_ID);
    expect(trailAtStart).toBeLessThanOrEqual(2);

    // Move to the Full Scene → whole track at the same time origin.
    await gotoScene(page, FULL_SCENE_INDEX);
    await page.waitForTimeout(800);
    expect(await activeMode(page)).toBe('full');
    await setTime(page, T0);
    const fullAtStart = await trailVertexCount(page, TRACK_ALPHA_ID);
    expect(fullAtStart).toBeGreaterThan(trailAtStart);

    // Return to the Trail Scene → trail behaviour applies again.
    await gotoScene(page, TRAIL_SCENE_INDEX);
    await page.waitForTimeout(3000);
    expect(await activeMode(page)).toBe('trail');
    await setTime(page, T0);
    const trailAgain = await trailVertexCount(page, TRACK_ALPHA_ID);
    expect(trailAgain).toBeLessThanOrEqual(2);
  });
});
