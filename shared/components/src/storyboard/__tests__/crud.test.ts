import { describe, expect, it } from "vitest";

import {
  copySceneToOtherStoryboard,
  createScene,
  createStoryboard,
  deleteScene,
  deleteStoryboard,
  describeStoryboard,
  duplicateScene,
  renameStoryboard,
  restoreScene,
  updateScene,
} from "../crud";
import { listScenesOrdered } from "../ordering";
import { OrphanSceneError, UnknownStoryboardError } from "../errors";
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
    expect(storyboard.properties.schema_version).toBe(2);
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

  // ── #259 — relax timestamp uniqueness; creation_order is the tie-breaker.
  it("AT-001 (FR-001) accepts a Scene at a timestamp that another Scene already uses", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene: first } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    const { plot: p2, scene: second } = await createScene(p1, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 12, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumbnails/second.png",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000XXX1",
      activityIdOverride: "11000000-0000-4000-8000-000000000001",
    });
    const ordered = listScenesOrdered(p2, storyboardId);
    expect(ordered.map((s) => s.properties.id)).toEqual([
      first.properties.id,
      second.properties.id,
    ]);
    // New Scene always appended after existing tied-group members (FR-011)
    expect(second.properties.creation_order).toBeGreaterThan(
      first.properties.creation_order,
    );
  });

  it("AT-004 / AT-011 (FR-004, FR-011) assigns monotonic creation_order to three captures at the same timestamp", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene: a } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
      { id: "01JSC00000000000000000AAA1" },
    );
    const { plot: p2, scene: b } = await createScene(p1, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 11, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "b.png",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000BBB1",
      activityIdOverride: "11000000-0000-4000-8000-000000000002",
    });
    const { plot: p3, scene: c } = await createScene(p2, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 12, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "c.png",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000CCC1",
      activityIdOverride: "11000000-0000-4000-8000-000000000003",
    });
    expect([
      a.properties.creation_order,
      b.properties.creation_order,
      c.properties.creation_order,
    ]).toEqual([0, 1, 2]);
    expect(listScenesOrdered(p3, storyboardId).map((s) => s.properties.id)).toEqual([
      a.properties.id,
      b.properties.id,
      c.properties.id,
    ]);
  });

  it("AT-005 (FR-005) persists creation_order on properties (not a sidecar)", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { scene } = await seedScene(p0, storyboardId, "2026-04-20T10:00:00Z");
    expect(scene.properties.creation_order).toBeTypeOf("number");
    expect(scene.properties.creation_order).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(scene.properties.creation_order)).toBe(true);
  });

  it("AT-002 (FR-002) accepts a Scene with an earlier timestamp (out-of-order timestamps unchanged)", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene: later } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T11:00:00Z",
    );
    const { plot: p2, scene: earlier } = await createScene(p1, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "earlier.png",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000EEE1",
      activityIdOverride: "11000000-0000-4000-8000-000000000004",
    });
    // Earlier timestamp sorts first regardless of creation_order
    expect(listScenesOrdered(p2, storyboardId).map((s) => s.properties.id)).toEqual([
      earlier.properties.id,
      later.properties.id,
    ]);
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

  it("#259 accepts same-timestamp duplication and assigns a fresh creation_order", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "A");
    const { plot: p1, scene } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    const { scene: dup } = await duplicateScene(p1, {
      sceneId: scene.properties.id,
      newTimestamp: "2026-04-20T10:00:00Z",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000DUP1",
      activityIdOverride: "12000000-0000-4000-8000-000000000001",
    });
    expect(dup.properties.creation_order).toBeGreaterThan(
      scene.properties.creation_order,
    );
    expect(dup.properties.timestamp).toBe(scene.properties.timestamp);
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

// ──────────────────────────────────────────────────────────────────────
// #218 additive extensions
// ──────────────────────────────────────────────────────────────────────

// #259 removes checkSceneTimestamp — duplicate-timestamp pre-flight is no
// longer needed because createScene / updateScene / duplicateScene /
// copySceneToOtherStoryboard / restoreScene all accept tied timestamps.

describe("describeStoryboard (#218)", () => {
  it("sets description and appends a describe entry to provenance", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "My Brief");
    const { plot: p1, storyboard } = await describeStoryboard(p0, {
      storyboardId,
      description: "Initial briefing state.",
      actor: ALICE,
      now: NOW,
      activityIdOverride: "20000000-0000-4000-8000-000000000001",
    });
    expect(storyboard.properties.description).toBe("Initial briefing state.");
    const last = storyboard.properties.provenance?.slice(-1)[0];
    expect(last?.was_generated_by.parameters[0]?.value).toBe("describe");
    expect(last?.agent).toBe(ALICE);
    // p1 does not mutate p0 (CRUD immutability)
    expect(p1).not.toBe(p0);
  });

  it("clears description when passed null", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "My Brief");
    const { plot: p1 } = await describeStoryboard(p0, {
      storyboardId,
      description: "temp",
      actor: ALICE,
      now: NOW,
      activityIdOverride: "20000000-0000-4000-8000-000000000002",
    });
    const { storyboard } = await describeStoryboard(p1, {
      storyboardId,
      description: null,
      actor: ALICE,
      now: NOW,
      activityIdOverride: "20000000-0000-4000-8000-000000000003",
    });
    expect(storyboard.properties.description).toBeUndefined();
  });

  it("throws UnknownStoryboardError for missing id", async () => {
    await expect(
      describeStoryboard(emptyPlot(), {
        storyboardId: "does-not-exist",
        description: "x",
        actor: ALICE,
        now: NOW,
        activityIdOverride: "20000000-0000-4000-8000-000000000004",
      }),
    ).rejects.toBeInstanceOf(UnknownStoryboardError);
  });
});

describe("restoreScene (#218)", () => {
  it("with empty preservedProvenance behaves like createScene (restore entry is the sole entry)", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "SB");
    const { plot, scene } = await restoreScene(p0, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumbnails/scene-restore.png",
      actor: ALICE,
      now: NOW,
      idOverride: "01JSC00000000000000000AAAA",
      activityIdOverride: "30000000-0000-4000-8000-000000000001",
      preservedProvenance: [],
    });
    expect(isSceneFeature(plot.features[plot.features.length - 1]!)).toBe(true);
    expect(scene.properties.provenance).toHaveLength(1);
    expect(scene.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value).toBe(
      "restore",
    );
  });

  it("non-empty preservedProvenance yields [...preserved, restoreEntry] byte-identically", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "SB");
    const { plot: p1, scene: original } = await seedScene(
      p0,
      storyboardId,
      "2026-04-20T10:00:00Z",
    );
    // Simulate a delete — #215's deleteScene appends the delete entry
    // to provenance BEFORE removing the feature.
    const { plot: p2 } = await deleteScene(p1, {
      sceneId: original.properties.id,
      actor: ALICE,
      now: "2026-04-20T10:05:00Z",
      activityIdOverride: "30000000-0000-4000-8000-000000000010",
    });
    // Capture the pre-delete provenance (includes the {op:'delete'} entry
    // appended by deleteScene prior to removal — per crud.ts)
    // We captured `original` BEFORE delete; the delete modified `p1`
    // in-place via produce, so re-read from p2 is not possible (the
    // feature is gone). Instead we reconstruct: the buffer will hold
    // the in-draft Scene Feature (with the delete entry already on it).
    //
    // For this test we build `preservedProvenance` from the original
    // provenance + a fake delete entry, asserting ordering.
    const preserved = [
      ...(original.properties.provenance ?? []),
      {
        activity_id: "delete-entry-id",
        timestamp: "2026-04-20T10:05:00Z",
        was_generated_by: {
          tool: "storyboard-crud",
          tool_version: "1.0.0",
          parameters: [{ value: "delete" }, { value: "delete scene" }],
        },
        used: [],
        generated: [original.properties.id],
        execution_duration: "PT0S",
        agent: ALICE,
      },
    ];
    const { scene: restored } = await restoreScene(p2, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumbnails/scene.png",
      actor: ALICE,
      now: "2026-04-20T10:06:00Z",
      idOverride: original.properties.id,
      activityIdOverride: "30000000-0000-4000-8000-000000000011",
      preservedProvenance: preserved,
    });
    const prov = restored.properties.provenance!;
    // Byte-identical preserved tail
    expect(prov.length).toBe(preserved.length + 1);
    for (let i = 0; i < preserved.length; i++) {
      expect(JSON.stringify(prov[i])).toBe(JSON.stringify(preserved[i]));
    }
    // Restore entry on top
    const last = prov[prov.length - 1]!;
    expect(last.was_generated_by.parameters[0]?.value).toBe("restore");
    expect(last.activity_id).toBe("30000000-0000-4000-8000-000000000011");
  });

  it("honours idOverride (restored scene keeps the original id)", async () => {
    const { plot: p0, storyboardId } = await seedStoryboard(emptyPlot(), "SB");
    const FIXED_ID = "01JSC00000000000000000BBBB";
    const { scene } = await restoreScene(p0, {
      storyboardId,
      viewport: { center: [-5.0, 50.0], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T11:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumbnails/scene.png",
      actor: ALICE,
      now: NOW,
      idOverride: FIXED_ID,
      activityIdOverride: "30000000-0000-4000-8000-000000000020",
      preservedProvenance: [],
    });
    expect(scene.properties.id).toBe(FIXED_ID);
  });

  it("throws OrphanSceneError when the target storyboard is gone", async () => {
    await expect(
      restoreScene(emptyPlot(), {
        storyboardId: "missing-sb",
        viewport: { center: [0, 0], zoom: 10, bearing: 0 },
        timestamp: "2026-04-20T10:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumbnails/x.png",
        actor: ALICE,
        now: NOW,
        idOverride: "01JSC00000000000000000CCCC",
        activityIdOverride: "30000000-0000-4000-8000-000000000030",
        preservedProvenance: [],
      }),
    ).rejects.toBeInstanceOf(OrphanSceneError);
  });
});

