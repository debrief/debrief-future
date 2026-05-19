/**
 * Tests for `createScene`'s time-range flavour input handling (#263).
 *
 * Covers:
 * - happy path: both timeRange + viewportEnd accepted, written to props
 * - XOR rejection: timeRange-only and viewportEnd-only inputs throw
 * - range-validity rejection: end <= start throws
 * - bearing-zero enforcement applies to viewport_end too
 * - instant flavour (neither input) still works exactly as before
 */
import { describe, it, expect } from "vitest";

import { createStoryboard, createScene } from "../crud";
import {
  SceneFlavourXorViolationError,
  SceneTimeRangeEndNotAfterStartError,
  ReservedSlotViolationError,
} from "../errors";
import { isTimeRangeScene } from "../types";
import type { Plot, TimeRange, Viewport } from "../types";

const VIEWPORT: Viewport = { center: [-1.25, 50.75], zoom: 11, bearing: 0 };
const VIEWPORT_END: Viewport = { center: [-1.1, 50.85], zoom: 12, bearing: 0 };
const TR: TimeRange = {
  start: "2026-05-15T12:00:00Z",
  end: "2026-05-15T12:01:30Z",
};

async function bootstrapPlotWithStoryboard(): Promise<{
  plot: Plot;
  storyboardId: string;
}> {
  const emptyPlot: Plot = { type: "FeatureCollection", features: [] };
  const { plot: withSb, storyboard } = await createStoryboard(emptyPlot, {
    name: "Test SB",
    actor: "tester",
  });
  return { plot: withSb, storyboardId: storyboard.properties.id };
}

describe("createScene flavour handling (#263)", () => {
  it("creates an instant Scene (no timeRange / no viewportEnd)", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    const { scene } = await createScene(plot, {
      storyboardId,
      viewport: VIEWPORT,
      timestamp: "2026-05-15T12:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb",
      actor: "tester",
    });
    expect(scene.properties.time_range).toBeUndefined();
    expect(scene.properties.viewport_end).toBeUndefined();
    expect(isTimeRangeScene(scene)).toBe(false);
  });

  it("creates a time-range Scene when both timeRange and viewportEnd are provided", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    const { scene } = await createScene(plot, {
      storyboardId,
      viewport: VIEWPORT,
      viewportEnd: VIEWPORT_END,
      timeRange: TR,
      timestamp: "2026-05-15T12:00:00Z",
      visibleFeatureIds: [],
      thumbnailAssetRef: "thumb",
      actor: "tester",
    });
    expect(scene.properties.time_range).toEqual(TR);
    expect(scene.properties.viewport_end).toEqual(VIEWPORT_END);
    expect(isTimeRangeScene(scene)).toBe(true);
  });

  it("rejects timeRange without viewportEnd (XOR)", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    await expect(
      createScene(plot, {
        storyboardId,
        viewport: VIEWPORT,
        timeRange: TR,
        timestamp: "2026-05-15T12:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumb",
        actor: "tester",
      }),
    ).rejects.toBeInstanceOf(SceneFlavourXorViolationError);
  });

  it("rejects viewportEnd without timeRange (XOR)", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    await expect(
      createScene(plot, {
        storyboardId,
        viewport: VIEWPORT,
        viewportEnd: VIEWPORT_END,
        timestamp: "2026-05-15T12:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumb",
        actor: "tester",
      }),
    ).rejects.toBeInstanceOf(SceneFlavourXorViolationError);
  });

  it("rejects timeRange with end <= start", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    await expect(
      createScene(plot, {
        storyboardId,
        viewport: VIEWPORT,
        viewportEnd: VIEWPORT_END,
        timeRange: {
          start: "2026-05-15T12:01:30Z",
          end: "2026-05-15T12:00:00Z",
        },
        timestamp: "2026-05-15T12:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumb",
        actor: "tester",
      }),
    ).rejects.toBeInstanceOf(SceneTimeRangeEndNotAfterStartError);
  });

  it("rejects viewportEnd with non-zero bearing (reserved slot)", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    await expect(
      createScene(plot, {
        storyboardId,
        viewport: VIEWPORT,
        viewportEnd: { ...VIEWPORT_END, bearing: 5 as 0 },
        timeRange: TR,
        timestamp: "2026-05-15T12:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumb",
        actor: "tester",
      }),
    ).rejects.toBeInstanceOf(ReservedSlotViolationError);
  });

  it("does NOT mutate the input plot on rejection", async () => {
    const { plot, storyboardId } = await bootstrapPlotWithStoryboard();
    const featuresBefore = plot.features.length;
    await expect(
      createScene(plot, {
        storyboardId,
        viewport: VIEWPORT,
        timeRange: TR,
        timestamp: "2026-05-15T12:00:00Z",
        visibleFeatureIds: [],
        thumbnailAssetRef: "thumb",
        actor: "tester",
      }),
    ).rejects.toBeInstanceOf(SceneFlavourXorViolationError);
    expect(plot.features.length).toBe(featuresBefore);
  });
});
