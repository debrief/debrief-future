/**
 * Temporal state slice implementation.
 * Feature: 024-document-session-state
 */

import type { StateCreator } from 'zustand';
import type {
  TemporalSlice,
  TemporalActions,
  TimeInstant,
  TimeRange,
  TimeFilter,
  TimeStep,
  PlaybackState,
  DisplayMode,
  SessionStore,
} from '../../types/index.js';
import {
  DEFAULT_TEMPORAL_SLICE,
  validatePlaybackRate,
  createTimeInstant,
} from '../../types/index.js';

export type TemporalSliceWithActions = TemporalSlice & TemporalActions;

/**
 * Create the temporal slice for the session store.
 */
export const createTemporalSlice: StateCreator<
  SessionStore,
  [],
  [],
  TemporalSliceWithActions
> = (set, get) => ({
  ...DEFAULT_TEMPORAL_SLICE,

  setCurrentTime: (time: TimeInstant | null) => {
    set({ currentTime: time });
  },

  setTimeRange: (range: TimeRange | null) => {
    set({ timeRange: range });
  },

  setTimeFilter: (filter: TimeFilter | null) => {
    set({ timeFilter: filter });
  },

  setStepSize: (step: TimeStep) => {
    set({ stepSize: step });
  },

  setPlaybackRate: (rate: number) => {
    if (!validatePlaybackRate(rate)) {
      throw new Error(`Playback rate must be between 0.1 and 100.0, got ${rate}`);
    }
    set({ playbackRate: rate });
  },

  setPlaybackState: (state: PlaybackState) => {
    set({ playbackState: state });
  },

  setDisplayMode: (mode: DisplayMode) => {
    set({ displayMode: mode });
  },

  stepForward: () => {
    const { currentTime, stepSize, timeRange } = get();
    if (!currentTime) return;

    const stepMs = getStepMilliseconds(stepSize);
    const newEpoch = currentTime.epoch + stepMs;

    // Clamp to time range if set
    const maxEpoch = timeRange?.end.epoch ?? Infinity;
    const clampedEpoch = Math.min(newEpoch, maxEpoch);

    set({ currentTime: createTimeInstant(clampedEpoch) });
  },

  stepBackward: () => {
    const { currentTime, stepSize, timeRange } = get();
    if (!currentTime) return;

    const stepMs = getStepMilliseconds(stepSize);
    const newEpoch = currentTime.epoch - stepMs;

    // Clamp to time range if set
    const minEpoch = timeRange?.start.epoch ?? -Infinity;
    const clampedEpoch = Math.max(newEpoch, minEpoch);

    set({ currentTime: createTimeInstant(clampedEpoch) });
  },
});

/**
 * Convert TimeStep to milliseconds.
 */
function getStepMilliseconds(step: TimeStep): number {
  const multipliers: Record<string, number> = {
    millisecond: 1,
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };
  return step.value * (multipliers[step.unit] ?? 1);
}
