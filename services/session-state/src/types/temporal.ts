/**
 * Temporal state types for session state management.
 * Feature: 024-document-session-state
 */

/**
 * A point in time with dual representations (FR-032, FR-033).
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
 * A temporal interval with inclusive start and end.
 */
export interface TimeRange {
  start: TimeInstant;
  end: TimeInstant;
}

/**
 * Constraints on the visible time window.
 */
export interface TimeFilter {
  start: TimeInstant | null;
  end: TimeInstant | null;
}

/**
 * Units for time step navigation.
 */
export type TimeUnit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day';

/**
 * Step size for discrete time navigation (FR-008).
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
 */
export interface TemporalSlice {
  /** Current playback/display time (FR-005) */
  currentTime: TimeInstant | null;
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
 */
export interface TemporalActions {
  setCurrentTime: (time: TimeInstant | null) => void;
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
