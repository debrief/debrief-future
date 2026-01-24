/**
 * Undo/redo constants and utilities.
 * Feature: 024-document-session-state
 *
 * Note: Undo/redo is implemented directly in the store using a custom
 * history stack pattern. This module exports shared constants.
 */

/**
 * Maximum undo steps (SC-005).
 */
export const MAX_UNDO_STEPS = 50;

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
