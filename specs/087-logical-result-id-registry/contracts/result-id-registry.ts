/**
 * Result ID Registry — API Contract
 * Feature: 087-logical-result-id-registry (E04)
 *
 * This file defines the TypeScript interface for the Result ID Registry.
 * It is a design artifact, not executable code.
 */

import type { LogEntry, RecordResult, ArtifactVersion } from '@debrief/session-state';

// ─── Core Types ──────────────────────────────────────────────────────────

/** A single mapping from a logical result ID to its current file path. */
export interface ResultIdMapping {
  /** Stable logical result ID (e.g., "bt_plot_001"). */
  readonly resultId: string;
  /** Current versioned file path (e.g., "./results/bt_plot_001_v2.png"). */
  readonly currentPath: string;
  /** Version number, if known from STAC metadata. Null when inferred from Log entry only. */
  readonly version: number | null;
  /** MIME type of the artifact. Null if unknown. */
  readonly mimeType: string | null;
}

/** Change event emitted when a result ID mapping is created or updated. */
export interface ResultIdChangeEvent {
  /** The result ID that changed. */
  readonly resultId: string;
  /** Previous file path, or null for first registration. */
  readonly previousPath: string | null;
  /** New file path after the update. */
  readonly newPath: string;
  /** Previous version number, if known. */
  readonly previousVersion: number | null;
  /** New version number, if known. */
  readonly newVersion: number | null;
}

/** Callback signature for result ID change notifications. */
export type ResultIdChangeCallback = (event: ResultIdChangeEvent) => void;

// ─── STAC Asset Hydration ────────────────────────────────────────────────

/** Minimal STAC asset shape needed for hydration (extends StacAsset). */
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
  // ── Lookup ──

  /** Resolve a result ID to its current mapping. Returns undefined if unknown. */
  resolve(resultId: string): ResultIdMapping | undefined;

  /** Return all registered mappings. */
  listAll(): ResultIdMapping[];

  /** Return the number of registered mappings. */
  readonly size: number;

  // ── Registration ──

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

  // ── Subscriptions ──

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

  // ── Lifecycle ──

  /**
   * Clear all mappings and remove all subscriptions.
   * Called when the active plot is closed or replaced.
   */
  clear(): void;
}

// ─── Factory ─────────────────────────────────────────────────────────────

/**
 * No external dependencies needed — the registry is a pure in-memory
 * map with callback subscriptions. The factory is parameterless.
 */
export type CreateResultIdRegistry = () => ResultIdRegistry;
