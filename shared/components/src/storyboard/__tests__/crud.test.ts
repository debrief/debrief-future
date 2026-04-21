import { describe, expect, it } from "vitest";

import {
  copySceneToOtherStoryboard,
  createScene,
  createStoryboard,
  deleteScene,
  deleteStoryboard,
  duplicateScene,
  renameStoryboard,
  updateScene,
} from "../crud";
import type { Plot } from "../types";
import { isSceneFeature, isStoryboardFeature } from "../types";

const ALICE = "alice";
const NOW = "2026-04-20T09:00:00Z";

function emptyPlot(): Plot {
  return { type: "FeatureCollection", features: [] };
}

async function seedStoryboard(
  plot: Plot,
  name: string,
  id?: string,
): Promise<{ plot: Plot; storyboardId: string }> {
  const { plot: p, storyboard } = await createStoryboard(plot, {
    name,
    actor: ALICE,
    now: NOW,
    idOverride: id ?? `01JSB${String(name.length).padStart(2, "0")}000000000000000`,
    activityIdOverride: `00000000-0000-4000-8000-${String(name.length).padStart(12, "0")}`,
  });
  return { plot: p, storyboardId: storyboard.properties.id };
}

async function seedScene(
  plot: Plot,
  storyboardId: string,
  timestamp: string,
  opts: { id?: string; visibleIds?: string[]; thumbnail?: string } = {},
) {
  const result = await createScene(plot, {
    storyboardId,
    viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
    timestamp,
    visibleFeatureIds: opts.visibleIds ?? [],
    thumbnailAssetRef: opts.thumbnail ?? "thumbnails/scene.png",
    actor: ALICE,
    now: timestamp,
    idOverride: opts.id ?? `01JSC${timestamp.slice(-6)}0000000000000000`.slice(0, 26),
    activityIdOverride: `10000000-0000-4000-8000-${timestamp.slice(-12).padStart(12, "0").replaceAll(":", "0")}`,
  });
  return result;
}

describe("createStoryboard", () => {
  it("appends a Storyboard Feature with one create LogEntry", async () => {
    const { plot: after, storyboard } = await createStoryboard(emptyPlot(), {
      name: "My Brief",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSB00000000000000000AAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000001",
    });
    expect(after.features).toHaveLength(1);
    const stored = after.features[0];
    expect(stored).toBe(storyboard);
    expect(isStoryboardFeature(stored)).toBe(true);
    expect(storyboard.properties.name).toBe("My Brief");
    expect(storyboard.properties.schema_version).toBe(1);
    expect(storyboard.properties.provenance).toHaveLength(1);
    const first = storyboard.properties.provenance?.[0];
    expect(first?.agent).toBe(ALICE);
    expect(first?.was_generated_by.tool).toBe("storyboard-crud");
    expect(first?.was_generated_by.parameters[0]?.value).toBe("create");
  });

  it("rejects duplicate names with DuplicateStoryboardName", async () => {
    const { plot: withOne } = await seedStoryboard(emptyPlot(), "Dup");
    await expect(
      createStoryboard(withOne, { name: "Dup", actor: ALICE, now: NOW }),
    ).rejects.toMatchObject({ code: "DuplicateStoryboardName" });
  });

  it("rejects blank name with ReservedSlotViolation", async () => {
    await expect(
      createStoryboard(emptyPlot(), { name: "  ", actor: ALICE, now: NOW }),
    ).rejects.toMatchObject({ code: "ReservedSlotViolation" });
  });
});

describe("renameStoryboard", () => {
  it("updates name and appends rename LogEntry", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "Old");
    const { plot: p1, storyboard } = await renameStoryboard(p0, {
      storyboardId,
      newName: "New",
      actor: ALICE,
      now: NOW,
      activityIdOverride: "00000000-0000-4000-8000-000000000099",
    });
    expect(storyboard.properties.name).toBe("New");
    expect(storyboard.properties.provenance).toHaveLength(2);
    const last =
      storyboard.properties.provenance?.[
        storyboard.properties.provenance.length - 1
      ];
    expect(last?.was_generated_by.parameters[0]?.value).toBe("rename");
    // Input not mutated
    expect(
      (p0.features[0] as unknown as { properties: { name: string } }).properties
        .name,
    ).toBe("Old");
    // Return value is a distinct reference
    expect(p1).not.toBe(p0);
  });

  it("rejects unknown storyboard id with UnknownStoryboard", async () => {
    await expect(
      renameStoryboard(emptyPlot(), {
        storyboardId: "01J000000000000000000XXXXX",
        newName: "x",
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "UnknownStoryboard" });
  });
});

describe("deleteStoryboard cascade", () => {
  it("removes the Storyboard + all its Scenes atomically", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "Gone");
    const { plot: p1 } = await seedScene(p0, storyboardId, "2026-04-20T10:00:00Z");
    const { plot: p2 } = await seedScene(p1, storyboardId, "2026-04-20T11:00:00Z");
    const { plot: p3, removedSceneIds } = await deleteStoryboard(p2, {
      storyboardId,
      actor: ALICE,
      now: NOW,
    });
    expect(p3.features).toHaveLength(0);
    expect(removedSceneIds).toHaveLength(2);
  });
});

describe("createScene", () => {
  it("appends a Scene with computed hash + provenance", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await createScene(p0, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: ["track-alpha", "track-alpha", "point-charlie"],
      thumbnailAssetRef: "thumbnails/a.png",
      actor: ALICE,
      now: NOW,
    });
    expect(scene.properties.visible_feature_ids).toEqual([
      "point-charlie",
      "track-alpha",
    ]);
    expect(scene.properties.feature_set_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(p1.features).toHaveLength(2);
    expect(scene.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value).toBe(
      "create",
    );
  });

  it("throws DuplicateTimestamp when two Scenes collide", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1 } = await seedScene(p0, storyboardId, "2026-04-20T10:00:00Z");
    await expect(
      createScene(p1, {
        storyboardId,
        viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
        timestamp: "2026-04-20T10:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "x",
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "DuplicateTimestamp" });
  });

  it("throws ReservedSlotViolation when bearing != 0", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    await expect(
      createScene(p0, {
        storyboardId,
        viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0.5 },
        timestamp: "2026-04-20T10:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "x",
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "ReservedSlotViolation" });
  });

  it("throws OrphanScene when storyboard is missing", async () => {
    await expect(
      createScene(emptyPlot(), {
        storyboardId: "01JSBXYZ00000000000000XXXX",
        viewport: { center: [0, 0], zoom: 5, bearing: 0 },
        timestamp: "2026-04-20T10:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "x",
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "OrphanScene" });
  });

  it("detects insert-middle op when new Scene lands between existing ones", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1 } = await seedScene(p0, storyboardId, "2026-04-20T09:00:00Z");
    const { plot: p2 } = await seedScene(p1, storyboardId, "2026-04-20T11:00:00Z");
    const { scene } = await createScene(p2, {
      storyboardId,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "x",
      actor: ALICE,
      now: NOW,
    });
    expect(scene.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value).toBe(
      "insert-middle",
    );
  });
});

describe("updateScene", () => {
  it("emits describe op when only title/description change", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    const { scene: updated } = await updateScene(p1, {
      sceneId: scene.properties.id,
      patch: { title: "Renamed Scene" },
      actor: ALICE,
      now: NOW,
    });
    expect(updated.properties.title).toBe("Renamed Scene");
    const last = updated.properties.provenance?.at(-1);
    expect(last?.was_generated_by.parameters[0]?.value).toBe("describe");
  });

  it("emits update-to-current op when visibleFeatureIds change + recomputes hash", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    const originalHash = scene.properties.feature_set_hash;
    const { scene: updated } = await updateScene(p1, {
      sceneId: scene.properties.id,
      patch: { visibleFeatureIds: ["alpha", "bravo"] },
      actor: ALICE,
      now: NOW,
    });
    expect(updated.properties.feature_set_hash).not.toBe(originalHash);
    const last = updated.properties.provenance?.at(-1);
    expect(last?.was_generated_by.parameters[0]?.value).toBe("update-to-current");
  });

  it("throws UnknownScene on missing sceneId", async () => {
    await expect(
      updateScene(emptyPlot(), {
        sceneId: "01J000000000000000000XXXXX",
        patch: { title: "x" },
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "UnknownScene" });
  });
});

describe("deleteScene", () => {
  it("removes the Scene and retains provenance on the in-place draft", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    const { plot: p2 } = await deleteScene(p1, {
      sceneId: scene.properties.id,
      actor: ALICE,
      now: NOW,
    });
    expect(
      p2.features.find(
        (f) => isSceneFeature(f) && f.properties.id === scene.properties.id,
      ),
    ).toBeUndefined();
  });
});

describe("duplicateScene", () => {
  it("creates a fresh Scene with new id, new timestamp, same storyboard", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
      { visibleIds: ["x", "y"] },
    );
    const { scene: dup } = await duplicateScene(p1, {
      sceneId: scene.properties.id,
      newTimestamp: "2026-04-20T11:00:00Z",
      actor: ALICE,
      now: NOW,
    });
    expect(dup.properties.id).not.toBe(scene.properties.id);
    expect(dup.properties.storyboard_id).toBe(storyboardId);
    expect(dup.properties.timestamp).toBe("2026-04-20T11:00:00Z");
    expect(dup.properties.visible_feature_ids).toEqual(["x", "y"]);
    expect(dup.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value).toBe(
      "duplicate",
    );
  });

  it("rejects same-timestamp duplication with DuplicateTimestamp", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    await expect(
      duplicateScene(p1, {
        sceneId: scene.properties.id,
        newTimestamp: "2026-04-20T10:00:00Z",
        actor: ALICE,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: "DuplicateTimestamp" });
  });
});

describe("copySceneToOtherStoryboard", () => {
  it("deep-copies the thumbnail and assigns destination storyboard", async () => {
    const { plot: p0, storyboardId: srcId } = await seedStoryboard(
      emptyPlot(),
      "Src",
    );
    const { plot: p1, storyboardId: dstId } = await seedStoryboard(p0, "Dst");
    const { plot: p2, scene } = await seedScene(
      p1,
      srcId,
      "2026-04-20T10:00:00Z",
      { thumbnail: "src/a.png" },
    );
    let copies = 0;
    const { plot: p3, scene: copied } = await copySceneToOtherStoryboard(p2, {
      sceneId: scene.properties.id,
      destinationStoryboardId: dstId,
      actor: ALICE,
      now: NOW,
      newTimestamp: "2026-04-20T12:00:00Z",
      deepCopyThumbnail: async (src, dst) => {
        copies += 1;
        return `dst/${dst}/${src.split("/").pop()}`;
      },
    });
    expect(copies).toBe(1);
    expect(copied.properties.id).not.toBe(scene.properties.id);
    expect(copied.properties.storyboard_id).toBe(dstId);
    expect(copied.properties.thumbnail_asset_ref).not.toBe(
      scene.properties.thumbnail_asset_ref,
    );
    expect(copied.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value).toBe(
      "copy-in",
    );
    expect(p3.features.length).toBe(p2.features.length + 1);
  });
});
