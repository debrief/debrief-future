import { describe, expect, it } from "vitest";

import {
  buildStoryboardCrudLogEntry,
  getCreatedAt,
  getCreatedBy,
  getLastModifiedAt,
  getLastModifiedBy,
  readStoryboardCrudOp,
} from "../provenance";
import {
  createScene,
  createStoryboard,
  renameStoryboard,
} from "../crud";
import type { Plot } from "../types";

describe("buildStoryboardCrudLogEntry", () => {
  it("sets the canonical tool + tool_version + op + agent fields", () => {
    const entry = buildStoryboardCrudLogEntry({
      op: "create",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      summary: "create storyboard",
      used: [],
      generated: ["sb-001"],
      activityId: "00000000-0000-4000-8000-000000000001",
    });
    expect(entry.was_generated_by.tool).toBe("storyboard-crud");
    expect(entry.was_generated_by.tool_version).toBe("1.0.0");
    expect(entry.was_generated_by.parameters[0]?.value).toBe("create");
    expect(entry.agent).toBe("alice");
    expect(entry.execution_duration).toBe("PT0S");
    expect(entry.used).toEqual([]);
    expect(entry.generated).toEqual(["sb-001"]);
  });

  it("omits rationale when not provided", () => {
    const entry = buildStoryboardCrudLogEntry({
      op: "create",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      summary: "x",
      used: [],
      generated: ["sb-001"],
      activityId: "00000000-0000-4000-8000-000000000001",
    });
    expect(entry.rationale).toBeUndefined();
  });
});

describe("readStoryboardCrudOp", () => {
  it("returns the op value for storyboard-crud entries", () => {
    const entry = buildStoryboardCrudLogEntry({
      op: "rename",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      summary: "x",
      used: [],
      generated: ["sb-001"],
      activityId: "00000000-0000-4000-8000-000000000002",
    });
    expect(readStoryboardCrudOp(entry)).toBe("rename");
  });

  it("returns null for entries emitted by other tools", () => {
    const entry = {
      activity_id: "00000000-0000-4000-8000-000000000003",
      timestamp: "2026-04-20T09:00:00Z",
      was_generated_by: {
        tool: "some-other-tool",
        tool_version: "1.0.0",
        parameters: [{ value: "create" }],
      },
      used: [],
      generated: [],
      execution_duration: "PT0S",
    };
    expect(readStoryboardCrudOp(entry)).toBeNull();
  });
});

describe("append-only invariant + derived accessors", () => {
  it("every mutation appends exactly one LogEntry and preserves prior entries", async () => {
    let plot: Plot = { type: "FeatureCollection", features: [] };
    const c = await createStoryboard(plot, {
      name: "A",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARDPROVAAAAAAAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000100",
    });
    plot = c.plot;
    expect(c.storyboard.properties.provenance).toHaveLength(1);
    const originalCreate = c.storyboard.properties.provenance?.[0];

    const r = await renameStoryboard(plot, {
      storyboardId: c.storyboard.properties.id,
      newName: "A2",
      actor: "bob",
      now: "2026-04-20T10:00:00Z",
      activityIdOverride: "00000000-0000-4000-8000-000000000101",
    });
    expect(r.storyboard.properties.provenance).toHaveLength(2);
    // Prior entry is unchanged
    expect(r.storyboard.properties.provenance?.[0]).toEqual(originalCreate);
    // Accessors
    expect(getCreatedAt(r.storyboard)).toBe("2026-04-20T09:00:00Z");
    expect(getLastModifiedAt(r.storyboard)).toBe("2026-04-20T10:00:00Z");
    expect(getCreatedBy(r.storyboard)).toBe("alice");
    expect(getLastModifiedBy(r.storyboard)).toBe("bob");
  });

  it("createScene appends exactly one create entry to the new Scene", async () => {
    let plot: Plot = { type: "FeatureCollection", features: [] };
    const c = await createStoryboard(plot, {
      name: "B",
      actor: "alice",
      now: "2026-04-20T09:00:00Z",
      idOverride: "01JSTORYBOARDSCENEAAAAAAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000200",
    });
    plot = c.plot;
    const s = await createScene(plot, {
      storyboardId: c.storyboard.properties.id,
      viewport: { center: [-5, 50], zoom: 10, bearing: 0 },
      timestamp: "2026-04-20T10:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "x",
      actor: "alice",
      now: "2026-04-20T10:00:00Z",
      idOverride: "01JSCENEPROVAAAAAAAAAAAAAA",
      activityIdOverride: "00000000-0000-4000-8000-000000000201",
    });
    expect(s.scene.properties.provenance).toHaveLength(1);
    expect(
      s.scene.properties.provenance?.[0]?.was_generated_by.parameters[0]?.value,
    ).toBe("create");
  });
});
