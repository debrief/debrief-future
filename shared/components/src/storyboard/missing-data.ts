/**
 * Pure missing-data classifier for a single Scene.
 *
 * Returns one of:
 *   - `{ kind: "ok" }` — all `visible_feature_ids` resolve and the Scene
 *     `timestamp` is inside `plotTimeRange`.
 *   - `{ kind: "missing-features", missingIds: [...] }` — one or more
 *     `visible_feature_ids` do not match any `plotFeatures` id.
 *   - `{ kind: "out-of-range" }` — the Scene `timestamp` is before
 *     `plotTimeRange.start` or after `plotTimeRange.end`.
 *
 * When both apply, `out-of-range` takes precedence (documented by the
 * tests in missing-data.test.ts).
 *
 * Pure: MUST NOT mutate either argument. Guaranteed sync — no crypto.
 */

import type { SceneFeature } from "./types";

export type MissingDataClassification =
  | { kind: "ok" }
  | { kind: "missing-features"; missingIds: string[] }
  | { kind: "out-of-range" };

export interface PlotTimeRange {
  start: string;
  end: string;
}

export function detectMissingDataForScene(
  scene: SceneFeature,
  plotFeatures: ReadonlyArray<GeoJSON.Feature>,
  plotTimeRange: PlotTimeRange,
): MissingDataClassification {
  const sceneTs = scene.properties.timestamp;
  // ISO-8601 strings are lexicographically comparable when they carry
  // the same time zone offset — Debrief uses `Z` throughout.
  if (sceneTs < plotTimeRange.start || sceneTs > plotTimeRange.end) {
    return { kind: "out-of-range" };
  }
  const availableIds = new Set<string>();
  for (const feat of plotFeatures) {
    if (typeof feat.id === "string") {
      availableIds.add(feat.id);
    }
    const propsId = (feat.properties as { id?: unknown } | null)?.id;
    if (typeof propsId === "string") {
      availableIds.add(propsId);
    }
  }
  const missingIds: string[] = [];
  for (const id of scene.properties.visible_feature_ids) {
    if (!availableIds.has(id)) {
      missingIds.push(id);
    }
  }
  if (missingIds.length > 0) {
    return { kind: "missing-features", missingIds };
  }
  return { kind: "ok" };
}
