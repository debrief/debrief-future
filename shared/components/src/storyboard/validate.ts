/**
 * Save-time invariant scanner for storyboard features in a plot.
 *
 * Pure, synchronous, side-effect-free. Throws the first invariant violation
 * encountered — consumers call this from their save path to reject corrupt
 * FeatureCollections before persistence.
 *
 * Covers (in order):
 *   - DuplicateStoryboardName (FC-I2)
 *   - OrphanScene (FC-I1)
 *   - DuplicateTimestamp (FC-I3)
 *   - ReservedSlotViolation (SC-I4 time_range, SC-I5 viewport.bearing)
 */

import {
  DuplicateStoryboardNameError,
  DuplicateTimestampError,
  OrphanSceneError,
  ReservedSlotViolationError,
} from "./errors";
import type { Plot } from "./types";
import { isSceneFeature, isStoryboardFeature } from "./types";

export function validatePlot(plot: Plot): void {
  const storyboardIds = new Set<string>();
  const storyboardNames = new Map<string, string>();

  for (const f of plot.features) {
    if (isStoryboardFeature(f)) {
      const existingId = storyboardNames.get(f.properties.name);
      if (existingId !== undefined && existingId !== f.properties.id) {
        throw new DuplicateStoryboardNameError(
          f.properties.name,
          existingId,
        );
      }
      storyboardNames.set(f.properties.name, f.properties.id);
      storyboardIds.add(f.properties.id);
    }
  }

  const seenSceneTimestamps = new Map<string, string>();
  for (const f of plot.features) {
    if (!isSceneFeature(f)) continue;
    if (f.properties.viewport.bearing !== 0) {
      throw new ReservedSlotViolationError(
        "viewport.bearing",
        f.properties.viewport.bearing,
      );
    }
    const tr = f.properties.time_range;
    if (tr !== null && tr !== undefined) {
      throw new ReservedSlotViolationError("time_range", tr);
    }
    if (!storyboardIds.has(f.properties.storyboard_id)) {
      throw new OrphanSceneError(
        f.properties.id,
        f.properties.storyboard_id,
      );
    }
    const key = `${f.properties.storyboard_id}|${f.properties.timestamp}`;
    const existingId = seenSceneTimestamps.get(key);
    if (existingId !== undefined && existingId !== f.properties.id) {
      throw new DuplicateTimestampError(
        f.properties.timestamp,
        existingId,
      );
    }
    seenSceneTimestamps.set(key, f.properties.id);
  }
}
