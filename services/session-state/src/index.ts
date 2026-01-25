/**
 * Session State Management Service
 * Feature: 024-document-session-state
 *
 * Centralized state management for the Debrief VS Code extension.
 * Tracks temporal navigation, spatial viewport, feature selection, and document lifecycle.
 *
 * @example
 * ```typescript
 * import { getSessionStore, subscribeToCurrentTime } from '@debrief/session-state';
 *
 * const store = getSessionStore();
 *
 * // Subscribe to current time changes
 * const unsubscribe = subscribeToCurrentTime(store, (time, prevTime) => {
 *   console.log('Time changed:', time);
 * });
 *
 * // Update state
 * store.getState().setCurrentTime({ epoch: Date.now(), iso: new Date().toISOString() });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */

// Types
export * from './types/index.js';

// Store
export {
  createSessionStore,
  getSessionStore,
  resetSessionStore,
  type SessionStoreApi,
} from './store/index.js';

// Subscriptions
export {
  subscribeToSlice,
  subscribeToTemporal,
  subscribeToSpatial,
  subscribeToFeatures,
  subscribeToDocument,
  subscribeToCurrentTime,
  subscribeToViewport,
  subscribeToSelection,
  subscribeToDirty,
  selectors,
  shallowArrayEqual,
  shallowObjectEqual,
  type Selector,
  type EqualityFn,
} from './store/subscriptions.js';

// Selector utilities
export {
  createSelector,
  createVisibleFeaturesSelector,
  hasSelectionSelector,
  hasUnsavedChangesSelector,
} from './store/middleware/selector.js';

// Persistence
export {
  saveSession,
  serializeState,
  extractPersistentState,
  loadSession,
  parseSessionJson,
  isVersionCompatible,
  isFutureVersion,
  SCHEMA_VERSIONS,
  type SaveResult,
  type LoadResult,
} from './persistence/index.js';

// Server (for standalone mode)
export {
  createApp,
  startServer,
  createMCPHandler,
  createSSEHandler,
  type ServerOptions,
} from './server/index.js';
