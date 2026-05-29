/**
 * In-memory temporal-variant fixtures for the tolerant playhead-import feature
 * (spec 267). The two on-disk JSON fixtures shipped by spec-261
 * (`shared/schemas/fixtures/system-state/cross-field/temporal-{current-time-out-of-window,bad-window}.json`)
 * cover the after-end clamp and the incoherent-window hard-fail. This file adds
 * the cases those two do NOT cover: before-start, the two boundary cases, a
 * single-instant window, in-range, and absent `current_time`.
 *
 * Each builder returns a fully-typed `TemporalVariant` so the unit tests need no
 * casts. The coherent window used throughout is [WINDOW_START, WINDOW_END].
 */
import type { TemporalVariant } from '../../types.js';

export const WINDOW_START = '2024-01-01T00:00:00Z';
export const WINDOW_END = '2024-01-07T00:00:00Z';

/** A coherent-window temporal variant with an optional `current_time` override. */
function temporal(extra: Partial<TemporalVariant> = {}): TemporalVariant {
  return {
    kind: 'SYSTEM',
    state_type: 'temporal',
    start_time: WINDOW_START,
    end_time: WINDOW_END,
    ...extra,
  };
}

/** current_time strictly BEFORE start_time → recoverable, clamp to start. */
export const beforeStart: TemporalVariant = temporal({
  current_time: '2023-12-20T00:00:00Z',
});

/** current_time strictly AFTER end_time → recoverable, clamp to end. */
export const afterEnd: TemporalVariant = temporal({
  current_time: '2024-02-01T00:00:00Z',
});

/** current_time exactly EQUAL to start_time → in-range, no clamp. */
export const onStartBoundary: TemporalVariant = temporal({
  current_time: WINDOW_START,
});

/** current_time exactly EQUAL to end_time → in-range, no clamp. */
export const onEndBoundary: TemporalVariant = temporal({
  current_time: WINDOW_END,
});

/** current_time comfortably inside the window → in-range, no clamp. */
export const inRange: TemporalVariant = temporal({
  current_time: '2024-01-03T14:30:00Z',
});

/** No current_time at all → nothing to validate or clamp. */
export const absent: TemporalVariant = temporal();

/**
 * Single-instant window (start_time == end_time). Any out-of-range current_time
 * clamps to that single instant; this one is after it → clamp to end (== start).
 */
export const SINGLE_INSTANT = '2024-03-15T12:00:00Z';
export const singleInstantWindowAfter: TemporalVariant = {
  kind: 'SYSTEM',
  state_type: 'temporal',
  start_time: SINGLE_INSTANT,
  end_time: SINGLE_INSTANT,
  current_time: '2024-03-16T00:00:00Z',
};

/** Incoherent window (start_time > end_time) → fatal, never recoverable. */
export const incoherentWindow: TemporalVariant = {
  kind: 'SYSTEM',
  state_type: 'temporal',
  start_time: WINDOW_END,
  end_time: WINDOW_START,
};

/**
 * Incoherent window AND an out-of-window current_time on the same feature →
 * the incoherent-window failure must take precedence (FR-005); the clamp path
 * is never reached.
 */
export const incoherentWindowWithOrphanPlayhead: TemporalVariant = {
  kind: 'SYSTEM',
  state_type: 'temporal',
  start_time: WINDOW_END,
  end_time: WINDOW_START,
  current_time: '2024-02-01T00:00:00Z',
};

/** Unparseable timestamps → fatal. */
export const unparseableStart: TemporalVariant = temporal({ start_time: 'not-a-date' });
export const unparseableEnd: TemporalVariant = temporal({ end_time: 'not-a-date' });
export const unparseableCurrent: TemporalVariant = temporal({ current_time: 'not-a-date' });
