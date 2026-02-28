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

/** Pre-tool feature state for mutation (in-place transform) tools. */
export interface InputFeatureState {
  featureId: string;
  geometry: unknown;
  properties: Record<string, unknown> | null;
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
  deleted?: boolean;
  /** Whether this entry is skipped during replay. Feature: 113-prov-card-flip */
  disabled?: boolean;
  /** Free-text analyst annotation. Feature: 113-prov-card-flip */
  rationale?: string | null;
  /** Pre-tool geometry for mutation tools — enables correct tune replay. */
  inputState?: InputFeatureState[] | null;
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
  /** Pre-tool geometry snapshot for mutation tools (passed through to LogEntry). */
  inputState?: InputFeatureState[];
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

  // Phase 6 methods (Feature: 076-replay-tune)
  tuneEntry(
    storePath: string,
    itemPath: string,
    activityId: string,
    parameter: string,
    newValue: unknown
  ): Promise<ReplayResult>;

  revertTo(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<void>;

  revertThis(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<ReplayResult>;

  restoreEntry(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<ReplayResult>;

  // Feature 113: Flip-card edit operations
  disableEntry(
    storePath: string,
    itemPath: string,
    activityId: string,
    disabled: boolean
  ): Promise<{ disabledActivityIds: string[] }>;

  setRationale(
    storePath: string,
    itemPath: string,
    activityId: string,
    rationale: string
  ): Promise<void>;

  // Delegated stubs (moved to dedicated services)
  createSnapshot(): Promise<void>;
  branchFrom(activityId: string): Promise<string>;
}

// ─── Replay Engine Types (Feature: 076-replay-tune) ────────────────────

/** Describes a single entry in a replay plan. */
export interface ReplayEntry {
  activityId: string;
  toolId: string;
  toolVersion: string;
  parameters: Record<string, unknown>;
  featureIds: string[];
  isTuneTarget: boolean;
}

/** Describes the parameter being tuned. */
export interface TuneTarget {
  activityId: string;
  parameter: string;
  previousValue: unknown;
  newValue: unknown;
}

/** Full replay plan built from timeline analysis. */
export interface ReplayPlan {
  startFromSnapshot: string | null;
  entries: ReplayEntry[];
  tuneTarget: TuneTarget | null;
  preReplayState: GeoJsonFeatureCollection;
}

/** Progress update emitted during replay. */
export interface ReplayProgress {
  current: number;
  total: number;
  currentToolId: string;
  phase: 'loading-snapshot' | 'replaying' | 'finalising';
}

/** New versioned artifact produced during replay. */
export interface ArtifactVersion {
  resultId: string;
  version: number;
  path: string;
  previousPath: string;
}

/** Why replay stopped before completing. */
export interface ReplayHaltReason {
  type: 'version-mismatch' | 'dependency-missing' | 'execution-error';
  entryActivityId: string;
  toolId: string;
  message: string;
}

/** Outcome of a replay operation. */
export interface ReplayResult {
  status: 'completed' | 'halted' | 'cancelled';
  entriesReplayed: number;
  totalEntries: number;
  haltReason: ReplayHaltReason | null;
  tuneAnnotation: TuneAnnotation | null;
  artifactsCreated: ArtifactVersion[];
}

/** Minimal tool execution result for the Replay Engine. */
export interface ToolExecutionResultForReplay {
  success: boolean;
  features?: { type: 'FeatureCollection'; features: unknown[] };
  durationMs: number;
  toolVersion?: string;
  artifactHref?: string;
  resultId?: string;
}

/** Callback to execute a single tool during replay. */
export type ToolExecutor = (
  toolId: string,
  featureIds: string[],
  params: Record<string, unknown>
) => Promise<ToolExecutionResultForReplay>;

/** Callback to load a snapshot GeoJSON for cross-snapshot replay. */
export type SnapshotLoader = (
  storePath: string,
  itemPath: string,
  assetFilename: string
) => Promise<GeoJsonFeatureCollection | null>;

/** Callback to get the installed version of a tool. */
export type ToolVersionResolver = (toolId: string) => Promise<string | null>;

/** Callback to report progress to the UI. */
export type ProgressReporter = (progress: ReplayProgress) => void;

/** All dependencies the Replay Engine needs. */
export interface ReplayEngineDeps {
  executeTool: ToolExecutor;
  loadSnapshot: SnapshotLoader;
  resolveToolVersion: ToolVersionResolver;
  onProgress: ProgressReporter;
  signal: AbortSignal;
}

/** Replay Engine interface. */
export interface ReplayEngine {
  buildPlan(
    timeline: LogEntry[],
    tuneTarget: TuneTarget | null,
    deletedActivityIds: string[],
    currentState: GeoJsonFeatureCollection,
    snapshotAsset: string | null
  ): ReplayPlan;

  execute(plan: ReplayPlan): Promise<ReplayResult>;
}

/** Type info for parameter validation. */
export interface ParameterTypeInfo {
  type: 'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string';
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
  label: string;
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
  branchOrigin: BranchOrigin | null;
  provenance: FileProvEntry[];
}

/** Branch record on the source plot's system record. */
export interface BranchRecord {
  branchId: string;
  branchedFrom: string;
  branchedAt: string;
  targetAsset: string;
}

// ─── Branch Types (Feature: 075-branching) ──────────────────────────────

/** Reverse link on a branch plot's system record. */
export interface BranchOrigin {
  sourceAsset: string;
  branchedFrom: string;
  branchedAt: string;
  branchId: string;
}

/** Options for branchFrom(). */
export interface BranchFromOptions {
  activityId: string;
}

/** Result of a successful branch creation. */
export interface BranchResult {
  branchId: string;
  branchItemPath: string;
  branchGeoJsonPath: string;
  branchedFrom: string;
  entriesIncluded: number;
  timestamp: string;
}

/** Where a branch point entry is located in the history. */
export type BranchPointLocation =
  | { type: 'current-segment'; entryIndex: number }
  | { type: 'snapshot-boundary'; snapshotAsset: string }
  | { type: 'pre-snapshot-arbitrary'; snapshotAsset: string; entryIndex: number };

/** Branch-specific error codes. */
export type BranchErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'SNAPSHOT_NOT_FOUND'
  | 'REPLAY_NOT_AVAILABLE'
  | 'WRITE_FAILED'
  | 'SOURCE_LOAD_FAILED';

/** Dependencies for the branch service (extends snapshot deps). */
export interface BranchServiceDeps extends SnapshotServiceDeps {
  createItem: (storePath: string, title: string) => { itemPath: string; itemId: string; itemDir: string };
  generateBranchId: () => string;
}

/** Branch service interface. */
export interface BranchService {
  branchFrom(
    storePath: string,
    itemPath: string,
    options: BranchFromOptions
  ): Promise<BranchResult>;

  locateBranchPoint(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<BranchPointLocation | null>;

  getBranches(
    storePath: string,
    itemPath: string
  ): Promise<BranchRecord[]>;

  getBranchOrigin(
    storePath: string,
    itemPath: string
  ): Promise<BranchOrigin | null>;
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
