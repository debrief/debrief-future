/**
 * #273 — live-preview playback capture.
 *
 * The Preview button opens exactly this renderer. To show the *payoff* of
 * Preview (the briefing actually playing), this spec drives the built SPA
 * through the dev-fixture storyboard — the same Channel Crossing narrative
 * the renderer ships — and captures a frame per scene plus Present mode,
 * straight into the #273 media folder so the blog post can embed them.
 *
 * Run: `node run-playwright.mjs preview-capture` (cloud).
 */
import { test } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { SELECTORS, waitForReady } from './helpers';

const MEDIA_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/273-storyboard-preview-button/media/images',
);

test.describe('briefing renderer — #273 preview playback capture', () => {
  test('captures the storyboard playing back, scene by scene', async ({ page }) => {
    test.setTimeout(120_000);

    const shot = async (name: string): Promise<void> => {
      await page.screenshot({ path: `${MEDIA_DIR}/${name}.png` });
    };

    await page.goto('/');
    await waitForReady(page);
    // Settle the initial flyTo to Scene 1's viewport.
    await page.waitForTimeout(1400);
    await shot('preview-scene-1-overview');

    // Step through the remaining scenes with the transport Next control —
    // this is what an author watches after clicking Preview.
    const next = page.locator(SELECTORS.nextButton);
    const labels = ['preview-scene-2-approach', 'preview-scene-3-convergence', 'preview-scene-4-timerange'];
    for (const label of labels) {
      await next.click();
      await page.waitForTimeout(1700);
      await shot(label);
    }

    // Present mode — press P to hide all chrome and fill the screen.
    await page.keyboard.press('p');
    await page.waitForTimeout(900);
    await shot('preview-present-mode');
  });
});
