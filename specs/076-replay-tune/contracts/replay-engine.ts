/**
 * Replay Engine Contract — Feature 076-replay-tune
 *
 * Defines the public interface for the Replay Engine module.
 * This is a design contract, not executable code.
 */

import type {
  LogEntry,
  TuneAnnotation,
  GeoJsonFeatureCollection,
} from '@debrief/session-state';

// ─── Replay Engine Types ──────────────────────────────────────────────

/** Describes a single entry to be replayed. */
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

/** Why replay stopped before completing all entries. */
export interface ReplayHaltReason {
  type: 'version-mismatch' | 'dependency-missing' | 'execution-error';
  entryActivityId: string;
  toolId: string;
  message: string;
  details: VersionMismatchDetails | DependencyDetails | ErrorDetails;
}

export interface VersionMismatchDetails {
  recordedVersion: string;
  installedVersion: string;
}

export interface DependencyDetails {
  missingFeatureId: string;
  deletedByActivityId: string;
}

export interface ErrorDetails {
  originalError: string;
}

/** Outcome of a completed replay operation. */
export interface ReplayResult {
  status: 'completed' | 'halted' | 'cancelled';
  entriesReplayed: number;
  totalEntries: number;
  haltReason: ReplayHaltReason | null;
  tuneAnnotation: TuneAnnotation | null;
  artifactsCreated: ArtifactVersion[];
}

// ─── Replay Engine Dependencies ───────────────────────────────────────

/**
 * Callback to execute a single tool.
 * Injected by the VS Code extension (wraps calcService.executeTool).
 */
export type ToolExecutor = (
  toolId: string,
  featureIds: string[],
  params: Record<string, unknown>
) => Promise<ToolExecutionResultForReplay>;

/** Minimal result shape the Replay Engine needs from tool execution. */
export interface ToolExecutionResultForReplay {
  success: boolean;
  features?: { type: 'FeatureCollection'; features: unknown[] };
  durationMs: number;
  toolVersion?: string;
  artifactHref?: string;
  resultId?: string;
}

/** Callback to load a snapshot GeoJSON for cross-snapshot replay. */
export type SnapshotLoader = (
  storePath: string,
  itemPath: string,
  assetFilename: string
) => Promise<GeoJsonFeatureCollection | null>;

/** Callback to get the installed version of a tool. */
export type ToolVersionResolver = (
  toolId: string
) => Promise<string | null>;

/** Callback to report progress to the UI. */
export type ProgressReporter = (progress: ReplayProgress) => void;

/** All dependencies the Replay Engine needs (injected at creation). */
export interface ReplayEngineDeps {
  executeTool: ToolExecutor;
  loadSnapshot: SnapshotLoader;
  resolveToolVersion: ToolVersionResolver;
  onProgress: ProgressReporter;
  signal: AbortSignal;
}

// ─── Replay Engine Interface ──────────────────────────────────────────

export interface ReplayEngine {
  /**
   * Build a replay plan from the current timeline.
   *
   * For tuneEntry: plan includes entries from tuneTarget onward.
   * For revertThis: plan includes entries after the deleted entry.
   *
   * @throws if validation fails (invalid parameter value, entry not found)
   */
  buildPlan(
    timeline: LogEntry[],
    tuneTarget: TuneTarget | null,
    deletedActivityIds: string[],
    currentState: GeoJsonFeatureCollection,
    snapshotAsset: string | null
  ): ReplayPlan;

  /**
   * Execute a replay plan sequentially.
   *
   * - Loads snapshot if plan.startFromSnapshot is set
   * - Validates tool versions before each entry
   * - Executes each entry via deps.executeTool
   * - Reports progress via deps.onProgress
   * - Halts on any failure (version mismatch, missing dep, tool error)
   * - Restores pre-replay state on cancellation or halt
   *
   * @returns ReplayResult describing the outcome
   */
  execute(plan: ReplayPlan): Promise<ReplayResult>;
}

// ─── Log Service Extended Signatures ──────────────────────────────────

/**
 * Extended LogService methods for Phase 6.
 * These replace the Phase 4-6 stubs in logService.ts.
 */
export interface LogServicePhase6 {
  /**
   * Tune a parameter on a past entry and replay subsequent entries.
   *
   * 1. Validates the new parameter value
   * 2. Builds a replay plan (entries from tuneTarget onward)
   * 3. Appends TuneAnnotation to the target entry
   * 4. Executes the replay plan
   * 5. Marks document dirty
   *
   * @returns ReplayResult (completed, halted, or cancelled)
   */
  tuneEntry(
    storePath: string,
    itemPath: string,
    activityId: string,
    parameter: string,
    newValue: unknown
  ): Promise<ReplayResult>;

  /**
   * Permanently discard all entries after the specified entry.
   *
   * 1. Removes entries after activityId from all features' provenance arrays
   * 2. Marks document dirty
   * 3. No replay needed (state at the selected point is already in the features)
   *
   * NOTE: This does NOT restore feature state to the selected point.
   * Feature geometry/properties reflect ALL operations up to the current point.
   * For true state restoration, the caller must load a snapshot or replay.
   */
  revertTo(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<void>;

  /**
   * Soft-delete a single entry and replay subsequent entries without it.
   *
   * 1. Marks the entry as deleted (deleted: true)
   * 2. Builds a replay plan for all entries after the deleted one
   * 3. Executes the replay plan (entries skip the deleted one)
   * 4. If any entry fails due to dependency on the deleted entry, halts
   * 5. Marks document dirty
   *
   * @returns ReplayResult (completed or halted with dependency error)
   */
  revertThis(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<ReplayResult>;

  /**
   * Restore a soft-deleted entry.
   *
   * 1. Removes the deleted flag from the entry
   * 2. Rebuilds the replay plan including the restored entry
   * 3. Executes the replay plan
   * 4. Marks document dirty
   *
   * @returns ReplayResult
   */
  restoreEntry(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<ReplayResult>;
}

// ─── Log Panel Message Protocol Extensions ────────────────────────────

/** Extension → Webview messages for Phase 6. */
export type Phase6ExtToWebview =
  | { type: 'replay:progress'; payload: ReplayProgress }
  | { type: 'replay:result'; payload: ReplayResult }
  | { type: 'replay:error'; payload: { message: string } };

/** Webview → Extension messages for Phase 6. */
export type Phase6WebviewToExt =
  | { type: 'tune:request'; payload: { activityId: string; parameter: string; newValue: unknown } }
  | { type: 'revert-to:request'; payload: { activityId: string } }
  | { type: 'revert-this:request'; payload: { activityId: string } }
  | { type: 'restore:request'; payload: { activityId: string } }
  | { type: 'replay:cancel' };

// ─── Parameter Editor Types ───────────────────────────────────────────

/** Type information for rendering parameter editors. */
export interface ParameterTypeInfo {
  type: 'float' | 'integer' | 'duration' | 'enum' | 'boolean' | 'string';
  min?: number;
  max?: number;
  allowedValues?: string[];
  pattern?: string;
  label: string;
}

/** Props for the ParameterEditor shared component. */
export interface ParameterEditorProps {
  name: string;
  value: unknown;
  typeInfo: ParameterTypeInfo;
  tunable: boolean;
  onCommit: (name: string, newValue: unknown) => void;
  onCancel: () => void;
}
