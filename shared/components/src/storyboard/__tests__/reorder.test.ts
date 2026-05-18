import { describe, expect, it } from "vitest";

import {
  createScene,
  createStoryboard,
  deleteScene,
  reorderSceneInTiedGroup,
  updateScene,
} from "../crud";
import { listScenesOrdered } from "../ordering";
import type { Plot, SceneFeature } from "../types";

const ALICE = "alice";
const NOW = "2026-04-20T09:00:00Z";

async function buildTiedGroup(
  tiedTimestamp: string,
  count: number,
): Promise<{ plot: Plot; storyboardId: string; sceneIds: string[] }> {
  let plot: Plot = { type: "FeatureCollection", features: [] };
  const { plot: p1, storyboard } = await createStoryboard(plot, {
    name: "Reorder Test",
    actor: ALICE,
    now: NOW,
    idOverride: "01JSREORDER000000000000AAAA",
    activityIdOverride: "00000000-0000-4000-8000-000000000001",
  });
  plot = p1;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = String(i).padStart(2, "0");
    const sceneId = `01JSCREORDER${idx}00000000000000`.slice(0, 26);
    const result = await createScene(plot, {
      storyboardId: storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10 + i, bearing: 0 },
      timestamp: tiedTimestamp,
      visibleFeatureIds: [],
      thumbnailAssetRef: `r${i}.png`,
      actor: ALICE,
      now: tiedTimestamp,
      idOverride: sceneId,
      activityIdOverride: `00000000-0000-4000-8000-${idx.padStart(12, "0")}`,
    });
    plot = result.plot;
    ids.push(sceneId);
  }
  return { plot, storyboardId: storyboard.properties.id, sceneIds: ids };
}

function tiedGroupCreationOrders(plot: Plot, storyboardId: string): number[] {
  return listScenesOrdered(plot, storyboardId).map((s) => s.properties.creation_order);
}

describe("reorderSceneInTiedGroup (#259)", () => {
  it("AT-007 (FR-007) moves the middle scene to the end", async () => {
    const { plot, storyboardId, sceneIds } = await buildTiedGroup(
      "2026-04-20T10:00:00Z",
      3,
    );
    const [a, b, c] = sceneIds as [string, string, string];
    const { plot: next } = reorderSceneInTiedGroup(plot, {
      sceneId: b,
      newPositionInGroup: 2,
    });
    expect(listScenesOrdered(next, storyboardId).map((s) => s.properties.id)).toEqual([
      a,
      c,
      b,
    ]);
    expect(tiedGroupCreationOrders(next, storyboardId)).toEqual([0, 1, 2]);
  });

  it("moves the last scene to the front", async () => {
    const { plot, storyboardId, sceneIds } = await buildTiedGroup(
      "2026-04-20T10:00:00Z",
      3,
    );
    const [a, b, c] = sceneIds as [string, string, string];
    const { plot: next } = reorderSceneInTiedGroup(plot, {
      sceneId: c,
      newPositionInGroup: 0,
    });
    expect(listScenesOrdered(next, storyboardId).map((s) => s.properties.id)).toEqual([
      c,
      a,
      b,
    ]);
  });

  it("preserves Scenes outside the tied group", async () => {
    const { plot: tied, storyboardId, sceneIds } = await buildTiedGroup(
      "2026-04-20T10:00:00Z",
      3,
    );
    // Append a fourth Scene at a later timestamp.
    const { plot } = await createScene(tied, {
      storyboardId,
      viewport: { center: [-5, 50], zoom: 9, bearing: 0 },
      timestamp: "2026-04-20T10:05:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "outside.png",
      actor: ALICE,
      now: "2026-04-20T10:05:00Z",
      idOverride: "01JSCREORDEROUTSIDE0000XXXX",
      activityIdOverride: "00000000-0000-4000-8000-000000000099",
    });
    const outsideBefore = listScenesOrdered(plot, storyboardId)[3];
    const [, b] = sceneIds as [string, string, string];
    const { plot: next } = reorderSceneInTiedGroup(plot, {
      sceneId: b,
      newPositionInGroup: 2,
    });
    const outsideAfter = listScenesOrdered(next, storyboardId)[3];
    expect(outsideAfter?.properties.id).toBe(outsideBefore?.properties.id);
    expect(outsideAfter?.properties.creation_order).toBe(
      outsideBefore?.properties.creation_order,
    );
  });

  it("AT-008 (FR-008) deleteScene on a tied group leaves a gap (no renumber)", async () => {
    const { plot, storyboardId, sceneIds } = await buildTiedGroup(
      "2026-04-20T10:00:00Z",
      3,
    );
    const [a, b, c] = sceneIds as [string, string, string];
    const { plot: next } = await deleteScene(plot, {
      sceneId: b,
      actor: ALICE,
      now: NOW,
    });
    const remaining = listScenesOrdered(next, storyboardId);
    expect(remaining.map((s) => s.properties.id)).toEqual([a, c]);
    expect(remaining.map((s) => s.properties.creation_order)).toEqual([0, 2]);
  });

  it("AT-009 (FR-009) updateScene viewport leaves creation_order + position unchanged", async () => {
    const { plot, storyboardId, sceneIds } = await buildTiedGroup(
      "2026-04-20T10:00:00Z",
      3,
    );
    const [, b] = sceneIds as [string, string, string];
    const before = listScenesOrdered(plot, storyboardId).find(
      (s: SceneFeature) => s.properties.id === b,
    );
    const { plot: next } = await updateScene(plot, {
      sceneId: b,
      patch: { viewport: { center: [-10, 40], zoom: 14, bearing: 0 } },
      actor: ALICE,
      now: NOW,
    });
    const after = listScenesOrdered(next, storyboardId).find(
      (s: SceneFeature) => s.properties.id === b,
    );
    expect(after?.properties.creation_order).toBe(before?.properties.creation_order);
    expect(listScenesOrdered(next, storyboardId).map((s) => s.properties.id)).toEqual(
      sceneIds,
    );
  });

  it("AT-014 (defensive) throws CreationOrderOutOfRange for an out-of-bounds index", async () => {
    const { plot, sceneIds } = await buildTiedGroup("2026-04-20T10:00:00Z", 3);
    const [a] = sceneIds as [string, string, string];
    expect(() =>
      reorderSceneInTiedGroup(plot, { sceneId: a, newPositionInGroup: 99 }),
    ).toThrow(
      expect.objectContaining({
        code: "CreationOrderOutOfRange",
        providedIndex: 99,
        tiedGroupSize: 3,
      }),
    );
  });

  it("single-Scene tied group: newPositionInGroup=0 is a no-op; any other throws", async () => {
    const { plot, sceneIds } = await buildTiedGroup("2026-04-20T10:00:00Z", 1);
    const [only] = sceneIds as [string];
    expect(() =>
      reorderSceneInTiedGroup(plot, { sceneId: only, newPositionInGroup: 0 }),
    ).not.toThrow();
    expect(() =>
      reorderSceneInTiedGroup(plot, { sceneId: only, newPositionInGroup: 1 }),
    ).toThrow(expect.objectContaining({ code: "CreationOrderOutOfRange" }));
  });
});
