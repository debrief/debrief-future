/**
 * Snapshot Service Contract — API for snapshot operations.
 *
 * This contract defines the interface for the snapshot service module
 * that will be implemented in services/session-state/src/log/snapshotService.ts.
 *
 * Design follows the dependency injection pattern established by #071 Log Service.
 *
 * Feature: 074-snapshots
 */

import type { LogEntry } from '../../services/session-state/src/log/types';
import type {
  CreateSnapshotOptions,
  SnapshotResult,
  SnapshotBoundary,
  SnapshotEntriesResult,
  CrossSnapshotTimelineOptions,
  SnapshotLinks,
  FileProvEntry,
} from './snapshot-types';

// ─── Dependencies (injected for testability) ─────────────────────────────

/**
 * Dependencies required by the snapshot service.
 * Extends the LogServiceDeps pattern from #071.
 */
export interface SnapshotServiceDeps {
  /**
   * Load the working GeoJSON FeatureCollection from a STAC Item.
   * Returns null if the file doesn't exist.
   */
  loadGeoJson: (
    storePath: string,
    itemPath: string
  ) => Promise<GeoJsonFeatureCollection | null>;

  /**
   * Write a snapshot GeoJSON file as a STAC asset.
   * Returns the full path to the written file.
   */
  writeSnapshotAsset: (
    storePath: string,
    itemPath: string,
    filename: string,
    data: string
  ) => Promise<string>;

  /**
   * Load a snapshot GeoJSON file by its asset filename.
   * Returns null if the file doesn't exist.
   */
  loadSnapshotGeoJson: (
    storePath: string,
    itemPath: string,
    assetFilename: string
  ) => Promise<GeoJsonFeatureCollection | null>;

  /**
   * Overwrite the working GeoJSON file with updated content.
   * Used after clearing provenance arrays post-snapshot.
   */
  writeGeoJson: (
    storePath: string,
    itemPath: string,
    featureCollection: GeoJsonFeatureCollection
  ) => Promise<void>;

  /**
   * Mark the session document as dirty (triggers save indicator).
   */
  markDirty: () => void;
}

// ─── Minimal GeoJSON Types ────────────────────────────────────────────────

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

// ─── Snapshot Service Interface ───────────────────────────────────────────

/**
 * Snapshot service providing snapshot creation and history navigation.
 *
 * Created via `createSnapshotService(deps)` factory function.
 */
export interface SnapshotService {
  /**
   * Create a snapshot of the current plot state.
   *
   * Algorithm:
   * 1. Load the working GeoJSON
   * 2. Build a clean copy (strip provenance from spatial features)
   * 3. Populate snapshot system record with chain links
   * 4. Write snapshot file as STAC asset
   * 5. Update working file: clear spatial feature provenance, update system record links
   * 6. Update previous snapshot's next link (if exists)
   * 7. Record file-level provenance entry on both system records
   * 8. Mark document dirty
   *
   * If options.fromEntryId is provided, creates a "capture from here" snapshot:
   * - Snapshot captures state at the specified entry
   * - Working file retains entries after the specified entry
   *
   * Atomic guarantee (FR-015): If the snapshot file cannot be written,
   * no changes are made to the working file.
   *
   * @throws Error if working GeoJSON cannot be loaded
   * @throws Error if snapshot file cannot be written (disk full, permissions)
   * @throws Error if fromEntryId is provided but not found in any feature's provenance
   */
  createSnapshot(
    storePath: string,
    itemPath: string,
    options?: CreateSnapshotOptions
  ): Promise<SnapshotResult>;

  /**
   * Check if a snapshot boundary exists for the current plot.
   *
   * Returns the boundary information (asset filename + entry count)
   * without loading the snapshot file. Used by the Log Panel to display
   * "Show earlier history (N earlier operations)".
   *
   * @returns Boundary info or null if no previous snapshot exists
   */
  getSnapshotBoundary(
    storePath: string,
    itemPath: string
  ): Promise<SnapshotBoundary | null>;

  /**
   * Load Log entries from a previous snapshot.
   *
   * Reads the referenced snapshot GeoJSON file, extracts Log entries
   * from all features, and returns them along with the next boundary
   * (if the snapshot itself has a previous snapshot).
   *
   * This is a read-only operation — the snapshot file is not modified.
   *
   * @returns Entries from the snapshot + next boundary info
   * @throws Error if the snapshot file cannot be read
   */
  loadSnapshotEntries(
    storePath: string,
    itemPath: string,
    assetFilename: string
  ): Promise<SnapshotEntriesResult>;

  /**
   * Assemble a cross-snapshot timeline from current entries and
   * previously loaded snapshot entries.
   *
   * Merges all entries, deduplicates on activityId, and sorts
   * by timestamp ascending.
   *
   * This is a pure function — no I/O, no side effects.
   *
   * @param currentFeatures - The current working file's FeatureCollection
   * @param options - Previously loaded entries to merge
   * @returns Unified, sorted, deduplicated timeline
   */
  assembleCrossSnapshotTimeline(
    currentFeatures: GeoJsonFeatureCollection,
    options?: CrossSnapshotTimelineOptions
  ): LogEntry[];
}

// ─── Factory Function Signature ───────────────────────────────────────────

/**
 * Create a snapshot service with injected dependencies.
 *
 * Usage:
 * ```typescript
 * const snapshotService = createSnapshotService({
 *   loadGeoJson: stacService.loadGeoJson.bind(stacService),
 *   writeSnapshotAsset: stacService.writeSnapshotAsset.bind(stacService),
 *   loadSnapshotGeoJson: stacService.loadSnapshotGeoJson.bind(stacService),
 *   writeGeoJson: stacService.writeGeoJson.bind(stacService),
 *   markDirty: () => store.getState().markDirty(),
 * });
 * ```
 */
export type CreateSnapshotService = (deps: SnapshotServiceDeps) => SnapshotService;

// ─── Pure Helper Function Signatures ──────────────────────────────────────

/**
 * Find the system record in a FeatureCollection.
 * Returns the feature with properties.featureType === "system", or null.
 */
export type FindSystemRecord = (
  featureCollection: GeoJsonFeatureCollection
) => GeoJsonFeature | null;

/**
 * Create a minimal system record feature if one doesn't exist.
 * Returns a new Feature with empty snapshotLinks, branches, and provenance.
 */
export type CreateSystemRecord = () => GeoJsonFeature;

/**
 * Strip provenance arrays from all spatial features in a FeatureCollection.
 * Returns a deep copy with provenance cleared. Does NOT strip system record provenance.
 */
export type StripSpatialProvenance = (
  featureCollection: GeoJsonFeatureCollection
) => GeoJsonFeatureCollection;

/**
 * Count total Log entries across all spatial features in a FeatureCollection.
 * Used to populate provEntryCount on snapshot links.
 */
export type CountLogEntries = (
  featureCollection: GeoJsonFeatureCollection
) => number;

/**
 * Generate a snapshot filename from the current timestamp.
 * Format: plot-snap-{ISO-timestamp-with-hyphens}.geojson
 * Example: plot-snap-2026-02-09T14-30-00.geojson
 */
export type GenerateSnapshotFilename = (timestamp?: Date) => string;
