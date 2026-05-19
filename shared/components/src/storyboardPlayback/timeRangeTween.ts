/**
 * TimeRangeTween — RAF-driven primitive that drives both the map viewport
 * and the time slider in lock-step for a time-range Scene (#263).
 *
 * Per the playback-engine contract:
 *   - On each frame compute `p` ∈ [0, 1] from elapsed wall-clock time over
 *     the Scene's `transition_duration_ms`.
 *   - Forward: `p = elapsed / duration`. Reverse: `p = 1 - elapsed / duration`.
 *   - Apply `setCurrentTime(lerp(t_start, t_end, p))` FIRST, then
 *     `flyToViewport(blendedViewport, 0)` — feature-visibility windows
 *     resolve before the next redraw.
 *   - On natural completion snap to the endpoint (forward → p=1; reverse → p=0).
 *   - On abort stop writing frames; leave the world at the last written
 *     frame; the engine emits a fresh snapshot reflecting it.
 *
 * Pure, host-agnostic, port-driven. No DOM access, no React, no VS Code
 * imports — the primitive is the same in every host (Article IV).
 */

import type { TimeRangeSceneFeature, Viewport } from "../storyboard/types";

/** Cheap linear blend on a scalar. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linear blend of two viewports. Bearing is always 0 (v1 reserved).
 *
 *  `Viewport.center` is typed `number[]` by the generator (LinkML emits
 *  unbounded arrays even with `minimum_cardinality/maximum_cardinality: 2`).
 *  The Storyboard CRUD module guarantees a length-2 array at write time, so
 *  reading positions 0 and 1 is safe — we narrow with `?? 0` to satisfy
 *  strict-mode TS without a non-null assertion. */
export function blendViewport(
  start: Viewport,
  end: Viewport,
  p: number,
): Viewport {
  const s0 = start.center[0] ?? 0;
  const s1 = start.center[1] ?? 0;
  const e0 = end.center[0] ?? 0;
  const e1 = end.center[1] ?? 0;
  return {
    center: [lerp(s0, e0, p), lerp(s1, e1, p)],
    zoom: lerp(start.zoom, end.zoom, p),
    bearing: 0,
  };
}

/** Direction of playback through the Scene. */
export type TimeRangeTweenDirection = "forward" | "reverse";

/** Ports the tween calls every frame. Both adapters (VS Code, web-shell) must
 *  honour `flyToViewport(viewport, 0)` as the documented snap path. */
export interface TimeRangeTweenPorts {
  /** Write the slider position in epoch milliseconds. Idempotent at p=0/1. */
  setCurrentTime(epochMs: number): void;
  /** Snap the map viewport. The tween only ever passes `durationMs = 0` so
   *  the per-frame call must be a direct snap (no compounding animation). */
  flyToViewport(viewport: Viewport, durationMs: 0): void;
}

/** Active handle returned by `runTimeRangeTween`. Callers `cancel()` to
 *  abort the RAF loop cleanly (no further frames written). */
export interface TimeRangeTweenHandle {
  /** Idempotent. After cancel, no further `setCurrentTime` / `flyToViewport`
   *  calls are made; the resolution promise still resolves with the last
   *  written `(epoch, viewport)` pair. */
  cancel(): void;
  /** Resolves on natural completion OR cancellation. The resolved payload
   *  carries the final written frame so the calling engine can emit a
   *  coherent snapshot (Article IV — the engine is the source of truth,
   *  never the DOM). */
  done: Promise<TimeRangeTweenResult>;
}

export interface TimeRangeTweenResult {
  /** True iff the tween completed naturally (reached p=1 forward or p=0
   *  reverse). False iff it was cancelled mid-flight. */
  completed: boolean;
  /** The last frame actually written to the ports. Lets the engine emit a
   *  coherent snapshot reflecting on-disk state. */
  lastEpoch: number;
  lastViewport: Viewport;
}

/** Schedule callback abstraction — defaults to RAF in browser hosts, falls
 *  back to setTimeout for jsdom / Node. Exposed so tests can drive the loop
 *  deterministically. */
export interface FrameScheduler {
  request(cb: (timestamp: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

interface RafCapableGlobal {
  requestAnimationFrame?: (cb: (t: number) => void) => number;
  cancelAnimationFrame?: (h: number) => void;
}

/** Default scheduler — RAF + performance.now() in browser, setTimeout in node. */
function defaultScheduler(): FrameScheduler {
  const g = globalThis as RafCapableGlobal;
  const nowFn =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? () => performance.now()
      : () => Date.now();
  if (typeof g.requestAnimationFrame === "function" &&
      typeof g.cancelAnimationFrame === "function") {
    const raf = g.requestAnimationFrame;
    const caf = g.cancelAnimationFrame;
    return {
      request: (cb) => raf(cb),
      cancel: (h) => caf(h),
      now: nowFn,
    };
  }
  // setTimeout returns ReturnType<typeof setTimeout> in node and number in
  // browsers; the scheduler interface uses `number` as an opaque handle and
  // we round-trip through the runtime's own representation via the
  // `Timeout`-typed map below.
  const timers = new Map<number, ReturnType<typeof setTimeout>>();
  let nextHandle = 1;
  return {
    request: (cb) => {
      const h = nextHandle++;
      timers.set(h, setTimeout(() => {
        timers.delete(h);
        cb(nowFn());
      }, 16));
      return h;
    },
    cancel: (h) => {
      const timer = timers.get(h);
      if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(h);
      }
    },
    now: nowFn,
  };
}

/** Inputs to `runTimeRangeTween` — kept narrow so the engine can mock the
 *  scheduler in tests and so the primitive doesn't need a host-specific
 *  config object. */
export interface RunTimeRangeTweenInput {
  /** The target Scene, already narrowed to the time-range flavour. */
  readonly targetScene: TimeRangeSceneFeature;
  /** Forward or reverse — determines whether `p` runs 0→1 or 1→0. */
  readonly direction: TimeRangeTweenDirection;
  /** Wall-clock duration of the tween in ms. The engine reads this from
   *  `targetScene.properties.transition_duration_ms ?? 500` — the primitive
   *  accepts it as an input so tests don't need to construct full Scenes. */
  readonly durationMs: number;
  /** Ports the tween writes through on each frame. */
  readonly ports: TimeRangeTweenPorts;
  /** Optional frame scheduler (defaults to RAF). Test code passes a fake. */
  readonly scheduler?: FrameScheduler;
}

/** Drive a time-range Scene from p=0→1 (forward) or p=1→0 (reverse) over
 *  `durationMs` wall-clock. Returns a handle the engine uses to abort.
 *
 *  Lock-step guarantee: every frame writes a `(currentTime, viewport)` pair
 *  derived from the same `p`. The two axes MUST NOT diverge.
 *
 *  Degenerate cases:
 *  - `durationMs <= 0` → snap to endpoint and resolve in a microtask (no
 *    RAF). Used by the engine when `transition_duration_ms === 0`.
 *  - `time_range.start === time_range.end` → the viewport still tweens but
 *    `setCurrentTime` writes the same value every frame (slider stays put).
 *    No divide-by-zero (we lerp time even when start===end, which is a
 *    no-op).
 */
export function runTimeRangeTween(
  input: RunTimeRangeTweenInput,
): TimeRangeTweenHandle {
  const scheduler = input.scheduler ?? defaultScheduler();
  const startEpoch = Date.parse(input.targetScene.properties.time_range.start);
  const endEpoch = Date.parse(input.targetScene.properties.time_range.end);
  const startViewport = input.targetScene.properties.viewport;
  const endViewport = input.targetScene.properties.viewport_end;
  const t0 = scheduler.now();
  let cancelled = false;
  let lastEpoch = input.direction === "forward" ? startEpoch : endEpoch;
  let lastViewport: Viewport =
    input.direction === "forward" ? startViewport : endViewport;
  let rafHandle: number | null = null;

  let resolveDone!: (r: TimeRangeTweenResult) => void;
  const done = new Promise<TimeRangeTweenResult>((res) => {
    resolveDone = res;
  });

  function applyFrame(p: number, completed: boolean): void {
    // Forward: p ∈ [0, 1] maps t_start → t_end.
    // Reverse: p ∈ [0, 1] maps t_end → t_start. We compute the linear
    // schedule once; the lerps below handle both directions symmetrically.
    const tFrac =
      input.direction === "forward" ? p : 1 - p;
    const epoch = lerp(startEpoch, endEpoch, tFrac);
    const viewport = blendViewport(startViewport, endViewport, tFrac);
    lastEpoch = epoch;
    lastViewport = viewport;
    // Lock-step: setCurrentTime FIRST (so feature-visibility windows
    // resolve), then snap the viewport.
    input.ports.setCurrentTime(epoch);
    input.ports.flyToViewport(viewport, 0);
    if (completed) {
      resolveDone({ completed: true, lastEpoch, lastViewport });
    }
  }

  // Zero-duration shortcut: snap to endpoint and resolve immediately.
  if (input.durationMs <= 0) {
    applyFrame(1, true);
    return {
      cancel: () => {
        // No-op after natural completion; the contract is idempotent cancel.
      },
      done,
    };
  }

  function tick(): void {
    if (cancelled) return;
    const elapsed = scheduler.now() - t0;
    const linear = Math.min(1, Math.max(0, elapsed / input.durationMs));
    if (linear >= 1) {
      applyFrame(1, true);
      rafHandle = null;
      return;
    }
    applyFrame(linear, false);
    rafHandle = scheduler.request(tick);
  }

  rafHandle = scheduler.request(tick);

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      if (rafHandle !== null) {
        scheduler.cancel(rafHandle);
        rafHandle = null;
      }
      resolveDone({ completed: false, lastEpoch, lastViewport });
    },
    done,
  };
}
