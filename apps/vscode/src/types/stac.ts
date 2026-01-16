/**
 * STAC-related type definitions for the Debrief VS Code Extension
 */

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
 */
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
