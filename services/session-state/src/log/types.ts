/**
 * Log Service type definitions.
 * Feature: 071-log-recording-service (E02, Phase 1)
 */

// LogEntry types (PROV-aligned, mirrors Phase 0 LinkML schema)
export interface ParameterValue {
  value: unknown;
  default: boolean;
  tunable: boolean;
}

export interface WasGeneratedBy {
  tool: string;
  toolVersion: string;
  parameters: Record<string, ParameterValue>;
}

export interface TuneAnnotation {
  timestamp: string;
  parameter: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface LogEntry {
  activityId: string;
  timestamp: string;
  wasGeneratedBy: WasGeneratedBy;
  used: string[];
  generated: string[];
  executionDuration: string;
  generatedResultId?: string | null;
  tune: TuneAnnotation | null;
}

// Expanded ToolResult fields (Phase 0 contract)
export interface ModifiedFeature {
  featureId: string;
  changedProperties: Record<string, PropertyDelta>;
}

export interface PropertyDelta {
  previousValue: unknown;
  newValue: unknown;
}

export interface CreatedAsset {
  resultId: string;
  path: string;
  mimeType?: string;
}

export interface ExpandedToolResultFields {
  toolVersion?: string;
  modifiedFeatures?: ModifiedFeature[];
  createdFeatures?: string[];
  createdAssets?: CreatedAsset[];
  parameters?: Record<string, ParameterValue>;
}

// LogService interface
export interface RecordResult {
  activityId: string;
  featuresUpdated: number;
  entries: LogEntry[];
}

export interface TimelineOptions {
  loadFromSnapshot?: string;
}

// Minimal ToolResult shape the Log Service needs (avoids importing vscode types)
export interface ToolResultForLog {
  success: boolean;
  features?: { type: 'FeatureCollection'; features: Array<Record<string, unknown>> };
  durationMs: number;
  resultType?: string;
  sourceFeatureIds?: string[];
  artifactHref?: string;
  toolId?: string;
}

// Feature provenance entry for stacService
export interface FeatureProvenance {
  featureId: string;
  entry: Record<string, unknown>;
}

export interface LogService {
  recordToolResult(
    toolResult: ToolResultForLog,
    expandedFields: ExpandedToolResultFields | undefined,
    storePath: string,
    itemPath: string
  ): Promise<RecordResult>;

  getTimeline(
    storePath: string,
    itemPath: string,
    options?: TimelineOptions
  ): Promise<LogEntry[]>;

  // Phase 4-6 stubs
  tuneEntry(activityId: string, parameter: string, newValue: unknown): Promise<void>;
  revertTo(activityId: string): Promise<void>;
  revertThis(activityId: string): Promise<void>;
  createSnapshot(): Promise<void>;
  branchFrom(activityId: string): Promise<string>;
}
