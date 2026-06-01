import { TimeRangeSceneFeature, Viewport } from '../storyboard/types';

/** Linear blend of two viewports. Bearing is always 0 (v1 reserved).
 *
 *  `Viewport.center` is typed `number[]` by the generator (LinkML emits
 *  unbounded arrays even with `minimum_cardinality/maximum_cardinality: 2`).
 *  The Storyboard CRUD module guarantees a length-2 array at write time, so
 *  reading positions 0 and 1 is safe — we narrow with `?? 0` to satisfy
 *  strict-mode TS without a non-null assertion. */
export declare function blendViewport(start: Viewport, end: Viewport, p: number): Viewport;
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
export declare function runTimeRangeTween(input: RunTimeRangeTweenInput): TimeRangeTweenHandle;
//# sourceMappingURL=timeRangeTween.d.ts.map