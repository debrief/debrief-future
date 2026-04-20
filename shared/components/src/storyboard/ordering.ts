/**
 * Scene ordering helper.
 *
 * Ordering is **derived** from `properties.timestamp` ascending — no
 * explicit `order` field exists. Scene timestamps are unique within a
 * Storyboard (invariant SC-I1), so the sort is stable w.r.t. the
 * consumer's expectations.
 *
 * Sync, pure, no mutation.
 */

import type { Plot, SceneFeature } from "./types";
import { isSceneFeature } from "./types";

export function listScenesOrdered(
  plot: Plot,
  storyboardId: string,
): SceneFeature[] {
  const scenes: SceneFeature[] = [];
  for (const feature of plot.features) {
    if (!isSceneFeature(feature)) continue;
    if (feature.properties.storyboard_id !== storyboardId) continue;
    scenes.push(feature);
  }
  // Copy to avoid mutating `plot.features` — the Array.prototype.sort call
  // on a local array is fine.
  return scenes.sort((a, b) => {
    const at = a.properties.timestamp;
    const bt = b.properties.timestamp;
    return at < bt ? -1 : at > bt ? 1 : 0;
  });
}
