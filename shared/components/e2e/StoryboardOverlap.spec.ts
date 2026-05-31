/**
 * Playwright component E2E for #271 — overlap warning on time-range Scenes.
 *
 * Drives the `Panels/StoryboardPanel` → `WithOverlapWarnings` story. Asserts
 * the passive warning appears on both overlapping rows (naming the partner),
 * stays off the clean rows, and is cleared by the Dismiss control. Captures
 * the three theme screenshots used as feature evidence.
 */
import { test, expect } from '@playwright/test';

const STORY = '/iframe.html?id=panels-storyboardpanel--with-overlap-warnings';
const withTheme = (theme: 'light' | 'dark' | 'vscode'): string =>
  `${STORY}&globals=theme:${theme}`;

const EVIDENCE_DIR = '../../specs/271-scene-overlap-warning/evidence/screenshots';

const badge = (sceneId: string): string =>
  `[data-testid="overlap-badge"][data-scene-id="${sceneId}"]`;

test.describe('StoryboardPanel — overlap warnings (#271)', () => {
  test('warns on both overlapping rows naming the partner; clean rows stay clean', async ({
    page,
  }) => {
    await page.goto(withTheme('light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');

    // Both overlapping rows carry a badge that names the other Scene.
    await expect(page.locator(badge('scene-1'))).toBeVisible();
    await expect(page.locator(badge('scene-1'))).toHaveAttribute(
      'aria-label',
      'Overlaps with Egress leg',
    );
    await expect(page.locator(badge('scene-2'))).toHaveAttribute(
      'aria-label',
      'Overlaps with Approach run',
    );

    // Non-overlapping time-range Scene + instant Scene stay clean.
    await expect(page.locator(badge('scene-3'))).toHaveCount(0);
    await expect(page.locator(badge('scene-4'))).toHaveCount(0);

    await page.screenshot({ path: `${EVIDENCE_DIR}/overlap-light.png` });
  });

  test('renders in dark theme', async ({ page }) => {
    await page.goto(withTheme('dark'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    await expect(page.locator(badge('scene-1'))).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/overlap-dark.png` });
  });

  test('renders in vscode theme', async ({ page }) => {
    await page.goto(withTheme('vscode'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    await expect(page.locator(badge('scene-1'))).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/overlap-vscode.png` });
  });

  test('Dismiss clears the warning on both rows', async ({ page }) => {
    await page.goto(withTheme('light'));
    await page.waitForSelector('[data-testid="storyboard-panel"]');
    await expect(page.locator(badge('scene-1'))).toBeVisible();
    await expect(page.locator(badge('scene-2'))).toBeVisible();

    await page
      .locator(`${badge('scene-1')} [data-testid="overlap-badge-dismiss-button"]`)
      .click();

    await expect(page.locator(badge('scene-1'))).toHaveCount(0);
    await expect(page.locator(badge('scene-2'))).toHaveCount(0);
  });
});
