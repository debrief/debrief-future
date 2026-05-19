/**
 * Playwright component E2E for spec 260 — viewport lock visual states
 * (T037). Captures screenshots into specs/260-viewport-lock/evidence/
 * screenshots/ for the feature post.
 *
 * Covers three Storybook stories × three theme variants:
 *  - StoryboardPanel padlock (locked, unlocked, empty)
 *  - ViewportLockBanner (locked, unlocked)
 *  - (The LeafletToolbar disabled state is exercised by the web-shell
 *    Playwright spec where the toolbar mounts inside a live MapView;
 *    standalone Storybook for `LeafletToolbar` would require a Leaflet
 *    stub which the project doesn't currently maintain.)
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const EVIDENCE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/260-viewport-lock/evidence/screenshots',
);

const STORY_PANEL = '/iframe.html?id=panels-storyboardpanel';
const STORY_BANNER = '/iframe.html?id=components-mapview-viewportlockbanner';

const withTheme = (url: string, theme: 'light' | 'dark' | 'vscode'): string =>
  `${url}&globals=theme:${theme}`;

test.describe('StoryboardPanel — viewport lock padlock variants', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`unlocked state renders aria-pressed="false" in ${theme}`, async ({ page }) => {
      await page.goto(withTheme(`${STORY_PANEL}--viewport-unlocked`, theme));
      const toggle = page.locator('[data-testid="viewport-lock-toggle"]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.screenshot({
        path: `${EVIDENCE_DIR}/storyboard-padlock-${theme}.png`,
      });
    });

    test(`locked state renders aria-pressed="true" in ${theme}`, async ({ page }) => {
      await page.goto(withTheme(`${STORY_PANEL}--viewport-locked`, theme));
      const toggle = page.locator('[data-testid="viewport-lock-toggle"]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      if (theme === 'light') {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/storyboard-padlock-locked-light.png`,
        });
      }
    });

    test(`empty-plot state renders disabled padlock in ${theme}`, async ({ page }) => {
      await page.goto(
        withTheme(`${STORY_PANEL}--viewport-lock-empty-state`, theme),
      );
      const toggle = page.locator('[data-testid="viewport-lock-toggle"]');
      await expect(toggle).toBeVisible();
      await expect(toggle).toBeDisabled();
    });
  }
});

test.describe('ViewportLockBanner — overlay variants', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`locked state renders banner in ${theme}`, async ({ page }) => {
      await page.goto(withTheme(`${STORY_BANNER}--locked`, theme));
      const banner = page.locator('[data-testid="viewport-lock-banner"]');
      await expect(banner).toBeVisible();
      await expect(banner).toHaveAttribute('role', 'status');
      await page.screenshot({
        path: `${EVIDENCE_DIR}/banner-${theme}.png`,
      });
    });

    test(`unlocked state renders nothing in ${theme}`, async ({ page }) => {
      await page.goto(withTheme(`${STORY_BANNER}--unlocked`, theme));
      // The banner is conditional — DOM has no element when locked=false.
      const banner = page.locator('[data-testid="viewport-lock-banner"]');
      await expect(banner).toHaveCount(0);
    });
  }
});

test.describe('ViewportLockBanner — click-to-unlock interaction', () => {
  test('clicking the banner fires onUnlock (interactive story)', async ({ page }) => {
    await page.goto(withTheme(`${STORY_BANNER}--interactive`, 'light'));
    const banner = page.locator('[data-testid="viewport-lock-banner"]');
    await expect(banner).toBeVisible();
    await page.locator('[data-testid="viewport-lock-banner-unlock"]').click();
    // After unlock, banner is gone — confirms onUnlock fired.
    await expect(banner).toHaveCount(0);
  });
});
