/**
 * Log Service module — public API.
 * Feature: 071-log-recording-service (E02, Phase 1)
 */

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
  FeatureProvenance,
  LogService,
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
  msToIsoDuration,
  generateActivityId,
  extractActivityIdFromOutputFeatures,
} from './entryBuilder.js';

export { assembleTimeline } from './timeline.js';

export { createLogService, type LogServiceDeps } from './logService.js';

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
