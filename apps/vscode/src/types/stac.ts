/**
 * STAC-related type definitions for the Debrief VS Code Extension
 */

import type { PlatformRecord } from '@debrief/schemas';
export type { PlatformRecord };

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
 * Full STAC Item (from catalog.json)
 */
export interface StacItem {
  type: 'Feature';
  stac_version: string;
  id: string;
  geometry: GeoJSON.Geometry;
  bbox: [number, number, number, number];
  properties: {
    datetime: string;
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  links: StacLink[];
  assets: Record<string, StacAsset>;
}

/**
 * STAC Link
 */
export interface StacLink {
  rel: string;
  href: string;
  type?: string;
  title?: string;
}

/**
 * STAC Asset
 */
export interface StacAsset {
  href: string;
  type?: string;
  title?: string;
  roles?: string[];
}

/**
 * STAC Catalog JSON structure
 */
export interface StacCatalog {
  type: 'Catalog';
  stac_version: string;
  id: string;
  title?: string;
  description: string;
  links: StacLink[];
}

/**
 * Spatial and temporal extent of a STAC Collection
 */
export interface StacExtent {
  spatial: {
    /** Bounding boxes as [[west, south, east, north]] */
    bbox: [number, number, number, number][];
  };
  temporal: {
    /** Temporal intervals as [[start, end]] (ISO 8601 strings or null) */
    interval: [string | null, string | null][];
  };
}

/**
 * Pre-aggregated summaries of extension properties across all items
 */
export interface StacSummaries {
  'debrief:platforms'?: PlatformRecord[];
  'debrief:tags'?: string[];
  'debrief:feature_tags'?: string[];
}

/**
 * STAC Collection JSON structure (extends Catalog with extent, summaries, license)
 */
export interface StacCollection {
  type: 'Collection';
  stac_version: string;
  id: string;
  title?: string;
  description: string;
  license: string;
  extent: StacExtent;
  summaries?: StacSummaries;
  links: StacLink[];
}

/**
 * Union type for catalog.json which may be either a Catalog or a promoted Collection
 */
export type StacCatalogOrCollection = StacCatalog | StacCollection;

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
