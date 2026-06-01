/**
 * Log Service module — public API.
 * Feature: 071-log-recording-service (E02, Phase 1)
 */

export { FILE_SAVE_TOOL_SENTINEL } from './types.js';

export type {
  LogEntry,
  WasGeneratedBy,
  ParameterValue,
  TuneAnnotation,
  ExpandedToolResultFields,
  ModifiedFeature,
  PropertyDelta,
  CreatedAsset,
  RecordResult,
  TimelineOptions,
  ToolResultForLog,
  InputFeatureState,
  FeatureProvenance,
  LogService,
  // Replay Engine types (Feature: 076)
  ReplayEntry,
  TuneTarget,
  ReplayPlan,
  ReplayProgress,
  ArtifactVersion,
  ReplayHaltReason,
  ReplayResult,
  ToolExecutionResultForReplay,
  ToolExecutor,
  SnapshotLoader,
  ToolVersionResolver,
  ProgressReporter,
  ReplayEngineDeps,
  ReplayEngine,
  ParameterTypeInfo,
  // Snapshot types (Feature: 074)
  SnapshotRef,
  SnapshotLinks,
  FileProvEntry,
  SystemRecordProperties,
  BranchRecord,
  // Branch types (Feature: 075)
  BranchOrigin,
  BranchFromOptions,
  BranchResult,
  BranchPointLocation,
  BranchErrorCode,
  BranchServiceDeps,
  BranchService,
  CreateSnapshotOptions,
  SnapshotResult,
  SnapshotBoundary,
  SnapshotEntriesResult,
  CrossSnapshotTimelineOptions,
  GeoJsonFeatureCollection,
  GeoJsonFeature,
  SnapshotServiceDeps,
  SnapshotService,
} from './types.js';

export {
  buildLogEntry,
  buildVisibilityChangeLogEntry,
  msToIsoDuration,
  generateActivityId,
  extractActivityIdFromOutputFeatures,
} from './entryBuilder.js';

// Feature 261 (FR-013) — per-feature visibility-change provenance.
export { VISIBILITY_CHANGE_TOOL_SENTINEL } from './types.js';
export type { RecordVisibilityChangeInput } from './types.js';

export { assembleTimeline } from './timeline.js';

export { createLogService, type LogServiceDeps } from './logService.js';

// Replay Engine (Feature: 076)
export { createReplayEngine } from './replayEngine.js';
export { validateParameter, isValidIsoDuration, type ValidationResult } from './parameterValidation.js';

// Snapshot Service (Feature: 074)
export { createSnapshotService } from './snapshotService.js';
export {
  findSystemRecord,
  createSystemRecord,
  stripSpatialProvenance,
  countLogEntries,
  generateSnapshotFilename,
  normaliseProvenance,
  trimProvenanceAfterEntry,
} from './snapshotHelpers.js';

// Branch Service (Feature: 075)
export { createBranchService } from './branchService.js';
export {
  findEntryInFeatures,
  trimProvenanceToEntry,
  createBranchRecord,
  createBranchOrigin,
  createBranchProvEntry,
} from './branchService.js';
