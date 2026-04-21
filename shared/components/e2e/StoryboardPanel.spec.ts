/**
 * Playwright component E2E tests for Feature 216 — StoryboardPanel.
 *
 * Verifies the 5 stories × 3 theme variants documented in
 * `specs/216-storyboarding-capture/plan.md § Storybook E2E Testing`.
 * Screenshots are captured for evidence.
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const STORY_BASE = '/iframe.html?id=panels-storyboardpanel';

const storyUrl = (variant: string): string => `${STORY_BASE}--${variant}`;
const withTheme = (url: string, theme: 'light' | 'dark' | 'vscode'): string =>
  `${url}&globals=theme:${theme}`;

// Evidence dir resolved relative to this test file, so screenshots always
// land in `specs/216-.../evidence/screenshots/` regardless of the cwd from
// which Playwright is invoked.
const EVIDENCE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/216-storyboarding-capture/evidence/screenshots',
);

test.describe('StoryboardPanel — Empty', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders empty-state copy in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('empty'), theme));
      await page.waitForSelector('[data-testid="storyboard-panel"]');
      const empty = page.locator('[data-testid="storyboard-empty-state"]');
      await expect(empty).toBeVisible();
      await expect(empty).toContainText('No Storyboards yet');
      if (theme === 'light') {
        await page.screenshot({ path: `${EVIDENCE_DIR}/panel-empty.png` });
      }
    });
  }
});

test.describe('StoryboardPanel — EmptyStoryboard', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders empty-Storyboard copy in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('empty-storyboard'), theme));
      await page.waitForSelector('[data-testid="storyboard-panel"]');
      await expect(
        page.locator('[data-testid="storyboard-empty-storyboard"]'),
      ).toBeVisible();
      await expect(page.locator('[data-testid="storyboard-name"]')).toHaveText(
        'Exercise Alpha',
      );
    });
  }
});

test.describe('StoryboardPanel — WithOneScene', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders one scene row in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('with-one-scene'), theme));
      await page.waitForSelector('[data-testid="scene-row"]');
      const rows = page.locator('[data-testid="scene-row"]');
      await expect(rows).toHaveCount(1);
      // a11y asserts
      const row = rows.first();
      await expect(row).toHaveAttribute('role', 'listitem');
      await expect(row).toHaveAttribute('aria-label', /.+/);
    });
  }
});

test.describe('StoryboardPanel — WithThreeScenes', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders three scene rows in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('with-three-scenes'), theme));
      await page.waitForSelector('[data-testid="scene-row"]');
      await expect(page.locator('[data-testid="scene-row"]')).toHaveCount(3);
      await expect(page.locator('[data-testid="storyboard-scene-count"]')).toHaveText(
        '3 scenes',
      );
      await page.screenshot({
        path: `${EVIDENCE_DIR}/panel-three-scenes-${theme}.png`,
      });
    });
  }
});

test.describe('StoryboardPanel — Capturing', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`prepends pending row in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('capturing'), theme));
      await page.waitForSelector('[data-testid="scene-row"]');
      const rows = page.locator('[data-testid="scene-row"]');
      // 3 persisted + 1 pending
      await expect(rows).toHaveCount(4);
      const pending = page.locator('[data-testid="scene-row"][data-state="pending"]');
      await expect(pending).toHaveCount(1);
      if (theme === 'light') {
        await page.screenshot({
          path: `${EVIDENCE_DIR}/capture-in-flight.png`,
        });
      }
    });
  }
});

test.describe('StoryboardPanel — accessibility', () => {
  test('capture button has aria-label="Capture scene"', async ({ page }) => {
    await page.goto(withTheme(storyUrl('empty'), 'light'));
    const button = page.locator('[data-testid="capture-button"]');
    await expect(button).toHaveAttribute('aria-label', 'Capture scene');
  });
});
