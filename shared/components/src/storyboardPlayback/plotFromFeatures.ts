/**
 * Shared helper — wraps a `DebriefFeature[]` array as a throwaway
 * `StoryboardPlot` FeatureCollection for passing to #215's module API.
 *
 * Hoisted from `apps/vscode/src/services/plotFromFeatures.ts` during the
 * T-HOIST step of spec #264. Both the briefing renderer and the VS Code
 * authoring environment need this conversion at the #215 boundary; the
 * VS Code copy now re-exports from here.
 *
 * The cast is unavoidable: `DebriefFeature` is the canonical union of
 * every known GeoJSON Feature kind (Tracks, Annotations, Storyboards,
 * Scenes, …), while `StoryboardPlotFeature` is #215's structural
 * super-type. Both are GeoJSON Features — see ADR-019 for the decision
 * to cross the boundary with a cast rather than a runtime conversion.
 */

import type { DebriefFeature } from '../utils/types';
import type { Plot as StoryboardPlot } from '../storyboard/types';

type StoryboardPlotFeature = StoryboardPlot['features'][number];

export function plotFromFeatures(
  features: readonly DebriefFeature[],
): StoryboardPlot {
  return {
    type: 'FeatureCollection',
    // eslint-disable-next-line no-restricted-syntax -- DebriefFeature ↔ StoryboardPlotFeature boundary — both are GeoJSON Features (see ADR-019).
    features: features as unknown as StoryboardPlotFeature[],
  };
}

/**
 * Inverse of `plotFromFeatures` — unwraps a `StoryboardPlot.features`
 * array (returned from #215's async CRUD) back into the canonical
 * `DebriefFeature[]` view. Same ADR-019 boundary.
 */
export function featuresFromPlot(
  plot: StoryboardPlot,
): DebriefFeature[] {
  // eslint-disable-next-line no-restricted-syntax -- inverse of the cast above.
  return plot.features as unknown as DebriefFeature[];
}
