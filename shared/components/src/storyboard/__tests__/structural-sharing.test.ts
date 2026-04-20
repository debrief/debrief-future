import { describe, expect, it } from "vitest";

import {
  createScene,
  createStoryboard,
  renameStoryboard,
  updateScene,
} from "../crud";
import type { Plot } from "../types";

function seed(): Plot {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "track-001",
        geometry: {
          type: "LineString",
          coordinates: [
            [-5, 50],
            [-4.9, 50.1],
          ],
        },
        properties: {
          kind: "TRACK",
          id: "track-001",
          name: "HMS Example",
        },
      },
    ],
  };
}

describe("structural sharing (FR-MODULE-022)", () => {
  it("createStoryboard preserves reference-equality on untouched Features", async () => {
    const before = seed();
    const track0 = before.features[0];
    const { plot: after } = await createStoryboard(before, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARDAAAAAAAAAAAAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000001",
    });
    const track1 = after.features.find(
      (f) => typeof f.id === "string" && f.id === "track-001",
    );
    expect(track1).toBe(track0); // reference-equal, not just deep-equal
    expect(after).not.toBe(before); // outer plot is a new reference
    expect(after.features).not.toBe(before.features);
  });

  it("createScene does not mutate the input FeatureCollection", async () => {
    const plot0 = seed();
    const { plot: plot1, storyboard } = await createStoryboard(plot0, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARD1111111111XXXX",
      activityIdOverride: "00000000-0000-4000-8000-000000000002",
    });
    const featuresSnapshot = [...plot1.features];
    const lengthsBefore = plot1.features.length;
    await createScene(plot1, {
      storyboardId: storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: ["track-001"],
      thumbnailAssetRef: "x",
      actor: "alice",
      now: "2026-04-20T10:00:00Z",
      idOverride: "01JSCENE000000000000000000",
      activityIdOverride: "00000000-0000-4000-8000-000000000003",
    });
    expect(plot1.features).toEqual(featuresSnapshot);
    expect(plot1.features.length).toBe(lengthsBefore);
  });

  it("renameStoryboard preserves reference-equality on sibling Features", async () => {
    const plot0 = seed();
    const { plot: plot1, storyboard } = await createStoryboard(plot0, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARD2222222222XXXX",
      activityIdOverride: "00000000-0000-4000-8000-000000000010",
    });
    const track0 = plot1.features[0]; // TRACK, not touched by rename
    const { plot: plot2 } = await renameStoryboard(plot1, {
      storyboardId: storyboard.properties.id,
      newName: "B",
      actor: "alice",
      now: "2026-04-20T09:10:00Z",
      activityIdOverride: "00000000-0000-4000-8000-000000000011",
    });
    const track1 = plot2.features[0];
    expect(track1).toBe(track0);
  });

  it("updateScene preserves reference-equality on sibling Scenes", async () => {
    const plot0 = seed();
    const { plot: p1, storyboard } = await createStoryboard(plot0, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARD3333333333XXXX",
      activityIdOverride: "00000000-0000-4000-8000-000000000020",
    });
    const { plot: p2, scene: s1 } = await createScene(p1, {
      storyboardId: storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "x",
      actor: "alice",
      now: "2026-04-20T10:00:00Z",
      idOverride: "01JSCENE1111111111111111AA",
      activityIdOverride: "00000000-0000-4000-8000-000000000021",
    });
    const { plot: p3, scene: s2 } = await createScene(p2, {
      storyboardId: storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T11:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "y",
      actor: "alice",
      now: "2026-04-20T11:00:00Z",
      idOverride: "01JSCENE2222222222222222BB",
      activityIdOverride: "00000000-0000-4000-8000-000000000022",
    });
    // Update s1 — s2 should be reference-equal across p3 and p4
    const s2Ref = p3.features.find(
      (f) =>
        typeof (f.properties as { id?: string } | null)?.id === "string" &&
        (f.properties as { id: string }).id === s2.properties.id,
    );
    const { plot: p4 } = await updateScene(p3, {
      sceneId: s1.properties.id,
      patch: { title: "Renamed" },
      actor: "alice",
      now: "2026-04-20T11:05:00Z",
      activityIdOverride: "00000000-0000-4000-8000-000000000023",
    });
    const s2Ref2 = p4.features.find(
      (f) =>
        typeof (f.properties as { id?: string } | null)?.id === "string" &&
        (f.properties as { id: string }).id === s2.properties.id,
    );
    expect(s2Ref2).toBe(s2Ref);
  });
});
