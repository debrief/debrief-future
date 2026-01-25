/**
 * Selector middleware configuration.
 * Feature: 024-document-session-state
 *
 * Note: subscribeWithSelector is already applied in the store factory.
 * This module provides additional selector utilities.
 */

import type { SessionStore } from '../../types/index.js';

/**
 * Create a memoized selector that only recomputes when dependencies change.
 * Useful for derived state that depends on multiple store values.
 */
export function createSelector<T, R>(
  selectors: ((state: SessionStore) => T)[],
  combiner: (...args: T[]) => R
): (state: SessionStore) => R {
  let lastArgs: T[] | null = null;
  let lastResult: R | null = null;

  return (state: SessionStore): R => {
    const args = selectors.map((selector) => selector(state));

    // Check if any arguments changed
    const argsChanged =
      lastArgs === null ||
      args.length !== lastArgs.length ||
      args.some((arg, i) => arg !== lastArgs![i]);

    if (argsChanged) {
      lastArgs = args;
      lastResult = combiner(...args);
    }

    return lastResult!;
  };
}

/**
 * Create a selector that filters features by visibility.
 */
export const createVisibleFeaturesSelector = createSelector(
  [
    (state: SessionStore) => state.selection.featureIds,
    (state: SessionStore) => state.hiddenFeatureIds,
  ],
  (selectedIds, hiddenIds) => {
    const hiddenSet = new Set(hiddenIds);
    return selectedIds.filter((id) => !hiddenSet.has(id));
  }
);

/**
 * Create a selector that returns whether any features are selected.
 */
export const hasSelectionSelector = (state: SessionStore): boolean =>
  state.selection.featureIds.length > 0;

/**
 * Create a selector that returns whether the document has unsaved changes.
 */
export const hasUnsavedChangesSelector = (state: SessionStore): boolean =>
  state.dirty;
