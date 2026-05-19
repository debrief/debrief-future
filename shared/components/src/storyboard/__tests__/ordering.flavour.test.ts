/**
 * Tests for `listScenesOrdered` with mixed instant + time-range Scenes (#263).
 *
 * The sort key is `(time_range?.start ?? timestamp, creation_order)`. Instant
 * Scenes carry `time_range = undefined` so the anchor falls back to
 * `timestamp` (byte-equivalent to #259's behaviour). Time-range Scenes use
 * `time_range.start` directly. Ties on the anchor break by `creation_order`
 * ascending (#259 SC-I1).
 */
import { describe, it, expect } from "vitest";

import { listScenesOrdered } from "../ordering";
import type { Plot, PlotFeature } from "../types";

function mkScene(
  id: string,
  timestamp: string,
  creationOrder: number,
  storyboardId: string,
  timeRangeStart?: string,
  timeRangeEnd?: string,
): PlotFeature {
  const props: Record<string, unknown> = {
    kind: "STORYBOARD_SCENE",
    id,
    storyboard_id: storyboardId,
    title: `Scene ${id}`,
    viewport: { center: [-1.25, 50.75], zoom: 11, bearing: 0 },
    timestamp,
    visible_feature_ids: [],
    feature_set_hash:
      "0000000000000000000000000000000000000000000000000000000000000000",
    thumbnail_asset_ref: "thumb",
    transition_duration_ms: 500,
    creation_order: creationOrder,
  };
  if (timeRangeStart !== undefined && timeRangeEnd !== undefined) {
    props.time_range = { start: timeRangeStart, end: timeRangeEnd };
    props.viewport_end = { center: [-1.1, 50.85], zoom: 12, bearing: 0 };
  }
  return {
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
    properties: props,
  } as PlotFeature;
}

function mkStoryboard(id: string): PlotFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] },
    properties: {
      kind: "STORYBOARD",
      id,
      name: "SB",
      schema_version: 2,
    },
  } as PlotFeature;
}

describe("listScenesOrdered with mixed flavours (#263)", () => {
  const SB = "01HZ7777777777777777777777";

  it("instant-only Storyboard sorts by timestamp ASC (byte-equivalent to #259)", () => {
    const plot: Plot = {
      type: "FeatureCollection",
      features: [
        mkStoryboard(SB),
        mkScene("01HZSCENE0000000000000000C", "2026-05-15T12:00:30Z", 2, SB),
        mkScene("01HZSCENE0000000000000000A", "2026-05-15T12:00:00Z", 0, SB),
        mkScene("01HZSCENE0000000000000000B", "2026-05-15T12:00:15Z", 1, SB),
      ],
    };
    const ordered = listScenesOrdered(plot, SB).map((s) => s.properties.id);
    expect(ordered).toEqual([
      "01HZSCENE0000000000000000A",
      "01HZSCENE0000000000000000B",
      "01HZSCENE0000000000000000C",
    ]);
  });

  it("time-range Scenes sort by time_range.start (anchor) ASC", () => {
    const plot: Plot = {
      type: "FeatureCollection",
      features: [
        mkStoryboard(SB),
        mkScene(
          "01HZSCENE0000000000000000R",
          "2026-05-15T12:30:00Z",
          2,
          SB,
          "2026-05-15T12:30:00Z",
          "2026-05-15T12:31:00Z",
        ),
        mkScene(
          "01HZSCENE0000000000000000P",
          "2026-05-15T12:00:00Z",
          0,
          SB,
          "2026-05-15T12:00:00Z",
          "2026-05-15T12:01:00Z",
        ),
        mkScene(
          "01HZSCENE0000000000000000Q",
          "2026-05-15T12:15:00Z",
          1,
          SB,
          "2026-05-15T12:15:00Z",
          "2026-05-15T12:16:00Z",
        ),
      ],
    };
    const ordered = listScenesOrdered(plot, SB).map((s) => s.properties.id);
    expect(ordered).toEqual([
      "01HZSCENE0000000000000000P",
      "01HZSCENE0000000000000000Q",
      "01HZSCENE0000000000000000R",
    ]);
  });

  it("mixed flavours interleave correctly under the anchor sort", () => {
    // From data-model.md §5:
    //   A instant @ T0     creation_order 0
    //   B time-range [T0, T0+60s]  creation_order 1
    //   C instant @ T0+30s creation_order 2
    //   D time-range [T0+30s, T0+90s] creation_order 3
    //
    // Anchor sort yields: A (T0/0), B (T0/1), C (T0+30s/2), D (T0+30s/3).
    const plot: Plot = {
      type: "FeatureCollection",
      features: [
        mkStoryboard(SB),
        mkScene("01HZSCENEMIX00000000000000A", "2026-05-15T12:00:00Z", 0, SB),
        mkScene(
          "01HZSCENEMIX00000000000000B",
          "2026-05-15T12:00:00Z",
          1,
          SB,
          "2026-05-15T12:00:00Z",
          "2026-05-15T12:01:00Z",
        ),
        mkScene("01HZSCENEMIX00000000000000C", "2026-05-15T12:00:30Z", 2, SB),
        mkScene(
          "01HZSCENEMIX00000000000000D",
          "2026-05-15T12:00:30Z",
          3,
          SB,
          "2026-05-15T12:00:30Z",
          "2026-05-15T12:01:30Z",
        ),
      ],
    };
    const ordered = listScenesOrdered(plot, SB).map((s) => s.properties.id);
    expect(ordered).toEqual([
      "01HZSCENEMIX00000000000000A",
      "01HZSCENEMIX00000000000000B",
      "01HZSCENEMIX00000000000000C",
      "01HZSCENEMIX00000000000000D",
    ]);
  });

  it("ties on the anchor break by creation_order ASC (#259)", () => {
    // Two time-range Scenes sharing time_range.start — order by creation_order.
    const plot: Plot = {
      type: "FeatureCollection",
      features: [
        mkStoryboard(SB),
        mkScene(
          "01HZSCENETIE000000000000002",
          "2026-05-15T12:00:00Z",
          2,
          SB,
          "2026-05-15T12:00:00Z",
          "2026-05-15T12:01:00Z",
        ),
        mkScene(
          "01HZSCENETIE000000000000001",
          "2026-05-15T12:00:00Z",
          1,
          SB,
          "2026-05-15T12:00:00Z",
          "2026-05-15T12:02:00Z",
        ),
      ],
    };
    const ordered = listScenesOrdered(plot, SB).map((s) => s.properties.id);
    expect(ordered).toEqual([
      "01HZSCENETIE000000000000001",
      "01HZSCENETIE000000000000002",
    ]);
  });
});
