/**
 * Save-time invariant scanner for storyboard features in a plot.
 *
 * Pure, synchronous, side-effect-side-free. Throws the first invariant
 * violation encountered — consumers call this from their save path (and
 * from their open path, per #259 FR-010) to reject corrupt or pre-#259
 * FeatureCollections before persistence.
 *
 * Covers (in order):
 *   - UnsupportedSchemaVersion (FC-V1) — fires first so legacy plots
 *     surface a clear schema-version error before FC-I5
 *   - DuplicateStoryboardName (FC-I2)
 *   - OrphanScene (FC-I1)
 *   - MissingCreationOrder (FC-I5) — pre-#259 Scenes without creation_order
 *   - DuplicateCreationOrder (FC-I4) — replaces #215's FC-I3
 *   - ReservedSlotViolation (SC-I4 time_range, SC-I5 viewport.bearing)
 */

import {
  DuplicateCreationOrderError,
  DuplicateStoryboardNameError,
  MissingCreationOrderError,
  OrphanSceneError,
  ReservedSlotViolationError,
  UnsupportedSchemaVersionError,
} from "./errors";
import type { Plot } from "./types";
import { isSceneFeature, isStoryboardFeature } from "./types";

const REQUIRED_SCHEMA_VERSION = 2;

export function validatePlot(plot: Plot): void {
  const storyboardIds = new Set<string>();
  const storyboardNames = new Map<string, string>();

  // FC-V1 first — every Storyboard must declare schema_version >= 2.
  // Surfaces the "pre-#259 plot" case with the most informative error
  // before the per-Scene FC-I5 check fires on the same data.
  for (const f of plot.features) {
    if (!isStoryboardFeature(f)) continue;
    const v = f.properties.schema_version;
    if (typeof v !== "number" || v < REQUIRED_SCHEMA_VERSION) {
      throw new UnsupportedSchemaVersionError(
        f.properties.id,
        typeof v === "number" ? v : 0,
        REQUIRED_SCHEMA_VERSION,
      );
    }
  }

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

  // FC-I4 — uniqueness key is `${storyboard_id}|${creation_order}`.
  const seenCreationOrders = new Map<string, string>();
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
    // FC-I5 — every Scene MUST carry creation_order. Pre-#259 Scenes that
    // slip through the Pydantic layer (e.g. hand-edited JSON) are caught
    // here.
    if (typeof f.properties.creation_order !== "number") {
      throw new MissingCreationOrderError(
        f.properties.storyboard_id,
        f.properties.id,
      );
    }
    const key = `${f.properties.storyboard_id}|${f.properties.creation_order}`;
    const existingId = seenCreationOrders.get(key);
    if (existingId !== undefined && existingId !== f.properties.id) {
      throw new DuplicateCreationOrderError(
        f.properties.storyboard_id,
        f.properties.creation_order,
        [existingId, f.properties.id],
      );
    }
    seenCreationOrders.set(key, f.properties.id);
  }
}
