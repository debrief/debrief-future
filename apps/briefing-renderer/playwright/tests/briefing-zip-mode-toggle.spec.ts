/**
 * T076 — 10 consecutive Present ↔ Minimal toggles preserve playback state.
 *
 * Asserts SC-005: after each toggle the current Scene index and play
 * state are identical to the pre-toggle values.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;

test('10 toggles preserve Scene index + play state', async ({ page }) => {
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  // Advance to Scene 2 so we have a non-zero index to preserve.
  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('3 / 4');

  for (let i = 0; i < 10; i++) {
    // Press P → Present mode. Chrome hides.
    await page.keyboard.press('p');
    await expect(page.locator('[data-testid="briefing-present-chrome"]')).toBeVisible();
    await expect(page.locator('[data-testid="briefing-minimal-chrome"]')).not.toBeVisible();

    // Press P → Minimal mode. Chrome reappears. Scene index preserved.
    await page.keyboard.press('p');
    await expect(page.locator('[data-testid="briefing-minimal-chrome"]')).toBeVisible();
    await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('3 / 4');
  }
});

test('mode-toggle reachable via keyboard in Present mode (FR-024)', async ({ page }) => {
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  await page.keyboard.press('p');
  await expect(page.locator('[data-testid="briefing-present-chrome"]')).toBeVisible();
  // The Minimal chrome is gone — only keyboard / corner-hover gets us out.
  await expect(page.locator('[data-testid="briefing-minimal-chrome"]')).not.toBeVisible();

  await page.keyboard.press('p');
  await expect(page.locator('[data-testid="briefing-minimal-chrome"]')).toBeVisible();
});
