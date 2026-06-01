/**
 * Evidence-producer spec (#280, T015) — captures a sequence of PNG frames
 * of the Trail Scene as the slider scrubs the playback window from start to
 * end. The frames are written to a temp dir and assembled into
 * `evidence/screenshots/interaction.gif` by `scripts/make-trail-gif.mjs`.
 *
 * This is not a behavioural assertion (that lives in
 * briefing-zip-trail-mode.spec.ts) — it only writes frames, so it is cheap
 * and side-effect-only.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;
const framesDir = '/tmp/trail-gif-frames';

test('capture trail-growth frames for the interaction GIF', async ({ page }) => {
  test.setTimeout(90_000);
  mkdirSync(framesDir, { recursive: true });

  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  // Advance to the Trail Scene (Scene 4) and let the entry tween settle.
  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('4 / 4');
  const slider = page.locator('[data-testid="briefing-time-slider-input"]');
  await expect(slider).toBeEnabled();
  await page.waitForTimeout(3000);

  const min = Number(await slider.getAttribute('min'));
  const max = Number(await slider.getAttribute('max'));

  const FRAMES = 14;
  for (let i = 0; i < FRAMES; i++) {
    const value = Math.round(min + ((max - min) * i) / (FRAMES - 1));
    await slider.evaluate((el: HTMLInputElement, v) => {
      const set = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      set?.call(el, String(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
    await page.waitForTimeout(220);
    await page.screenshot({
      path: `${framesDir}/frame-${String(i).padStart(2, '0')}.png`,
      fullPage: false,
    });
  }
});
