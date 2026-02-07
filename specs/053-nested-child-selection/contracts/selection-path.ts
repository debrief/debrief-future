/**
 * Selection Path API Contract
 *
 * Feature: 053-nested-child-selection
 * Module: services/session-state
 *
 * These functions are added to the session-state package as pure utilities.
 * They operate on path strings and the level registry; they do not access
 * feature data or the store.
 */

// ─── Types ───────────────────────────────────────────────────────────

export type AddressingMode = 'id' | 'index';

export interface LevelDefinition {
  name: string;
  addressingMode: AddressingMode;
  description?: string;
}

export interface PathLevel {
  levelName: string;
  address: string;
}

export interface ParsedPath {
  raw: string;
  root: string;
  levels: PathLevel[];
  depth: number;
}

export interface PathValidationResult {
  valid: boolean;
  errors: string[];
}

// ─── Level Registry ──────────────────────────────────────────────────

/**
 * Returns the canonical set of level definitions.
 * Consumers use this to interpret path segments.
 */
export declare function getLevelRegistry(): ReadonlyMap<string, LevelDefinition>;

// ─── Path Utilities ──────────────────────────────────────────────────

/**
 * Escape a path segment per RFC 6901: `~` → `~0`, `/` → `~1`.
 */
export declare function escapeSegment(segment: string): string;

/**
 * Unescape a path segment per RFC 6901: `~1` → `/`, `~0` → `~`.
 * Order matters: unescape `~1` before `~0`.
 */
export declare function unescapeSegment(segment: string): string;

/**
 * Normalise a selection path:
 * - Trim whitespace
 * - Strip trailing slash
 * - Return empty string if input is empty/whitespace
 */
export declare function normalisePath(path: string): string;

/**
 * Parse a selection path into its constituent parts.
 * Does NOT validate against the level registry.
 *
 * @throws {Error} if path is empty or structurally invalid
 *
 * @example
 *   parsePath("track-001/positions/4")
 *   // → { raw: "track-001/positions/4", root: "track-001",
 *   //     levels: [{ levelName: "positions", address: "4" }], depth: 1 }
 *
 *   parsePath("track-001")
 *   // → { raw: "track-001", root: "track-001", levels: [], depth: 0 }
 */
export declare function parsePath(path: string): ParsedPath;

/**
 * Build a selection path from components.
 *
 * @example
 *   buildPath("track-001", [{ levelName: "positions", address: "4" }])
 *   // → "track-001/positions/4"
 */
export declare function buildPath(root: string, levels?: PathLevel[]): string;

/**
 * Extract the root feature ID from a selection path.
 * Equivalent to `parsePath(path).root` but cheaper.
 *
 * @example
 *   getRoot("track-001/positions/4")  // → "track-001"
 *   getRoot("track-001")              // → "track-001"
 */
export declare function getRoot(path: string): string;

/**
 * Get the nesting depth of a selection path.
 * 0 = root only, 1 = one child level, etc.
 */
export declare function getDepth(path: string): number;

/**
 * Check if a path is a root-only (whole-feature) selection.
 */
export declare function isRootPath(path: string): boolean;

/**
 * Get the parent path by removing the last level.
 * Returns null for root paths.
 *
 * @example
 *   getParent("track-001/segments/alpha/positions/3")
 *   // → "track-001/segments/alpha"
 *
 *   getParent("track-001/positions/4")
 *   // → "track-001"
 *
 *   getParent("track-001")
 *   // → null
 */
export declare function getParent(path: string): string | null;

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Validate structural well-formedness of a selection path.
 * Does NOT check against the level registry or feature data.
 *
 * Checks:
 * - Non-empty
 * - No empty segments
 * - Valid escape sequences (only `~0` and `~1`)
 * - Even number of child segments (level/address pairs)
 */
export declare function validatePathStructure(path: string): PathValidationResult;

/**
 * Validate a path against the level registry.
 * Checks that level names are known and addresses conform to
 * the expected addressing mode.
 *
 * @param path - The selection path to validate
 * @param registry - Level registry (defaults to canonical registry)
 */
export declare function validatePathSemantics(
  path: string,
  registry?: ReadonlyMap<string, LevelDefinition>,
): PathValidationResult;
