/**
 * E2E test for #259 — tied-timestamp captures (US1 / FR-001 / FR-011).
 *
 * Captures three Scenes at the same instant by pausing the time-controller
 * between captures and only changing the map viewport. Asserts:
 *   - all three Scenes share the same `timestamp`
 *   - their `creation_order` values are monotonic (0, 1, 2)
 *   - the panel renders them in capture order (the visual proof for the
 *     blog post lives here as a screenshot)
 *
 * Writes the headline screenshot directly into the spec's evidence dir.
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { StoryboardPanelPage } from '../pages/StoryboardPanelPage';
import { openCapturablePlot } from '../helpers/openCapturablePlot';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_PATH = resolve(
  __dirname,
  '../../../../specs/259-relax-scene-time/evidence/screenshots/tied-timestamps.png',
);

test.describe('Storyboard — tied-timestamp captures (#259)', () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }) => {
    // Open a track-bearing, temporal plot deterministically (the recency
    // .first() row can be a non-temporal areas plot whose missing currentTime
    // hangs capture setup — see helpers/openCapturablePlot.ts).
    await openCapturablePlot(page);
  });

  test('three captures at one instant land in capture order with monotonic creation_order', async ({
    page,
  }) => {
    const panel = new StoryboardPanelPage(page);

    // Capture #1 — names the Storyboard and lands the first Scene.
    await panel.firstCapture('Op Harrier — turn-and-engage');

    // Capture the playhead so we can confirm later that captures 2 and 3
    // share this exact timestamp (we never advance the time-controller).
    const firstTimestamp = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      const scene = fc.find(
        (f) => (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
      );
      return (scene?.properties as { timestamp?: string })?.timestamp ?? null;
    });
    expect(firstTimestamp).not.toBeNull();

    // Pan the map between captures so each Scene's viewport is visibly
    // different — the analyst's intent is a multi-viewport snapshot.
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    if (!box) throw new Error('Leaflet container has no bounding box');

    const panAndCapture = async (dx: number, dy: number): Promise<void> => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + dx,
        box.y + box.height / 2 + dy,
      );
      await page.mouse.up();
      // Wait for Leaflet's moveend to drop a fresh viewport into the
      // session store before invoking capture.
      await page.waitForTimeout(150);
      await panel.subsequentCapture();
    };

    await panAndCapture(40, 0);
    await panAndCapture(-40, 30);

    // Three Scenes; all share the same timestamp; creation_order 0, 1, 2.
    const scenes = await page.evaluate(() => {
      const fc = window.__currentPlotFeatures ?? [];
      return fc
        .filter(
          (f) =>
            (f.properties as { kind?: string })?.kind === 'STORYBOARD_SCENE',
        )
        .map((f) => ({
          id: (f.properties as { id: string }).id,
          timestamp: (f.properties as { timestamp: string }).timestamp,
          creation_order: (f.properties as { creation_order: number })
            .creation_order,
        }))
        .sort((a, b) => a.creation_order - b.creation_order);
    });
    expect(scenes).toHaveLength(3);
    expect(scenes[0]!.timestamp).toBe(firstTimestamp);
    expect(scenes[1]!.timestamp).toBe(firstTimestamp);
    expect(scenes[2]!.timestamp).toBe(firstTimestamp);
    expect(scenes.map((s) => s.creation_order)).toEqual([0, 1, 2]);

    // Panel renders the three rows in (timestamp, creation_order) order.
    const rows = await panel.getSceneRows();
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.id)).toEqual(scenes.map((s) => s.id));

    // No collision banner ever surfaced.
    await expect(
      page.locator('[data-testid="storyboard-collision-banner"]'),
    ).toBeHidden();

    // Headline screenshot for the blog post — the rail with three rows.
    await panel.rail.screenshot({ path: SCREENSHOT_PATH });
  });
});
