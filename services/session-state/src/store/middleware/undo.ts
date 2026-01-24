/**
 * Undo/redo middleware using Zundo.
 * Feature: 024-document-session-state
 *
 * Provides undo/redo with 50-step history (SC-005).
 * Ephemeral state is excluded from history (FR-023).
 */

import { temporal } from 'zundo';
import type { StateCreator } from 'zustand';
import type { SessionStore, SessionState } from '../../types/index.js';

/**
 * Maximum undo steps (SC-005).
 */
export const MAX_UNDO_STEPS = 50;

/**
 * Extract only persistent state for undo history.
 * Excludes ephemeral fields: playbackState, dirty (FR-023).
 */
export function partializeState(state: SessionStore): Partial<SessionState> {
  return {
    temporal: {
      currentTime: state.currentTime,
      timeRange: state.timeRange,
      timeFilter: state.timeFilter,
      stepSize: state.stepSize,
      playbackRate: state.playbackRate,
      playbackState: 'stopped', // Reset ephemeral
      displayMode: state.displayMode,
    },
    spatial: {
      viewport: state.viewport,
      rotation: state.rotation,
    },
    features: {
      featureCollectionUri: state.featureCollectionUri,
      selection: state.selection,
      hiddenFeatureIds: state.hiddenFeatureIds,
    },
    document: {
      dirty: false, // Reset ephemeral
      savePath: state.savePath,
    },
  };
}

/**
 * Compare states for equality.
 * Used to avoid recording duplicate states.
 */
export function equalityFn(
  pastState: Partial<SessionState>,
  currentState: Partial<SessionState>
): boolean {
  // Simple JSON comparison for now
  return JSON.stringify(pastState) === JSON.stringify(currentState);
}

/**
 * Create undo middleware wrapper.
 */
export function createUndoMiddleware() {
  return temporal<SessionStore>({
    limit: MAX_UNDO_STEPS,
    partialize: partializeState,
    equality: equalityFn,
    // Throttle rapid changes
    handleSet: (handleSet) =>
      // @ts-expect-error - Zundo types are complex
      (...args) => {
        handleSet(...args);
      },
  });
}

/**
 * Undo/redo actions type for store integration.
 */
export interface UndoActions {
  undo: (steps?: number) => void;
  redo: (steps?: number) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}
