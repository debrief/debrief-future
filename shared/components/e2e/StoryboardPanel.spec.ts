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

// #273 evidence dir — live Preview control captures.
const EVIDENCE_DIR_273 = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/273-storyboard-preview-button/evidence/screenshots',
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

// Three stories × three themes were originally captured, but the panel's
// VS Code CSS tokens resolve identically in the Storybook sandbox, so the
// dark / vscode variants produced byte-identical PNGs. Kept one light
// capture per story as the canonical evidence; the theme-parity
// behaviour is noted in evidence/screenshots/README.md.

test.describe('StoryboardPanel — Transport (#217)', () => {
  test('renders TransportRow with canonical light-theme capture', async ({ page }) => {
    await page.goto(withTheme(storyUrl('transport'), 'light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
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
      path: `${EVIDENCE_DIR_217}/storyboard-panel-transport-light.png`,
    });
  });
});

test.describe('StoryboardPanel — WithMultipleStoryboards (#217)', () => {
  test('renders header dropdown with 3 Storyboards (canonical light capture)', async ({ page }) => {
    await page.goto(withTheme(storyUrl('with-multiple-storyboards'), 'light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    const dropdown = page.locator('[data-testid="storyboard-header-select"]');
    await expect(dropdown).toBeVisible();
    await expect(
      page.locator('[data-testid="storyboard-header-overflow"]'),
    ).toBeVisible();
    await page.screenshot({
      path: `${EVIDENCE_DIR_217}/storyboard-panel-multi-light.png`,
    });
  });
});

test.describe('StoryboardPanel — HardBlockModal (#217)', () => {
  test('renders HardBlockModal (canonical light capture)', async ({ page }) => {
    await page.goto(withTheme(storyUrl('hard-block-modal-story'), 'light'));
    await page.waitForSelector('[role="dialog"]');
    await expect(page.locator('[role="dialog"]')).toHaveAttribute(
      'aria-modal',
      'true',
    );
    await page.screenshot({
      path: `${EVIDENCE_DIR_217}/storyboard-panel-hardblock-light.png`,
    });
  });
});

// ─── #273 — live Preview control ──────────────────────────────────────

test.describe('StoryboardPanel — Preview control (#273)', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`Preview button is enabled with scenes in ${theme} theme`, async ({ page }) => {
      await page.goto(withTheme(storyUrl('with-preview'), theme));
      await page.waitForSelector('[data-testid="storyboard-panel"]');
      const preview = page.locator('[data-testid="storyboard-preview"]');
      await expect(preview).toBeVisible();
      await expect(preview).toBeEnabled();
      await expect(preview).toHaveAttribute('aria-label', 'Preview briefing');
      await page.screenshot({
        path: `${EVIDENCE_DIR_273}/storyboard-preview-${theme}.png`,
      });
    });
  }

  test('Preview button is disabled with an explanatory tooltip when there are no scenes', async ({
    page,
  }) => {
    await page.goto(withTheme(storyUrl('preview-disabled-no-scenes'), 'light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    const preview = page.locator('[data-testid="storyboard-preview"]');
    await expect(preview).toBeVisible();
    await expect(preview).toBeDisabled();
    await expect(preview).toHaveAttribute('title', /at least one scene/i);
    await page.screenshot({
      path: `${EVIDENCE_DIR_273}/preview-disabled-no-scenes.png`,
    });
  });

  test('absent onPreview renders no Preview button (legacy parity)', async ({ page }) => {
    await page.goto(withTheme(storyUrl('with-three-scenes'), 'light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    await expect(page.locator('[data-testid="storyboard-preview"]')).toHaveCount(0);
  });
});
