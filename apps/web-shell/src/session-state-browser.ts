/**
 * Browser-safe re-exports from @debrief/session-state.
 *
 * The full barrel (index.ts) re-exports server/persistence modules that
 * import Node.js builtins (fs, http, express). This shim exports only the
 * browser-compatible subset needed by the web-shell.
 */

// Types
export * from '../../../services/session-state/src/types/index.js';

// Store
export {
  createSessionStore,
  getSessionStore,
  resetSessionStore,
  type SessionStoreApi,
  type SessionStoreWithUndo,
} from '../../../services/session-state/src/store/index.js';

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
} from '../../../services/session-state/src/store/subscriptions.js';

// Selection Path Utilities (Feature: 053) — pure functions, browser-safe.
export {
  getLevelRegistry,
  escapeSegment,
  unescapeSegment,
  normalisePath,
  parsePath,
  buildPath,
  getRoot,
  getDepth,
  isRootPath,
  getParent,
  validatePathStructure,
  validatePathSemantics,
  type AddressingMode,
  type LevelDefinition,
  type PathLevel,
  type ParsedPath,
  type PathValidationResult,
} from '../../../services/session-state/src/utils/selectionPath.js';

// Plot slice — read-only signal (Feature 192). Pure selectors, browser-safe.
export {
  selectIsReadOnly,
  selectReadOnlyReason,
} from '../../../services/session-state/src/store/slices/plot.js';
