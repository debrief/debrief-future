/**
 * Session state store factory.
 * Feature: 024-document-session-state
 */

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import type { SessionStore } from '../types/index.js';
import {
  DEFAULT_TEMPORAL_SLICE,
  DEFAULT_SPATIAL_SLICE,
  DEFAULT_FEATURES_SLICE,
  DEFAULT_DOCUMENT_SLICE,
  DEFAULT_RESULTS_SLICE,
  DEFAULT_BROWSER_FILTER_SLICE,
  DEFAULT_PLOT_SLICE,
} from '../types/index.js';
import { createTemporalSlice } from './slices/temporal.js';
import { createSpatialSlice } from './slices/spatial.js';
import { createFeaturesSlice } from './slices/features.js';
import { createDocumentSlice } from './slices/document.js';
import { createResultsSlice } from './slices/results.js';
import { createBrowserFilterSlice } from './slices/browser-filter.js';
import { createPlotSlice } from './slices/plot.js';
import { MAX_UNDO_STEPS } from './middleware/undo.js';
import { DIRTY_TRIGGER_FIELDS } from './middleware/dirty.js';

/**
 * Fields tracked in undo/redo snapshots (073-undo-redo-split).
 * Only UI-state fields — data changes are tracked by the Log Service.
 */
const UNDO_TRACKED_FIELDS = new Set([
  'currentTime',
  'timeRange',
  'timeFilter',
  'stepSize',
  'playbackRate',
  'displayMode',
  'viewport',
  'rotation',
  'selection',
  'hiddenFeatureIds',
]);

/**
 * State snapshot for undo/redo.
 * UI-only fields — data changes tracked by Log Service (073-undo-redo-split).
 */
interface StateSnapshot {
  currentTime: SessionStore['currentTime'];
  timeRange: SessionStore['timeRange'];
  timeFilter: SessionStore['timeFilter'];
  stepSize: SessionStore['stepSize'];
  playbackRate: SessionStore['playbackRate'];
  displayMode: SessionStore['displayMode'];
  viewport: SessionStore['viewport'];
  rotation: SessionStore['rotation'];
  selection: SessionStore['selection'];
  hiddenFeatureIds: SessionStore['hiddenFeatureIds'];
}

/**
 * Undo/redo history.
 */
interface UndoHistory {
  past: StateSnapshot[];
  future: StateSnapshot[];
}

/**
 * Extended store type with undo/redo actions.
 */
export interface SessionStoreWithUndo extends SessionStore {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
}

/**
 * Create a state snapshot for undo/redo.
 */
function createSnapshot(state: SessionStore): StateSnapshot {
  return {
    currentTime: state.currentTime,
    timeRange: state.timeRange,
    timeFilter: state.timeFilter,
    stepSize: state.stepSize,
    playbackRate: state.playbackRate,
    displayMode: state.displayMode,
    viewport: state.viewport,
    rotation: state.rotation,
    selection: state.selection,
    hiddenFeatureIds: state.hiddenFeatureIds,
  };
}

/**
 * Apply a snapshot to the store.
 */
function applySnapshot(set: (partial: Partial<SessionStoreWithUndo>) => void, snapshot: StateSnapshot): void {
  set({
    currentTime: snapshot.currentTime,
    timeRange: snapshot.timeRange,
    timeFilter: snapshot.timeFilter,
    stepSize: snapshot.stepSize,
    playbackRate: snapshot.playbackRate,
    displayMode: snapshot.displayMode,
    viewport: snapshot.viewport,
    rotation: snapshot.rotation,
    selection: snapshot.selection,
    hiddenFeatureIds: snapshot.hiddenFeatureIds,
  });
}

/**
 * Compare two snapshots for equality.
 */
function snapshotsEqual(a: StateSnapshot, b: StateSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Create a session state store instance.
 *
 * The store combines all four state slices:
 * - Temporal: time navigation and playback
 * - Spatial: map viewport and orientation
 * - Features: selection and visibility
 * - Document: dirty tracking and save path
 *
 * Uses Zustand with subscribeWithSelector middleware for fine-grained
 * subscriptions (FR-003, FR-004, SC-006).
 *
 * Includes undo/redo with 50-step history (SC-005).
 */
export function createSessionStore() {
  // Undo/redo history is stored outside the Zustand state
  // to avoid it being part of the subscriptions
  const history: UndoHistory = {
    past: [],
    future: [],
  };

  // Flag to prevent recording during undo/redo
  let isUndoRedo = false;

  const store = createStore<SessionStoreWithUndo>()(
    subscribeWithSelector((set, get, api) => {
      // Wrap set to track history and dirty state
      const trackedSet: typeof set = (partial, replace) => {
        const prev = get();

        // Determine which fields are being changed
        const changedFields = typeof partial === 'function'
          ? [] // Can't determine for function updates
          : Object.keys(partial as Record<string, unknown>);

        // Check if any undo-tracked field is being changed
        const hasUndoableChange = changedFields.length === 0 ||
          changedFields.some((field) => UNDO_TRACKED_FIELDS.has(field));

        // Record history before change (unless we're undoing/redoing or only non-tracked fields)
        if (!isUndoRedo && hasUndoableChange) {
          const snapshot = createSnapshot(prev);

          // Only push if different from last
          if (
            history.past.length === 0 ||
            !snapshotsEqual(history.past[history.past.length - 1]!, snapshot)
          ) {
            history.past.push(snapshot);

            // Enforce history limit
            if (history.past.length > MAX_UNDO_STEPS) {
              history.past.shift();
            }

            // Clear future on new change
            history.future = [];
          }
        }

        // Apply the change
        if (replace === true) {
          set(partial as SessionStoreWithUndo, true);
        } else {
          set(partial);
        }

        // Check if dirty should be set (for non-undo/redo changes)
        if (!isUndoRedo) {
          const next = get();
          const hasChange = Array.from(DIRTY_TRIGGER_FIELDS).some((field) => {
            const current = next[field as keyof SessionStore];
            const previous = prev[field as keyof SessionStore];
            return current !== previous;
          });

          if (hasChange && !next.dirty) {
            set({ dirty: true });
          }
        }
      };

      return {
        // Temporal slice
        ...createTemporalSlice(trackedSet, get, api),

        // Spatial slice
        ...createSpatialSlice(trackedSet, get, api),

        // Features slice
        ...createFeaturesSlice(trackedSet, get, api),

        // Document slice (uses regular set to avoid dirty tracking loop)
        ...createDocumentSlice(set, get, api),

        // Results slice (uses regular set — result layers are data, not UI state)
        ...createResultsSlice(set, get, api),

        // Browser filter slice (uses regular set — ephemeral filter state, not undoable)
        ...createBrowserFilterSlice(set, get, api),

        // Plot slice (uses regular set — derived host-capability signal, not undoable)
        ...createPlotSlice(set, get, api),

        // Global reset action
        reset: () => {
          history.past = [];
          history.future = [];
          set({
            ...DEFAULT_TEMPORAL_SLICE,
            ...DEFAULT_SPATIAL_SLICE,
            ...DEFAULT_FEATURES_SLICE,
            ...DEFAULT_DOCUMENT_SLICE,
            ...DEFAULT_RESULTS_SLICE,
            ...DEFAULT_BROWSER_FILTER_SLICE,
            ...DEFAULT_PLOT_SLICE,
          });
        },

        // Undo action
        undo: () => {
          if (history.past.length === 0) return;

          isUndoRedo = true;
          try {
            const current = createSnapshot(get());
            const previous = history.past.pop()!;

            history.future.push(current);
            applySnapshot(set, previous);

            // Mark dirty after undo (state changed from saved)
            set({ dirty: true });
          } finally {
            isUndoRedo = false;
          }
        },

        // Redo action
        redo: () => {
          if (history.future.length === 0) return;

          isUndoRedo = true;
          try {
            const current = createSnapshot(get());
            const next = history.future.pop()!;

            history.past.push(current);
            applySnapshot(set, next);

            // Mark dirty after redo (state changed from saved)
            set({ dirty: true });
          } finally {
            isUndoRedo = false;
          }
        },

        // Check if undo is available
        canUndo: () => history.past.length > 0,

        // Check if redo is available
        canRedo: () => history.future.length > 0,

        // Clear history
        clearHistory: () => {
          history.past = [];
          history.future = [];
        },
      };
    })
  );

  return store;
}

/**
 * Type for the created store (with all Zustand methods).
 */
export type SessionStoreApi = ReturnType<typeof createSessionStore>;

// Singleton store instance for typical use cases
let _sessionStore: SessionStoreApi | null = null;

/**
 * Get or create the singleton session store instance.
 *
 * For most use cases, a single store is sufficient.
 * Use createSessionStore() directly when you need
 * isolated stores (e.g., for testing).
 */
export function getSessionStore(): SessionStoreApi {
  if (!_sessionStore) {
    _sessionStore = createSessionStore();
  }
  return _sessionStore;
}

/**
 * Reset the singleton store to a fresh instance.
 * Useful for testing or when reinitializing state.
 */
export function resetSessionStore(): SessionStoreApi {
  _sessionStore = createSessionStore();
  return _sessionStore;
}

// Re-export slice creators for testing
export { createTemporalSlice } from './slices/temporal.js';
export { createSpatialSlice } from './slices/spatial.js';
export { createFeaturesSlice } from './slices/features.js';
export { createDocumentSlice } from './slices/document.js';
export { createResultsSlice } from './slices/results.js';
export { createBrowserFilterSlice } from './slices/browser-filter.js';
export { createPlotSlice, selectIsReadOnly, selectReadOnlyReason } from './slices/plot.js';
