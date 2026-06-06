/**
 * Per-plot active-Storyboard pin (Feature 237).
 *
 * Three pure functions on the plot FeatureCollection — one type-guard plus a
 * getter and a setter — that read/write a single `SystemState` Feature with
 * `state_type: active_storyboard` inside the plot itself.
 *
 * Mirrors the existing storyboard helper pattern (`isStoryboardFeature`,
 * `isSceneFeature`, `getActiveStoryboardDefault`). No I/O, no React, no host
 * coupling — the host owns the actual save via the plot-edit pipeline
 * (`@debrief/stac-writer`).
 */

import type { Plot, PlotFeature } from "./types";

export const ACTIVE_STORYBOARD_FEATURE_ID = "state.activestoryboard";
export const ACTIVE_STORYBOARD_STATE_TYPE = "active_storyboard";

interface ActiveStoryboardSelectionFeature extends PlotFeature {
  properties: {
    kind: "SYSTEM";
    state_type: typeof ACTIVE_STORYBOARD_STATE_TYPE;
    active_storyboard_id?: string;
    [k: string]: unknown;
  };
}

export function isActiveStoryboardSelection(
  feature: PlotFeature | null | undefined,
): feature is ActiveStoryboardSelectionFeature {
  if (!feature || !feature.properties) return false;
  const props = feature.properties as { kind?: unknown; state_type?: unknown };
  return (
    props.kind === "SYSTEM" && props.state_type === ACTIVE_STORYBOARD_STATE_TYPE
  );
}

/**
 * Scan the plot for the first `SystemState` feature with
 * `state_type: active_storyboard` and return its `active_storyboard_id`,
 * or null if no such feature exists.
 *
 * Defensive de-dup logging (V-5): if multiple matching features exist, the
 * first match is returned and a single non-fatal warning is emitted; the
 * next write through `setActiveStoryboardSelection` will collapse them.
 *
 * Does NOT validate that the recorded ID corresponds to a Storyboard present
 * in the plot — that cross-feature integrity check (V-2) is the host's
 * responsibility on read.
 */
export function getActiveStoryboardSelection(plot: Plot): string | null {
  const matches = plot.features.filter(isActiveStoryboardSelection);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    console.warn(
      `[active-storyboard] plot contains ${matches.length} SystemState features ` +
        `with state_type=${ACTIVE_STORYBOARD_STATE_TYPE}; using the first. ` +
        `The next setActiveStoryboardSelection write will de-duplicate.`,
    );
  }
  const id = matches[0]!.properties.active_storyboard_id;
  if (typeof id !== "string") {
    if (id !== undefined && id !== null) {
      console.warn(
        `[active-storyboard] active_storyboard_id is not a string ` +
          `(${typeof id}); treating as absent.`,
      );
    }
    return null;
  }
  return id;
}

/**
 * Return a NEW FeatureCollection with the active-storyboard SystemState
 * feature upserted (V-3: at most one) or removed (V-4: when id is null).
 *
 * Pure — never mutates the input plot or any of its features.
 */
export function setActiveStoryboardSelection(
  plot: Plot,
  id: string | null,
): Plot {
  const without = plot.features.filter((f) => !isActiveStoryboardSelection(f));
  if (id === null) {
    return { ...plot, features: without };
  }
  const upserted: PlotFeature = {
    type: "Feature",
    id: ACTIVE_STORYBOARD_FEATURE_ID,
    geometry: { type: "Point", coordinates: [] },
    properties: {
      kind: "SYSTEM",
      state_type: ACTIVE_STORYBOARD_STATE_TYPE,
      active_storyboard_id: id,
    },
  };
  return { ...plot, features: [...without, upserted] };
}
