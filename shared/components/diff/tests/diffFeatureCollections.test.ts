import { describe, it, expect } from "vitest";
import {
  diffFeatureCollections,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
} from "../src/diffFeatureCollections";

function makeFC(features: GeoJSONFeature[]): GeoJSONFeatureCollection {
  return { type: "FeatureCollection", features };
}

function makeFeature(
  id: string,
  coords: [number, number] = [0, 0],
  props: Record<string, unknown> = {},
): GeoJSONFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: coords },
    properties: { name: id, ...props },
  };
}

describe("diffFeatureCollections", () => {
  it("returns empty diff for identical collections", () => {
    const fc = makeFC([makeFeature("a"), makeFeature("b")]);
    const diff = diffFeatureCollections(fc, fc);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("detects added features", () => {
    const oldFC = makeFC([makeFeature("a")]);
    const newFC = makeFC([makeFeature("a"), makeFeature("b")]);
    const diff = diffFeatureCollections(oldFC, newFC);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe("b");
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("detects removed features", () => {
    const oldFC = makeFC([makeFeature("a"), makeFeature("b")]);
    const newFC = makeFC([makeFeature("a")]);
    const diff = diffFeatureCollections(oldFC, newFC);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(["b"]);
    expect(diff.modified).toEqual([]);
  });

  it("detects modified features", () => {
    const oldFC = makeFC([makeFeature("a", [0, 0])]);
    const newFC = makeFC([makeFeature("a", [1, 1])]);
    const diff = diffFeatureCollections(oldFC, newFC);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].id).toBe("a");
  });

  it("handles empty collections", () => {
    const diff = diffFeatureCollections(makeFC([]), makeFC([]));
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.modified).toEqual([]);
  });

  it("detects all from empty to populated", () => {
    const diff = diffFeatureCollections(
      makeFC([]),
      makeFC([makeFeature("a"), makeFeature("b")]),
    );
    expect(diff.added).toHaveLength(2);
    expect(diff.removed).toEqual([]);
  });

  it("detects all removed from populated to empty", () => {
    const diff = diffFeatureCollections(
      makeFC([makeFeature("a"), makeFeature("b")]),
      makeFC([]),
    );
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(["a", "b"]);
  });

  it("handles mixed changes", () => {
    const oldFC = makeFC([makeFeature("a", [0, 0]), makeFeature("b"), makeFeature("c")]);
    const newFC = makeFC([makeFeature("a", [1, 1]), makeFeature("c"), makeFeature("d")]);
    const diff = diffFeatureCollections(oldFC, newFC);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0].id).toBe("d");
    expect(diff.removed).toEqual(["b"]);
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].id).toBe("a");
  });

  it("uses properties.id as fallback", () => {
    const oldF: GeoJSONFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { id: "x", name: "old" },
    };
    const newF: GeoJSONFeature = {
      type: "Feature",
      geometry: { type: "Point", coordinates: [0, 0] },
      properties: { id: "x", name: "new" },
    };
    const diff = diffFeatureCollections(makeFC([oldF]), makeFC([newF]));
    expect(diff.modified).toHaveLength(1);
    expect(diff.modified[0].id).toBe("x");
  });

  it("handles incremental diff for multi-result processing", () => {
    // Simulate: first operation removes a feature
    const fc1 = makeFC([makeFeature("a"), makeFeature("b"), makeFeature("c")]);
    const fc2 = makeFC([makeFeature("a"), makeFeature("c")]);
    const diff1 = diffFeatureCollections(fc1, fc2);
    expect(diff1.removed).toEqual(["b"]);

    // Second operation adds a feature
    const fc3 = makeFC([makeFeature("a"), makeFeature("c"), makeFeature("d")]);
    const diff2 = diffFeatureCollections(fc2, fc3);
    expect(diff2.added).toHaveLength(1);
    expect(diff2.added[0].id).toBe("d");
  });
});
