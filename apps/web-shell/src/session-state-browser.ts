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

// SystemState helper (Feature 261) — pure, browser-safe FeatureCollection
// read/write for all four variants + per-feature visibility + the store bridge.
// The single shared producer/consumer used by both hosts (FR-015).
export {
  readSystemStateFromFeatureCollection,
  writeSystemStateIntoFeatureCollection,
  readHiddenFeatureIds,
  applyVisibilityToFeatureCollection,
  buildWriteInputFromStore,
  applyStateToFeatures,
  mirrorViewStateIntoFeatures,
  hydrateStoreFromFeatures,
  checkTemporalCrossField,
  SystemStateLoadError,
  STATE_FEATURE_ID,
  type SystemStateLoadErrorKind,
  type FeatureLike,
  type SystemStateType,
  type TemporalVariant,
  type SpatialVariant,
  type SelectionVariant,
  type ActiveStoryboardVariant,
  type SystemStateMap,
  type SystemStateWriteInput,
  // spec 267 — tolerant playhead-clamp diagnostic returned by the load path.
  type PlayheadClampDiagnostic,
} from '../../../services/session-state/src/system-state/index.js';
