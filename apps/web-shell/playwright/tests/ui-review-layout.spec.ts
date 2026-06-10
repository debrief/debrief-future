/**
 * US3 + US4 Playwright spec — spec 281 T014 (US3) + T020 (US4).
 *
 * US3: Analysis layout scales to wide screens (P2.1)
 *   SC-003: >=1600px — 0 ellipsised tool labels; rail width in "wide" band.
 *   SC-004: <=1366px — rail ~280px; map has majority.
 *   FR-011: A saved custom v3 layout is respected verbatim (not overwritten).
 *
 * US4: Properties discoverable on short laptops (P2.2)
 *   SC-005: 1280x720 + feature selected → Properties section reachable.
 *
 * NOTE: This spec is authored only. Do NOT run during CI until a dedicated
 * Heroku Review App or local server is available. The spec models its
 * viewport/plot-load setup on the existing `plot-load.spec.ts` and
 * `panel-persistence.spec.ts`, and reuses `AnalysisPage`.
 *
 * Evidence screenshots are written to:
 *   specs/281-ui-review-p1-p2-fixes/evidence/screenshots/
 */

import { test, expect } from '@playwright/test';
import * as path from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { AnalysisPage } from '../pages/AnalysisPage';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Repo-relative path to the evidence screenshots directory. */
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../../specs/281-ui-review-p1-p2-fixes/evidence/screenshots',
);
mkdirSync(EVIDENCE_DIR, { recursive: true });

/** Open the first available plot in the catalog. */
async function openFirstPlot(analysis: AnalysisPage): Promise<void> {
  await analysis.page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
  await analysis.waitForLoad();
}

// ─────────────────────────────────────────────────────────────────────────────
// US3 — Analysis layout scales to wide screens
// ─────────────────────────────────────────────────────────────────────────────

test.describe('US3 — responsive sidebar width (spec 281)', () => {
  test.beforeEach(async ({ page }) => {
    // Remove any saved layout so the responsive default is used
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));
  });

  test('SC-003 @ 1920px: 0 ellipsised tool labels, rail in wide band', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // SC-003: no tool label should be truncated at 1920px
    const ellipsised = await analysis.countEllipsisedToolLabels();
    expect(ellipsised).toBe(0);

    // Rail width should be in the wide band (~380px target → ~20% of 1920 = ~384px)
    // Accept a range of 300–500px to be tolerant of GL chrome
    const railWidth = await analysis.getActivityRailWidthPx();
    expect(railWidth).toBeGreaterThan(300);
    expect(railWidth).toBeLessThan(500);

    // Map must keep majority: rail < 50% of viewport
    expect(railWidth).toBeLessThan(1920 * 0.5);

    // Screenshot evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'analysis-1920.png'),
      fullPage: false,
    });
  });

  test('SC-004 @ 1366px: rail ~280px target, map keeps majority', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // Rail width should be ~280px target (20% of 1366 ≈ 273px — accept 200-400px range)
    const railWidth = await analysis.getActivityRailWidthPx();
    expect(railWidth).toBeGreaterThan(200);
    expect(railWidth).toBeLessThan(400);

    // Map must keep majority: rail < 50% of viewport
    expect(railWidth).toBeLessThan(1366 * 0.5);

    // Screenshot evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'analysis-1366.png'),
      fullPage: false,
    });
  });

  test('1440px viewport: rail in middle or small band, map majority', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    const railWidth = await analysis.getActivityRailWidthPx();
    // Middle band target ~320px; accept 250–500px
    expect(railWidth).toBeGreaterThan(250);
    expect(railWidth).toBeLessThan(500);
    expect(railWidth).toBeLessThan(1440 * 0.5);
  });

  test('FR-011: a saved custom layout is respected verbatim', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // The app persists GoldenLayout's *resolved* config on stateChanged.
    // Wait for that autosave, then widen the sidebar to a custom 30% and write
    // it back — this is a real, app-produced layout (not a hand-built one), so
    // it round-trips through LayoutConfig.fromResolved() exactly as a user's
    // saved layout would.
    await page.waitForFunction(() => localStorage.getItem('debrief-panel-layout') !== null);
    const mutated = await page.evaluate(() => {
      const raw = localStorage.getItem('debrief-panel-layout');
      if (raw === null) return false;
      const parsed = JSON.parse(raw) as {
        config: { root?: { type: string; content: { size: number }[] } };
      };
      const root = parsed.config.root;
      if (!root || root.type !== 'row' || root.content.length < 2) return false;
      // content[0] = sidebar column, content[1] = map column
      root.content[0].size = 30;
      root.content[1].size = 70;
      localStorage.setItem('debrief-panel-layout', JSON.stringify(parsed));
      return true;
    });
    expect(mutated).toBe(true);

    // Reload and reopen — the saved custom layout must be applied verbatim.
    await page.reload();
    await openFirstPlot(analysis);

    // 30% sidebar at 1440px ≈ 432px. Accept a generous range tolerating GL chrome.
    const railWidth = await analysis.getActivityRailWidthPx();
    expect(railWidth).toBeGreaterThan(380);
    expect(railWidth).toBeLessThan(520);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// US4 — Properties discoverable on short laptops
// ─────────────────────────────────────────────────────────────────────────────

test.describe('US4 — Properties reachable at short viewport (spec 281)', () => {
  test('SC-005: Properties reachable at 1280x720 with feature selected', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // Select a feature to trigger the Properties display
    // The first layer row is the most reliable — use layers-panel click
    const firstLayer = analysis.layerRows.first();
    await firstLayer.waitFor({ state: 'visible', timeout: 5000 });
    await analysis.selectLayer(firstLayer);

    // SC-005: Properties section must be reachable (visible in the viewport)
    const propertiesReachable = await analysis.isPropertiesReachable();
    expect(propertiesReachable).toBe(true);

    // Screenshot evidence
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'properties-720.png'),
      fullPage: false,
    });
  });

  test('Properties section exists in ActivityPanel at 1280x720', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('debrief-panel-layout'));

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // The Properties section header must be present (even before feature selection)
    const propertiesSection = analysis.getSectionByTitle('Properties');
    await expect(propertiesSection).toBeAttached();
  });
});
