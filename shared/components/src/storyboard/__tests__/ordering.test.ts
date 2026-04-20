import { describe, expect, it } from "vitest";

import { createScene, createStoryboard } from "../crud";
import { listScenesOrdered } from "../ordering";
import type { Plot } from "../types";

async function buildWithScenes(timestamps: string[]): Promise<{
  plot: Plot;
  storyboardId: string;
}> {
  let plot: Plot = { type: "FeatureCollection", features: [] };
  const { plot: p1, storyboard } = await createStoryboard(plot, {
    name: "A",
    actor: "alice",
    now: "2026-04-20T09:00:00Z",
    idOverride: "01JSTORYBOARDORDERAAAAAAAA",
    activityIdOverride: "00000000-0000-4000-8000-000000000001",
  });
  plot = p1;
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i] as string;
    const idx = String(i).padStart(2, "0");
    const result = await createScene(plot, {
      storyboardId: storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: ts,
      visibleFeatureIds: [],
      thumbnailAssetRef: `t${i}.png`,
      actor: "alice",
      now: ts,
      idOverride: `01JSCENE${idx}00000000000000AA`.slice(0, 26),
      activityIdOverride: `00000000-0000-4000-8000-${idx.padStart(12, "0")}`,
    });
    plot = result.plot;
  }
  return { plot, storyboardId: storyboard.properties.id };
}

describe("listScenesOrdered", () => {
  it("returns Scenes sorted by ascending timestamp regardless of insertion order", async () => {
    const { plot, storyboardId } = await buildWithScenes([
      "2026-04-20T12:00:00Z",
      "2026-04-20T10:00:00Z",
      "2026-04-20T11:00:00Z",
    ]);
    const ordered = listScenesOrdered(plot, storyboardId);
    expect(ordered.map((s) => s.properties.timestamp)).toEqual([
      "2026-04-20T10:00:00Z",
      "2026-04-20T11:00:00Z",
      "2026-04-20T12:00:00Z",
    ]);
  });

  it("returns an empty array when no Scenes belong to the storyboard", async () => {
    const { plot } = await buildWithScenes([]);
    expect(
      listScenesOrdered(plot, "01JNOSTORYBOARDXXXXXXXXXXX"),
    ).toEqual([]);
  });

  it("does not mutate the plot when called", async () => {
    const { plot, storyboardId } = await buildWithScenes([
      "2026-04-20T12:00:00Z",
      "2026-04-20T10:00:00Z",
    ]);
    const snapshot = JSON.parse(JSON.stringify(plot)) as Plot;
    listScenesOrdered(plot, storyboardId);
    expect(plot).toEqual(snapshot);
  });
});
