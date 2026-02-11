/**
 * Branch Service Contract — API for branching operations.
 *
 * This contract defines the interface for the branch service module
 * that will be implemented in services/session-state/src/log/branchService.ts.
 *
 * Design follows the dependency injection pattern established by
 * #071 Log Service and #074 Snapshot Service.
 *
 * Feature: 075-branching
 */

import type { LogEntry } from '../../services/session-state/src/log/types';
import type {
  BranchFromOptions,
  BranchResult,
  BranchOrigin,
  BranchPointLocation,
} from './branch-types';
import type {
  SnapshotServiceDeps,
  GeoJsonFeatureCollection,
  GeoJsonFeature,
} from '../074-snapshots/contracts/snapshot-service';

// ─── Dependencies (injected for testability) ─────────────────────────────

/**
 * Dependencies required by the branch service.
 * Extends SnapshotServiceDeps to inherit snapshot chain navigation capabilities.
 */
export interface BranchServiceDeps extends SnapshotServiceDeps {
  /**
   * Create a new STAC Item for the branch plot.
   * Creates the Item directory structure and writes item.json.
   * Returns the path to the new Item directory.
   */
  createItem: (
    storePath: string,
    collectionPath: string,
    itemId: string
  ) => Promise<string>;

  /**
   * Write or overwrite a GeoJSON file at the given location.
   * Used to write the branch plot's GeoJSON.
   */
  writeGeoJson: (
    storePath: string,
    itemPath: string,
    featureCollection: GeoJsonFeatureCollection
  ) => Promise<void>;

  /**
   * Generate a unique branch identifier.
   * Default implementation: "branch-" + crypto.randomUUID().slice(0, 8)
   */
  generateBranchId: () => string;
}

// ─── Branch Service Interface ────────────────────────────────────────────

/**
 * Branch service providing branch creation and link management.
 *
 * Created via `createBranchService(deps)` factory function.
 */
export interface BranchService {
  /**
   * Create a branch from a specific point in the plot's Log history.
   *
   * Algorithm:
   * 1. Locate the branch point entry in the current segment or snapshot chain
   * 2. Determine the branch strategy (current-segment, snapshot-boundary, or unsupported)
   * 3. Build the branch FeatureCollection:
   *    a. Current segment: deep-copy working file, trim provenance to branch point
   *    b. Snapshot boundary: deep-copy snapshot file (already clean)
   * 4. Create system record on branch plot with BranchOrigin
   * 5. Write branch plot as new STAC Item
   * 6. Update source plot's system record: append BranchRecord, add FileProvEntry
   * 7. Mark source document dirty
   *
   * @throws Error with code ENTRY_NOT_FOUND if activityId is not in the Log history
   * @throws Error with code SNAPSHOT_NOT_FOUND if the required snapshot file is missing
   * @throws Error with code REPLAY_NOT_AVAILABLE if the entry is in a pre-snapshot
   *         range that requires tool replay (not yet implemented)
   * @throws Error with code WRITE_FAILED if the branch plot cannot be written to disk
   * @throws Error with code SOURCE_LOAD_FAILED if the source plot cannot be loaded
   */
  branchFrom(
    storePath: string,
    itemPath: string,
    collectionPath: string,
    options: BranchFromOptions
  ): Promise<BranchResult>;

  /**
   * Locate where a branch point entry exists in the plot's history.
   *
   * Searches the current working file's features first, then walks the
   * snapshot chain backward until the entry is found.
   *
   * @returns Location descriptor, or null if the entry is not found anywhere
   */
  locateBranchPoint(
    storePath: string,
    itemPath: string,
    activityId: string
  ): Promise<BranchPointLocation | null>;

  /**
   * Get the list of branches created from this plot.
   *
   * Reads the system record's branches[] array.
   * Returns empty array if no system record or no branches.
   */
  getBranches(
    storePath: string,
    itemPath: string
  ): Promise<import('./branch-types').BranchRecord[]>;

  /**
   * Get the branch origin for this plot (if it is a branch).
   *
   * Reads the system record's branchOrigin property.
   * Returns null if this plot is not a branch.
   */
  getBranchOrigin(
    storePath: string,
    itemPath: string
  ): Promise<BranchOrigin | null>;
}

// ─── Factory Function Signature ───────────────────────────────────────────

/**
 * Create a branch service with injected dependencies.
 *
 * Usage:
 * ```typescript
 * const branchService = createBranchService({
 *   loadGeoJson: stacService.loadGeoJson.bind(stacService),
 *   writeSnapshotAsset: stacService.writeSnapshotAsset.bind(stacService),
 *   loadSnapshotGeoJson: stacService.loadSnapshotGeoJson.bind(stacService),
 *   writeGeoJson: stacService.writeGeoJson.bind(stacService),
 *   markDirty: () => store.getState().markDirty(),
 *   createItem: stacService.createBranchItem.bind(stacService),
 *   generateBranchId: () => `branch-${crypto.randomUUID().slice(0, 8)}`,
 * });
 * ```
 */
export type CreateBranchService = (deps: BranchServiceDeps) => BranchService;

// ─── Pure Helper Function Signatures ──────────────────────────────────────

/**
 * Deep-copy a FeatureCollection and trim provenance arrays on all spatial
 * features to include only entries up to (and including) the specified activityId.
 *
 * System record provenance is NOT trimmed — only spatial features.
 *
 * @param featureCollection - The source FeatureCollection to copy and trim
 * @param branchPointActivityId - The activityId of the last entry to include
 * @returns A new FeatureCollection with trimmed provenance
 */
export type TrimProvenanceToEntry = (
  featureCollection: GeoJsonFeatureCollection,
  branchPointActivityId: string
) => GeoJsonFeatureCollection;

/**
 * Create a BranchRecord for the source plot's system record.
 */
export type CreateBranchRecord = (
  branchId: string,
  branchedFrom: string,
  branchedAt: string,
  targetAsset: string
) => import('./branch-types').BranchRecord;

/**
 * Create a BranchOrigin for the branch plot's system record.
 */
export type CreateBranchOrigin = (
  sourceAsset: string,
  branchedFrom: string,
  branchedAt: string,
  branchId: string
) => BranchOrigin;

/**
 * Create a FileProvEntry for a branch event.
 *
 * @param direction - "source" for the source plot, "target" for the branch plot
 */
export type CreateBranchProvEntry = (
  activityId: string,
  timestamp: string,
  asset: string,
  branchId: string,
  direction: 'source' | 'target'
) => import('./branch-types').FileProvEntry;

/**
 * Search for an activityId in a FeatureCollection's provenance arrays.
 * Returns the index of the entry in the first feature where it's found, or -1.
 */
export type FindEntryInFeatures = (
  featureCollection: GeoJsonFeatureCollection,
  activityId: string
) => number;
