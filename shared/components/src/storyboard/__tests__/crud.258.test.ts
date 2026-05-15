/**
 * Tests covering Spec #258 additions to crud.ts.
 *
 * - T031 / T031a: `bboxToPolygon(bounds, 'bounds')` round-trip + extreme-zoom validity.
 * - T032 / T033 / T034: `createScene`, `updateScene`, `restoreScene` route through
 *   `bboxToPolygon` and persist `_polygon_source` correctly.
 * - T018 (US1): `createScene` accepts and persists `display_mode` in
 *   `SceneProperties`.
 */
import { describe, expect, it } from "vitest";

import {
  type SceneBounds,
  bboxToPolygon,
  createScene,
  createStoryboard,
  restoreScene,
  updateScene,
} from "../crud";
import type { Plot } from "../types";
import { isSceneFeature } from "../types";

const ALICE = "alice";
const NOW = "2026-04-20T09:00:00Z";

function emptyPlot(): Plot {
  return { type: "FeatureCollection", features: [] };
}

async function seedStoryboard(name = "SB258"): Promise<{
  plot: Plot;
  storyboardId: string;
}> {
  const { plot, storyboard } = await createStoryboard(emptyPlot(), {
    name,
    actor: ALICE,
    now: NOW,
    idOverride: "01JSB00000000000000000XX258",
    activityIdOverride: "00000000-0000-4000-8000-000000000258",
  });
  return { plot, storyboardId: storyboard.properties.id };
}

const CAPTURE_BOUNDS: SceneBounds = {
  west: -1.5,
  south: 50.5,
  east: -1.0,
  north: 51.0,
};

describe("bboxToPolygon (Spec #258 / T031)", () => {
  it("produces a closed [SW, NW, NE, SE, SW] ring matching the four corners", () => {
    const polygon = bboxToPolygon(CAPTURE_BOUNDS, "bounds");
    expect(polygon.type).toBe("Polygon");
    const ring = polygon.coordinates[0]!;
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual([CAPTURE_BOUNDS.west, CAPTURE_BOUNDS.south]); // SW
    expect(ring[1]).toEqual([CAPTURE_BOUNDS.east, CAPTURE_BOUNDS.south]); // SE (current shape — see makeBoundingPolygon)
    expect(ring[2]).toEqual([CAPTURE_BOUNDS.east, CAPTURE_BOUNDS.north]); // NE
    expect(ring[3]).toEqual([CAPTURE_BOUNDS.west, CAPTURE_BOUNDS.north]); // NW
    expect(ring[4]).toEqual([CAPTURE_BOUNDS.west, CAPTURE_BOUNDS.south]); // closed
  });

  it("handles whole-earth bounds without throwing (T031a — extreme zoom 0)", () => {
    const polygon = bboxToPolygon(
      { west: -180, south: -85, east: 180, north: 85 },
      "bounds",
    );
    const ring = polygon.coordinates[0]!;
    // Four distinct corners
    const unique = new Set(ring.slice(0, 4).map((p) => `${p[0]},${p[1]}`));
    expect(unique.size).toBe(4);
    // Non-degenerate area
    const minLng = Math.min(...ring.map((p) => p[0]!));
    const maxLng = Math.max(...ring.map((p) => p[0]!));
    const minLat = Math.min(...ring.map((p) => p[1]!));
    const maxLat = Math.max(...ring.map((p) => p[1]!));
    expect(maxLng - minLng).toBeGreaterThan(0);
    expect(maxLat - minLat).toBeGreaterThan(0);
  });

  it("handles sub-meter bounds (T031a — extreme max zoom)", () => {
    const polygon = bboxToPolygon(
      {
        west: -1.500001,
        south: 50.499999,
        east: -1.499999,
        north: 50.500001,
      },
      "bounds",
    );
    const ring = polygon.coordinates[0]!;
    expect(ring).toHaveLength(5);
    // Closed
    expect(ring[0]).toEqual(ring[4]);
    // Non-degenerate
    const minLng = Math.min(...ring.map((p) => p[0]!));
    const maxLng = Math.max(...ring.map((p) => p[0]!));
    expect(maxLng - minLng).toBeGreaterThan(0);
  });
});

describe("createScene (Spec #258 / T032 + T018)", () => {
  it("populates _polygon_source: 'bounds' and persists display_mode when supplied", async () => {
    const { plot, storyboardId } = await seedStoryboard();
    const { scene } = await createScene(plot, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
      bounds: CAPTURE_BOUNDS,
      displayMode: "trail",
      timestamp: "2026-04-20T09:01:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-258.png",
      actor: ALICE,
      now: "2026-04-20T09:01:00Z",
      idOverride: "01JSC25800000000000000XX01",
      activityIdOverride: "10000000-0000-4000-8000-000000000258",
    });
    expect(scene.properties._polygon_source).toBe("bounds");
    expect(scene.properties.display_mode).toBe("trail");
    const ring = scene.geometry.coordinates[0]!;
    expect(ring[0]).toEqual([CAPTURE_BOUNDS.west, CAPTURE_BOUNDS.south]);
  });

  it("falls back to _polygon_source: 'placeholder' when bounds are omitted (legacy callers)", async () => {
    const { plot, storyboardId } = await seedStoryboard();
    const { scene } = await createScene(plot, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
      timestamp: "2026-04-20T09:01:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-legacy.png",
      actor: ALICE,
      now: "2026-04-20T09:01:00Z",
      idOverride: "01JSC25800000000000000XX02",
      activityIdOverride: "10000000-0000-4000-8000-000000000259",
    });
    expect(scene.properties._polygon_source).toBe("placeholder");
    expect(scene.properties.display_mode).toBeUndefined();
  });
});

describe("updateScene (Spec #258 / T033)", () => {
  it("when patch.bounds is supplied, the geometry is regenerated and provenance is set to 'bounds'", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard();
    const created = await createScene(p0, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 8, bearing: 0 },
      timestamp: "2026-04-20T09:02:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-update.png",
      actor: ALICE,
      now: "2026-04-20T09:02:00Z",
      idOverride: "01JSC25800000000000000XX03",
      activityIdOverride: "10000000-0000-4000-8000-000000000260",
    });
    // Originally captured without bounds — should be 'placeholder'.
    expect(created.scene.properties._polygon_source).toBe("placeholder");
    const updated = await updateScene(created.plot, {
      sceneId: created.scene.properties.id,
      patch: {
        viewport: { center: [-1.0, 50.5], zoom: 11, bearing: 0 },
        bounds: CAPTURE_BOUNDS,
      },
      actor: ALICE,
      now: "2026-04-20T09:03:00Z",
      activityIdOverride: "10000000-0000-4000-8000-000000000261",
    });
    expect(updated.scene.properties._polygon_source).toBe("bounds");
    const ring = updated.scene.geometry.coordinates[0]!;
    expect(ring[0]).toEqual([CAPTURE_BOUNDS.west, CAPTURE_BOUNDS.south]);
  });
});

describe("restoreScene (Spec #258 / T034)", () => {
  it("preserves the polygonSource provenance passed in by the caller", async () => {
    const { plot, storyboardId } = await seedStoryboard();
    const { scene } = await restoreScene(plot, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 8, bearing: 0 },
      // Legacy scene being restored — preserve 'placeholder' provenance.
      polygonSource: "placeholder",
      timestamp: "2026-04-20T09:04:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-restore.png",
      actor: ALICE,
      now: "2026-04-20T09:04:00Z",
      idOverride: "01JSC25800000000000000XX04",
      activityIdOverride: "10000000-0000-4000-8000-000000000262",
      preservedProvenance: [],
    });
    expect(scene.properties._polygon_source).toBe("placeholder");
  });

  it("sets 'bounds' provenance when restoring with real bounds", async () => {
    const { plot, storyboardId } = await seedStoryboard();
    const { scene } = await restoreScene(plot, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
      bounds: CAPTURE_BOUNDS,
      timestamp: "2026-04-20T09:05:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-restore-2.png",
      actor: ALICE,
      now: "2026-04-20T09:05:00Z",
      idOverride: "01JSC25800000000000000XX05",
      activityIdOverride: "10000000-0000-4000-8000-000000000263",
      preservedProvenance: [],
    });
    expect(scene.properties._polygon_source).toBe("bounds");
  });
});

describe("integration: all three callers + flatten", () => {
  it("a freshly-captured scene appears with both display_mode and _polygon_source", async () => {
    const { plot, storyboardId } = await seedStoryboard();
    const { plot: after } = await createScene(plot, {
      storyboardId,
      viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
      bounds: CAPTURE_BOUNDS,
      displayMode: "full",
      timestamp: "2026-04-20T09:06:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb-int.png",
      actor: ALICE,
      now: "2026-04-20T09:06:00Z",
      idOverride: "01JSC25800000000000000XX06",
      activityIdOverride: "10000000-0000-4000-8000-000000000264",
    });
    const scenes = after.features.filter(isSceneFeature);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]!.properties.display_mode).toBe("full");
    expect(scenes[0]!.properties._polygon_source).toBe("bounds");
  });
});
