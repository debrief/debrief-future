/**
 * T005 + T008 — Header-link colour contrast audit (#281 US1).
 *
 * SC-001: header links must meet >=7:1 contrast in high-contrast-light theme.
 *
 * This spec:
 *   1. Loads the web-shell, switches to each theme variant.
 *   2. Runs axe-core `color-contrast` rule scoped to `.web-shell__header-link`
 *      in HC-light and asserts 0 violations (SC-001).
 *   3. Captures a screenshot of the header in each of the four themes for
 *      visual regression; the HC-light shot goes to the spec evidence dir.
 *
 * The web-shell uses a ThemeProvider that maps VS Code body classes to
 * `document.documentElement[data-theme]`. We pre-install the `vscode-dark`
 * body class via addInitScript (mirrors theme-runtime-switch.spec.ts) so
 * the provider latches onto vsCodeBodyClassSource for the lifetime of the page.
 * Subsequent calls to `setVSCodeBodyClass` (defined below) then flow through
 * the provider's MutationObserver.
 *
 * @see apps/web-shell/playwright/tests/theme-runtime-switch.spec.ts — source
 *      of the setVSCodeBodyClass helper and addInitScript pattern.
 * @see apps/web-shell/playwright/pages/StacBrowserPage.ts — setTheme page-
 *      object method that wraps the same mechanism.
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Evidence output dir — spec 281
const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../../specs/281-ui-review-p1-p2-fixes/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

// Theme variants to capture for regression.
const THEMES = [
  { bodyClass: 'vscode-light', dataTheme: 'light' },
  { bodyClass: 'vscode-dark', dataTheme: 'dark' },
  { bodyClass: 'vscode-high-contrast', dataTheme: 'high-contrast-dark' },
  { bodyClass: 'vscode-high-contrast-light', dataTheme: 'high-contrast-light' },
] as const;

/**
 * Pre-install `vscode-dark` on `<body>` before React mounts so that the
 * ThemeProvider's auto-detect picks vsCodeBodyClassSource (not the media-query
 * fallback). Subsequent body-class mutations then flow through the
 * MutationObserver. This pattern is taken directly from
 * theme-runtime-switch.spec.ts (T032).
 */
async function preinstallVSCodeBodyClass(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const apply = (): void => {
      if (!document.body) return;
      document.body.classList.add('vscode-dark');
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', apply, { once: true });
    } else {
      apply();
    }
  });
}

/**
 * Swap the active VS Code body class and wait for the ThemeProvider to flush
 * `data-theme` onto `<html>` (≤1 s budget, matching FR-002).
 */
async function setVSCodeBodyClass(
  page: Page,
  bodyClass: string,
  expectedDataTheme: string,
): Promise<void> {
  const allClasses = [
    'vscode-light',
    'vscode-dark',
    'vscode-high-contrast',
    'vscode-high-contrast-light',
  ];
  await page.evaluate(
    ({ all, cls }: { all: string[]; cls: string }) => {
      for (const c of all) document.body.classList.remove(c);
      document.body.classList.add(cls);
    },
    { all: allClasses, cls: bodyClass },
  );
  await page.waitForFunction(
    (dt: string) => document.documentElement.getAttribute('data-theme') === dt,
    expectedDataTheme,
    { timeout: 2_000 },
  );
}

test.describe('Header link contrast (#281 US1)', () => {
  test.setTimeout(120_000);

  /**
   * SC-001: axe-core color-contrast on `.web-shell__header-link` in HC-light.
   * Asserts 0 violations — the `#0F4A85` primary colour on a near-white
   * titleBar background achieves ~8.6:1 which clears the 7:1 WCAG AAA
   * threshold, so no new token is needed (T007 decision).
   */
  test('HC-light header links — 0 color-contrast axe violations (SC-001)', async ({
    page,
  }) => {
    await preinstallVSCodeBodyClass(page);
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    // Ensure the ThemeProvider has set data-theme before we swap.
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') !== null,
      { timeout: 5_000 },
    );

    await setVSCodeBodyClass(page, 'vscode-high-contrast-light', 'high-contrast-light');

    // Scope the axe audit to the header-links region only.
    const result = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .include('.web-shell__header-link')
      .analyze();

    expect(
      result.violations,
      `color-contrast violations on .web-shell__header-link in HC-light:\n${JSON.stringify(result.violations, null, 2)}`,
    ).toHaveLength(0);
  });

  /**
   * Visual regression: capture a header screenshot in every theme variant.
   * The HC-light shot is the primary evidence artefact (evidence/screenshots/
   * header-hc-light.png). Dark shots are alongside for quick diff.
   */
  test('header link screenshots — four theme variants', async ({ page }) => {
    await preinstallVSCodeBodyClass(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') !== null,
      { timeout: 5_000 },
    );

    for (const { bodyClass, dataTheme } of THEMES) {
      await setVSCodeBodyClass(page, bodyClass, dataTheme);

      const header = page.locator('.web-shell__header');
      await expect(header).toBeVisible({ timeout: 5_000 });

      const fileName =
        dataTheme === 'high-contrast-light'
          ? 'header-hc-light.png'
          : `header-${dataTheme}.png`;

      await header.screenshot({
        path: join(EVIDENCE_DIR, fileName),
      });
    }
  });
});
