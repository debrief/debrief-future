/**
 * Browser-safe subset of `@debrief/session-state`.
 *
 * The root barrel re-exports `./server/`, `./persistence/`, `./registry/`,
 * `./log/` — those modules import Node built-ins (`fs`, `http`, `net`, …)
 * and pull in `express` / `parseurl`. Webview consumers reach
 * `@debrief/session-state` through `@debrief/components` and bundle for
 * iife — the Node-only chain blows up the build.
 *
 * Anything a browser consumer needs (selectors, types, store helpers,
 * selectionPath utilities) lives here. Server/persistence stays behind
 * the root barrel for Node-side consumers (the VS Code extension host,
 * standalone server).
 */

// Types
export * from './types/index.js';

// Selection path utilities (Feature: 053 + 192)
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
} from './utils/selectionPath.js';

// Store
export {
  createSessionStore,
  getSessionStore,
  resetSessionStore,
  type SessionStoreApi,
  type SessionStoreWithUndo,
} from './store/index.js';

// Plot slice — read-only signal (Feature: 192)
export { selectIsReadOnly, selectReadOnlyReason } from './store/slices/plot.js';

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

// Selector helpers
export {
  createSelector,
  createVisibleFeaturesSelector,
  hasSelectionSelector,
  hasUnsavedChangesSelector,
} from './store/middleware/selector.js';

// SystemState helper (Feature 261) — pure, browser-safe FeatureCollection
// read/write for all four variants + per-feature visibility. The single
// shared producer/consumer used by both hosts (FR-015).
export {
  readSystemStateFromFeatureCollection,
  writeSystemStateIntoFeatureCollection,
  readHiddenFeatureIds,
  applyVisibilityToFeatureCollection,
  temporalSliceToInput,
  temporalVariantToSlice,
  spatialSliceToInput,
  spatialVariantToSlice,
  selectionSliceToInput,
  selectionVariantToSlice,
  activeStoryboardIdToInput,
  activeStoryboardVariantToId,
  checkTemporalCrossField,
  buildWriteInputFromStore,
  applyStateToFeatures,
  mirrorViewStateIntoFeatures,
  hydrateStoreFromFeatures,
  SystemStateLoadError,
  STATE_FEATURE_ID,
  type FeatureLike,
  type ViewStateStore,
  type SystemStateLoadErrorKind,
  type PlotFeature as SystemStatePlotFeature,
  type PlotFeatureCollection as SystemStatePlotFeatureCollection,
  type SystemStateType,
  type TemporalVariant,
  type SpatialVariant,
  type SelectionVariant,
  type ActiveStoryboardVariant,
  type SystemStateMap,
  type SystemStateWriteInput,
  type PlayheadClampDiagnostic,
  type ReadSystemStateResult,
  type TemporalCrossFieldResult,
} from './system-state/index.js';
