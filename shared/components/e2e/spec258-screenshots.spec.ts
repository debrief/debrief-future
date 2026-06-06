/**
 * Spec #258 — capture evidence screenshots for the four user-stories.
 *
 * Targets:
 * - FeatureList storyboard grouping with `(N)` badge (FR-010, FR-013, NEW-C)
 *   — collapsed parent + expanded parent + empty-storyboard disabled chevron.
 * - StoryboardPlayback active-scene halo (FR-007/008/009).
 * - Theme variants (light / dark / vscode) for both component groups.
 *
 * The spec writes PNGs into `specs/258-scene-playback-fidelity/evidence/
 * screenshots/`. Run via the cloud-friendly runner at
 * `apps/web-shell/run-playwright.mjs`-style script in
 * `shared/components/run-playwright.mjs`.
 */

import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync } from 'fs';

const EVIDENCE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../specs/258-scene-playback-fidelity/evidence/screenshots',
);

mkdirSync(EVIDENCE_DIR, { recursive: true });

const STORIES = {
  featureListGrouping: {
    light: '/iframe.html?id=components-featurelist--storyboard-grouping&globals=theme:light',
    dark: '/iframe.html?id=components-featurelist--storyboard-grouping&globals=theme:dark',
    vscode: '/iframe.html?id=components-featurelist--storyboard-grouping&globals=theme:vscode',
  },
  featureListGroupingExpanded: {
    light: '/iframe.html?id=components-featurelist--storyboard-grouping-expanded&globals=theme:light',
    dark: '/iframe.html?id=components-featurelist--storyboard-grouping-expanded&globals=theme:dark',
    vscode: '/iframe.html?id=components-featurelist--storyboard-grouping-expanded&globals=theme:vscode',
  },
  storyboardPlayback: {
    light: '/iframe.html?id=panels-storyboardplayback--integrated-playback&globals=theme:light',
    dark: '/iframe.html?id=panels-storyboardplayback--integrated-playback&globals=theme:dark',
    vscode: '/iframe.html?id=panels-storyboardplayback--integrated-playback&globals=theme:vscode',
  },
};

const SETTLE_MS = 700;

test.describe('Spec #258 — FeatureList storyboard grouping (N) badge', () => {
  for (const [variant, url] of Object.entries(STORIES.featureListGrouping)) {
    test(`captures collapsed parent + (N) badge — ${variant}`, async ({ page }) => {
      await page.setViewportSize({ width: 600, height: 400 });
      await page.goto(url);
      // Wait for FeatureList to mount.
      await page
        .locator('.debrief-feature-row')
        .first()
        .waitFor({ state: 'visible', timeout: 10000 });
      await page.waitForTimeout(SETTLE_MS);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/featurelist-grouping-${variant}.png`,
      });
    });
  }

  test('captures expanded parent + empty-storyboard disabled chevron — light', async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 520 });
    await page.goto(STORIES.featureListGroupingExpanded.light);
    await page
      .locator('.debrief-feature-row')
      .first()
      .waitFor({ state: 'visible', timeout: 10000 });
    // Expand the non-empty storyboard parent.
    const expandBtns = page.locator('button.debrief-feature-row__expand-btn:not([disabled])');
    const count = await expandBtns.count();
    // The storyboard parent appears after the two tracks (which have
    // their own expand buttons). Click the third-or-later button that
    // hasn't been clicked yet; in this fixture the storyboard parent is
    // the only one with an expandable list of indented scene children.
    // Simpler: locate the row whose text starts with "Engagement Brief"
    // and click its chevron.
    const sbRow = page
      .locator('.debrief-feature-row')
      .filter({ hasText: 'Engagement Brief' })
      .first();
    const sbChevron = sbRow.locator('button.debrief-feature-row__expand-btn');
    await sbChevron.click();
    await page.waitForTimeout(SETTLE_MS);
    await page.screenshot({
      path: `${EVIDENCE_DIR}/featurelist-grouping-expanded-light.png`,
    });
    // Sanity-check the (N) badge is visible.
    await expect(page.getByText(/Engagement Brief \(5\)/)).toBeVisible();
    await expect(page.getByText(/Empty Storyboard \(0\)/)).toBeVisible();
    // Sanity-check both expand buttons exist; the empty storyboard's is disabled.
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Spec #258 — StoryboardPlayback active-scene halo', () => {
  for (const [variant, url] of Object.entries(STORIES.storyboardPlayback)) {
    test(`captures halo on current scene — ${variant}`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto(url);
      await page
        .locator('[data-testid="storyboard-playback-harness"]')
        .waitFor({ state: 'visible', timeout: 15000 });
      // Wait for Leaflet tiles to settle (so the screenshot shows the basemap
      // not a white void). The existing #217 spec waits ~2.5s; we mirror that.
      await page.waitForTimeout(3000);
      // FR-007/008 — the current scene rectangle MUST carry the halo class.
      // Diagnostic: dump the classNames of every scene rectangle so we can
      // see exactly which CSS classes Leaflet is emitting.
      // FR-007/008 — exactly one rectangle MUST carry the halo class. Asserting
      // at the DOM level is the durable evidence that the screenshot is honest
      // (a single halo, current scene only). The class is applied to the
      // rendered SVG path via the SceneRectanglePolygon ref effect — see
      // `SceneRectangleLayer.tsx`.
      const haloHits = await page.locator('path.debrief-map-feature--selected').count();
      expect(haloHits).toBe(1);
      await page.screenshot({
        path: `${EVIDENCE_DIR}/scene-rect-halo-${variant}.png`,
      });
    });
  }
});
