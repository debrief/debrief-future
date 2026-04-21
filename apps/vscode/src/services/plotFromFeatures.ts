/**
 * Shared helper — wraps a `DebriefFeature[]` array as a throwaway
 * `StoryboardPlot` FeatureCollection for passing to #215's module API.
 *
 * Both the `StoryboardPanelViewProvider` and `StoryboardPlaybackService`
 * need this conversion at the #215 boundary. Extracting it here keeps
 * the single-source-of-truth for the `DebriefFeature` ↔ `StoryboardPlot`
 * cast (design-fix 4 from plan.md — extracts duplicated code from
 * `storyboardPanelView.ts:85-89`).
 *
 * The cast is unavoidable: `DebriefFeature` is the VS Code extension's
 * union of every known GeoJSON Feature kind (Tracks, Annotations,
 * Storyboards, Scenes, …), while `StoryboardPlotFeature` is #215's
 * structural super-type. Both are GeoJSON Features — see ADR-019 for
 * the decision to cross the boundary with a cast rather than a
 * runtime conversion.
 */
import type { DebriefFeature, StoryboardPlot } from '@debrief/components';

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
