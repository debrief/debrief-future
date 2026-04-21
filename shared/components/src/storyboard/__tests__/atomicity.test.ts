import { describe, expect, it } from "vitest";

import {
  copySceneToOtherStoryboard,
  createScene,
  createStoryboard,
} from "../crud";
import type { Plot } from "../types";

async function buildPlotWithTwoStoryboardsAndOneScene(): Promise<{
  plot: Plot;
  srcId: string;
  dstId: string;
  sceneId: string;
}> {
  let plot: Plot = { type: "FeatureCollection", features: [] };
  const src = await createStoryboard(plot, {
    name: "Src",
    actor: "alice",
    now: "2026-04-20T09:00:00Z",
    idOverride: "01JSTORYBOARDSRCXXXXXXXXXX",
    activityIdOverride: "00000000-0000-4000-8000-000000000001",
  });
  plot = src.plot;
  const dst = await createStoryboard(plot, {
    name: "Dst",
    actor: "alice",
    now: "2026-04-20T09:00:00Z",
    idOverride: "01JSTORYBOARDDSTXXXXXXXXXX",
    activityIdOverride: "00000000-0000-4000-8000-000000000002",
  });
  plot = dst.plot;
  const sc = await createScene(plot, {
    storyboardId: src.storyboard.properties.id,
    viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
    timestamp: "2026-04-20T10:00:00Z",
    visibleFeatureIds: ["alpha"],
    thumbnailAssetRef: "src/a.png",
    actor: "alice",
    now: "2026-04-20T10:00:00Z",
    idOverride: "01JSCENEAAAAAAAAAAAAAAAAAA",
    activityIdOverride: "00000000-0000-4000-8000-000000000003",
  });
  return {
    plot: sc.plot,
    srcId: src.storyboard.properties.id,
    dstId: dst.storyboard.properties.id,
    sceneId: sc.scene.properties.id,
  };
}

describe("atomicity (SC-005)", () => {
  it("copySceneToOtherStoryboard rolls back when deepCopyThumbnail rejects", async () => {
    const { plot, sceneId, dstId } =
      await buildPlotWithTwoStoryboardsAndOneScene();
    const snapshot = JSON.parse(JSON.stringify(plot)) as Plot;
    await expect(
      copySceneToOtherStoryboard(plot, {
        sceneId,
        destinationStoryboardId: dstId,
        deepCopyThumbnail: async () => {
          throw new Error("disk full");
        },
        actor: "alice",
        now: "2026-04-20T12:00:00Z",
        newTimestamp: "2026-04-20T12:00:00Z",
        idOverride: "01JSCENECOPYFAILED00000000",
      }),
    ).rejects.toMatchObject({ code: "ThumbnailDeepCopyFailed" });
    // Input plot byte-identical post-call
    expect(plot).toEqual(snapshot);
  });

  it("copySceneToOtherStoryboard does not mutate plot when UnknownStoryboard fires", async () => {
    const { plot, sceneId } =
      await buildPlotWithTwoStoryboardsAndOneScene();
    const snapshot = JSON.parse(JSON.stringify(plot)) as Plot;
    await expect(
      copySceneToOtherStoryboard(plot, {
        sceneId,
        destinationStoryboardId: "01JNOTEXISTYYYYYYYYYYYYYYY",
        deepCopyThumbnail: async (s) => s,
        actor: "alice",
        now: "2026-04-20T12:00:00Z",
        idOverride: "01JSCENECOPYNOSTRY00000000",
      }),
    ).rejects.toMatchObject({ code: "UnknownStoryboard" });
    expect(plot).toEqual(snapshot);
  });
});
