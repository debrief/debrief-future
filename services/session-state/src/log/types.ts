/**
 * Log Service type definitions.
 * Feature: 071-log-recording-service (E02, Phase 1)
 */

// LogEntry types (PROV-aligned, mirrors Phase 0 LinkML schema)
// Field names use snake_case to match the wire format (ADR-010).
import type {
  ActivityType,
  ToolExecutionResultForReplay as ToolExecutionResultForReplaySchema,
  ToolExecutor as ToolExecutorSchema,
  ToolResultForLog as ToolResultForLogSchema,
  ToolVersionResolver as ToolVersionResolverSchema,
} from '@debrief/schemas';
export type { ActivityType };

export interface ParameterValue {
  value: unknown;
  default: boolean;
  tunable: boolean;
}

export interface WasGeneratedBy {
  tool: string;
  tool_version: string;
  parameters: Record<string, ParameterValue>;
}

export interface TuneAnnotation {
  timestamp: string;
  parameter: string;
  previous_value: unknown;
  new_value: unknown;
}

/** Pre-tool feature state for mutation (in-place transform) tools. */
export interface InputFeatureState {
  feature_id: string;
  geometry: unknown;
  properties: Record<string, unknown> | null;
}

export interface LogEntry {
  activity_id: string;
  timestamp: string;
  was_generated_by: WasGeneratedBy;
  used: string[];
  generated: string[];
  execution_duration: string;
  generated_result_id?: string | null;
  tune: TuneAnnotation | null;
  deleted?: boolean;
  /** Whether this entry is skipped during replay. Feature: 113-prov-card-flip */
  disabled?: boolean;
  /** Free-text analyst annotation. Feature: 113-prov-card-flip */
  rationale?: string | null;
  /** Pre-tool geometry for mutation tools — enables correct tune replay. */
  input_state?: InputFeatureState[] | null;
  /**
   * Semantic kind of this provenance record. Mirror of
   * `LogEntry.activity_type` in the LinkML schema. Feature: 208-timeline-entry-kind.
   */
  activity_type?: ActivityType | null;
}

// Expanded ToolResult fields (Phase 0 contract)
export interface ModifiedFeature {
  feature_id: string;
  changed_properties: Record<string, PropertyDelta>;
}

export interface PropertyDelta {
  previous_value: unknown;
  new_value: unknown;
}

export interface CreatedAsset {
  result_id: string;
  path: string;
  mime_type?: string;
}

export interface ExpandedToolResultFields {
  tool_version?: string;
  modified_features?: ModifiedFeature[];
  created_features?: string[];
  created_assets?: CreatedAsset[];
  parameters?: Record<string, ParameterValue>;
}

// LogService interface
export interface RecordResult {
  activity_id: string;
  features_updated: number;
  entries: LogEntry[];
}

export interface TimelineOptions {
  loadFromSnapshot?: string;
}

// Minimal ToolResult shape the Log Service needs (avoids importing vscode types).
//
// Schema-rooted on `ToolResultForLog` from `@debrief/schemas` (LinkML
// `mcp.yaml`) and narrowed with the live GeoJSON `features` shape and
// the `input_state` array typed as `InputFeatureState[]` (the inner
// shape is owned by #224 session-state). Per FR-004 (R4 import-based
// schema rooting) the audit treats this file as schema-rooted.
export type ToolResultForLog = Omit<ToolResultForLogSchema, 'features' | 'input_state'> & {
  features?: { type: 'FeatureCollection'; features: unknown[] };
  /** Pre-tool geometry snapshot for mutation tools (passed through to LogEntry). */
  input_state?: InputFeatureState[];
};

// Feature provenance entry for stacService
export interface FeatureProvenance {
  feature_id: string;
  entry: Record<string, unknown>;
}

/**
 * Sentinel tool name used on FileSavedEvent LogEntries to mark them as
 * distinct from ToolRunEvents.  Producers (`LogService.recordFileSaved`)
 * and consumers (cleanup walker on plot close) reference this single
 * constant to avoid string literals scattered across the codebase.
 *
 * Feature: 178-vscode-tabular-results (R7)
 */
export const FILE_SAVE_TOOL_SENTINEL = 'debrief.fileSave';

/**
 * Sentinel tool name used on StoryboardEditEvent LogEntries produced by
 * `LogService.recordStoryboardEdit`. Distinct from both ToolRunEvent and
 * FileSavedEvent so #176 (Analysis Log Panel) can render them with a
 * storyboard-edit-specific card.
 *
 * Feature: 218-storyboarding-edit (FR-EDIT-020)
 */
export const STORYBOARD_EDIT_TOOL_SENTINEL = 'debrief.storyboardEdit';

/**
 * The canonical storyboard-edit op discriminator.
 *
 * Mirrors #215's `StoryboardCrudOp` (exported as `StoryboardOp` from
 * `@debrief/components/storyboard`) plus two #218-only ops that live
 * entirely in the orchestration layer (no CRUD counterpart):
 *   - `copy-out`         : source-side of a copy-to-other-storyboard pair
 *   - `refresh-all-stale`: rollup emitted after the bulk refresh (FR-EDIT-025)
 *
 * Note: `restore` and `refresh-thumbnail` are already in the CRUD op
 * union — the CRUD module emits them on Scene provenance and this
 * recorder echoes them onto the timeline.
 *
 * Duplicated (rather than imported) because `@debrief/session-state` must
 * not depend on the higher-level `@debrief/components` package (layering
 * constraint). A drift-guard test in #215's test suite asserts the two
 * unions stay aligned. Review decision 6A intent is preserved: any new
 * CRUD op requires a paired update here.
 */
export type StoryboardEditOp =
  | 'create'
  | 'rename'
  | 'describe'
  | 'delete'
  | 'restore'
  | 'update-to-current'
  | 'duplicate'
  | 'copy-in'
  | 'insert-middle'
  | 'refresh-thumbnail'
  | 'copy-out'
  | 'refresh-all-stale';

/**
 * Input shape for `LogService.recordStoryboardEdit`. Review decision 3A
 * adds `pairActivityId` so the two halves of a copy-to-other-storyboard
 * can render as linked cards in the LogPanel.
 *
 * Feature: 218-storyboarding-edit (contract:
 *   specs/218-storyboarding-edit/contracts/log-service-extension.md)
 */
export interface RecordStoryboardEditInput {
  readonly storePath: string;
  readonly itemPath: string;
  readonly op: StoryboardEditOp;
  readonly storyboardId: string;
  /** null for Storyboard-level ops. */
  readonly sceneId: string | null;
  /** null for delete / storyboard.delete-cascade (asset unreferenced). */
  readonly thumbnailAssetRef: string | null;
  readonly actor: string;
  /** One-line ≤ 120 char summary rendered on the LogPanel card. */
  readonly summary: string;
  /** ISO-8601 of the edit. */
  readonly timestamp: string;
  /** activity_id of the underlying #215 LogEntry (cross-link for #176). */
  readonly underlyingActivityId: string;
  /** Non-null for paired ops (currently copy-out + copy-in only).
   *  Both halves carry the SAME pairActivityId so #176 can render
   *  them as visually linked cards. Review decision 3A. */
  readonly pairActivityId: string | null;
}

export interface LogService {
  recordToolResult(
    toolResult: ToolResultForLog,
    expandedFields: ExpandedToolResultFields | undefined,
    storePath: string,
    itemPath: string
  ): Promise<RecordResult>;

  /**
   * Append a FileSavedEvent to the analysis log.
   *
   * Creates a LogEntry with `was_generated_by.tool = FILE_SAVE_TOOL_SENTINEL`
   * linked via `used[0] = parentActivityId` to the originating ToolRunEvent,
   * and recording the saved filename in `generated[0]`.
   *
   * Feature: 178-vscode-tabular-results (R7)
   *
   * @param storePath          STAC store root.
   * @param itemPath           STAC item path within the store.
   * @param parentActivityId   activity_id of the originating ToolRunEvent.
   * @param filename           Saved file path relative to the item, e.g.
   *                           `assets/track-stats--2026-04-07T10-00-00.csv`.
   * @param timestamp          ISO-8601 timestamp of the save action.
   * @returns                  The new entry's activity_id.
   *
   * @throws If `filename` does not begin with `assets/`.
   * @throws If `timestamp` is not a parseable ISO-8601 string.
   */
  recordFileSaved(
    storePath: string,
    itemPath: string,
    parentActivityId: string,
    filename: string,
    timestamp: string
  ): Promise<{ activity_id: string }>;

  /**
   * Append a StoryboardEditEvent to the analysis log.
   *
   * Creates a LogEntry with `was_generated_by.tool =
   * STORYBOARD_EDIT_TOOL_SENTINEL` carrying the op + affected
   * storyboard/scene ids + thumbnail ref + cross-link to the underlying
   * #215 LogEntry. Attaches to the affected Scene's provenance (or the
   * Storyboard's for Storyboard-level ops; falls back to the first
   * feature in the collection if neither carrier is present).
   *
   * Degraded-path contract (FR-EDIT-021): if the plot is unreachable
   * (deps.loadGeoJson returns null), returns `{ activity_id: '' }`
   * without throwing — the storyboard-edit is already persisted in the
   * affected Feature's provenance[] by #215's CRUD module.
   *
   * Feature: 218-storyboarding-edit (FR-EDIT-020)
   */
  recordStoryboardEdit(
    input: RecordStoryboardEditInput
  ): Promise<{ activity_id: string }>;

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
  activity_id: string;
  /** Original ISO-8601 timestamp — stamped on output provenance to preserve ordering. */
  timestamp: string;
  tool_id: string;
  tool_version: string;
  parameters: Record<string, unknown>;
  feature_ids: string[];
  is_tune_target: boolean;
}

/** Describes the parameter being tuned. */
export interface TuneTarget {
  activity_id: string;
  parameter: string;
  previous_value: unknown;
  new_value: unknown;
}

/** Full replay plan built from timeline analysis. */
export interface ReplayPlan {
  start_from_snapshot: string | null;
  entries: ReplayEntry[];
  tune_target: TuneTarget | null;
  pre_replay_state: GeoJsonFeatureCollection;
}

/** Progress update emitted during replay. */
export interface ReplayProgress {
  current: number;
  total: number;
  current_tool_id: string;
  phase: 'loading-snapshot' | 'replaying' | 'finalising';
}

/** New versioned artifact produced during replay. */
export interface ArtifactVersion {
  result_id: string;
  version: number;
  path: string;
  previous_path: string;
}

/** Why replay stopped before completing. */
export interface ReplayHaltReason {
  type: 'version-mismatch' | 'dependency-missing' | 'execution-error';
  entry_activity_id: string;
  tool_id: string;
  message: string;
}

/** Outcome of a replay operation. */
export interface ReplayResult {
  status: 'completed' | 'halted' | 'cancelled';
  entries_replayed: number;
  total_entries: number;
  halt_reason: ReplayHaltReason | null;
  tune_annotation: TuneAnnotation | null;
  artifacts_created: ArtifactVersion[];
}

/**
 * Minimal tool execution result for the Replay Engine.
 *
 * Schema-rooted on `ToolExecutionResultForReplay` from `@debrief/schemas`
 * (LinkML `mcp.yaml`) and narrowed with the live GeoJSON `features`
 * shape. Per FR-004 the audit treats this file as schema-rooted.
 */
export type ToolExecutionResultForReplay = Omit<ToolExecutionResultForReplaySchema, 'features'> & {
  features?: { type: 'FeatureCollection'; features: unknown[] };
};

/**
 * Callback to execute a single tool during replay.
 *
 * Schema-rooted on `ToolExecutor` from `@debrief/schemas` (the TS-only
 * function-alias module — Research R-002) and narrowed so the return
 * type uses the locally-narrowed `ToolExecutionResultForReplay`.
 */
export type ToolExecutor = (
  ...args: Parameters<ToolExecutorSchema>
) => Promise<ToolExecutionResultForReplay>;

/** Callback to load a snapshot GeoJSON for cross-snapshot replay. */
export type SnapshotLoader = (
  store_path: string,
  item_path: string,
  asset_filename: string
) => Promise<GeoJsonFeatureCollection | null>;

/**
 * Callback to get the installed version of a tool.
 *
 * Re-exported directly from `@debrief/schemas` (the TS-only
 * function-alias module — Research R-002).
 */
export type ToolVersionResolver = ToolVersionResolverSchema;

/** Callback to report progress to the UI. */
export type ProgressReporter = (progress: ReplayProgress) => void;

/** All dependencies the Replay Engine needs. */
export interface ReplayEngineDeps {
  execute_tool: ToolExecutor;
  load_snapshot: SnapshotLoader;
  resolve_tool_version: ToolVersionResolver;
  on_progress: ProgressReporter;
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
  allowed_values?: string[];
  pattern?: string;
  label: string;
}

// ─── Snapshot Types (Feature: 074-snapshots) ─────────────────────────────

/** Reference to another file in the snapshot chain. */
export interface SnapshotRef {
  asset: string;
  prov_entry_count: number;
}

/** Doubly-linked chain pointers on the system record. */
export interface SnapshotLinks {
  prev: SnapshotRef | null;
  next: SnapshotRef | null;
}

/** File-level provenance entry on the system record. */
export interface FileProvEntry {
  activity_id: string;
  type: 'snapshot' | 'branch';
  timestamp: string;
  asset: string | null;
  branch_id: string | null;
  direction: 'source' | 'target' | null;
}

/** Properties of the system record feature. */
export interface SystemRecordProperties {
  feature_type: 'system';
  snapshot_links: SnapshotLinks | null;
  branches: BranchRecord[];
  branch_origin: BranchOrigin | null;
  provenance: FileProvEntry[];
}

/** Branch record on the source plot's system record. */
export interface BranchRecord {
  branch_id: string;
  branched_from: string;
  branched_at: string;
  target_asset: string;
}

// ─── Branch Types (Feature: 075-branching) ──────────────────────────────

/** Reverse link on a branch plot's system record. */
export interface BranchOrigin {
  source_asset: string;
  branched_from: string;
  branched_at: string;
  branch_id: string;
}

/** Options for branchFrom(). */
export interface BranchFromOptions {
  activity_id: string;
}

/** Result of a successful branch creation. */
export interface BranchResult {
  branch_id: string;
  branch_item_path: string;
  branch_geojson_path: string;
  branched_from: string;
  entries_included: number;
  timestamp: string;
}

/** Where a branch point entry is located in the history. */
export type BranchPointLocation =
  | { type: 'current-segment'; entry_index: number }
  | { type: 'snapshot-boundary'; snapshot_asset: string }
  | { type: 'pre-snapshot-arbitrary'; snapshot_asset: string; entry_index: number };

/** Branch-specific error codes. */
export type BranchErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'SNAPSHOT_NOT_FOUND'
  | 'REPLAY_NOT_AVAILABLE'
  | 'WRITE_FAILED'
  | 'SOURCE_LOAD_FAILED';

/** Dependencies for the branch service (extends snapshot deps). */
export interface BranchServiceDeps extends SnapshotServiceDeps {
  create_item: (store_path: string, title: string) => { item_path: string; item_id: string; item_dir: string };
  generate_branch_id: () => string;
}

/** Branch service interface. */
export interface BranchService {
  branchFrom(
    store_path: string,
    item_path: string,
    options: BranchFromOptions
  ): Promise<BranchResult>;

  locateBranchPoint(
    store_path: string,
    item_path: string,
    activity_id: string
  ): Promise<BranchPointLocation | null>;

  getBranches(
    store_path: string,
    item_path: string
  ): Promise<BranchRecord[]>;

  getBranchOrigin(
    store_path: string,
    item_path: string
  ): Promise<BranchOrigin | null>;
}

/** Options for creating a snapshot. */
export interface CreateSnapshotOptions {
  from_entry_id?: string;
}

/** Result of a successful snapshot creation. */
export interface SnapshotResult {
  snapshot_asset: string;
  entries_captured: number;
  entries_remaining: number;
  timestamp: string;
}

/** Snapshot boundary info for "Show earlier history". */
export interface SnapshotBoundary {
  asset: string;
  prov_entry_count: number;
}

/** Result of loading entries from a snapshot. */
export interface SnapshotEntriesResult {
  entries: LogEntry[];
  next_boundary: SnapshotBoundary | null;
}

/** Extended timeline options for cross-snapshot assembly. */
export interface CrossSnapshotTimelineOptions {
  previous_entries?: LogEntry[];
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
