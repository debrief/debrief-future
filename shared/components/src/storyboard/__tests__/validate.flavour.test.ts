/**
 * Tests for `flavourCheck()` — the runtime XOR + range-validity enforcer
 * for #263 Scene flavour.
 *
 * Pure unit tests (no plot wrapper) covering:
 * - both valid flavours pass
 * - mixed-slot Scenes throw SceneFlavourXorViolationError
 * - reversed/zero ranges throw SceneTimeRangeEndNotAfterStartError
 */
import { describe, it, expect } from "vitest";

import { flavourCheck } from "../validate";
import {
  SceneFlavourXorViolationError,
  SceneTimeRangeEndNotAfterStartError,
} from "../errors";
import type { SceneFeature, TimeRange, Viewport } from "../types";

const VIEWPORT: Viewport = { center: [-1.25, 50.75], zoom: 11, bearing: 0 };
const VIEWPORT_END: Viewport = { center: [-1.1, 50.85], zoom: 12, bearing: 0 };
const TR_VALID: TimeRange = {
  start: "2026-05-15T12:00:00Z",
  end: "2026-05-15T12:01:30Z",
};

function makeScene(propsPatch: Record<string, unknown>): SceneFeature {
  return {
    type: "Feature",
    id: "01HZ263FLAVOUR000000000001",
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] } as never,
    properties: {
      kind: "STORYBOARD_SCENE",
      id: "01HZ263FLAVOUR000000000001",
      storyboard_id: "01HZ7777777777777777777777",
      title: "test",
      viewport: VIEWPORT,
      timestamp: "2026-05-15T12:00:00Z",
      visible_feature_ids: [],
      feature_set_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      thumbnail_asset_ref: "thumb",
      transition_duration_ms: 500,
      creation_order: 0,
      ...propsPatch,
    },
  } as unknown as SceneFeature;
}

describe("flavourCheck (#263)", () => {
  it("accepts the instant flavour (neither slot set)", () => {
    const scene = makeScene({});
    expect(() => flavourCheck(scene)).not.toThrow();
  });

  it("accepts the instant flavour with explicit null time_range/viewport_end", () => {
    const scene = makeScene({ time_range: null, viewport_end: null });
    expect(() => flavourCheck(scene)).not.toThrow();
  });

  it("accepts the time-range flavour (both slots set, end > start)", () => {
    const scene = makeScene({
      time_range: TR_VALID,
      viewport_end: VIEWPORT_END,
    });
    expect(() => flavourCheck(scene)).not.toThrow();
  });

  it("rejects time_range without viewport_end", () => {
    const scene = makeScene({ time_range: TR_VALID });
    expect(() => flavourCheck(scene)).toThrowError(
      SceneFlavourXorViolationError,
    );
    try {
      flavourCheck(scene);
    } catch (e) {
      const err = e as SceneFlavourXorViolationError;
      expect(err.timeRangePresent).toBe(true);
      expect(err.viewportEndPresent).toBe(false);
      expect(err.message).toContain("`time_range`");
      expect(err.message).toContain("`viewport_end`");
    }
  });

  it("rejects viewport_end without time_range", () => {
    const scene = makeScene({ viewport_end: VIEWPORT_END });
    expect(() => flavourCheck(scene)).toThrowError(
      SceneFlavourXorViolationError,
    );
    try {
      flavourCheck(scene);
    } catch (e) {
      const err = e as SceneFlavourXorViolationError;
      expect(err.timeRangePresent).toBe(false);
      expect(err.viewportEndPresent).toBe(true);
    }
  });

  it("rejects time_range with end <= start", () => {
    const scene = makeScene({
      time_range: {
        start: "2026-05-15T12:01:30Z",
        end: "2026-05-15T12:00:00Z",
      },
      viewport_end: VIEWPORT_END,
    });
    expect(() => flavourCheck(scene)).toThrowError(
      SceneTimeRangeEndNotAfterStartError,
    );
  });

  it("rejects time_range with end === start (zero-length disallowed)", () => {
    const scene = makeScene({
      time_range: {
        start: "2026-05-15T12:00:00Z",
        end: "2026-05-15T12:00:00Z",
      },
      viewport_end: VIEWPORT_END,
    });
    expect(() => flavourCheck(scene)).toThrowError(
      SceneTimeRangeEndNotAfterStartError,
    );
  });

  it("error carries Scene id, start, and end", () => {
    const scene = makeScene({
      time_range: {
        start: "2026-05-15T12:01:30Z",
        end: "2026-05-15T12:00:00Z",
      },
      viewport_end: VIEWPORT_END,
    });
    try {
      flavourCheck(scene);
    } catch (e) {
      const err = e as SceneTimeRangeEndNotAfterStartError;
      expect(err.sceneId).toBe("01HZ263FLAVOUR000000000001");
      expect(err.start).toBe("2026-05-15T12:01:30Z");
      expect(err.end).toBe("2026-05-15T12:00:00Z");
    }
  });
});
