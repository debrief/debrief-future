import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACTIVE_STORYBOARD_FEATURE_ID,
  ACTIVE_STORYBOARD_STATE_TYPE,
  getActiveStoryboardSelection,
  isActiveStoryboardSelection,
  setActiveStoryboardSelection,
} from "../activeStoryboardSelection";
import type { Plot, PlotFeature } from "../types";

const STORYBOARD_A = "01JSTORYBOARDAAAA000000000A";
const STORYBOARD_B = "01JSTORYBOARDBBBB000000000B";
const STORYBOARD_C = "01JSTORYBOARDCCCC000000000C";

function makeStoryboard(id: string, name: string): PlotFeature {
  return {
    type: "Feature",
    id,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {
      kind: "STORYBOARD",
      id,
      name,
      schema_version: 1,
      tags: [],
      provenance: [
        {
          activity_id: `${id}-activity-001`,
          timestamp: "2026-04-20T09:00:00Z",
          agent: "alice",
          was_generated_by: {
            tool: "storyboard-crud",
            tool_version: "1.0.0",
            parameters: [{ value: "create" }],
          },
          used: [],
          generated: [id],
          execution_duration: "PT0S",
        },
      ],
    },
  };
}

function makeActiveSelection(id: string): PlotFeature {
  return {
    type: "Feature",
    id: ACTIVE_STORYBOARD_FEATURE_ID,
    geometry: { type: "Point", coordinates: [] },
    properties: {
      kind: "SYSTEM",
      state_type: ACTIVE_STORYBOARD_STATE_TYPE,
      active_storyboard_id: id,
    },
  };
}

function makeOtherSystemFeature(state_type: string): PlotFeature {
  return {
    type: "Feature",
    id: `state.${state_type}`,
    geometry: { type: "Point", coordinates: [] },
    properties: {
      kind: "SYSTEM",
      state_type,
    },
  };
}

function makeEmptyPlot(): Plot {
  return { type: "FeatureCollection", features: [] };
}

function makePlotWithStoryboards(...ids: string[]): Plot {
  return {
    type: "FeatureCollection",
    features: ids.map((id, i) => makeStoryboard(id, `Storyboard ${i}`)),
  };
}

describe("isActiveStoryboardSelection", () => {
  it("returns true for a SYSTEM feature with state_type=active_storyboard", () => {
    expect(isActiveStoryboardSelection(makeActiveSelection(STORYBOARD_A))).toBe(true);
  });

  it("returns false for SYSTEM features with other state_type values", () => {
    expect(isActiveStoryboardSelection(makeOtherSystemFeature("temporal"))).toBe(false);
    expect(isActiveStoryboardSelection(makeOtherSystemFeature("spatial"))).toBe(false);
    expect(isActiveStoryboardSelection(makeOtherSystemFeature("selection"))).toBe(false);
  });

  it("returns false for non-SYSTEM features", () => {
    expect(isActiveStoryboardSelection(makeStoryboard(STORYBOARD_A, "A"))).toBe(false);
  });

  it("returns false for malformed input (missing properties)", () => {
    expect(isActiveStoryboardSelection(null as unknown as PlotFeature)).toBe(false);
    expect(isActiveStoryboardSelection(undefined as unknown as PlotFeature)).toBe(false);
    const noProps: PlotFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [] },
      properties: null,
    };
    expect(isActiveStoryboardSelection(noProps)).toBe(false);
  });
});

describe("getActiveStoryboardSelection", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns null on an empty plot", () => {
    expect(getActiveStoryboardSelection(makeEmptyPlot())).toBeNull();
  });

  it("returns null on a plot without an active-storyboard SystemState feature", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeOtherSystemFeature("temporal"));
    expect(getActiveStoryboardSelection(plot)).toBeNull();
  });

  it("returns the recorded ID on a plot with a valid active-storyboard SystemState feature", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeActiveSelection(STORYBOARD_B));
    expect(getActiveStoryboardSelection(plot)).toBe(STORYBOARD_B);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("V-5 — returns the first match and warns when duplicates exist", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeActiveSelection(STORYBOARD_A));
    plot.features.push(makeActiveSelection(STORYBOARD_B));
    expect(getActiveStoryboardSelection(plot)).toBe(STORYBOARD_A);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("returns null when the active-storyboard feature has no active_storyboard_id", () => {
    const plot = makeEmptyPlot();
    plot.features.push({
      type: "Feature",
      id: ACTIVE_STORYBOARD_FEATURE_ID,
      geometry: { type: "Point", coordinates: [] },
      properties: {
        kind: "SYSTEM",
        state_type: ACTIVE_STORYBOARD_STATE_TYPE,
      },
    });
    expect(getActiveStoryboardSelection(plot)).toBeNull();
  });

  it("Edge case — a malformed SystemState entry returns null and emits one non-fatal log", () => {
    const plot = makeEmptyPlot();
    plot.features.push({
      type: "Feature",
      id: ACTIVE_STORYBOARD_FEATURE_ID,
      geometry: { type: "Point", coordinates: [] },
      properties: {
        kind: "SYSTEM",
        state_type: ACTIVE_STORYBOARD_STATE_TYPE,
        active_storyboard_id: 42 as unknown as string,
      },
    });
    expect(getActiveStoryboardSelection(plot)).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("setActiveStoryboardSelection", () => {
  it("V-3 — appends the feature when none exists and writes once on a fresh plot", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const next = setActiveStoryboardSelection(plot, STORYBOARD_B);
    const matches = next.features.filter(isActiveStoryboardSelection);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.properties!.active_storyboard_id).toBe(STORYBOARD_B);
  });

  it("V-3 — replaces in place rather than appending on subsequent writes", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const once = setActiveStoryboardSelection(plot, STORYBOARD_B);
    const twice = setActiveStoryboardSelection(once, STORYBOARD_A);
    const matches = twice.features.filter(isActiveStoryboardSelection);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.properties!.active_storyboard_id).toBe(STORYBOARD_A);
  });

  it("V-3 — de-duplicates on write when multiple existing entries are present", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeActiveSelection(STORYBOARD_A));
    plot.features.push(makeActiveSelection(STORYBOARD_B));
    const next = setActiveStoryboardSelection(plot, STORYBOARD_C);
    const matches = next.features.filter(isActiveStoryboardSelection);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.properties!.active_storyboard_id).toBe(STORYBOARD_C);
  });

  it("V-4 — passing null removes the active-storyboard feature", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeActiveSelection(STORYBOARD_B));
    const next = setActiveStoryboardSelection(plot, null);
    expect(next.features.filter(isActiveStoryboardSelection)).toHaveLength(0);
  });

  it("V-4 — passing null on a plot with no active-storyboard feature is a no-op for that feature", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const next = setActiveStoryboardSelection(plot, null);
    expect(next.features.filter(isActiveStoryboardSelection)).toHaveLength(0);
    expect(next.features).toHaveLength(plot.features.length);
  });

  it("preserves non-storyboard features unchanged on write", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    plot.features.push(makeOtherSystemFeature("temporal"));
    plot.features.push(makeOtherSystemFeature("selection"));
    const next = setActiveStoryboardSelection(plot, STORYBOARD_A);
    const others = next.features.filter(
      (f) =>
        f.properties?.kind === "SYSTEM" &&
        f.properties?.state_type !== ACTIVE_STORYBOARD_STATE_TYPE,
    );
    expect(others).toHaveLength(2);
  });

  it("is pure — does not mutate the input plot or its features array", () => {
    const plot = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const beforeLen = plot.features.length;
    const beforeJson = JSON.stringify(plot);
    const next = setActiveStoryboardSelection(plot, STORYBOARD_B);
    expect(plot.features).toHaveLength(beforeLen);
    expect(JSON.stringify(plot)).toBe(beforeJson);
    expect(next).not.toBe(plot);
    expect(next.features).not.toBe(plot.features);
  });

  it("the upserted feature has the canonical id, geometry, and properties shape", () => {
    const plot = makeEmptyPlot();
    const next = setActiveStoryboardSelection(plot, STORYBOARD_B);
    const feature = next.features.find(isActiveStoryboardSelection)!;
    expect(feature.id).toBe(ACTIVE_STORYBOARD_FEATURE_ID);
    expect(feature.geometry).toEqual({ type: "Point", coordinates: [] });
    expect(feature.properties!.kind).toBe("SYSTEM");
    expect(feature.properties!.state_type).toBe(ACTIVE_STORYBOARD_STATE_TYPE);
    expect(feature.properties!.active_storyboard_id).toBe(STORYBOARD_B);
  });
});

describe("US3 — independence across plots", () => {
  it("US3#1 — set on plot P1 then read on plot P2 returns null (different FeatureCollections cannot collide)", () => {
    const p1 = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const p2 = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_C);
    const p1Pinned = setActiveStoryboardSelection(p1, STORYBOARD_B);
    expect(getActiveStoryboardSelection(p1Pinned)).toBe(STORYBOARD_B);
    expect(getActiveStoryboardSelection(p2)).toBeNull();
  });

  it("US3#2 — re-running setActiveStoryboardSelection on P1 leaves P2 untouched (helpers are pure — operating on one FeatureCollection cannot mutate another)", () => {
    const p1 = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_B);
    const p2 = makePlotWithStoryboards(STORYBOARD_A, STORYBOARD_C);
    const p1WithB = setActiveStoryboardSelection(p1, STORYBOARD_B);
    const p2WithC = setActiveStoryboardSelection(p2, STORYBOARD_C);
    const p1WithBPrime = setActiveStoryboardSelection(p1WithB, STORYBOARD_A);
    expect(getActiveStoryboardSelection(p1WithBPrime)).toBe(STORYBOARD_A);
    expect(getActiveStoryboardSelection(p2WithC)).toBe(STORYBOARD_C);
  });

  it("US3#3 — same Storyboard names across plots do not collide (the helper keys on (FeatureCollection identity, properties.id), not name)", () => {
    const p1 = {
      type: "FeatureCollection" as const,
      features: [
        makeStoryboard(STORYBOARD_A, "Commander's view"),
        makeStoryboard(STORYBOARD_B, "ASW evidence"),
      ],
    };
    const p2 = {
      type: "FeatureCollection" as const,
      features: [
        makeStoryboard(STORYBOARD_C, "Commander's view"),
      ],
    };
    const p1Pinned = setActiveStoryboardSelection(p1, STORYBOARD_A);
    const p2Pinned = setActiveStoryboardSelection(p2, STORYBOARD_C);
    expect(getActiveStoryboardSelection(p1Pinned)).toBe(STORYBOARD_A);
    expect(getActiveStoryboardSelection(p2Pinned)).toBe(STORYBOARD_C);
    expect(getActiveStoryboardSelection(p1Pinned)).not.toBe(
      getActiveStoryboardSelection(p2Pinned),
    );
  });
});
