/**
 * Playwright screenshot capture for feature 119 (Array Offset Calculations).
 *
 * Renders the ``ArrayOffsetComparison`` Storybook story and captures
 * screenshots showing the real sensor bearing lines rendered from
 * PLAIN / WORM / MEASURED array centres.  All three panels share the same
 * track fixture (``track-feature-sensors-turn-01.json``) — vessel sails
 * north, turns 90° east, reports five bearing cuts after the turn.
 *
 * The screenshots are saved to
 * ``specs/119-array-offset-calc/evidence/screenshots/`` and embedded in
 * the shipped post and evidence documentation.
 */

import { test } from '@playwright/test';

const STORY_URL =
  '/iframe.html?id=components-mapview-sensorrendering--array-offset-comparison';

const withTheme = (storyUrl: string, theme: 'light' | 'dark' | 'vscode'): string =>
  `${storyUrl}&globals=theme:${theme}`;

// Resolve from the repo root so this works regardless of Playwright's cwd.
// shared/components/e2e → repo root = ../../..
const EVIDENCE_DIR =
  '../../specs/119-array-offset-calc/evidence/screenshots';

/** Wait for all three map panels to render (i.e. leaflet-container inside each testid). */
async function waitForAllPanels(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForSelector('[data-testid="array-offset-comparison-root"]');
  const panels = ['plain', 'worm', 'measured'] as const;
  for (const mode of panels) {
    await page.waitForSelector(`[data-testid="array-offset-panel-${mode}"] .leaflet-container`);
  }
  // Give tiles time to load and canvas to render bearing lines.
  await page.waitForTimeout(1500);
}

test.describe('Array Offset Comparison - screenshot capture', () => {
  test('capture full comparison (default theme)', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(STORY_URL);
    await waitForAllPanels(page);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/array-offset-comparison-default.png`,
      fullPage: false,
    });
  });

  test('capture per-panel crops', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto(STORY_URL);
    await waitForAllPanels(page);

    const panels = ['plain', 'worm', 'measured'] as const;
    for (const mode of panels) {
      const panel = page.locator(`[data-testid="array-offset-panel-${mode}"]`);
      await panel.screenshot({
        path: `${EVIDENCE_DIR}/array-offset-${mode}.png`,
      });
    }
  });

  test('capture theme variants (comparison)', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    const themes = ['light', 'dark', 'vscode'] as const;
    for (const theme of themes) {
      await page.goto(withTheme(STORY_URL, theme));
      await waitForAllPanels(page);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/array-offset-comparison-${theme}.png`,
        fullPage: false,
      });
    }
  });
});
