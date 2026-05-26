/**
 * T074-T075 — component-isolation captures for TransportBar + ModeToggle.
 *
 * The briefing renderer does not ship Storybook (it's a tiny SPA — three
 * components, all consumed by one app). Instead, the App's `?story=…`
 * query-param mode renders one component on a neutral canvas; this spec
 * captures that canvas for each component as evidence.
 *
 * The single dark theme of the briefing renderer is captured here (light
 * + vscode theme variants are deferred until the briefing renderer adopts
 * multi-theme support — tracked separately from spec #264).
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const evidenceRoot = resolve(
  __dirname,
  '../../../../specs/264-briefing-zip-renderer/evidence/screenshots',
);

function storyUrl(story: 'transport-bar' | 'mode-toggle'): string {
  return `${pathToFileURL(`${distRoot}/index.html`).href}?story=${story}`;
}

test.describe('briefing components — story-mode captures', () => {
  test('TransportBar — Idle, end-of-storyboard Replay surface', async ({ page }) => {
    await page.goto(storyUrl('transport-bar'));
    await expect(page.locator('[data-testid="briefing-transport-bar"]')).toBeVisible({
      timeout: 10_000,
    });

    // Capture the idle state.
    await expect(page.locator('[data-testid="transport-scene-index"]')).toContainText('2 / 4');
    await page.screenshot({
      path: `${evidenceRoot}/transport-bar-idle.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });

    // Advance to the end-of-Storyboard so the Replay button shows.
    await page.locator('[data-testid="transport-next"]').click();
    await page.locator('[data-testid="transport-next"]').click();
    await expect(page.locator('[data-testid="transport-replay"]')).toBeVisible();
    await page.screenshot({
      path: `${evidenceRoot}/transport-bar-end-of-storyboard.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  });

  test('ModeToggle — Minimal and Present capture', async ({ page }) => {
    await page.goto(storyUrl('mode-toggle'));
    await expect(page.locator('[data-testid="briefing-mode-toggle"]')).toBeVisible({
      timeout: 10_000,
    });

    // Minimal mode capture.
    await page.screenshot({
      path: `${evidenceRoot}/mode-toggle-minimal.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });

    // Flip via the P key — should swap label.
    await page.keyboard.press('p');
    // Move the mouse near the top-right so the hover-revealed toggle
    // shows; otherwise the toggle hides in Present mode.
    await page.mouse.move(1240, 30);
    await expect(page.locator('[data-testid="briefing-mode-toggle"]')).toBeVisible();
    await page.screenshot({
      path: `${evidenceRoot}/mode-toggle-present.png`,
      fullPage: false,
      clip: { x: 0, y: 0, width: 1280, height: 720 },
    });
  });
});
