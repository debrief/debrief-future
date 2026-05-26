/**
 * Tests for the `TimeRangeTween` RAF primitive (#263).
 *
 * Uses a deterministic frame scheduler (no real RAF) so each test drives
 * the loop frame-by-frame.
 */
import { describe, it, expect } from "vitest";

import {
  blendViewport,
  runTimeRangeTween,
  type FrameScheduler,
  type TimeRangeTweenPorts,
} from "../timeRangeTween";
import type {
  TimeRangeSceneFeature,
  Viewport,
} from "../../storyboard/types";

const VIEWPORT_START: Viewport = {
  center: [-1.25, 50.75],
  zoom: 11,
  bearing: 0,
};
const VIEWPORT_END: Viewport = {
  center: [-1.0, 51.0],
  zoom: 13,
  bearing: 0,
};

const T_START = "2026-05-15T12:00:00Z";
const T_END = "2026-05-15T12:01:00Z"; // 60-second range
const EPOCH_START = Date.parse(T_START);
const EPOCH_END = Date.parse(T_END);

function makeScene(durationMs = 1000): TimeRangeSceneFeature {
  return {
    type: "Feature",
    id: "01HZ263TIMERANGE0000000000",
    geometry: { type: "Polygon", coordinates: [[[0, 0]]] } as never,
    properties: {
      kind: "STORYBOARD_SCENE",
      id: "01HZ263TIMERANGE0000000000",
      storyboard_id: "01HZ7777777777777777777777",
      title: "test",
      viewport: VIEWPORT_START,
      viewport_end: VIEWPORT_END,
      timestamp: T_START,
      time_range: { start: T_START, end: T_END },
      visible_feature_ids: [],
      feature_set_hash:
        "0000000000000000000000000000000000000000000000000000000000000000",
      thumbnail_asset_ref: "thumb",
      transition_duration_ms: durationMs,
      creation_order: 0,
    },
  } as unknown as TimeRangeSceneFeature;
}

interface RecordedFrame {
  epoch: number;
  viewport: Viewport;
  order: "currentTime-first" | "viewport-first";
}

function makePorts(): {
  ports: TimeRangeTweenPorts;
  frames: RecordedFrame[];
} {
  const frames: RecordedFrame[] = [];
  let pendingEpoch: number | null = null;
  const ports: TimeRangeTweenPorts = {
    setCurrentTime: (epoch) => {
      pendingEpoch = epoch;
    },
    flyToViewport: (viewport, durationMs) => {
      expect(durationMs).toBe(0);
      const epoch = pendingEpoch;
      // The pair MUST be set together; setCurrentTime fires first.
      if (epoch === null) {
        frames.push({ epoch: NaN, viewport, order: "viewport-first" });
      } else {
        frames.push({ epoch, viewport, order: "currentTime-first" });
      }
      pendingEpoch = null;
    },
  };
  return { ports, frames };
}

/** Deterministic scheduler the tests drive frame-by-frame. */
function makeScheduler(initialNow = 0): {
  scheduler: FrameScheduler;
  advance: (ms: number) => void;
  tick: () => void;
  pendingCount: () => number;
} {
  let now = initialNow;
  let nextHandle = 1;
  const queue: { handle: number; cb: (t: number) => void }[] = [];
  return {
    scheduler: {
      request: (cb) => {
        const handle = nextHandle++;
        queue.push({ handle, cb });
        return handle;
      },
      cancel: (h) => {
        const idx = queue.findIndex((q) => q.handle === h);
        if (idx >= 0) queue.splice(idx, 1);
      },
      now: () => now,
    },
    advance: (ms) => {
      now += ms;
    },
    tick: () => {
      const next = queue.shift();
      if (next) next.cb(now);
    },
    pendingCount: () => queue.length,
  };
}

describe("blendViewport", () => {
  it("returns the start at p=0", () => {
    expect(blendViewport(VIEWPORT_START, VIEWPORT_END, 0)).toEqual(VIEWPORT_START);
  });
  it("returns the end at p=1", () => {
    expect(blendViewport(VIEWPORT_START, VIEWPORT_END, 1)).toEqual(VIEWPORT_END);
  });
  it("linearly interpolates at p=0.5", () => {
    const mid = blendViewport(VIEWPORT_START, VIEWPORT_END, 0.5);
    expect(mid.center[0]).toBeCloseTo(-1.125, 6);
    expect(mid.center[1]).toBeCloseTo(50.875, 6);
    expect(mid.zoom).toBeCloseTo(12, 6);
    expect(mid.bearing).toBe(0);
  });
});

describe("runTimeRangeTween — forward", () => {
  it("at p=f the slider is at start + f·(end−start) and viewport is the linear blend", () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(1000);
    runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    // Frame 0 (t=0): p=0 → slider at t_start, viewport at start.
    tick();
    expect(frames[0]?.epoch).toBe(EPOCH_START);
    expect(frames[0]?.viewport).toEqual(VIEWPORT_START);

    // Frame 1 at t=500 ms: p=0.5
    advance(500);
    tick();
    expect(frames[1]?.epoch).toBeCloseTo((EPOCH_START + EPOCH_END) / 2, 0);
    expect(frames[1]?.viewport.zoom).toBeCloseTo(12, 6);
  });

  it("completes naturally at p=1: slider at t_end, viewport at viewport_end", async () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(1000);
    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick(); // frame 0
    advance(1000);
    tick(); // frame at exactly t=durationMs → completion
    const result = await handle.done;
    expect(result.completed).toBe(true);
    expect(result.lastEpoch).toBe(EPOCH_END);
    expect(result.lastViewport).toEqual(VIEWPORT_END);
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame?.epoch).toBe(EPOCH_END);
    expect(lastFrame?.viewport).toEqual(VIEWPORT_END);
  });

  it("writes setCurrentTime BEFORE flyToViewport on each frame (lock-step)", () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(1000);
    runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick();
    advance(250);
    tick();
    advance(250);
    tick();
    for (const frame of frames) {
      expect(frame.order).toBe("currentTime-first");
    }
  });
});

describe("runTimeRangeTween — reverse", () => {
  it("at p=f the slider is at t_end − f·(t_end−t_start)", async () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(1000);
    runTimeRangeTween({
      targetScene: scene,
      direction: "reverse",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick(); // frame 0 at p=0 (linear) → reverse maps to t_end
    expect(frames[0]?.epoch).toBe(EPOCH_END);
    expect(frames[0]?.viewport).toEqual(VIEWPORT_END);

    // Midway: linear=0.5 → reverse maps to (t_end + t_start) / 2
    advance(500);
    tick();
    expect(frames[1]?.epoch).toBeCloseTo((EPOCH_START + EPOCH_END) / 2, 0);

    // Complete
    advance(500);
    tick();
    const lastFrame = frames[frames.length - 1];
    expect(lastFrame?.epoch).toBe(EPOCH_START);
    expect(lastFrame?.viewport).toEqual(VIEWPORT_START);
  });
});

describe("runTimeRangeTween — symmetry", () => {
  it("forward at f produces the same world state as reverse at 1−f", () => {
    function captureAt(direction: "forward" | "reverse", advanceMs: number) {
      const { scheduler, advance, tick } = makeScheduler();
      const { ports, frames } = makePorts();
      const scene = makeScene(1000);
      runTimeRangeTween({
        targetScene: scene,
        direction,
        durationMs: 1000,
        ports,
        scheduler,
      });
      tick();
      advance(advanceMs);
      tick();
      return frames[1];
    }
    // forward at 250 ms → linear=0.25
    const fwd = captureAt("forward", 250);
    // reverse at 750 ms → linear=0.75, p_time = 0.25
    const rev = captureAt("reverse", 750);
    expect(rev?.epoch).toBeCloseTo(fwd?.epoch ?? NaN, 0);
    expect(rev?.viewport.center[0]).toBeCloseTo(
      fwd?.viewport.center[0] ?? NaN,
      6,
    );
    expect(rev?.viewport.zoom).toBeCloseTo(fwd?.viewport.zoom ?? NaN, 6);
  });
});

describe("runTimeRangeTween — abort", () => {
  it("cancel() stops further frames and resolves with completed:false", async () => {
    const { scheduler, advance, tick, pendingCount } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(1000);
    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick(); // frame 0
    advance(300);
    tick(); // frame at p=0.3
    const framesBeforeAbort = frames.length;
    handle.cancel();
    // After cancel: no new frames should fire even if scheduler ticks.
    advance(300);
    tick();
    expect(frames.length).toBe(framesBeforeAbort);
    expect(pendingCount()).toBe(0);
    const result = await handle.done;
    expect(result.completed).toBe(false);
    // Last written frame is the engine's source of truth.
    expect(result.lastEpoch).toBeCloseTo(
      EPOCH_START + 0.3 * (EPOCH_END - EPOCH_START),
      0,
    );
  });

  it("cancel() is idempotent — calling twice does not double-resolve", async () => {
    const { scheduler, tick } = makeScheduler();
    const { ports } = makePorts();
    const scene = makeScene(1000);
    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick();
    handle.cancel();
    handle.cancel();
    const result = await handle.done;
    expect(result.completed).toBe(false);
  });

  it("after natural completion, cancel() is a no-op (no rewrite)", async () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports } = makePorts();
    const scene = makeScene(1000);
    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick();
    advance(1000);
    tick();
    const result = await handle.done;
    expect(result.completed).toBe(true);
    handle.cancel(); // no-op
  });
});

describe("runTimeRangeTween — degenerate inputs", () => {
  it("durationMs=0 snaps to endpoint and resolves immediately", async () => {
    const { scheduler } = makeScheduler();
    const { ports, frames } = makePorts();
    const scene = makeScene(0);
    const handle = runTimeRangeTween({
      targetScene: scene,
      direction: "forward",
      durationMs: 0,
      ports,
      scheduler,
    });
    const result = await handle.done;
    expect(result.completed).toBe(true);
    expect(frames.length).toBe(1);
    expect(frames[0]?.epoch).toBe(EPOCH_END);
    expect(frames[0]?.viewport).toEqual(VIEWPORT_END);
  });

  it("zero-length range (t_end === t_start) viewport tweens; slider stays put", async () => {
    const { scheduler, advance, tick } = makeScheduler();
    const { ports, frames } = makePorts();
    const sameMomentScene: TimeRangeSceneFeature = {
      ...makeScene(1000),
      properties: {
        ...makeScene(1000).properties,
        time_range: { start: T_START, end: T_START },
      },
    } as TimeRangeSceneFeature;
    const handle = runTimeRangeTween({
      targetScene: sameMomentScene,
      direction: "forward",
      durationMs: 1000,
      ports,
      scheduler,
    });
    tick();
    advance(500);
    tick();
    advance(500);
    tick();
    const result = await handle.done;
    expect(result.completed).toBe(true);
    // Every frame's slider sits at EPOCH_START (no movement).
    for (const f of frames) {
      expect(f.epoch).toBe(EPOCH_START);
    }
    // But the viewport progressed.
    expect(frames[0]?.viewport).toEqual(VIEWPORT_START);
    expect(frames[frames.length - 1]?.viewport).toEqual(VIEWPORT_END);
  });
});
