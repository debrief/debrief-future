import { describe, expect, it } from "vitest";

import { detectMissingDataForScene } from "../missing-data";
import type { SceneFeature } from "../types";

function makeScene(
  timestamp: string,
  visibleIds: string[] = [],
): SceneFeature {
  return {
    type: "Feature",
    id: "scene-1",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-5, 50],
          [-4.9, 50],
          [-4.9, 50.1],
          [-5, 50.1],
          [-5, 50],
        ],
      ],
    },
    properties: {
      kind: "STORYBOARD_SCENE",
      id: "scene-1",
      storyboard_id: "sb-1",
      title: "Scene 1",
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp,
      visible_feature_ids: visibleIds,
      feature_set_hash:
        "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945",
      thumbnail_asset_ref: "thumb.png",
      transition_duration_ms: 500,
      tags: [],
      provenance: [],
    },
  } as SceneFeature;
}

const PLOT_RANGE = {
  start: "2026-04-20T09:00:00Z",
  end: "2026-04-20T12:00:00Z",
};

describe("detectMissingDataForScene", () => {
  it("returns ok when every visible_feature_id resolves and timestamp is in range", () => {
    const scene = makeScene("2026-04-20T10:00:00Z", ["track-1", "point-a"]);
    const plotFeatures: GeoJSON.Feature[] = [
      {
        type: "Feature",
        id: "track-1",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {},
      },
      {
        type: "Feature",
        id: "point-a",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {},
      },
    ];
    expect(
      detectMissingDataForScene(scene, plotFeatures, PLOT_RANGE),
    ).toEqual({ kind: "ok" });
  });

  it("returns missing-features with list of unresolved ids", () => {
    const scene = makeScene("2026-04-20T10:00:00Z", [
      "track-1",
      "missing-1",
      "missing-2",
    ]);
    const plotFeatures: GeoJSON.Feature[] = [
      {
        type: "Feature",
        id: "track-1",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {},
      },
    ];
    const result = detectMissingDataForScene(scene, plotFeatures, PLOT_RANGE);
    expect(result.kind).toBe("missing-features");
    if (result.kind === "missing-features") {
      expect(new Set(result.missingIds)).toEqual(
        new Set(["missing-1", "missing-2"]),
      );
    }
  });

  it("returns out-of-range when timestamp is before plot start", () => {
    const scene = makeScene("2026-04-20T08:00:00Z");
    expect(
      detectMissingDataForScene(scene, [], PLOT_RANGE),
    ).toEqual({ kind: "out-of-range" });
  });

  it("returns out-of-range when timestamp is after plot end", () => {
    const scene = makeScene("2026-04-20T14:00:00Z");
    expect(
      detectMissingDataForScene(scene, [], PLOT_RANGE),
    ).toEqual({ kind: "out-of-range" });
  });

  it("out-of-range takes precedence over missing-features", () => {
    const scene = makeScene("2026-04-20T14:00:00Z", ["never-existed"]);
    expect(
      detectMissingDataForScene(scene, [], PLOT_RANGE),
    ).toEqual({ kind: "out-of-range" });
  });

  it("is side-effect-free (SC-006) — inputs are deep-equal before/after", () => {
    const scene = makeScene("2026-04-20T10:00:00Z", [
      "track-1",
      "missing-1",
    ]);
    const plotFeatures: GeoJSON.Feature[] = [
      {
        type: "Feature",
        id: "track-1",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: {},
      },
    ];
    const sceneSnapshot = JSON.parse(JSON.stringify(scene));
    const featSnapshot = JSON.parse(JSON.stringify(plotFeatures));
    const rangeSnapshot = JSON.parse(JSON.stringify(PLOT_RANGE));
    detectMissingDataForScene(scene, plotFeatures, PLOT_RANGE);
    expect(scene).toEqual(sceneSnapshot);
    expect(plotFeatures).toEqual(featSnapshot);
    expect(PLOT_RANGE).toEqual(rangeSnapshot);
  });

  it("resolves feature IDs from properties.id when Feature.id is absent", () => {
    const scene = makeScene("2026-04-20T10:00:00Z", ["via-props"]);
    const plotFeatures: GeoJSON.Feature[] = [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { id: "via-props" },
      },
    ];
    expect(
      detectMissingDataForScene(scene, plotFeatures, PLOT_RANGE),
    ).toEqual({ kind: "ok" });
  });
});
