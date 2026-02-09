/**
 * Log Service API Contract — Feature 071
 *
 * This file defines the public interface of the Log Service module.
 * It is a design artifact, not production code.
 */

// ---------------------------------------------------------------------------
// Log Entry types (mirrors Phase 0 LinkML-generated schema)
// ---------------------------------------------------------------------------

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
  timestamp: string; // ISO 8601
  parameter: string;
  previousValue: unknown;
  newValue: unknown;
}

export interface LogEntry {
  activityId: string; // UUID
  timestamp: string; // ISO 8601
  wasGeneratedBy: WasGeneratedBy;
  used: string[]; // Input feature IDs
  generated: string[]; // Output feature IDs or artifact paths
  executionDuration: string; // ISO 8601 duration (e.g., "PT0.3S")
  generatedResultId?: string | null; // Stable artifact ID
  tune: TuneAnnotation | null; // Always null in Phase 1
}

// ---------------------------------------------------------------------------
// Expanded ToolResult (extends existing ToolExecutionResult)
// ---------------------------------------------------------------------------

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

/**
 * Fields added to ToolExecutionResult by Phase 0.
 * All optional for backward compatibility with legacy tools.
 */
export interface ExpandedToolResultFields {
  toolVersion?: string;
  modifiedFeatures?: ModifiedFeature[];
  createdFeatures?: string[];
  createdAssets?: CreatedAsset[];
  parameters?: Record<string, ParameterValue>;
}

// ---------------------------------------------------------------------------
// Log Service interface
// ---------------------------------------------------------------------------

export interface RecordResult {
  /** The activityId assigned to this operation */
  activityId: string;
  /** Number of features that received Log entries */
  featuresUpdated: number;
  /** The Log entries that were created */
  entries: LogEntry[];
}

export interface TimelineOptions {
  /** If provided, load entries from a snapshot file first */
  loadFromSnapshot?: string;
}

export interface LogService {
  /**
   * Record a tool execution as Log entries on affected features.
   *
   * - Creates LogEntry from the ToolResult
   * - Appends entry to input features' provenance arrays via stacService
   * - Calls markDirty() on the session store
   * - Does NOT record entries for failed executions (success=false)
   *
   * @param toolResult - The result from calcService.executeTool()
   * @param expandedFields - Optional expanded fields from Phase 0
   * @param storePath - STAC store root path
   * @param itemPath - Relative path to the STAC item
   * @returns RecordResult with activityId and entry count
   */
  recordToolResult(
    toolResult: {
      success: boolean;
      features?: { type: 'FeatureCollection'; features: unknown[] };
      durationMs: number;
      resultType?: string;
      sourceFeatureIds?: string[];
      artifactHref?: string;
    },
    expandedFields: ExpandedToolResultFields | undefined,
    storePath: string,
    itemPath: string
  ): Promise<RecordResult>;

  /**
   * Assemble the global timeline from all features in the current plot.
   *
   * - Collects properties.provenance[] from all features
   * - Deduplicates on activityId (first occurrence wins)
   * - Returns sorted by timestamp ascending
   *
   * @param storePath - STAC store root path
   * @param itemPath - Relative path to the STAC item
   * @param options - Optional: load from snapshot
   * @returns Sorted, deduplicated LogEntry array
   */
  getTimeline(
    storePath: string,
    itemPath: string,
    options?: TimelineOptions
  ): Promise<LogEntry[]>;

  // ----- Phase 4-6 stubs (throw "Not implemented") -----

  /** Phase 6: Modify a parameter and replay subsequent entries */
  tuneEntry(activityId: string, parameter: string, newValue: unknown): Promise<void>;

  /** Phase 6: Permanently discard all entries after the given entry */
  revertTo(activityId: string): Promise<void>;

  /** Phase 6: Soft-delete a single entry and replay subsequent */
  revertThis(activityId: string): Promise<void>;

  /** Phase 4: Save clean state, reset Log, create snapshot link */
  createSnapshot(): Promise<void>;

  /** Phase 5: Create a new plot from state at a given entry */
  branchFrom(activityId: string): Promise<string>;
}
