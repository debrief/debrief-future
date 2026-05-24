/**
 * Playwright e2e — MapView briefing tile-layer props (#264 T-MAPVIEW-EXT, T019).
 *
 * Captures the `BriefingTileLayerProps` story in the three theme
 * variants. Acts as visual-regression coverage for the four optional
 * props added in T-MAPVIEW-EXT (`errorTileUrl`, `maxZoom`, `noWrap`,
 * `tileLayerCrossOrigin`).
 *
 * Run: pnpm --filter @debrief/components test:e2e MapViewBriefingProps
 * Claude Code: CLAUDE_CODE=1 pnpm --filter @debrief/components test:e2e MapViewBriefingProps
 */

import { test, expect } from '@playwright/test';

const EVIDENCE_DIR = '../../specs/264-briefing-zip-renderer/evidence/screenshots';
const STORY_URL = '/iframe.html?id=components-mapview--briefing-tile-layer-props';

const themed = (theme: string): string => `${STORY_URL}&globals=theme:${theme}`;

test.describe('MapView — Briefing tile-layer props', () => {
  for (const theme of ['light', 'dark', 'vscode'] as const) {
    test(`renders in ${theme} theme with the file://-friendly prop bundle`, async ({ page }) => {
      await page.goto(themed(theme));
      // Map container mounts.
      await page.waitForSelector('.leaflet-container', { timeout: 15_000 });
      // Wait for Leaflet to settle.
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/mapview-briefing-props-${theme}.png`,
        fullPage: false,
      });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });
  }
});
