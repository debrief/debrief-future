/**
 * T062 — instant + time-range Scene playback.
 *
 * Asserts that:
 *  - Next/Prev advance / retreat the Scene index.
 *  - The Scene counter reflects the active position.
 *  - The Replay button appears at end-of-Storyboard.
 *  - The time-slider range remains disabled for instant Scenes.
 *
 * Time-range Scene assertions live in the unit-tests for the playback
 * driver — they need synthetic time_range fixtures the dev fixture
 * doesn't yet ship.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;

test('instant Scene transport — Next / Prev / Replay', async ({ page }) => {
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('1 / 4');
  await expect(page.locator('[data-testid="transport-prev"]')).toBeDisabled();

  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('2 / 4');

  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('4 / 4');

  // Replay button shows at end-of-Storyboard.
  await expect(page.locator('[data-testid="transport-replay"]')).toBeVisible();
  await page.locator('[data-testid="transport-replay"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('1 / 4');
});

test('time slider stays disabled for instant Scenes', async ({ page }) => {
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });
  // No time_range Scenes in the dev fixture → slider value shows "—".
  await expect(page.locator('[data-testid="briefing-time-slider-input"]')).toBeDisabled();
});
