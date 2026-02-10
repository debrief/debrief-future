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
  features?: { type: 'FeatureCollection'; features: unknown[] };
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

// ─── Snapshot Types (Feature: 074-snapshots) ─────────────────────────────

/** Reference to another file in the snapshot chain. */
export interface SnapshotRef {
  asset: string;
  provEntryCount: number;
}

/** Doubly-linked chain pointers on the system record. */
export interface SnapshotLinks {
  prev: SnapshotRef | null;
  next: SnapshotRef | null;
}

/** File-level provenance entry on the system record. */
export interface FileProvEntry {
  activityId: string;
  type: 'snapshot' | 'branch';
  timestamp: string;
  asset: string | null;
  branchId: string | null;
  direction: 'source' | 'target' | null;
}

/** Properties of the system record feature. */
export interface SystemRecordProperties {
  featureType: 'system';
  snapshotLinks: SnapshotLinks | null;
  branches: BranchRecord[];
  provenance: FileProvEntry[];
}

/** Branch record (out of scope for #074). */
export interface BranchRecord {
  branchId: string;
  branchedFrom: string;
  branchedAt: string;
  targetAsset: string;
}

/** Options for creating a snapshot. */
export interface CreateSnapshotOptions {
  fromEntryId?: string;
}

/** Result of a successful snapshot creation. */
export interface SnapshotResult {
  snapshotAsset: string;
  entriesCaptured: number;
  entriesRemaining: number;
  timestamp: string;
}

/** Snapshot boundary info for "Show earlier history". */
export interface SnapshotBoundary {
  asset: string;
  provEntryCount: number;
}

/** Result of loading entries from a snapshot. */
export interface SnapshotEntriesResult {
  entries: LogEntry[];
  nextBoundary: SnapshotBoundary | null;
}

/** Extended timeline options for cross-snapshot assembly. */
export interface CrossSnapshotTimelineOptions {
  previousEntries?: LogEntry[];
}

/** Minimal GeoJSON FeatureCollection for snapshot operations. */
export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

/** Minimal GeoJSON Feature for snapshot operations. */
export interface GeoJsonFeature {
  type: 'Feature';
  geometry: unknown;
  properties: Record<string, unknown> | null;
  id?: string | number;
}

/** Dependencies for the snapshot service. */
export interface SnapshotServiceDeps {
  loadGeoJson: (storePath: string, itemPath: string) => Promise<GeoJsonFeatureCollection | null>;
  writeSnapshotAsset: (storePath: string, itemPath: string, filename: string, data: string) => Promise<string>;
  loadSnapshotGeoJson: (storePath: string, itemPath: string, assetFilename: string) => Promise<GeoJsonFeatureCollection | null>;
  writeGeoJson: (storePath: string, itemPath: string, featureCollection: GeoJsonFeatureCollection) => Promise<void>;
  markDirty: () => void;
}

/** Snapshot service interface. */
export interface SnapshotService {
  createSnapshot(storePath: string, itemPath: string, options?: CreateSnapshotOptions): Promise<SnapshotResult>;
  getSnapshotBoundary(storePath: string, itemPath: string): Promise<SnapshotBoundary | null>;
  loadSnapshotEntries(storePath: string, itemPath: string, assetFilename: string): Promise<SnapshotEntriesResult>;
  assembleCrossSnapshotTimeline(currentFeatures: GeoJsonFeatureCollection, options?: CrossSnapshotTimelineOptions): LogEntry[];
}
