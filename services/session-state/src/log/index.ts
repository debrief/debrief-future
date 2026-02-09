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
} from './types.js';

export {
  buildLogEntry,
  msToIsoDuration,
  generateActivityId,
  extractActivityIdFromOutputFeatures,
} from './entryBuilder.js';

export { assembleTimeline } from './timeline.js';

export { createLogService, type LogServiceDeps } from './logService.js';
