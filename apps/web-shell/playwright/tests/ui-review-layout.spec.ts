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
import { AnalysisPage } from '../pages/AnalysisPage';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Repo-relative path to the evidence screenshots directory. */
const EVIDENCE_DIR = path.join(
  __dirname,
  '../../../../specs/281-ui-review-p1-p2-fixes/evidence/screenshots',
);

/** Open the first available plot in the catalog. */
async function openFirstPlot(analysis: AnalysisPage): Promise<void> {
  await analysis.page.locator('[data-testid="exercise-list-item-row"]').first().dblclick();
  await analysis.waitForLoad();
}

/**
 * Seed localStorage with a custom v3 layout at the well-known storage key.
 * The config content is structurally valid (all essential panels present)
 * but uses custom column widths to verify the layout is used verbatim.
 */
async function seedCustomV3Layout(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const customLayout = {
      version: 3,
      config: {
        root: {
          type: 'row',
          content: [
            {
              type: 'column',
              width: 30, // custom 30% sidebar
              content: [
                {
                  type: 'stack',
                  height: 30,
                  content: [{ type: 'component', componentType: 'navigation', title: 'Navigation' }],
                },
                {
                  type: 'stack',
                  height: 70,
                  activeItemIndex: 0,
                  content: [
                    { type: 'component', componentType: 'activity', title: 'Activity' },
                    { type: 'component', componentType: 'log', title: 'Log' },
                  ],
                },
              ],
            },
            {
              type: 'column',
              width: 70, // 70% for the map
              content: [
                {
                  type: 'stack',
                  content: [{ type: 'component', componentType: 'map', title: 'Map' }],
                },
              ],
            },
          ],
        },
        openPopouts: [],
        dimensions: {},
        header: {},
        resolved: true,
      },
    };
    localStorage.setItem('debrief-panel-layout', JSON.stringify(customLayout));
  });
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

  test('FR-011: saved v3 custom layout is respected verbatim', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // Seed a custom 30/70 split layout at v3
    await seedCustomV3Layout(page);

    const analysis = new AnalysisPage(page);
    await openFirstPlot(analysis);

    // The custom layout specifies 30% sidebar. At 1440px that is ~432px.
    // Accept a generous range (380-520px) tolerating GL chrome.
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
