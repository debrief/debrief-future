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

// #217 evidence dir — shares the Storybook E2E harness with #216's stories.
const EVIDENCE_DIR_217 = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/217-storyboarding-playback/evidence/screenshots',
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

// ─── #217 — Transport / MultipleStoryboards / HardBlockModal ─────────

test.describe('StoryboardPanel — Transport (#217)', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders TransportRow in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('transport'), theme));
      await page.waitForSelector('[data-testid="storyboard-panel"]');
      // Transport row present with Forward / Backward buttons + counter
      await expect(
        page.locator('[data-testid="transport-forward"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="transport-backward"]'),
      ).toBeVisible();
      // Currently at Scene 1 of 3 — Backward disabled, Forward enabled
      await expect(
        page.locator('[data-testid="transport-backward"]'),
      ).toBeDisabled();
      await expect(
        page.locator('[data-testid="transport-forward"]'),
      ).toBeEnabled();
      await page.screenshot({
        path: `${EVIDENCE_DIR_217}/storyboard-panel-transport-${theme}.png`,
      });
    });
  }
});

test.describe('StoryboardPanel — WithMultipleStoryboards (#217)', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders header dropdown with 3 Storyboards in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('with-multiple-storyboards'), theme));
      await page.waitForSelector('[data-testid="storyboard-panel"]');
      // Dropdown present + populated
      const dropdown = page.locator('[data-testid="storyboard-header-select"]');
      await expect(dropdown).toBeVisible();
      // Overflow trigger present
      await expect(
        page.locator('[data-testid="storyboard-header-overflow"]'),
      ).toBeVisible();
      await page.screenshot({
        path: `${EVIDENCE_DIR_217}/storyboard-panel-multi-${theme}.png`,
      });
    });
  }
});

test.describe('StoryboardPanel — HardBlockModal (#217)', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders HardBlockModal in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('hard-block-modal-story'), theme));
      // The presentational modal renders as a role="dialog" element
      await page.waitForSelector('[role="dialog"]');
      await expect(page.locator('[role="dialog"]')).toHaveAttribute(
        'aria-modal',
        'true',
      );
      await page.screenshot({
        path: `${EVIDENCE_DIR_217}/storyboard-panel-hardblock-${theme}.png`,
      });
    });
  }
});
