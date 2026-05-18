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

  // ── #259 — tied-timestamp ordering -----------------------------------
  it("AT-003 (FR-003) breaks ties on (timestamp) by creation_order ASC", async () => {
    // Three Scenes at the same timestamp; capture order = creation_order
    // order = expected listing order.
    const { plot, storyboardId } = await buildWithScenes([
      "2026-04-20T10:00:00Z",
      "2026-04-20T10:00:00Z",
      "2026-04-20T10:00:00Z",
    ]);
    const ordered = listScenesOrdered(plot, storyboardId);
    expect(ordered.map((s) => s.properties.creation_order)).toEqual([0, 1, 2]);
  });

  it("AT-006 (FR-006) deterministic: same input ordering for any in-memory permutation", async () => {
    const { plot, storyboardId } = await buildWithScenes([
      "2026-04-20T10:00:00Z",
      "2026-04-20T10:00:00Z",
      "2026-04-20T10:05:00Z",
    ]);
    const permuted: Plot = {
      ...plot,
      features: [...plot.features].reverse(),
    };
    const a = listScenesOrdered(plot, storyboardId).map((s) => s.properties.id);
    const b = listScenesOrdered(permuted, storyboardId).map((s) => s.properties.id);
    expect(a).toEqual(b);
  });

  it("Story 2 scenario 2: mixed tied + non-tied scenes order A,B,C,D,E", async () => {
    const { plot, storyboardId } = await buildWithScenes([
      "2026-04-20T10:00:00Z", // A
      "2026-04-20T10:00:00Z", // B (tied with A)
      "2026-04-20T10:05:00Z", // C
      "2026-04-20T10:05:00Z", // D (tied with C)
      "2026-04-20T10:10:00Z", // E
    ]);
    const ordered = listScenesOrdered(plot, storyboardId);
    expect(ordered.map((s) => s.properties.creation_order)).toEqual([0, 1, 2, 3, 4]);
  });
});
