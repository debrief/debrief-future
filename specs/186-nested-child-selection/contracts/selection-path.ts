/**
 * Contract: Selection Path Utilities
 * Feature: 186-nested-child-selection
 *
 * This file is a specification artifact — it defines the public API surface
 * of the refactored `services/session-state/src/utils/selectionPath.ts`
 * module. It is not compiled; the real implementation must satisfy this
 * contract and pass the golden fixtures in `golden-fixtures.json`.
 *
 * Delta from feature 053:
 *  - LEVEL_REGISTRY is sourced from `@debrief/schemas` (LinkML-derived), not
 *    hand-authored (FR-003, FR-004).
 *  - `validateAgainstRegistry(path)` rejects paths referencing unknown level
 *    names (FR-005). Previously advisory.
 *  - `computeRange(anchor, target)` produces the inclusive sibling range for
 *    Shift+click (FR-022); returns null when preconditions fail.
 *  - Flat-ID fallback semantics removed (FR-010): a single-segment path is
 *    just the zero-depth case of the general shape.
 */

import type {
  AddressingMode,
  LevelDefinition,
} from '@debrief/schemas';

// ─── Derived types ───────────────────────────────────────────────────

export type UnresolvableReason =
  | 'index-out-of-bounds'
  | 'id-not-found'
  | 'feature-not-found'
  | 'level-not-in-registry';

export interface PathLevel {
  readonly levelName: string;
  readonly address: string;
  readonly addressingMode: AddressingMode;
}

export interface ParsedPath {
  readonly raw: string;
  readonly normalised: string;
  readonly root: string;
  readonly levels: readonly PathLevel[];
  readonly depth: number;
}

export interface PathValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface UnresolvableFlag {
  readonly path: string;
  readonly reason: UnresolvableReason;
  readonly discoveredAt: 'click-time' | 'restore-time';
}

// ─── Registry access ─────────────────────────────────────────────────

/**
 * Returns the canonical Level Registry, generated from LinkML (FR-004).
 * The runtime identity of the map is guaranteed stable for the process
 * lifetime; callers may cache references.
 */
export declare function getLevelRegistry(): ReadonlyMap<string, LevelDefinition>;

// ─── Escape / Unescape (RFC 6901) ────────────────────────────────────

/**
 * Escape a raw segment value for inclusion in a path: `~` → `~0`, `/` → `~1`.
 * Order of operations: escape `~` first, then `/`.
 */
export declare function escapeSegment(raw: string): string;

/**
 * Unescape a path segment: `~1` → `/`, `~0` → `~`.
 * Order matters: unescape `~1` before `~0` to avoid double-decoding.
 * Throws on any other `~X` sequence (FR-012).
 */
export declare function unescapeSegment(segment: string): string;

// ─── Normalisation ───────────────────────────────────────────────────

/**
 * Normalise a selection path: trim, strip single trailing slash, reject
 * empty strings and double slashes. Returns empty string if input is
 * whitespace only (caller should treat empty string as invalid).
 */
export declare function normalisePath(raw: string): string;

// ─── Parse / Build ───────────────────────────────────────────────────

/**
 * Parse a selection path string. Throws on malformed input (FR-012).
 * Level names are resolved against the registry so the returned
 * `PathLevel` entries carry their addressing mode.
 *
 * Throws if:
 *  - input is empty or whitespace-only
 *  - any level name is not in the registry (FR-005)
 *  - segment count is even (would imply an unmatched level-name trailing)
 *  - any address is invalid for its level's addressing mode
 *  - escape sequences are malformed
 */
export declare function parsePath(raw: string): ParsedPath;

/**
 * Build a path from a root feature ID and an ordered list of level/address
 * pairs. The pairs are validated against the registry and the result is
 * parsed to confirm well-formedness.
 */
export declare function buildPath(
  rootFeatureId: string,
  levels: readonly { levelName: string; address: string }[]
): string;

// ─── Validation ──────────────────────────────────────────────────────

/**
 * Structural validation only — no registry lookup, no data resolution.
 * Returns a validation result listing every error found (does not throw).
 */
export declare function validatePathStructure(raw: string): PathValidationResult;

/**
 * Full validation including Level Registry (FR-005). Returns a validation
 * result listing every error; does not throw.
 */
export declare function validateAgainstRegistry(raw: string): PathValidationResult;

// ─── Navigation helpers (convenience) ────────────────────────────────

/** Extract the root feature ID (first unescaped segment). */
export declare function getRoot(path: string): string;

/** Depth: 0 for a single-segment path, N for a path with N level/address pairs. */
export declare function getDepth(path: string): number;

/** Parent path (one level up) or null if input is root-only. */
export declare function getParent(path: string): string | null;

/** True if the path is a single-segment whole-feature selection. */
export declare function isRootPath(path: string): boolean;

/**
 * True if `descendant` is a strict descendant of `ancestor` (they share the
 * same prefix and `descendant` has greater depth).
 */
export declare function isDescendantOf(descendant: string, ancestor: string): boolean;

// ─── Range computation (FR-022, FR-023, FR-024) ──────────────────────

/**
 * Compute the inclusive sibling range between `anchor` and `target`.
 *
 * Preconditions (all must hold; otherwise returns `null`):
 *  1. Both paths are well-formed and pass `validateAgainstRegistry`.
 *  2. They share the same parent path (identical prefix up to the last
 *     level-name segment).
 *  3. Their final level's `addressingMode` is `index` (FR-024; extensible
 *     later by allowing a canonical-order field on ID-based levels).
 *  4. Final addresses parse as non-negative integers.
 *
 * Returns the range inclusive of both endpoints, ordered ascending by
 * index, each element carrying the shared prefix and the same last level
 * name. Range is independent of click order — Shift+click from 9 to 4
 * produces [4, 5, 6, 7, 8, 9] just as 4 to 9 does.
 */
export declare function computeRange(
  anchor: string,
  target: string
): string[] | null;

// ─── Resolution (called by persistence/load) ─────────────────────────

/**
 * Resolve a path against a live feature collection.
 * Returns `null` if the path resolves cleanly.
 * Returns an `UnresolvableFlag` (without `discoveredAt`; caller sets it)
 * when resolution fails, citing the specific reason.
 *
 * Note: this function deliberately does not consult the DOM or any UI
 * state — it is pure and called from both click-time and restore-time
 * codepaths.
 */
export declare function resolvePath(
  path: string,
  featureCollection: FeatureCollectionLike
): Omit<UnresolvableFlag, 'discoveredAt'> | null;

// ─── Supporting types ────────────────────────────────────────────────

/**
 * Minimal view of a feature collection needed for path resolution.
 * Implementations may pass the full `FeatureCollection` — only these
 * fields are read.
 */
export interface FeatureCollectionLike {
  getFeatureById(id: string): FeatureLike | undefined;
}

export interface FeatureLike {
  id: string;
  /**
   * Look up a child at a given level by address. Returns undefined if no
   * such child exists at that level. Implementations:
   *  - `positions` (index mode): numeric index into the LineString coords.
   *  - `segments`  (id mode):    segment-by-id lookup.
   *  - extensible by registering new levels in the registry.
   */
  getChild(levelName: string, address: string): FeatureLike | undefined;
}
