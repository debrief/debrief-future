/**
 * STAC-related type definitions for the Debrief VS Code Extension
 *
 * STAC envelope types (StacItem, StacCatalog, StacCollection,
 * StacLink, StacAsset, StacExtent, StacSummaries, StacCatalogOrCollection,
 * StacProvider) are LinkML-rooted and re-exported from @debrief/schemas
 * per spec #223 — the audit's drift cluster has been resolved by
 * promoting the hand-types to schema-derived ones.
 *
 * UI-only Debrief-specific projections (StoreStatus, StacStore, Catalog,
 * StacItemSummary camelCase adapter, the createStore/buildStacUri/etc.
 * helpers) remain hand-typed because they do NOT cross Python↔TS — see
 * spec §OOS-001 / §OOS-002.
 */

import type { PlatformRecord } from '@debrief/schemas';
export type {
  PlatformRecord,
  StacItem,
  StacCatalog,
  StacCollection,
  StacLink,
  StacAsset,
  StacExtent,
  StacSpatialExtent,
  StacTemporalExtent,
  StacSummaries,
  StacProvider,
  StacCatalogOrCollection,
} from '@debrief/schemas';

/**
 * Store availability status
 */
export type StoreStatus = 'available' | 'unavailable' | 'checking';

/**
 * A registered STAC store
 */
export interface StacStore {
  /** Unique identifier (generated UUID) */
  id: string;

  /** Local filesystem path to the STAC catalog root */
  path: string;

  /** User-friendly display name (optional, defaults to directory name) */
  displayName?: string;

  /** Whether this store is currently accessible */
  status: StoreStatus;

  /** Error message if status is 'unavailable' */
  errorMessage?: string;
}

/**
 * A STAC Catalog
 */
export interface Catalog {
  /** STAC catalog ID */
  id: string;

  /** Catalog title from STAC metadata */
  title: string;

  /** Catalog description from STAC metadata */
  description?: string;

  /** Path to catalog.json relative to store root */
  catalogPath: string;

  /** Parent store ID */
  storeId: string;

  /** Number of items (plots) in this catalog */
  itemCount: number;
}

/**
 * A STAC Item summary (minimal info for tree display)
 *
 * Schema equivalent: @debrief/schemas#StacItemSummary
 * Not migrated: the generated StacItemSummary uses snake_case field names
 * (item_path, catalog_id, store_id, start_datetime, end_datetime,
 * feature_tags) while this type uses camelCase. All consumers
 * (stacService, stacTreeProvider, catalogOverviewPanel) depend on camelCase
 * field access. Rename would require coordinated update across all consumers.
 */
// eslint-disable-next-line no-restricted-syntax -- deliberate camelCase adapter over @debrief/schemas.StacItemSummary; follow-up to unify, #214 scope-adjacent
export interface StacItemSummary {
  /** STAC Item ID */
  id: string;

  /** Item title */
  title: string;

  /** Creation/capture timestamp */
  datetime: string;

  /** Path to item.json relative to store root */
  itemPath: string;

  /** Parent catalog ID */
  catalogId: string;

  /** Parent store ID (needed for URI construction) */
  storeId: string;

  /** Bounding box [west, south, east, north] */
  bbox?: [number, number, number, number] | null;

  /** Range start datetime (ISO 8601) */
  startDatetime?: string | null;

  /** Range end datetime (ISO 8601) */
  endDatetime?: string | null;

  /** Per-platform metadata from debrief:platforms */
  platforms?: readonly PlatformRecord[];

  /** Plot-level tags from debrief:tags */
  tags?: readonly string[];

  /** Feature-level tags from debrief:feature_tags */
  featureTags?: readonly string[];

  /**
   * Href to small thumbnail PNG (200x150), or null if not captured.
   *
   * Spec 241 rename: the field name now follows STAC convention — the small
   * variant (200x150) lives at `assets.thumbnail`, so `thumbnailHref`
   * unambiguously points at the small image. The large 800x600 variant
   * is exposed via the new `overviewHref` field below.
   */
  thumbnailHref?: string | null;

  /**
   * Href to large overview PNG (800x600), or null if not captured.
   *
   * Spec 241 rename: was `thumbnailHref` (which used to point at the
   * 800x600). Now lives at `assets.overview` per STAC 1.1 conventions
   * (`roles: ["overview"]`).
   */
  overviewHref?: string | null;
}

/**
 * Create a new store with default values
 */
export function createStore(path: string, displayName?: string): StacStore {
  return {
    id: generateStoreId(),
    path,
    displayName: displayName ?? getDirectoryName(path),
    status: 'checking',
  };
}

/**
 * Generate a unique store ID
 */
function generateStoreId(): string {
  return `store-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Extract directory name from path
 */
function getDirectoryName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] ?? path;
}

/**
 * Validate a store path
 */
export function isValidStorePath(path: string): boolean {
  // Path must be non-empty and absolute
  if (!path || path.length === 0) {
    return false;
  }

  // Check if absolute path (Unix or Windows)
  const isUnixAbsolute = path.startsWith('/');
  const isWindowsAbsolute = /^[A-Za-z]:[\\/]/.test(path);

  return isUnixAbsolute || isWindowsAbsolute;
}

/**
 * Build URI for a STAC item
 */
export function buildStacUri(storeId: string, itemPath: string): string {
  return `stac://${storeId}/${itemPath}`;
}

/**
 * Parse a STAC URI
 */
export function parseStacUri(uri: string): { storeId: string; itemPath: string } | null {
  const match = /^stac:\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!match) {
    return null;
  }

  const [, storeId, itemPath] = match;
  if (!storeId || !itemPath) {
    return null;
  }
  return { storeId, itemPath };
}
