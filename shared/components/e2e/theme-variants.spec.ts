/**
 * T061 — Storybook E2E test for the four explicit theme variants (#220 US3).
 *
 * For each `[light, dark, high-contrast-light, high-contrast-dark]` variant,
 * load LogPanel/Default in Storybook with the `globals=theme:<variant>` URL
 * parameter and assert:
 *   - `documentElement[data-theme]` matches the variant.
 *   - `--vscode-sideBar-background` reads as the expected per-variant value
 *     (proves the decorator's token map injection actually drives styling,
 *     not the hardcoded fallback — the headline US3 outcome).
 *
 * Also captures the per-variant LogPanel screenshots used by T078.
 *
 * Output: `specs/220-fix-theme-responsiveness/evidence/screenshots/`
 */

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EVIDENCE_DIR = resolve(
  __dirname,
  '../../../specs/220-fix-theme-responsiveness/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

const VARIANTS = [
  {
    name: 'light' as const,
    expectedSideBar: '#f3f3f3',
  },
  {
    name: 'dark' as const,
    expectedSideBar: '#252526',
  },
  {
    name: 'high-contrast-light' as const,
    expectedSideBar: '#ffffff',
  },
  {
    name: 'high-contrast-dark' as const,
    expectedSideBar: '#000000',
  },
];

async function gotoLogPanel(page: Page, variant: string): Promise<void> {
  await page.goto(
    `/iframe.html?id=components-logpanel--default&globals=theme:${variant}`,
  );
  await page.waitForLoadState('domcontentloaded');
  // Storybook's decorator runs in an effect — give it a tick to inject tokens.
  await page.waitForTimeout(300);
}

test.describe('Storybook theme variants (#220 US3)', () => {
  test.setTimeout(120_000);

  for (const variant of VARIANTS) {
    test(`LogPanel renders with the ${variant.name} variant`, async ({ page }) => {
      await gotoLogPanel(page, variant.name);

      const dataTheme = await page.evaluate(() =>
        document.documentElement.getAttribute('data-theme'),
      );
      expect(dataTheme).toBe(variant.name);

      const sideBarBg = await page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--vscode-sideBar-background')
          .trim()
          .toLowerCase(),
      );
      expect(sideBarBg).toBe(variant.expectedSideBar.toLowerCase());

      // Capture LogPanel screenshot for evidence.
      await page.screenshot({
        path: join(EVIDENCE_DIR, `logpanel-${variant.name}.png`),
        fullPage: false,
      });
    });
  }
});
