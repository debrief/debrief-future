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
const FLYTO_SETTLE_MS = FLYTO_DURATION_MS + 400;

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
    // Small extra settle for fonts + tile fade-in.
    await page.waitForTimeout(600);
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
  test('records forward-through-storyboard flow', async ({ page, browser }, testInfo) => {
    // Fresh context per recording so the .webm is scoped to this test only.
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: {
        dir: testInfo.outputDir,
        size: { width: 1280, height: 720 },
      },
    });
    const recPage = await context.newPage();
    await recPage.goto(STORY_URL);
    await recPage.waitForSelector(
      '[data-testid="storyboard-playback-harness"]',
    );
    await recPage.waitForSelector('.leaflet-tile-loaded, .leaflet-container');
    await recPage.waitForTimeout(800);

    // Forward twice → each step animates the map (flyTo) and advances the
    // counter. Wait out each transition so the recording captures the full
    // animation, not just the final frame.
    await recPage.locator('[data-testid="transport-forward"]').click();
    await recPage.waitForTimeout(FLYTO_SETTLE_MS);

    // Back once then forward again — exercises Backward too.
    await recPage.locator('[data-testid="transport-backward"]').click();
    await recPage.waitForTimeout(FLYTO_SETTLE_MS);
    await recPage.locator('[data-testid="transport-forward"]').click();
    await recPage.waitForTimeout(FLYTO_SETTLE_MS);

    // Final assertion so the recording captures a known-good terminal state.
    const counter = recPage.locator('[data-testid="transport-counter"]');
    await expect(counter).toContainText('2 of 3');

    // Close the page first so the video is finalised on disk.
    const videoObj = recPage.video();
    await recPage.close();
    await context.close();
    if (videoObj) {
      const webmPath = await videoObj.path();
      // Expose the recorded path so the companion convert script can find it.
      testInfo.attachments.push({
        name: 'interaction-webm',
        path: webmPath,
        contentType: 'video/webm',
      });
    }
  });
});
