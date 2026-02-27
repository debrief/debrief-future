/**
 * Schema cache interface for tool parameter schemas.
 *
 * Cached in webview React state. Populated lazily on first card flip
 * per tool type. Invalidated only on session change.
 */

import type { ParameterSchemaEntry } from './webview-messages';

// ---------------------------------------------------------------------------
// Cache entry
// ---------------------------------------------------------------------------

export interface SchemaCacheEntry {
  /** Tool identifier (kebab-case). */
  readonly toolId: string;

  /** Parameter schema entries, in display order. */
  readonly parameters: ReadonlyArray<ParameterSchemaEntry>;

  /** Timestamp when this entry was cached (for diagnostics). */
  readonly cachedAt: number;
}

// ---------------------------------------------------------------------------
// Cache interface
// ---------------------------------------------------------------------------

export interface SchemaCache {
  /** Get cached schema for a tool. Returns undefined if not cached. */
  get(toolId: string): SchemaCacheEntry | undefined;

  /** Store schema for a tool. Overwrites any existing entry. */
  set(toolId: string, parameters: ReadonlyArray<ParameterSchemaEntry>): void;

  /** Check if a schema is cached for a tool. */
  has(toolId: string): boolean;

  /** Clear the entire cache (e.g., on session change). */
  clear(): void;

  /** Number of cached schemas. */
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new schema cache instance backed by a Map.
 *
 * Usage:
 * ```typescript
 * const cache = createSchemaCache();
 * cache.set('calculate-range', [...parameters]);
 * const schema = cache.get('calculate-range');
 * ```
 */
export type CreateSchemaCache = () => SchemaCache;
