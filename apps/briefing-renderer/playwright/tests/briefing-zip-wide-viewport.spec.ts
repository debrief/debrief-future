/**
 * Wide-viewport sanity check — captures the briefing at 1920×1080 so
 * we catch chrome-overflow regressions on ultra-wide screens.
 *
 * Not a CI-gated test by default; runs alongside the other screenshot
 * producers when `briefing-zip-screenshots` is invoked.
 */

import { test, expect } from '@playwright/test';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distRoot = resolve(__dirname, '../../dist');
const indexUrl = pathToFileURL(`${distRoot}/index.html`).href;
const evidenceRoot = resolve(
  __dirname,
  '../../../../specs/264-briefing-zip-renderer/evidence/screenshots',
);

test.use({ viewport: { width: 1920, height: 1080 } });

test.describe('briefing-renderer @ ultra-wide viewport', () => {
  test('Minimal mode — chrome stays centred + capped, map fills with content', async ({ page }) => {
    await page.goto(indexUrl);
    await expect(page.locator('[data-testid="briefing-map"]')).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(1200);

    // Title bar should be present + the full title should fit.
    const titlebar = page.locator('[data-testid="briefing-minimal-titlebar"]');
    await expect(titlebar).toBeVisible();
    await expect(titlebar).toContainText('Channel Crossing — Demo Briefing');

    // Mode toggle should be visible (sits above the map).
    await expect(page.locator('[data-testid="briefing-mode-toggle"]')).toBeVisible();

    // Transport bar should be visible.
    await expect(page.locator('[data-testid="briefing-transport-bar"]')).toBeVisible();

    await page.screenshot({
      path: `${evidenceRoot}/briefing-minimal-wide.png`,
      fullPage: false,
    });
  });
});
