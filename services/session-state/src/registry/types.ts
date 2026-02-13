/**
 * Result ID Registry type definitions.
 * Feature: 087-logical-result-id-registry (E04)
 */

import type { LogEntry, RecordResult, ArtifactVersion } from '../log/types.js';

// ─── Core Types ──────────────────────────────────────────────────────────

/** A single mapping from a logical result ID to its current file path. */
export interface ResultIdMapping {
  readonly resultId: string;
  readonly currentPath: string;
  readonly version: number | null;
  readonly mimeType: string | null;
}

/** Change event emitted when a result ID mapping is created or updated. */
export interface ResultIdChangeEvent {
  readonly resultId: string;
  readonly previousPath: string | null;
  readonly newPath: string;
  readonly previousVersion: number | null;
  readonly newVersion: number | null;
}

/** Callback signature for result ID change notifications. */
export type ResultIdChangeCallback = (event: ResultIdChangeEvent) => void;

// ─── STAC Asset Hydration ────────────────────────────────────────────────

/** Minimal STAC asset shape needed for hydration. */
export interface StacAssetForHydration {
  href: string;
  type?: string;
  roles?: string[];
  'debrief:resultId'?: string;
  'debrief:version'?: number;
}

// ─── Registry Interface ──────────────────────────────────────────────────

/** Result ID Registry service interface. */
export interface ResultIdRegistry {
  /** Resolve a result ID to its current mapping. Returns undefined if unknown. */
  resolve(resultId: string): ResultIdMapping | undefined;

  /** Return all registered mappings. */
  listAll(): ResultIdMapping[];

  /** Return the number of registered mappings. */
  readonly size: number;

  /**
   * Extract generatedResultId from a LogEntry and register/update the mapping.
   * No-op if the entry has no generatedResultId.
   */
  registerFromLogEntry(entry: LogEntry): void;

  /**
   * Process all entries in a RecordResult (from logService.recordToolResult).
   * Delegates to registerFromLogEntry for each entry.
   */
  registerFromRecordResult(result: RecordResult): void;

  /**
   * Process artifact versions from a replay result (from replayEngine.execute).
   * Updates mappings for each artifact with a resultId.
   */
  registerFromReplayResult(artifacts: ArtifactVersion[]): void;

  /**
   * Scan STAC Item assets for debrief:resultId metadata and populate the registry.
   * Selects the highest debrief:version for each unique result ID.
   * Does NOT emit change events (bulk initialization).
   */
  hydrateFromAssets(assets: Record<string, StacAssetForHydration>): void;

  /**
   * Subscribe to changes for a specific result ID.
   * Returns an unsubscribe function.
   */
  subscribe(resultId: string, callback: ResultIdChangeCallback): () => void;

  /**
   * Subscribe to all result ID changes (any result ID).
   * Returns an unsubscribe function.
   */
  subscribeAll(callback: ResultIdChangeCallback): () => void;

  /**
   * Clear all mappings and remove all subscriptions.
   * Called when the active plot is closed or replaced.
   */
  clear(): void;
}
