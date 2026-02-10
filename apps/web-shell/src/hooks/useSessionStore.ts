/**
 * React hook to bridge @debrief/session-state (Zustand vanilla store)
 * into the web-shell React component tree.
 *
 * Feature: 073-undo-redo-split (runtime verification)
 */

import { useSyncExternalStore, useCallback } from 'react';
import {
  getSessionStore,
  type SessionStoreApi,
  type SessionStoreWithUndo,
} from '@debrief/session-state';

/**
 * Subscribe to the full session store, returning the complete state.
 * Use selectors (useSessionSelector) for fine-grained subscriptions.
 */
export function useSessionStore(): SessionStoreWithUndo {
  const store = getSessionStore();
  return useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
}

/**
 * Subscribe to a selected slice of the session store.
 * Re-renders only when the selected value changes (by reference).
 */
export function useSessionSelector<T>(
  selector: (state: SessionStoreWithUndo) => T,
): T {
  const store = getSessionStore();
  const getSnapshot = useCallback(() => selector(store.getState()), [store, selector]);
  return useSyncExternalStore(
    store.subscribe,
    getSnapshot,
    getSnapshot,
  );
}

/**
 * Get the raw store API (for imperative calls outside render).
 */
export function useSessionStoreApi(): SessionStoreApi {
  return getSessionStore();
}
