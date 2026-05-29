/**
 * Canonical feature-identity accessor tests (ADR-038).
 *
 * `getPlotFeatureId` exists to close the defect where the storyboard
 * capture pipeline read `properties.id` to identify *data* features. The
 * LinkML schema puts `id` at the top level (`required: true`) on every
 * feature class; `properties.id` exists only on Scene/Storyboard features.
 * Reading `properties.id` on a Track therefore returned `undefined`, so the
 * Track was dropped from the Scene's `visible_feature_ids` and never made
 * it into the exported / previewed briefing.
 *
 * These cases pin the contract: identity comes from the top-level `id`, and
 * a stray `properties.id` is never consulted.
 */
import { describe, it, expect } from "vitest";

import { getPlotFeatureId, type PlotFeature } from "../types";

/** A REP-imported Track: top-level `id`, no `properties.id` (the bug case). */
const trackFeature: PlotFeature = {
  type: "Feature",
  id: "749aca01-653d-4c68-99c7-4a770b871e2b",
  geometry: { type: "LineString", coordinates: [] },
  properties: { kind: "TRACK", platform_id: "HMS Richmond" },
};

describe("getPlotFeatureId (ADR-038 canonical identity)", () => {
  it("reads the top-level `id` of a data feature that has no properties.id", () => {
    expect(getPlotFeatureId(trackFeature)).toBe(
      "749aca01-653d-4c68-99c7-4a770b871e2b",
    );
  });

  it("never consults `properties.id` — the top-level `id` wins even when both exist", () => {
    const scenelike: PlotFeature = {
      type: "Feature",
      id: "TOP_LEVEL",
      geometry: { type: "Point", coordinates: [] },
      // A Scene/Storyboard carries a domain id in properties; identity must
      // still resolve from the top level so all features key uniformly.
      properties: { kind: "STORYBOARD_SCENE", id: "PROPERTIES_LEVEL" },
    };
    expect(getPlotFeatureId(scenelike)).toBe("TOP_LEVEL");
  });

  it("coerces a numeric top-level `id` to string", () => {
    expect(getPlotFeatureId({ id: 42 })).toBe("42");
  });

  it("returns undefined when there is no usable top-level `id`", () => {
    expect(getPlotFeatureId({})).toBeUndefined();
    expect(getPlotFeatureId({ id: "" })).toBeUndefined();
    expect(getPlotFeatureId({ id: null })).toBeUndefined();
  });

  it("does NOT fall back to properties.id when the top-level id is absent (a Track with no top-level id is unidentifiable, not silently keyed by a non-existent properties.id)", () => {
    const noTopLevel: PlotFeature = {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] },
      properties: { kind: "TRACK", id: "SHOULD_BE_IGNORED" },
    };
    expect(getPlotFeatureId(noTopLevel)).toBeUndefined();
  });
});
