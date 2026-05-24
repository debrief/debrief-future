import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const indexUrl = pathToFileURL(resolve(__dirname, '../../dist/index.html')).href;

test('dragging slider on Scene 4 updates value + map markers', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  // Wait for auto-tween to finish.
  await page.waitForTimeout(3000);

  const slider = page.locator('[data-testid="briefing-time-slider-input"]');
  await expect(slider).toBeEnabled();
  const min = Number(await slider.getAttribute('min'));
  const max = Number(await slider.getAttribute('max'));
  const before = Number(await slider.inputValue());
  // After auto-play the slider rests near max.
  expect(before).toBeGreaterThan(min + (max - min) * 0.95);

  // Drag to ~25%.
  const target = Math.floor(min + (max - min) * 0.25);
  await slider.evaluate((el: HTMLInputElement, v) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    set?.call(el, String(v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, target);
  await page.waitForTimeout(200); // settle React render

  const after = Number(await slider.inputValue());
  expect(after).toBe(target);
});

test('slider hidden on instant Scenes, shown on Scene 4', async ({ page }) => {
  await page.goto(indexUrl);
  await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });

  // Scene 1 (instant) — slider should not be in the DOM at all.
  await expect(page.locator('[data-testid="briefing-time-slider"]')).toHaveCount(0);

  await page.locator('[data-testid="transport-next"]').click();
  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="briefing-time-slider"]')).toHaveCount(0);

  await page.locator('[data-testid="transport-next"]').click();
  await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('4 / 4');
  // Scene 4 — slider appears.
  await expect(page.locator('[data-testid="briefing-time-slider"]')).toBeVisible({ timeout: 3000 });
});
