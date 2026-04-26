/**
 * Storybook E2E — FilterBar NL mode (#191 T053).
 *
 * Drives the `NlModeWithStubClient` story across the three theme variants,
 * asserting the happy path (phrase → chips) and failure-banner rendering,
 * and capturing evidence screenshots.
 *
 * Screenshots written to `specs/191-vscode-nl-search/evidence/screenshots/`
 * — these are the source of record for the shipped blog post.
 */

import { test, expect } from '@playwright/test';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EVIDENCE_DIR = resolve(
  HERE,
  '..',
  '..',
  '..',
  'specs',
  '191-vscode-nl-search',
  'evidence',
  'screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

// Storybook route convention — built by `pnpm --filter @debrief/components storybook:build`.
const STORY_ID = 'filterbar--nl-mode-with-stub-client';

function themeUrl(theme: 'light' | 'dark' | 'vscode'): string {
  return `/iframe.html?id=${STORY_ID}&globals=theme:${theme}`;
}

test.describe('FilterBar NL mode — theme matrix (T053)', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders + chips in ${theme} theme`, async ({ page }) => {
      await page.goto(themeUrl(theme));
      await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

      // Type a recognised phrase and submit.
      const input = page.getByTestId('quick-search-input');
      await input.fill('UK submarines');
      await input.press('Enter');

      // Wait for the stub latency to resolve + chip to land.
      await page.waitForTimeout(600);

      // Capture the theme screenshot for evidence.
      await page.screenshot({
        path: resolve(EVIDENCE_DIR, `filterbar-nl-${theme}.png`),
        fullPage: false,
      });

      // Chip container should have rendered a lozenge.
      const lozenges = page.locator('[data-testid^="lozenge-"]');
      await expect(lozenges.first()).toBeVisible();

      // Indicator should be visible across all themes.
      await expect(page.getByTestId('nl-search-indicator')).toBeVisible();
    });
  }
});

test.describe('FilterBar NL mode — banner per failure class', () => {
  const banners: Array<{ phrase: string; reason: string }> = [
    { phrase: 'auth-failure test', reason: 'auth-failure' },
    { phrase: 'rate-limit test', reason: 'rate-limit' },
    { phrase: 'provider-error test', reason: 'provider-error' },
    { phrase: 'timeout test', reason: 'timeout' },
    { phrase: 'malformed test', reason: 'malformed-response' },
    { phrase: 'not-configured test', reason: 'not-configured' },
    { phrase: 'ceiling-reached test', reason: 'ceiling-reached' },
  ];

  for (const b of banners) {
    test(`shows ${b.reason} banner`, async ({ page }) => {
      await page.goto(themeUrl('light'));
      await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

      const input = page.getByTestId('quick-search-input');
      await input.fill(b.phrase);
      await input.press('Enter');

      const banner = page.getByTestId('live-transport-banner');
      await banner.waitFor({ timeout: 10_000 });
      await expect(banner).toHaveAttribute('data-transport-reason', b.reason);

      await page.screenshot({
        path: resolve(EVIDENCE_DIR, `banner-${b.reason}.png`),
        fullPage: false,
      });
    });
  }
});

// ---------------------------------------------------------------------------
// #198 T031 — keyring-unavailable banner per platformHint × theme
// ---------------------------------------------------------------------------

const KEYRING_EVIDENCE_DIR = resolve(
  HERE,
  '..',
  '..',
  '..',
  'specs',
  '198-nl-keyring-banner',
  'evidence',
  'screenshots',
);
mkdirSync(KEYRING_EVIDENCE_DIR, { recursive: true });

const KEYRING_STORY_BY_HINT: Record<
  'linux' | 'macos' | 'windows' | 'unknown',
  string
> = {
  linux: 'filterbar--nl-mode-keyring-unavailable',
  macos: 'filterbar--nl-mode-keyring-unavailable-macos',
  windows: 'filterbar--nl-mode-keyring-unavailable-windows',
  unknown: 'filterbar--nl-mode-keyring-unavailable-unknown',
};

function keyringUrl(
  hint: 'linux' | 'macos' | 'windows' | 'unknown',
  theme: 'light' | 'dark' | 'vscode',
): string {
  return `/iframe.html?id=${KEYRING_STORY_BY_HINT[hint]}&globals=theme:${theme}`;
}

test.describe('FilterBar NL mode — keyring-unavailable banner (#198 T031)', () => {
  for (const hint of ['linux', 'macos', 'windows', 'unknown'] as const) {
    test(`renders ${hint} variant with correct reason + actions`, async ({ page }) => {
      await page.goto(keyringUrl(hint, 'light'));
      await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

      const input = page.getByTestId('quick-search-input');
      await input.fill('any phrase');
      await input.press('Enter');

      const banner = page.getByTestId('live-transport-banner');
      await banner.waitFor({ timeout: 10_000 });
      await expect(banner).toHaveAttribute(
        'data-transport-reason',
        'keyring-unavailable',
      );

      // Hint paragraph: present for known platforms, absent for unknown.
      const hintEl = banner.locator('[data-testid="live-transport-banner-hint"]');
      if (hint === 'unknown') {
        await expect(hintEl).toHaveCount(0);
      } else {
        await expect(hintEl).toHaveCount(1);
        await expect(hintEl).toHaveAttribute('data-platform-hint', hint);
      }

      // Both action buttons should render.
      await expect(page.getByTestId('live-transport-banner-help')).toBeVisible();
      await expect(
        page.getByTestId('live-transport-banner-open-settings'),
      ).toBeVisible();

      // Banner copy must NOT instruct re-entering the key (FR-004).
      const text = (await banner.textContent()) ?? '';
      expect(text).not.toMatch(/re-?enter/i);
      expect(text).toMatch(/keyring/i);

      // Capture for evidence — light theme only here; dark/vscode below.
      if (hint !== 'unknown') {
        await page.screenshot({
          path: resolve(
            KEYRING_EVIDENCE_DIR,
            `banner-keyring-unavailable-${hint}.png`,
          ),
          fullPage: false,
        });
      }
    });
  }

  // T032 — dark + vscode theme captures (Linux variant covers all three).
  for (const theme of ['dark', 'vscode'] as const) {
    test(`linux variant renders in ${theme} theme`, async ({ page }) => {
      await page.goto(keyringUrl('linux', theme));
      await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

      const input = page.getByTestId('quick-search-input');
      await input.fill('any phrase');
      await input.press('Enter');

      const banner = page.getByTestId('live-transport-banner');
      await banner.waitFor({ timeout: 10_000 });
      await expect(banner).toHaveAttribute(
        'data-transport-reason',
        'keyring-unavailable',
      );
      await page.screenshot({
        path: resolve(
          KEYRING_EVIDENCE_DIR,
          `banner-keyring-unavailable-linux-${theme}.png`,
        ),
        fullPage: false,
      });
    });
  }
});

test.describe('FilterBar NL mode — lozenges survive failure (T046)', () => {
  test('chips persist across a follow-up auth-failure', async ({ page }) => {
    await page.goto(themeUrl('light'));
    await page.getByTestId('nl-search-indicator').waitFor({ timeout: 10_000 });

    const input = page.getByTestId('quick-search-input');
    await input.fill('UK submarines');
    await input.press('Enter');
    await page.waitForTimeout(600);
    const beforeFail = await page.locator('[data-testid^="lozenge-"]').count();
    expect(beforeFail).toBeGreaterThanOrEqual(1);

    await input.fill('auth-failure test');
    await input.press('Enter');
    await page.getByTestId('live-transport-banner').waitFor({ timeout: 10_000 });

    const afterFail = await page.locator('[data-testid^="lozenge-"]').count();
    expect(afterFail).toBeGreaterThanOrEqual(beforeFail);
  });
});
