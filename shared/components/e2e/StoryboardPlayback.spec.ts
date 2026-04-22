/**
 * Integrated Storybook E2E for feature 217 — drives the full
 * StoryboardPanel + MapView playback flow end-to-end.
 *
 * Produces the three artefacts that were originally scoped as
 * VS Code webview E2E (interaction GIF, hardblock screenshot,
 * dropdown-switch screenshot). Web-shell / Storybook is the
 * correct preview environment — no VS Code host required.
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const STORY_URL =
  '/iframe.html?id=panels-storyboardplayback--integrated-playback';

const EVIDENCE_DIR_217 = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/217-storyboarding-playback/evidence/screenshots',
);

const FLYTO_DURATION_MS = 600;
// Give Leaflet's tile layer time to download + render after each flyTo
// lands on a new viewport — otherwise the recording captures blank tiles
// during the post-transition frame.
const FLYTO_SETTLE_MS = FLYTO_DURATION_MS + 2000;
// Initial tile-load settle after the harness renders, before any
// interaction starts. Longer than FLYTO_SETTLE_MS because the first
// paint of the base tile layer from a cold cache is the slowest step.
const INITIAL_TILE_SETTLE_MS = 2500;

test.describe('StoryboardPlayback — integrated flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(STORY_URL);
    await page.waitForSelector(
      '[data-testid="storyboard-playback-harness"]',
    );
    // Wait for the Leaflet tiles layer to paint so screenshots show the
    // basemap, not a white void.
    await page.waitForSelector('.leaflet-tile-loaded, .leaflet-container');
    // Let tiles download + render before any interaction begins.
    await page.waitForTimeout(INITIAL_TILE_SETTLE_MS);
  });

  test('dropdown switch refreshes Scene rectangles', async ({ page }) => {
    // Start on Commander's view — confirm.
    const select = page.locator('[data-testid="storyboard-header-select"]');
    await expect(select).toHaveValue('sb-commander');
    // Switch to ASW evidence — rectangles repaint to the 3 ASW scenes.
    await select.selectOption('sb-asw');
    await page.waitForTimeout(500);
    // After switch, the map's SceneRectangleLayer renders 3 polygons for
    // ASW (different bbox centres). The transport counter resets to "1 of 3".
    const counter = page.locator('[data-testid="transport-counter"]');
    await expect(counter).toContainText('1 of 3');
    await page.screenshot({
      path: `${EVIDENCE_DIR_217}/e2e-dropdown-switch.png`,
    });
  });

  test('forward onto a blocked scene surfaces HardBlockModal', async ({
    page,
  }) => {
    // The commander's 3rd scene is configured as `blocked: true`.
    // Two Forward clicks → first advances to Scene 2 (ok), second tries
    // Scene 3 → blocked → modal surfaces.
    await page.locator('[data-testid="transport-forward"]').click();
    await page.waitForTimeout(FLYTO_SETTLE_MS);
    await page.locator('[data-testid="transport-forward"]').click();
    // Modal renders as an overlay with the HardBlockModal inside.
    const overlay = page.locator('[data-testid="hard-block-overlay"]');
    await expect(overlay).toBeVisible();
    const dialog = page.locator('[data-testid="hard-block-modal"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toContainText('track-nimitz');
    await page.screenshot({
      path: `${EVIDENCE_DIR_217}/e2e-hardblock.png`,
    });
  });
});

// ── Interaction GIF capture ────────────────────────────────────────────
//
// The recordVideo-produced .webm lives under `test-results/`. A companion
// Node script converts it to `interaction.gif` (ffmpeg). If ffmpeg isn't
// available in the environment, the .webm itself is committed as the
// interaction artefact — GIF is a convenience format.

test.describe('StoryboardPlayback — interaction recording', () => {
  // Playwright's recordVideo (WebM, compositor-level) doesn't capture
  // Leaflet tile-layer rasters reliably on Chromium. Screenshots do.
  // So we drive the interaction and grab a PNG frame every ~120ms over
  // the entire flow, then stitch them into a GIF via ffmpeg.
  //
  // The result is a true representation of what the analyst sees —
  // tiles, rectangles, panel state, and the scene-row highlight
  // transitioning in lock-step with the map flyTo animation.

  test('frames forward-through-storyboard flow', async ({
    page,
  }, testInfo) => {
    const framesDir = testInfo.outputDir;
    const FRAME_INTERVAL_MS = 120;
    let frameIdx = 0;

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(STORY_URL);
    await page.waitForSelector(
      '[data-testid="storyboard-playback-harness"]',
    );
    await page.waitForSelector('.leaflet-tile-loaded, .leaflet-container');
    // Let tiles settle at the initial viewport before the first click.
    await page.waitForTimeout(INITIAL_TILE_SETTLE_MS);

    // Frame grabber — runs in parallel with the interactions. We capture
    // PNGs only of the right-hand map region (avoiding the panel, which
    // is mostly static) to keep individual frames small. A timer loop
    // keeps firing until we cancel it after the last interaction.
    let grabbing = true;
    const grabLoop = (async (): Promise<void> => {
      while (grabbing) {
        const path = `${framesDir}/frame-${String(frameIdx).padStart(4, '0')}.png`;
        try {
          await page.screenshot({ path, clip: { x: 380, y: 0, width: 900, height: 480 } });
        } catch {
          // Page may be closing; ignore and exit loop.
          break;
        }
        frameIdx += 1;
        await page.waitForTimeout(FRAME_INTERVAL_MS);
      }
    })();

    // Drive the interaction — Forward, Backward, Forward. Same pattern
    // as the WebM recording.
    await page.locator('[data-testid="transport-forward"]').click();
    await page.waitForTimeout(FLYTO_SETTLE_MS);

    await page.locator('[data-testid="transport-backward"]').click();
    await page.waitForTimeout(FLYTO_SETTLE_MS);

    await page.locator('[data-testid="transport-forward"]').click();
    await page.waitForTimeout(FLYTO_SETTLE_MS);

    grabbing = false;
    await grabLoop;

    const counter = page.locator('[data-testid="transport-counter"]');
    await expect(counter).toContainText('2 of 3');

    // Emit the frames directory as an attachment so the post-run ffmpeg
    // script knows where to find them.
    testInfo.attachments.push({
      name: 'interaction-frames-dir',
      path: framesDir,
      contentType: 'text/plain',
    });
  });
});
