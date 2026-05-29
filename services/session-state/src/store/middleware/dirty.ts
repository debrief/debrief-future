/**
 * Dirty tracking middleware.
 * Feature: 024-document-session-state
 * Updated: 261-session-state-systemstate (FR-019/FR-021).
 *
 * Tracks unsaved changes. Ephemeral changes don't trigger the dirty flag.
 *
 * Feature 261 dirty-tracking contract (FR-019/FR-021): **view-state changes are
 * exploration** — pan, zoom, rotate, scrub the playhead, change the time
 * window/filter/display-mode/step/rate, select, or hide/reveal a feature. They
 * update the in-memory store but MUST NOT raise the dirty flag (looking around a
 * plot is free, and an explicit save still persists the current view — FR-020).
 * Only substantive content edits (adding/deleting/modifying geographic /
 * annotation / storyboard features; tool results) set the dirty flag, and those
 * go through the Log Service `markDirty()` directly (073-undo-redo-split), not
 * this subscriber. Hence the trigger set is now empty.
 */

import type { SessionStore } from '../../types/index.js';
import { isEphemeralField } from './partialize.js';

/**
 * Fields whose change should mark the document dirty *via this subscriber*.
 *
 * Empty as of feature 261 (FR-019): every field that used to live here
 * (currentTime, timeRange, timeFilter, stepSize, playbackRate, displayMode,
 * viewport, rotation, selection, hiddenFeatureIds) is now classified as
 * view-state exploration and must NOT mark the plot dirty. Content-edit dirty
 * tracking is handled by the Log Service `markDirty()`.
 */
export const DIRTY_TRIGGER_FIELDS = new Set<string>([]);

/**
 * Check if a field change should trigger dirty flag.
 */
export function shouldTriggerDirty(field: string): boolean {
  if (isEphemeralField(field)) {
    return false;
  }
  return DIRTY_TRIGGER_FIELDS.has(field);
}

/**
 * Create a subscriber that automatically marks dirty on persistent changes.
 * Call this after creating the store to enable auto-dirty tracking.
 */
export function enableDirtyTracking(
  store: {
    getState: () => SessionStore;
    subscribe: (callback: (state: SessionStore, prevState: SessionStore) => void) => () => void;
  }
): () => void {
  const persistentFields = Array.from(DIRTY_TRIGGER_FIELDS);

  return store.subscribe((state, prevState) => {
    // Check if any persistent field changed
    const hasChange = persistentFields.some((field) => {
      const current = state[field as keyof SessionStore];
      const previous = prevState[field as keyof SessionStore];
      return current !== previous;
    });

    if (hasChange && !state.dirty) {
      // Use setTimeout to avoid triggering during the current update
      setTimeout(() => {
        store.getState().markDirty();
      }, 0);
    }
  });
}
