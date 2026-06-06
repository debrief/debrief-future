/**
 * Scene ordering helper.
 *
 * Ordering is **derived** from `(anchorTimestamp, creation_order)` ascending —
 * no explicit `order` field exists. The anchor timestamp is
 * `properties.time_range.start ?? properties.timestamp`. For instant Scenes
 * (#215) the anchor equals `timestamp`; for time-range Scenes (#263) the
 * anchor is the start of the captured range. Per #259, multiple Scenes
 * within a Storyboard MAY share an anchor timestamp; the secondary
 * `creation_order` key breaks ties deterministically (SC-I1).
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
    const at = a.properties.time_range?.start ?? a.properties.timestamp;
    const bt = b.properties.time_range?.start ?? b.properties.timestamp;
    if (at < bt) return -1;
    if (at > bt) return 1;
    // Tied anchor timestamps — break by creation_order ASC (#259 / SC-I1).
    return a.properties.creation_order - b.properties.creation_order;
  });
}
