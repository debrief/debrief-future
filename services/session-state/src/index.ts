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

// Selection Path Utilities (Feature: 053)
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

// Log Service (Feature: 071)
export {
  buildLogEntry,
  msToIsoDuration,
  generateActivityId,
  extractActivityIdFromOutputFeatures,
  assembleTimeline,
  type LogEntry,
  type WasGeneratedBy,
  type ParameterValue,
  type TuneAnnotation,
  type ExpandedToolResultFields,
  type ModifiedFeature,
  type PropertyDelta,
  type CreatedAsset,
  type RecordResult,
  type TimelineOptions,
  type ToolResultForLog,
  type InputFeatureState,
  type FeatureProvenance,
  type LogService,
  type LogServiceDeps,
  createLogService,
  // Feature: 178-vscode-tabular-results — sentinel used by recordFileSaved
  FILE_SAVE_TOOL_SENTINEL,
  // Replay Engine (Feature: 076)
  createReplayEngine,
  validateParameter,
  isValidIsoDuration,
  type ReplayEntry,
  type TuneTarget,
  type ReplayPlan,
  type ReplayProgress,
  type ArtifactVersion,
  type ReplayHaltReason,
  type ReplayResult,
  type ToolExecutionResultForReplay,
  type ToolExecutor,
  type SnapshotLoader,
  type ToolVersionResolver,
  type ProgressReporter,
  type ReplayEngineDeps,
  type ReplayEngine,
  type ParameterTypeInfo,
  type ValidationResult,
  // Snapshot Service (Feature: 074)
  createSnapshotService,
  findSystemRecord,
  createSystemRecord,
  stripSpatialProvenance,
  countLogEntries,
  generateSnapshotFilename,
  normaliseProvenance,
  trimProvenanceAfterEntry,
  type SnapshotRef,
  type SnapshotLinks,
  type FileProvEntry,
  type SystemRecordProperties,
  type BranchRecord,
  type CreateSnapshotOptions,
  type SnapshotResult,
  type SnapshotBoundary,
  type SnapshotEntriesResult,
  type CrossSnapshotTimelineOptions,
  type GeoJsonFeatureCollection,
  type GeoJsonFeature,
  type SnapshotServiceDeps,
  type SnapshotService,
} from './log/index.js';

// Result ID Registry (Feature: 087)
export {
  createResultIdRegistry,
  type ResultIdMapping,
  type ResultIdChangeEvent,
  type ResultIdChangeCallback,
  type ResultIdRegistry,
  type StacAssetForHydration,
} from './registry/index.js';

// Server (for standalone mode)
export {
  createApp,
  startServer,
  createMCPHandler,
  createSSEHandler,
  type ServerOptions,
} from './server/index.js';
