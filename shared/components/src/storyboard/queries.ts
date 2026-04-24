/**
 * Pure synchronous queries over a plot FeatureCollection.
 *
 * None of these functions touch the crypto subtle path, so they stay sync.
 * `readSceneWithStaleness` returns the stored hash + canonical list so the
 * consumer can choose when to await a recomputation (see research.md R11).
 */

import { canonicaliseVisibleFeatureIds } from "./hash";
import type { Plot, SceneFeature, StoryboardFeature } from "./types";
import { isSceneFeature, isStoryboardFeature } from "./types";

export function getStoryboard(
  plot: Plot,
  storyboardId: string,
): StoryboardFeature | null {
  for (const f of plot.features) {
    if (isStoryboardFeature(f) && f.properties.id === storyboardId) {
      return f;
    }
  }
  return null;
}

export function getScene(
  plot: Plot,
  sceneId: string,
): SceneFeature | null {
  for (const f of plot.features) {
    if (isSceneFeature(f) && f.properties.id === sceneId) {
      return f;
    }
  }
  return null;
}

/**
 * Return the plot's default "active" Storyboard (first by name ascending).
 * Null if the plot contains no Storyboards.
 */
export function getActiveStoryboardDefault(
  plot: Plot,
): StoryboardFeature | null {
  let best: StoryboardFeature | null = null;
  for (const f of plot.features) {
    if (!isStoryboardFeature(f)) continue;
    if (best === null || f.properties.name < best.properties.name) {
      best = f;
    }
  }
  return best;
}

/**
 * Return the plot's most-recently-modified Storyboard — the one whose
 * last provenance entry has the latest timestamp. Ties are broken by
 * `storyboard.properties.id` ascending (ULIDs sort lexicographically by
 * generation time, so this is a deterministic fallback consistent with
 * creation order within the same millisecond).
 *
 * Null if the plot contains no Storyboards or any candidate Storyboard
 * has an empty `provenance[]` (which would be a schema-invalid state
 * caught by #215's `validatePlot`).
 *
 * Used by #217's playback service to seed the active Storyboard on
 * plot-open (research R7 / FR-PLAY-002).
 */
export function getMostRecentlyModifiedStoryboard(
  plot: Plot,
): StoryboardFeature | null {
  let best: StoryboardFeature | null = null;
  let bestTs: string | null = null;
  for (const f of plot.features) {
    if (!isStoryboardFeature(f)) continue;
    const entries = f.properties.provenance ?? [];
    const last = entries[entries.length - 1];
    if (!last) continue;
    const ts = last.timestamp;
    if (
      bestTs === null ||
      ts > bestTs ||
      (ts === bestTs && f.properties.id < best!.properties.id)
    ) {
      best = f;
      bestTs = ts;
    }
  }
  return best;
}

export interface StaleReadResult {
  scene: SceneFeature;
  storedHash: string;
  canonicalVisibleIds: string[];
}

/**
 * Sync read that returns the Scene + stored hash + canonical feature IDs.
 * Consumers compute `await computeFeatureSetHash(result.canonicalVisibleIds)`
 * and compare against `storedHash` to detect staleness.
 */
export function readSceneWithStaleness(
  plot: Plot,
  sceneId: string,
): StaleReadResult | null {
  const scene = getScene(plot, sceneId);
  if (scene === null) return null;
  const canonicalVisibleIds = canonicaliseVisibleFeatureIds(
    scene.properties.visible_feature_ids,
  );
  return {
    scene,
    storedHash: scene.properties.feature_set_hash,
    canonicalVisibleIds,
  };
}
