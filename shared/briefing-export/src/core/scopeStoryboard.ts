/**
 * scopeStoryboard — pure helper for the briefing-zip export pipeline
 * (data-model § 2, BR-1–BR-5).
 *
 * Given a plot FeatureCollection and a chosen Storyboard's id, compute
 * the briefing-scoped FeatureCollection:
 *   - Exactly one StoryboardFeature (the chosen one).
 *   - Every SceneFeature whose `storyboard_id` matches.
 *   - Every non-Storyboard / non-Scene feature whose `id` appears in
 *     the union of Scene `visible_feature_ids`.
 *   - Ordering: Storyboard first, Scenes (timestamp ASC, creation_order
 *     ASC), then referenced data features (original order).
 */

import { isStoryboardFeature, isSceneFeature } from '@debrief/components/storyboard';
import type {
  StoryboardPlot,
  SceneFeature,
  StoryboardFeature,
} from '@debrief/components/storyboard';

// Local accessor helpers. The shared `PlotFeature` declares
// `properties: { kind?: string; [k: string]: unknown } | null` which
// loses the StoryboardFeature / SceneFeature structural fields the
// briefing-export code needs. These helpers read the same field with
// an explicit type annotation, no `as unknown` casts.
function sbId(feature: { properties?: unknown }): string {
  const p = feature.properties as { id?: unknown } | null | undefined;
  return typeof p?.id === 'string' ? p.id : '';
}
function sceneStoryboardId(feature: { properties?: unknown }): string {
  const p = feature.properties as { storyboard_id?: unknown } | null | undefined;
  return typeof p?.storyboard_id === 'string' ? p.storyboard_id : '';
}
function sceneTimestamp(feature: { properties?: unknown }): string {
  const p = feature.properties as { timestamp?: unknown } | null | undefined;
  return typeof p?.timestamp === 'string' ? p.timestamp : '';
}
function sceneCreationOrder(feature: { properties?: unknown }): number {
  const p = feature.properties as { creation_order?: unknown } | null | undefined;
  return typeof p?.creation_order === 'number' ? p.creation_order : 0;
}

export class StoryboardNotFoundError extends Error {
  constructor(public readonly storyboardId: string) {
    super(`No StoryboardFeature with id "${storyboardId}" in plot`);
    this.name = 'StoryboardNotFoundError';
  }
}

export interface ScopedFeatureCollection {
  fc: StoryboardPlot;
  storyboard: StoryboardFeature;
  scenes: readonly SceneFeature[];
}

function getSceneVisibleIds(scene: SceneFeature): string[] {
  const visible = (scene.properties as { visible_feature_ids?: unknown }).visible_feature_ids;
  if (Array.isArray(visible)) {
    return visible.filter((x): x is string => typeof x === 'string');
  }
  return [];
}

export function scopeStoryboard(
  plot: StoryboardPlot,
  storyboardId: string,
): ScopedFeatureCollection {
  const allStoryboards = plot.features.filter(isStoryboardFeature);
  const storyboard = allStoryboards.find((sb) => sbId(sb) === storyboardId);
  if (!storyboard) {
    throw new StoryboardNotFoundError(storyboardId);
  }

  // BR-2: every Scene matching the chosen Storyboard id
  const matchingScenes = plot.features
    .filter(isSceneFeature)
    .filter((s) => sceneStoryboardId(s) === storyboardId);

  // BR-5 ordering: timestamp ASC, then creation_order ASC
  const orderedScenes = [...matchingScenes].sort((a, b) => {
    const ta = Date.parse(sceneTimestamp(a));
    const tb = Date.parse(sceneTimestamp(b));
    if (ta !== tb) {
      return ta - tb;
    }
    return sceneCreationOrder(a) - sceneCreationOrder(b);
  });

  // BR-3: referenced data features (anything whose id appears in any
  // Scene's visible_feature_ids and is NOT itself a Storyboard / Scene).
  const referencedIds = new Set<string>();
  for (const scene of orderedScenes) {
    for (const id of getSceneVisibleIds(scene)) {
      referencedIds.add(id);
    }
  }

  const referencedFeatures = plot.features.filter((f) => {
    // Re-narrow with the type guards — non-Storyboard/Scene features only.
    if (isStoryboardFeature(f) || isSceneFeature(f)) {
      return false;
    }
    const fid: unknown = (f as { id?: unknown }).id;
    return typeof fid === 'string' && referencedIds.has(fid);
  });

  return {
    fc: {
      type: 'FeatureCollection',
      features: [storyboard, ...orderedScenes, ...referencedFeatures],
    },
    storyboard,
    scenes: orderedScenes,
  };
}
