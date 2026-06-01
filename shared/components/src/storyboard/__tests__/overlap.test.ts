/**
 * Unit tests for `detectSceneOverlaps` / `overlapPairKey` (#271).
 *
 * Covers contract cases C1.1–C1.12 from
 * `specs/271-scene-overlap-warning/contracts/overlap-detection.md`.
 */
import { describe, it, expect } from "vitest";

import { detectSceneOverlaps, overlapPairKey } from "../overlap";
import type { Plot, PlotFeature } from "../types";

const SB = "01HZ7777777777777777777777";
const SB2 = "01HZ8888888888888888888888";

/** Build a Scene Feature. Omitting the time-range pair makes it an instant Scene. */
function mkScene(
  id: string,
  storyboardId: string,
  creationOrder: number,
  range?: { start: string; end: string },
): PlotFeature {
  const props: Record<string, unknown> = {
    kind: "STORYBOARD_SCENE",
    id,
    storyboard_id: storyboardId,
    title: `Scene ${id}`,
    viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
    // Instant anchor falls back to `timestamp`; for time-range Scenes the
    // anchor is `time_range.start`. Use the range start as the timestamp too
    // so ordering is intuitive in the fixtures.
    timestamp: range?.start ?? "2024-01-01T00:00:00Z",
    visible_feature_ids: [],
    feature_set_hash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    thumbnail_asset_ref: "thumb",
    transition_duration_ms: 500,
    creation_order: creationOrder,
  };
  if (range !== undefined) {
    props.time_range = { start: range.start, end: range.end };
    props.viewport_end = { center: [-1.1, 50.85], zoom: 12, bearing: 0 };
  }
  return {
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
    properties: props,
  } as PlotFeature;
}

function mkStoryboard(id: string): PlotFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
    properties: { kind: "STORYBOARD", id, name: "SB", schema_version: 2 },
  } as PlotFeature;
}

function mkPlot(...features: PlotFeature[]): Plot {
  return { type: "FeatureCollection", features };
}

/** Partner ids for a Scene, sorted for order-independent assertions. */
function partnerIds(
  result: ReadonlyMap<string, readonly { sceneId: string }[]>,
  sceneId: string,
): string[] {
  return (result.get(sceneId) ?? []).map((p) => p.sceneId).sort();
}

describe("overlapPairKey", () => {
  it("is order-independent", () => {
    expect(overlapPairKey("a", "b")).toBe(overlapPairKey("b", "a"));
  });
  it("produces distinct keys for distinct pairs", () => {
    expect(overlapPairKey("a", "b")).not.toBe(overlapPairKey("a", "c"));
  });
});

describe("detectSceneOverlaps (#271)", () => {
  it("C1.1 — two overlapping time-range Scenes warn each other (symmetric)", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:45:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(partnerIds(r, "A")).toEqual(["B"]);
    expect(partnerIds(r, "B")).toEqual(["A"]);
    expect(r.get("A")?.[0]?.title).toBe("Scene B");
  });

  it("C1.2 — non-overlapping Scenes are absent from the result", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T11:00:00Z", end: "2024-01-01T11:30:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(r.size).toBe(0);
  });

  it("C1.3 — touching endpoints do not overlap", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:30:00Z", end: "2024-01-01T11:00:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(r.size).toBe(0);
  });

  it("C1.4 — instant Scenes never participate, even inside a range", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("R", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T11:00:00Z" }),
      // Instant Scene whose timestamp sits inside R's window.
      mkScene("I", SB, 1),
    );
    const instant = plot.features.find((f) => f.properties?.id === "I");
    (instant!.properties as Record<string, unknown>).timestamp =
      "2024-01-01T10:30:00Z";
    const r = detectSceneOverlaps(plot, SB);
    expect(r.size).toBe(0);
  });

  it("C1.5 — A overlaps B and C (B,C disjoint)", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T12:00:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("C", SB, 2, { start: "2024-01-01T11:15:00Z", end: "2024-01-01T11:30:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(partnerIds(r, "A")).toEqual(["B", "C"]);
    expect(partnerIds(r, "B")).toEqual(["A"]);
    expect(partnerIds(r, "C")).toEqual(["A"]);
  });

  it("C1.6 — chain A-B, B-C overlap but A-C disjoint", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:40:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:30:00Z", end: "2024-01-01T11:10:00Z" }),
      mkScene("C", SB, 2, { start: "2024-01-01T11:00:00Z", end: "2024-01-01T11:40:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(partnerIds(r, "A")).toEqual(["B"]);
    expect(partnerIds(r, "B")).toEqual(["A", "C"]);
    expect(partnerIds(r, "C")).toEqual(["B"]);
  });

  it("C1.7 — identical windows fully overlap", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
    );
    const r = detectSceneOverlaps(plot, SB);
    expect(partnerIds(r, "A")).toEqual(["B"]);
    expect(partnerIds(r, "B")).toEqual(["A"]);
  });

  it("C1.8 — zero-length window strictly inside another overlaps; touching does not", () => {
    const inside = mkPlot(
      mkStoryboard(SB),
      mkScene("R", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T11:00:00Z" }),
      mkScene("Z", SB, 1, { start: "2024-01-01T10:30:00Z", end: "2024-01-01T10:30:00Z" }),
    );
    expect(partnerIds(detectSceneOverlaps(inside, SB), "Z")).toEqual(["R"]);

    const touching = mkPlot(
      mkStoryboard(SB),
      mkScene("R", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T11:00:00Z" }),
      mkScene("Z", SB, 1, { start: "2024-01-01T11:00:00Z", end: "2024-01-01T11:00:00Z" }),
    );
    expect(detectSceneOverlaps(touching, SB).size).toBe(0);
  });

  it("C1.9 — Scenes in different Storyboards are not compared", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkStoryboard(SB2),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB2, 0, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:45:00Z" }),
    );
    expect(detectSceneOverlaps(plot, SB).size).toBe(0);
    expect(detectSceneOverlaps(plot, SB2).size).toBe(0);
  });

  it("C1.10 — dismissedPairs suppresses the pair on both sides", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:45:00Z" }),
    );
    const dismissed = new Set([overlapPairKey("A", "B")]);
    expect(detectSceneOverlaps(plot, SB, dismissed).size).toBe(0);
  });

  it("C1.10b — dismissing one pair leaves a Scene's other live overlap", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T12:00:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("C", SB, 2, { start: "2024-01-01T11:15:00Z", end: "2024-01-01T11:30:00Z" }),
    );
    const dismissed = new Set([overlapPairKey("A", "B")]);
    const r = detectSceneOverlaps(plot, SB, dismissed);
    expect(partnerIds(r, "A")).toEqual(["C"]);
    expect(partnerIds(r, "C")).toEqual(["A"]);
    expect(r.has("B")).toBe(false);
  });

  it("C1.11 — empty / single-Scene / instant-only Storyboards produce no overlaps", () => {
    expect(detectSceneOverlaps(mkPlot(mkStoryboard(SB)), SB).size).toBe(0);
    const single = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
    );
    expect(detectSceneOverlaps(single, SB).size).toBe(0);
    const instants = mkPlot(mkStoryboard(SB), mkScene("A", SB, 0), mkScene("B", SB, 1));
    expect(detectSceneOverlaps(instants, SB).size).toBe(0);
  });

  it("C1.12 — pure & deterministic: same input yields equal output, plot untouched", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:45:00Z" }),
    );
    const before = JSON.stringify(plot);
    const r1 = detectSceneOverlaps(plot, SB);
    const r2 = detectSceneOverlaps(plot, SB);
    expect(JSON.stringify(plot)).toBe(before); // no mutation
    expect(partnerIds(r1, "A")).toEqual(partnerIds(r2, "A"));
  });

  it("re-warns a previously-dismissed pair once its stale key is dropped (FR-009)", () => {
    const plot = mkPlot(
      mkStoryboard(SB),
      mkScene("A", SB, 0, { start: "2024-01-01T10:00:00Z", end: "2024-01-01T10:30:00Z" }),
      mkScene("B", SB, 1, { start: "2024-01-01T10:15:00Z", end: "2024-01-01T10:45:00Z" }),
    );
    // Pruned (empty) dismissal set — the re-created overlap warns afresh.
    expect(partnerIds(detectSceneOverlaps(plot, SB, new Set()), "A")).toEqual(["B"]);
  });
});
