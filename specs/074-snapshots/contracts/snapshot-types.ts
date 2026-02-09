/**
 * Snapshot Types — Shared type definitions for the snapshot system.
 *
 * These types align with the LinkML schema in shared/schemas/src/linkml/system-record.yaml
 * and the existing TypeScript types in services/session-state/src/log/types.ts.
 *
 * Feature: 074-snapshots
 */

import type { LogEntry } from '../../services/session-state/src/log/types';

// ─── Snapshot Chain Types ─────────────────────────────────────────────────

/**
 * Reference to another file in the snapshot chain.
 * Carried within SnapshotLinks on the system record.
 */
export interface SnapshotRef {
  /** Filename of the referenced GeoJSON asset (e.g., "plot-snap-2026-02-09T14-30-00.geojson") */
  asset: string;
  /** Count of Log entries in the referenced file at snapshot time. Enables lazy loading indicators. */
  provEntryCount: number;
}

/**
 * Doubly-linked chain pointers on the system record.
 * Each file (working or snapshot) carries prev/next references.
 */
export interface SnapshotLinks {
  /** Link to the previous file in the chain, or null if this is the earliest snapshot */
  prev: SnapshotRef | null;
  /** Link to the next file in the chain, or null if this is the working file */
  next: SnapshotRef | null;
}

// ─── File-Level Provenance Types ──────────────────────────────────────────

/**
 * File-level provenance entry recorded on the system record
 * when a snapshot or branch event occurs.
 */
export interface FileProvEntry {
  activityId: string;
  type: 'snapshot' | 'branch';
  timestamp: string;
  asset: string | null;
  branchId: string | null;
  direction: 'source' | 'target' | null;
}

// ─── System Record Types ──────────────────────────────────────────────────

/**
 * Properties of the system record feature.
 * The system record is a non-spatial GeoJSON Feature with featureType: "system".
 */
export interface SystemRecordProperties {
  featureType: 'system';
  snapshotLinks: SnapshotLinks | null;
  branches: BranchRecord[];
  provenance: FileProvEntry[];
}

/**
 * Branch record (out of scope for #074, included for type completeness).
 */
export interface BranchRecord {
  branchId: string;
  branchedFrom: string;
  branchedAt: string;
  targetAsset: string;
}

// ─── Snapshot Operation Types ─────────────────────────────────────────────

/**
 * Options for creating a snapshot.
 */
export interface CreateSnapshotOptions {
  /**
   * If provided, create a snapshot representing state at this entry.
   * Entries after this point remain in the working file.
   * If omitted, snapshot captures all entries (standard snapshot).
   */
  fromEntryId?: string;
}

/**
 * Result of a successful snapshot creation.
 */
export interface SnapshotResult {
  /** Filename of the created snapshot asset */
  snapshotAsset: string;
  /** Number of Log entries captured in the snapshot */
  entriesCaptured: number;
  /** Number of Log entries remaining in the working file */
  entriesRemaining: number;
  /** Timestamp of the snapshot */
  timestamp: string;
}

// ─── Snapshot Boundary Types ──────────────────────────────────────────────

/**
 * Information about a snapshot boundary, used by the Log Panel
 * to display "Show earlier history" indicators.
 */
export interface SnapshotBoundary {
  /** Filename of the previous snapshot asset */
  asset: string;
  /** Number of entries in the previous snapshot (for display without loading) */
  provEntryCount: number;
}

/**
 * Result of loading entries from a snapshot.
 */
export interface SnapshotEntriesResult {
  /** Log entries extracted from the snapshot */
  entries: LogEntry[];
  /** Next boundary if the snapshot has a previous snapshot, or null if chain end */
  nextBoundary: SnapshotBoundary | null;
}

// ─── Timeline Assembly Types ──────────────────────────────────────────────

/**
 * Extended timeline options supporting cross-snapshot assembly.
 */
export interface CrossSnapshotTimelineOptions {
  /** Pre-loaded entries from previous snapshots to merge with current entries */
  previousEntries?: LogEntry[];
}
