/**
 * Dirty tracking middleware.
 * Feature: 024-document-session-state
 *
 * Tracks unsaved changes (FR-020).
 * Ephemeral changes don't trigger dirty flag (FR-023).
 */

import type { SessionStore } from '../../types/index.js';
import { isEphemeralField } from './partialize.js';

/**
 * Fields that when changed should mark the document as dirty.
 */
export const DIRTY_TRIGGER_FIELDS = new Set([
  'currentTime',
  'timeRange',
  'timeFilter',
  'stepSize',
  'playbackRate',
  'displayMode',
  'viewport',
  'rotation',
  'featureCollectionUri',
  'selection',
  'hiddenFeatureIds',
]);

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
