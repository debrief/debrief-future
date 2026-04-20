/**
 * Temporal state types for session state management.
 * Feature: 024-document-session-state
 * Updated: 132-three-view-sync (epoch refactor — Review Decision 5C)
 */

/**
 * A point in time with dual representations (FR-032, FR-033).
 * Retained as a utility type for MCP tool I/O and persistence boundaries.
 * No longer used in TemporalSlice, TimeRange, or TimeFilter interfaces.
 *
 * Schema equivalent: @debrief/schemas#TimeInstant (identical shape).
 * Not imported directly because @debrief/schemas is not in this package's
 * dependencies and the shape is identical — no migration value.
 */
export interface TimeInstant {
  /** Milliseconds since Unix epoch */
  epoch: number;
  /** ISO 8601 UTC format string */
  iso: string;
}

/**
 * Create a TimeInstant from epoch milliseconds.
 */
export function createTimeInstant(epoch: number): TimeInstant {
  return {
    epoch,
    iso: new Date(epoch).toISOString(),
  };
}

/**
 * Create a TimeInstant from ISO string.
 */
export function createTimeInstantFromISO(iso: string): TimeInstant {
  return {
    epoch: new Date(iso).getTime(),
    iso,
  };
}

/**
 * Convert epoch milliseconds to ISO 8601 string.
 */
export function epochToISO(epoch: number): string {
  return new Date(epoch).toISOString();
}

/**
 * Convert ISO 8601 string to epoch milliseconds.
 * Returns NaN for invalid input.
 */
export function isoToEpoch(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * A temporal interval with inclusive start and end.
 * Uses plain epoch milliseconds (Review Decision 5C).
 *
 * Schema equivalent: @debrief/schemas#TimeRange
 * Not migrated: generated TimeRange uses { start: TimeInstant, end: TimeInstant }
 * while this type stores plain epoch milliseconds (Review Decision 5C). The
 * epoch-only representation was chosen to avoid redundancy in hot-path
 * state updates.
 */
export interface TimeRange {
  start: number;
  end: number;
}

/**
 * Constraints on the visible time window.
 *
 * Canonical source (feature 203): @debrief/schemas#TimeFilter, which emits
 * `{ start?: number; end?: number }` (optional epoch milliseconds; missing
 * means unbounded). Runtime code uses `value != null` checks, which accept
 * both `undefined` and any legacy `null` values (FR-021).
 */
import type { TimeFilter } from '@debrief/schemas';
export type { TimeFilter };

/**
 * Units for time step navigation.
 */
export type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';

/**
 * Step size for discrete time navigation (FR-008).
 *
 * Schema equivalent: @debrief/schemas#TimeStep
 * Not migrated: generated TimeStep uses { value: number, unit: string } while
 * this type constrains unit to the TimeUnit literal union for type safety.
 */
export interface TimeStep {
  value: number;
  unit: TimeUnit;
}

/**
 * Current state of time playback (FR-010).
 * Ephemeral - not persisted or tracked in undo history.
 */
export type PlaybackState = 'stopped' | 'playing' | 'paused';

/**
 * Track visualization display mode (FR-011).
 */
export type DisplayMode = 'normal' | 'snailTrail';

/**
 * Temporal state slice (FR-005 through FR-011).
 * Uses plain epoch milliseconds for currentTime (Review Decision 5C).
 *
 * Schema equivalent: @debrief/schemas#TemporalSlice
 * Not migrated: generated TemporalSlice uses TimeInstant objects for
 * currentTime/timeRange/timeFilter, and string literals for playbackState/
 * displayMode. This type uses epoch numbers (Review Decision 5C) and
 * discriminated union literals for type safety.
 */
export interface TemporalSlice {
  /** Current playback/display time as epoch milliseconds (FR-005) */
  currentTime: number | null;
  /** Full temporal extent of loaded data (FR-006) */
  timeRange: TimeRange | null;
  /** Optional visible time window constraint (FR-007) */
  timeFilter: TimeFilter | null;
  /** Step size for discrete navigation (FR-008) */
  stepSize: TimeStep;
  /** Playback speed multiplier 0.1-100x (FR-009) */
  playbackRate: number;
  /** Current playback state - ephemeral (FR-010) */
  playbackState: PlaybackState;
  /** Track visualization mode (FR-011) */
  displayMode: DisplayMode;
}

/**
 * Default temporal state values.
 */
export const DEFAULT_TEMPORAL_SLICE: TemporalSlice = {
  currentTime: null,
  timeRange: null,
  timeFilter: null,
  stepSize: { value: 1, unit: 'minute' },
  playbackRate: 1.0,
  playbackState: 'stopped',
  displayMode: 'normal',
};

/**
 * Temporal slice actions for state updates.
 * Uses plain epoch milliseconds (Review Decision 5C).
 */
export interface TemporalActions {
  setCurrentTime: (time: number | null) => void;
  setTimeRange: (range: TimeRange | null) => void;
  setTimeFilter: (filter: TimeFilter | null) => void;
  setStepSize: (step: TimeStep) => void;
  setPlaybackRate: (rate: number) => void;
  setPlaybackState: (state: PlaybackState) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

/**
 * Validate playback rate is within allowed range (FR-009).
 */
export function validatePlaybackRate(rate: number): boolean {
  return rate >= 0.1 && rate <= 100.0;
}

// ---------------------------------------------------------------------------
// TimeRange Converters (#172 — proactive per review decision)
// ---------------------------------------------------------------------------

/**
 * Create a TimeRange from ISO 8601 strings.
 * Returns NaN values for invalid input strings.
 */
export function timeRangeFromISO(startISO: string, endISO: string): TimeRange {
  return {
    start: new Date(startISO).getTime(),
    end: new Date(endISO).getTime(),
  };
}

/**
 * Convert a TimeRange to ISO 8601 strings.
 */
export function timeRangeToISO(range: TimeRange): { start: string; end: string } {
  return {
    start: new Date(range.start).toISOString(),
    end: new Date(range.end).toISOString(),
  };
}

/**
 * Create a TimeRange from min/max epoch millisecond values.
 * Automatically orders start ≤ end.
 */
export function timeRangeFromMinMax(a: number, b: number): TimeRange {
  return {
    start: Math.min(a, b),
    end: Math.max(a, b),
  };
}
