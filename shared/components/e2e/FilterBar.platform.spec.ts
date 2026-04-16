/**
 * Playwright E2E tests for the platform chip (#186).
 *
 * Covers E1–E7 from specs/186-filter-chips/contracts/test-list.md.
 * Run:
 *   pnpm --filter @debrief/components test:e2e FilterBar.platform
 * In Claude Code cloud sessions, use:
 *   node apps/web-shell/run-playwright.mjs
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/186-filter-chips/evidence/screenshots';

const PLATFORM_STORY = '/iframe.html?id=filterbar--with-platform-chip';
const EMPTY_URL = '/iframe.html?id=filterbar--empty';
const INTERACTIVE_URL = '/iframe.html?id=filterbar--interactive';
const OR_STORY = '/iframe.html?id=filterbar--platform-chip-or-group';

const theme = (url: string, t: string) => `${url}&globals=theme:${t}`;

const THEME_BG: Record<'light' | 'dark' | 'vscode', { bg: string; fg: string }> = {
  light: { bg: '#ffffff', fg: '#222222' },
  dark: { bg: '#1e1e1e', fg: '#d4d4d4' },
  vscode: { bg: '#252526', fg: '#cccccc' },
};

async function captureThemedScreenshot(
  page: import('@playwright/test').Page,
  themeName: 'light' | 'dark' | 'vscode',
  path: string,
) {
  await page.goto(theme(PLATFORM_STORY, themeName));
  await page.waitForSelector('[data-testid="filter-bar"]');

  // Apply the theme imperatively. Storybook's globals URL parameter doesn't
  // always re-trigger the ThemeProvider decorator for the first paint, and
  // Storybook owns the iframe <html>/<body> backgrounds. We set both the
  // data-theme attribute (which the ThemeProvider honours) AND a CSS override
  // that forces the backdrop so the theme is visually evident in the capture.
  await page.evaluate(
    ({ t, bg, fg }) => {
      document.documentElement.setAttribute('data-theme', t);
      const styleId = 'platform-chip-theme-override';
      const prev = document.getElementById(styleId);
      if (prev) prev.remove();
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        html, body, #storybook-root, .sb-show-main {
          background: ${bg} !important;
          color: ${fg} !important;
        }
      `;
      document.head.appendChild(style);
    },
    { t: themeName, ...THEME_BG[themeName] },
  );

  await page.waitForTimeout(200);
  await page.screenshot({ path, fullPage: true });
}

test.describe('Platform chip — theme variants (E7)', () => {
  test('renders in light theme', async ({ page }) => {
    await captureThemedScreenshot(page, 'light', `${EVIDENCE_DIR}/component-light.png`);
    await expect(page.getByTestId('lozenge-story-p1')).toBeVisible();
  });

  test('renders in dark theme', async ({ page }) => {
    await captureThemedScreenshot(page, 'dark', `${EVIDENCE_DIR}/component-dark.png`);
  });

  test('renders in vscode theme', async ({ page }) => {
    await captureThemedScreenshot(page, 'vscode', `${EVIDENCE_DIR}/component-vscode.png`);
  });
});

test.describe('Platform chip — user flows (E1–E5)', () => {
  // E1: add platform chip via UI
  test('E1: add a platform chip via the UI', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="filter-add-button"]');
    await expect(page.getByTestId('filter-type-platform')).toBeVisible();
    await page.click('[data-testid="filter-type-platform"]');
    await expect(page.getByTestId('platform-value-editor')).toBeVisible();

    // At least one picker should be present.
    await expect(page.getByTestId('platform-editor-row-nationality')).toBeVisible();

    // Pick whatever nationality is available first (story-dependent).
    const natSelect = page.getByTestId('platform-editor-select-nationality');
    const natCount = await natSelect.locator('option').count();
    test.skip(natCount < 2, 'No catalog nationalities to pick from');
    await natSelect.selectOption({ index: 1 });

    const confirmBtn = page.getByTestId('platform-editor-confirm');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // A platform chip should appear — any lozenge with data-shape="platform".
    await expect(page.locator('[data-shape="platform"]').first()).toBeVisible();
  });

  // E4: editor blocks confirm with zero attributes
  test('E4: confirm button disabled until an attribute is selected', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.click('[data-testid="filter-add-button"]');
    await page.click('[data-testid="filter-type-platform"]');
    await expect(page.getByTestId('platform-editor-confirm')).toBeDisabled();
  });

  // E3: negate platform chip
  test('E3: toggle negate on a platform chip', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    const negateBtn = page.getByTestId('lozenge-negate-story-p1');
    await negateBtn.click();
    await expect(page.locator('text=NOT').first()).toBeVisible();
  });

  // E5: remove platform chip
  test('E5: remove a platform chip', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.getByTestId('lozenge-story-p1')).toBeVisible();
    await page.getByTestId('lozenge-remove-story-p1').click();
    await expect(page.getByTestId('lozenge-story-p1')).toHaveCount(0);
  });
});

test.describe('Platform chip — OR composition (E6)', () => {
  test('E6: two platform chips appear inside an OR container', async ({ page }) => {
    await page.goto(theme(OR_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await expect(page.locator('[data-shape="platform"]')).toHaveCount(2);
    await expect(page.locator('.debrief-or-container').first()).toBeVisible();
  });
});

test.describe('Platform chip — edit flow (E2)', () => {
  test('E2: edit a platform chip opens the compound editor', async ({ page }) => {
    await page.goto(theme(PLATFORM_STORY, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');

    await page.getByTestId('lozenge-body-story-p1').click();
    await expect(page.getByTestId('platform-value-editor')).toBeVisible();
  });
});

test.describe('Platform chip — interaction keyframes (evidence)', () => {
  test('captures four keyframes of the add flow', async ({ page }) => {
    await page.goto(theme(EMPTY_URL, 'light'));
    await page.waitForSelector('[data-testid="filter-bar"]');
    await page.setViewportSize({ width: 900, height: 320 });

    // Frame 1: empty filter bar
    await page.screenshot({ path: `${EVIDENCE_DIR}/interaction-1-empty.png` });

    // Frame 2: filter-type menu open
    await page.click('[data-testid="filter-add-button"]');
    await page.waitForSelector('[data-testid="filter-type-dropdown"]');
    await page.screenshot({ path: `${EVIDENCE_DIR}/interaction-2-menu.png` });

    // Frame 3: platform editor open with attributes selected
    await page.click('[data-testid="filter-type-platform"]');
    await page.waitForSelector('[data-testid="platform-value-editor"]');
    const natSelect = page.getByTestId('platform-editor-select-nationality');
    const natCount = await natSelect.locator('option').count();
    if (natCount > 1) {
      await natSelect.selectOption({ index: 1 });
    }
    const domSelect = page.getByTestId('platform-editor-select-domain');
    const domCount = await domSelect.locator('option').count();
    if (domCount > 1) {
      await domSelect.selectOption({ index: 1 });
    }
    await page.screenshot({ path: `${EVIDENCE_DIR}/interaction-3-editor.png` });

    // Frame 4: chip confirmed
    await page.getByTestId('platform-editor-confirm').click();
    await expect(page.locator('[data-shape="platform"]').first()).toBeVisible();
    await page.screenshot({ path: `${EVIDENCE_DIR}/interaction-4-chip.png` });
  });
});
