/**
 * Branch Types — Shared type definitions for the branching system.
 *
 * Extends the existing types from 074-snapshots (BranchRecord, FileProvEntry)
 * with branch-specific types (BranchOrigin, BranchResult).
 *
 * Feature: 075-branching
 */

import type { LogEntry } from '../../services/session-state/src/log/types';
import type {
  BranchRecord,
  FileProvEntry,
  SnapshotLinks,
} from '../074-snapshots/contracts/snapshot-types';

// Re-export existing types used by this feature
export type { BranchRecord, FileProvEntry };

// ─── Branch Origin Types ─────────────────────────────────────────────────

/**
 * Reverse link on a branch plot's system record, pointing back to the source.
 * A plot has at most one BranchOrigin (it was branched from one source).
 * A source can have many BranchRecords (multiple branches).
 */
export interface BranchOrigin {
  /** Relative path to the source plot's GeoJSON (e.g., "../plot-alpha/plot.geojson") */
  sourceAsset: string;
  /** Activity ID of the Log entry at the branch point */
  branchedFrom: string;
  /** ISO 8601 timestamp when the branch was created */
  branchedAt: string;
  /** Branch identifier matching the source's BranchRecord.branchId */
  branchId: string;
}

// ─── Extended System Record ──────────────────────────────────────────────

/**
 * System record properties with full branching support.
 * Extends the 074 definition with BranchOrigin.
 */
export interface SystemRecordProperties {
  featureType: 'system';
  snapshotLinks: SnapshotLinks | null;
  branches: BranchRecord[];
  branchOrigin: BranchOrigin | null;
  provenance: FileProvEntry[];
}

// ─── Branch Operation Types ──────────────────────────────────────────────

/**
 * Options for the branchFrom() operation.
 */
export interface BranchFromOptions {
  /**
   * Activity ID of the Log entry to branch from.
   * The branch plot will contain state at this entry, with Log trimmed to this point.
   */
  activityId: string;
}

/**
 * Result of a successful branch creation.
 */
export interface BranchResult {
  /** Unique identifier of the created branch (e.g., "branch-a1b2c3d4") */
  branchId: string;
  /** Filesystem path to the new STAC Item directory */
  branchItemPath: string;
  /** Filesystem path to the branch plot's GeoJSON */
  branchGeoJsonPath: string;
  /** Activity ID of the branch point entry */
  branchedFrom: string;
  /** Count of Log entries included in the branch plot */
  entriesIncluded: number;
  /** ISO 8601 timestamp of the branch creation */
  timestamp: string;
}

// ─── Branch Entry Location ───────────────────────────────────────────────

/**
 * Describes where a branch point entry is located relative to the
 * current snapshot chain.
 */
export type BranchPointLocation =
  | { type: 'current-segment'; entryIndex: number }
  | { type: 'snapshot-boundary'; snapshotAsset: string }
  | { type: 'pre-snapshot-arbitrary'; snapshotAsset: string; entryIndex: number };

// ─── Error Types ─────────────────────────────────────────────────────────

/**
 * Branch-specific error codes.
 */
export type BranchErrorCode =
  | 'ENTRY_NOT_FOUND'
  | 'SNAPSHOT_NOT_FOUND'
  | 'REPLAY_NOT_AVAILABLE'
  | 'WRITE_FAILED'
  | 'SOURCE_LOAD_FAILED';
