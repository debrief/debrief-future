/**
 * Predicate narrowing tests for the Scene flavour discriminated union (#263).
 *
 * Confirms that `isTimeRangeScene` narrows to `TimeRangeSceneFeature` for
 * a Scene with `time_range` set, and that the narrowed type carries the
 * non-undefined `time_range` and `viewport_end` slots.
 */
import { describe, it, expect, expectTypeOf } from "vitest";

import {
  isTimeRangeScene,
  type SceneFeature,
  type InstantSceneFeature,
  type TimeRangeSceneFeature,
  type TimeRange,
  type Viewport,
} from "../types";

const viewport: Viewport = { center: [-1.25, 50.75], zoom: 11, bearing: 0 };
const viewportEnd: Viewport = { center: [-1.1, 50.85], zoom: 12, bearing: 0 };
const timeRange: TimeRange = {
  start: "2026-05-15T12:00:00Z",
  end: "2026-05-15T12:01:30Z",
};

function makeInstantScene(): SceneFeature {
  return {
    type: "Feature",
    id: "01HZ263000000000000000INST",
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] } as never,
    properties: {
      kind: "STORYBOARD_SCENE",
      id: "01HZ263000000000000000INST",
      storyboard_id: "01HZ7777777777777777777777",
      title: "Instant",
      viewport,
      timestamp: "2026-05-15T12:00:00Z",
      visible_feature_ids: [],
      feature_set_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      thumbnail_asset_ref: "thumb",
      transition_duration_ms: 500,
      creation_order: 0,
    },
  } as unknown as SceneFeature;
}

function makeTimeRangeScene(): SceneFeature {
  return {
    type: "Feature",
    id: "01HZ263000000000000000RANG",
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] } as never,
    properties: {
      kind: "STORYBOARD_SCENE",
      id: "01HZ263000000000000000RANG",
      storyboard_id: "01HZ7777777777777777777777",
      title: "Range",
      viewport,
      viewport_end: viewportEnd,
      timestamp: "2026-05-15T12:00:00Z",
      time_range: timeRange,
      visible_feature_ids: [],
      feature_set_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      thumbnail_asset_ref: "thumb",
      transition_duration_ms: 500,
      creation_order: 1,
    },
  } as unknown as SceneFeature;
}

describe("isTimeRangeScene predicate (#263)", () => {
  it("returns true for a Scene with time_range set", () => {
    const scene = makeTimeRangeScene();
    expect(isTimeRangeScene(scene)).toBe(true);
  });

  it("returns false for a Scene with no time_range slot", () => {
    const scene = makeInstantScene();
    expect(isTimeRangeScene(scene)).toBe(false);
  });

  it("returns false for a Scene with explicit time_range = null", () => {
    const scene = makeInstantScene();
    (scene.properties as { time_range: unknown }).time_range = null;
    expect(isTimeRangeScene(scene)).toBe(false);
  });

  it("narrows to TimeRangeSceneFeature inside the truthy branch", () => {
    const scene = makeTimeRangeScene();
    if (isTimeRangeScene(scene)) {
      // After narrowing, `time_range` and `viewport_end` are non-optional.
      expectTypeOf(scene.properties.time_range).toEqualTypeOf<TimeRange>();
      expectTypeOf(scene.properties.viewport_end).toEqualTypeOf<Viewport>();
      expect(scene.properties.time_range.end).toBeDefined();
      expect(scene.properties.viewport_end.center).toBeDefined();
    } else {
      throw new Error("expected predicate to narrow");
    }
  });

  it("does NOT mutate the input", () => {
    const scene = makeTimeRangeScene();
    const snapshotBefore = JSON.stringify(scene);
    void isTimeRangeScene(scene);
    expect(JSON.stringify(scene)).toBe(snapshotBefore);
  });

  it("type-level: InstantSceneFeature and TimeRangeSceneFeature both extend SceneFeature", () => {
    // Compile-time assertions only — vitest's expectTypeOf is the gate.
    expectTypeOf<InstantSceneFeature>().toMatchTypeOf<SceneFeature>();
    expectTypeOf<TimeRangeSceneFeature>().toMatchTypeOf<SceneFeature>();
  });
});
