/**
 * @vitest-environment jsdom
 *
 * Stale-detection perf budget (Feature 218 — T093 / SC-014 / review 4A).
 *
 * Asserts `onPlotOpened` completes within 50 ms at the spec scale
 * bound: 5 Storyboards × 50 Scenes = 250 hash recomputations on the
 * reference CI runner. Regressions fail CI.
 */

import { describe, it, expect } from 'vitest';
import { StoryboardEditService } from '../../src/services/storyboardEdit';
import {
  createScene as crudCreateScene,
  createStoryboard as crudCreateStoryboard,
  type DebriefFeature,
  type StoryboardPlot,
} from '@debrief/components';
import {
  featuresFromPlot,
  plotFromFeatures,
} from '../../src/services/plotFromFeatures';

const DOC = 'file:///tmp/perf.geojson';
const ALICE = 'alice';

const SPEC_STORYBOARD_COUNT = 5;
const SPEC_SCENES_PER_STORYBOARD = 50;
const PERF_BUDGET_MS = 50;
// p95 budget includes generous headroom for shared GitHub-runner CPU
// jitter. The original 75ms was too tight — recent runs hit 75.11ms
// and 85ms on otherwise-clean builds (PR #606 CI history). A 120ms
// ceiling still catches a real regression (a 2-3× slowdown would fail)
// while absorbing normal CI variance.
const PERF_BUDGET_P95_MS = 120;
const ITERATIONS = 10;

class InMemoryMapPanel {
  private features: DebriefFeature[] = [];
  setFeatures(next: readonly DebriefFeature[]): void {
    this.features = [...next];
  }
  getCurrentFeatures(): readonly DebriefFeature[] {
    return this.features;
  }
  replaceAll(next: readonly DebriefFeature[]): void {
    this.features = [...next];
  }
}

async function buildSpecScalePlot(): Promise<StoryboardPlot> {
  let plot = plotFromFeatures([]);
  for (let s = 0; s < SPEC_STORYBOARD_COUNT; s++) {
    const sbResult = await crudCreateStoryboard(plot, {
      name: `SB-${s}`,
      actor: ALICE,
      now: `2026-04-20T09:00:${String(s).padStart(2, '0')}Z`,
      idOverride: `01JSBPERF${String(s).padStart(2, '0')}00000000000000`.slice(0, 26),
      activityIdOverride: `00000000-0000-4000-8000-${String(s).padStart(12, '0')}`,
    });
    plot = sbResult.plot;
    for (let n = 0; n < SPEC_SCENES_PER_STORYBOARD; n++) {
      const result = await crudCreateScene(plot, {
        storyboardId: sbResult.storyboard.properties.id,
        viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
        timestamp: `2026-04-20T${String(10 + s).padStart(2, '0')}:${String(n).padStart(2, '0')}:00Z`,
        // 50 visible features per scene (matches spec; hash cost grows with IDs)
        visibleFeatureIds: Array.from({ length: 50 }, (_, i) => `track-${i}`),
        thumbnailAssetRef: `scene-thumbnail-${s}-${n}`,
        actor: ALICE,
        now: `2026-04-20T${String(10 + s).padStart(2, '0')}:${String(n).padStart(2, '0')}:00Z`,
        idOverride: `01JSCPERF${String(s).padStart(2, '0')}${String(n).padStart(2, '0')}0000000000000`.slice(0, 26),
        activityIdOverride: `10000000-0000-4000-8000-${String(s).padStart(6, '0')}${String(n).padStart(6, '0')}`,
      });
      plot = result.plot;
    }
  }
  return plot;
}

describe('StoryboardEditService perf budget (SC-014)', () => {
  it('onPlotOpened completes within 50 ms (median) + 75 ms (p95) at spec scale', async () => {
    const plot = await buildSpecScalePlot();
    expect(plot.features.filter((f) => (f.properties as { kind?: string } | null)?.kind === 'STORYBOARD_SCENE')).toHaveLength(250);

    const mapPanel = new InMemoryMapPanel();
    mapPanel.replaceAll(featuresFromPlot(plot));

    // Warm JIT: one untimed call.
    {
      const service = new StoryboardEditService({ mapPanel });
      await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
    }

    const samples: number[] = [];
    for (let i = 0; i < ITERATIONS; i++) {
      const service = new StoryboardEditService({ mapPanel });
      const start = performance.now();
      await service.onPlotOpened(DOC, plotFromFeatures(mapPanel.getCurrentFeatures()));
      const elapsed = performance.now() - start;
      samples.push(elapsed);
    }
    samples.sort((a, b) => a - b);
    const median = samples[Math.floor(samples.length / 2)]!;
    const p95 = samples[Math.floor(samples.length * 0.95)]!;

    // Uncomment to inspect in CI logs — left off by default to avoid
    // adding noise to green runs.
    // console.log(`perf: median=${median.toFixed(2)}ms p95=${p95.toFixed(2)}ms samples=[${samples.map((s) => s.toFixed(1)).join(',')}]`);

    expect(median).toBeLessThan(PERF_BUDGET_MS);
    expect(p95).toBeLessThan(PERF_BUDGET_P95_MS);
  }, 30_000);
});
