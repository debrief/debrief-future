/**
 * #273 — live Preview workflow E2E (US1) + headline media capture.
 *
 * Drives the *real* preview launch path end-to-end on the web-shell surface:
 *   1. Open a plot with two vessel tracks (Saxon Warrior — Twin CPA:
 *      HMS Richmond + Contact Alpha, a closest-point-of-approach exercise).
 *   2. Capture four Scenes at distinct viewports + times by panning /
 *      zooming the live Leaflet map and advancing the time slider between
 *      captures — so playback visibly flies between framings.
 *   3. Click **Preview** → assert the briefing-renderer opens in a new tab
 *      loaded live from a `?features=blob:` URL and reaches `ready`.
 *   4. Step the transport through the Scenes and capture the playback at
 *      each, plus Present mode — the media the feature post embeds.
 *
 * Regression guard for ADR-035: the captured Scenes' `visible_feature_ids`
 * must reference the two tracks (by their top-level GeoJSON `id`), so
 * `scopeStoryboard` carries them into the preview and the renderer draws
 * them. Before the fix, capture read the non-existent `properties.id` and
 * the preview map was empty.
 *
 * Screenshots land in specs/273-storyboard-preview-button/evidence/screenshots/.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { StoryboardPanelPage } from '../pages/StoryboardPanelPage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(
  __dirname,
  '../../../../specs/273-storyboard-preview-button/evidence/screenshots',
);
mkdirSync(SHOTS, { recursive: true });
const shot = (name: string): string => resolve(SHOTS, name);

// Subject: "Saxon Warrior: Twin Cpa" (core--twin-cpa) — two LineString
// tracks (HMS Richmond + Contact Alpha) in the Channel / Western Approaches
// sample set; an ideal briefing subject (two vessels converging at a CPA).

/** Screen-space union bbox of the rendered vessel tracks (SVG paths). */
async function trackBBox(
  page: Page,
): Promise<{ cx: number; cy: number; w: number; h: number } | null> {
  return page.evaluate(() => {
    const paths = Array.from(
      document.querySelectorAll('.leaflet-overlay-pane path'),
    );
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const p of paths) {
      const r = (p as SVGPathElement).getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      x0 = Math.min(x0, r.left);
      y0 = Math.min(y0, r.top);
      x1 = Math.max(x1, r.right);
      y1 = Math.max(y1, r.bottom);
    }
    if (!Number.isFinite(x0)) return null;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  });
}

/** Pan so the vessel tracks' centre sits at the map centre (keeps them framed). */
async function centreTracks(page: Page): Promise<void> {
  const box = await page.locator('.leaflet-container').boundingBox();
  const tb = await trackBBox(page);
  if (!box || !tb) return;
  const targetX = box.x + box.width / 2;
  const targetY = box.y + box.height / 2;
  const dx = targetX - tb.cx;
  const dy = targetY - tb.cy;
  if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
  await page.mouse.move(targetX, targetY);
  await page.mouse.down();
  await page.mouse.move(targetX + dx, targetY + dy, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(350);
}

/** Zoom one level toward the (re-centred) tracks via a double-click. */
async function zoomInOnTracks(page: Page): Promise<void> {
  await centreTracks(page);
  const box = await page.locator('.leaflet-container').boundingBox();
  if (!box) return;
  // Double-click slightly off the exact crossing so we don't fight a track
  // selection, but close enough that the +1 zoom stays framed on the action.
  await page.mouse.dblclick(box.x + box.width / 2 + 8, box.y + box.height / 2 - 8);
  await page.waitForTimeout(900);
  await centreTracks(page);
}

/** Move the playhead to a fraction across the plot's time range. */
async function setTimeFraction(page: Page, frac: number): Promise<void> {
  await page.evaluate((f) => {
    const store = window.__sessionStore;
    const tr = store?.getState().timeRange;
    if (!store || !tr) return;
    store.getState().setCurrentTime(tr.start + (tr.end - tr.start) * f);
  }, frac);
  await page.waitForTimeout(150);
}

/** Wait for the briefing renderer (popup) to finish booting + settling a flyTo. */
async function waitRendererReady(popup: Page): Promise<void> {
  const error = popup.locator('[data-testid="briefing-error"]');
  const map = popup.locator('[data-testid="briefing-map"]');
  await Promise.race([
    map.waitFor({ state: 'visible', timeout: 30_000 }),
    error.waitFor({ state: 'visible', timeout: 30_000 }),
  ]);
  if (await error.isVisible()) {
    const detail = await error.textContent();
    throw new Error(`Briefing renderer reported an error state: ${detail ?? ''}`);
  }
  // Wait for the OSM basemap to actually paint, then let the Scene-0 flyTo
  // (1s) settle. (The browser context ignores HTTPS errors so the cloud
  // env's TLS-intercepting proxy doesn't block the tiles — real users hit
  // OSM directly.)
  await popup
    .locator('.leaflet-tile-loaded')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 });
  await popup.waitForTimeout(2_500);
}

/** Advance one Scene in the renderer transport and let the flyTo settle. */
async function nextScene(popup: Page): Promise<void> {
  await popup.locator('[data-testid="transport-next"]').click();
  await popup.waitForTimeout(2_000);
}

test.describe('#273 — Storyboard live Preview (web-shell)', () => {
  test.setTimeout(300_000);

  test('capture → Preview → renderer plays the active storyboard with its tracks', async ({
    browser,
  }) => {
    // Own context so we can ignore HTTPS errors: the cloud test env routes
    // egress through a TLS-intercepting proxy whose CA the bundled Chromium
    // doesn't trust, which would otherwise block the OSM basemap tiles. Real
    // users reach OSM directly; this only affects the screenshot env.
    const context = await browser.newContext({
      baseURL: 'http://localhost:5173',
      viewport: { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const panel = new StoryboardPanelPage(page);

    // ── Load the Saxon Warrior plot with the rail enabled ──────────────
    await page.goto('/?storyboardPanel=1');
    await expect(page.locator('.web-shell--welcome')).toBeVisible({
      timeout: 20_000,
    });
    // Quick-search the catalog down to the twin-track exercise, then open it
    // through the real selection path (double-click → handlePlotSelect).
    const search = page.getByTestId('quick-search-input');
    await search.waitFor({ state: 'visible', timeout: 20_000 });
    await search.fill('Twin Cpa');
    const twinRow = page
      .locator('[data-testid="exercise-list-item-row"]')
      .filter({ hasText: 'Twin Cpa' });
    await twinRow.first().waitFor({ state: 'visible', timeout: 15_000 });
    await twinRow.first().dblclick();

    await expect(page.locator('.web-shell--analysis')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('.leaflet-container')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.locator('[data-testid="time-controller"]'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator('[data-testid="storyboard-panel-rail"]'),
    ).toBeVisible({ timeout: 15_000 });
    // Let the basemap tiles paint so captured thumbnails are meaningful.
    await page
      .locator('.leaflet-tile-loaded')
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => undefined);
    await page.waitForTimeout(1_000);

    // Tracks must be rendered before we can frame on them.
    await page
      .locator('.leaflet-overlay-pane path')
      .first()
      .waitFor({ state: 'attached', timeout: 20_000 });

    // Seed an initial (framed) viewport into the store before capture #1.
    await centreTracks(page);
    await page.waitForFunction(
      () =>
        window.__sessionStore?.getState().viewport !== null &&
        window.__sessionStore?.getState().currentTime !== null,
      { timeout: 60_000 },
    );

    // ── Capture four Scenes: progressively closing on the CPA over time ─
    // Scene 1 — opening overview, both tracks in frame, start of the run.
    await setTimeFraction(page, 0);
    await centreTracks(page);
    await panel.firstCapture('Saxon Warrior — Twin CPA');

    // Scene 2 — fly in on the approach.
    await zoomInOnTracks(page);
    await setTimeFraction(page, 0.35);
    await panel.subsequentCapture();

    // Scene 3 — the closest point of approach (tighter still).
    await zoomInOnTracks(page);
    await setTimeFraction(page, 0.65);
    await panel.subsequentCapture();

    // Scene 4 — the closing geometry, near the end of the timeline.
    await zoomInOnTracks(page);
    await setTimeFraction(page, 0.95);
    await panel.subsequentCapture();

    const rows = await panel.getSceneRows();
    expect(rows.length, 'expected four captured Scenes').toBe(4);

    // The trigger: the panel showing the captured storyboard + Preview.
    await expect(panel.previewButton).toBeEnabled();
    await page.screenshot({
      path: shot('preview-trigger-webshell.png'),
      fullPage: false,
    });

    // ── Launch the live Preview ────────────────────────────────────────
    const popup = await panel.openPreview();
    // The renderer is opened at `<base>briefing-renderer/?features=<url>`
    // where the features URL is an encodeURIComponent'd blob: object URL, so
    // the query reads `features=blob%3A…`.
    expect(popup.url(), 'renderer launched live from a features blob URL').toMatch(
      /\/briefing-renderer\/\?features=blob/,
    );
    await waitRendererReady(popup);

    // Scene 1 of the briefing (the renderer opens on the first Scene).
    await expect(
      popup.locator('[data-testid="transport-scene-index"]'),
    ).toHaveText('1 / 4');
    await popup.screenshot({ path: shot('preview-scene-1-overview.png') });
    // Headline: the renderer playing live in its own tab.
    await popup.screenshot({ path: shot('preview-playback-webshell.png') });

    await nextScene(popup);
    await popup.screenshot({ path: shot('preview-scene-2-approach.png') });

    await nextScene(popup);
    await popup.screenshot({ path: shot('preview-scene-3-convergence.png') });

    await nextScene(popup);
    await popup.screenshot({ path: shot('preview-scene-4-closing.png') });

    // Present mode — `P` hides the chrome and the map fills the screen.
    await popup.keyboard.press('p');
    await popup.waitForTimeout(800);
    await popup.screenshot({ path: shot('preview-present-mode.png') });

    // ── Assertions (after media is captured) ───────────────────────────
    // ADR-035 regression guard: captured Scenes reference the two tracks by
    // their top-level id, so scopeStoryboard carries them into the preview.
    const sceneVisibleCounts = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      return fc
        .filter(
          (f) =>
            (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        )
        .map(
          (f) =>
            ((f.properties as { visible_feature_ids?: unknown[] })
              .visible_feature_ids ?? []).length,
        );
    });
    expect(
      sceneVisibleCounts.length,
      'four scenes recorded',
    ).toBe(4);
    expect(
      sceneVisibleCounts.every((n) => n >= 2),
      `every Scene must reference both tracks — got ${JSON.stringify(sceneVisibleCounts)}`,
    ).toBe(true);

    // The renderer actually drew the track geometry (SVG paths in the
    // overlay pane) — the preview is not an empty map.
    const trackPaths = await popup
      .locator('.leaflet-overlay-pane path')
      .count();
    expect(trackPaths, 'renderer drew the vessel tracks').toBeGreaterThan(0);

    await popup.close();
    await context.close();
  });
});
