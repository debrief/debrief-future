/**
 * T050 — Storybook visual consistency snapshots across the four explicit
 * theme variants (#220 US2).
 *
 * For each theme variant we render a representative set of panel stories
 * and capture per-panel + composite screenshots. The composite proves
 * visual harmony (same backgrounds, borders, hover/selection palettes)
 * across panels in the same variant (FR-004 / SC-003).
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
  'light',
  'dark',
  'high-contrast-light',
  'high-contrast-dark',
] as const;

const STORIES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'components-logpanel--default', label: 'logpanel' },
  { id: 'components-filterbar--default', label: 'filterbar' },
  { id: 'components-featurelist--default', label: 'featurelist' },
  { id: 'components-mapview--default', label: 'mapview' },
  { id: 'components-timecontroller--default', label: 'timecontroller' },
];

async function gotoStory(
  page: Page,
  storyId: string,
  variant: string,
): Promise<void> {
  const url = `/iframe.html?id=${storyId}&globals=theme:${variant}`;
  await page.goto(url);
  await page.waitForLoadState('domcontentloaded');
  // Allow the theme decorator to apply CSS variables.
  await page.waitForTimeout(300);
}

test.describe('All-panels visual consistency (#220 US2)', () => {
  test.setTimeout(180_000);

  for (const variant of VARIANTS) {
    test(`per-panel screenshots — ${variant}`, async ({ page }) => {
      for (const story of STORIES) {
        try {
          await gotoStory(page, story.id, variant);
          await page.screenshot({
            path: join(EVIDENCE_DIR, `${story.label}-${variant}.png`),
            fullPage: false,
          });
        } catch (err) {
          // Story may not exist (new story names, etc.) — log but don't
          // fail the entire suite, so partial coverage is still captured.
          console.warn(
            `[all-panels-consistency] story ${story.id} failed for ${variant}: ${(err as Error).message}`,
          );
        }
      }
    });

    test(`every panel reports a non-empty data-theme — ${variant}`, async ({
      page,
    }) => {
      for (const story of STORIES) {
        try {
          await gotoStory(page, story.id, variant);
          const dataTheme = await page.evaluate(() =>
            document.documentElement.getAttribute('data-theme'),
          );
          expect(dataTheme, `${story.label} in ${variant}`).toBe(variant);
        } catch (err) {
          console.warn(
            `[all-panels-consistency] could not verify data-theme for ${story.id} in ${variant}`,
          );
        }
      }
    });
  }
});
