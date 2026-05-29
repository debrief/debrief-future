/**
 * Selection Path Utilities
 * Feature: 053-nested-child-selection
 *
 * Pure utility functions for parsing, building, and validating selection paths.
 * Selection paths use forward-slash-separated segments with RFC 6901 escaping.
 *
 * Path format: {featureId}[/{levelName}/{address}]*
 * Examples:
 *   "track-001"                          — root only (depth 0)
 *   "track-001/positions/4"              — position within track (depth 1)
 *   "track-001/segments/leg-alpha/positions/3" — depth 2
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

const LEVEL_REGISTRY: ReadonlyMap<string, LevelDefinition> = new Map([
  ['positions', { name: 'positions', addressingMode: 'index', description: 'Individual position within a track or segment' }],
  ['segments', { name: 'segments', addressingMode: 'id', description: 'Named track segment' }],
  ['points', { name: 'points', addressingMode: 'index', description: 'Individual point within a MultiPoint geometry' }],
  ['polygons', { name: 'polygons', addressingMode: 'index', description: 'Individual polygon within a MultiPolygon geometry' }],
  // Spec 192 (Phase 2 — Selection-Mode Resolver): vertex-bearing levels for
  // Polygon (rings/R/vertices/V), LineString and MultiPoint (vertices/V), and
  // single-Point (vertex/0) paths used by the sub-feature editor.
  ['rings', { name: 'rings', addressingMode: 'index', description: 'Linear ring within a Polygon geometry' }],
  ['vertices', { name: 'vertices', addressingMode: 'index', description: 'Vertex within a LineString, MultiPoint, or Polygon ring' }],
  ['vertex', { name: 'vertex', addressingMode: 'index', description: 'The single vertex of a Point geometry (always 0)' }],
]);

/**
 * Returns the canonical set of level definitions.
 */
export function getLevelRegistry(): ReadonlyMap<string, LevelDefinition> {
  return LEVEL_REGISTRY;
}

// ─── Escape / Unescape ──────────────────────────────────────────────

/**
 * Escape a path segment per RFC 6901: `~` → `~0`, `/` → `~1`.
 */
export function escapeSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

/**
 * Unescape a path segment per RFC 6901: `~1` → `/`, `~0` → `~`.
 * Order matters: unescape `~1` before `~0`.
 */
export function unescapeSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

// ─── Normalisation ──────────────────────────────────────────────────

/**
 * Normalise a selection path: trim whitespace, strip trailing slash.
 * Returns empty string if input is empty/whitespace.
 */
export function normalisePath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length === 0) return '';
  // Strip trailing slash
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

// ─── Parsing ────────────────────────────────────────────────────────

/**
 * Parse a selection path into its constituent parts.
 * Does NOT validate against the level registry.
 *
 * @throws {Error} if path is empty or structurally invalid
 */
export function parsePath(path: string): ParsedPath {
  const normalised = normalisePath(path);
  if (normalised.length === 0) {
    throw new Error('Selection path must not be empty');
  }

  const segments = normalised.split('/');

  // Check for empty segments (from //)
  for (const seg of segments) {
    if (seg.length === 0) {
      throw new Error('Selection path must not contain empty segments');
    }
  }

  const root = segments[0]!;
  const childSegments = segments.slice(1);

  // Child segments must come in pairs: levelName, address
  if (childSegments.length % 2 !== 0) {
    throw new Error('Selection path has incomplete level (missing address)');
  }

  const levels: PathLevel[] = [];
  for (let i = 0; i < childSegments.length; i += 2) {
    levels.push({
      levelName: childSegments[i]!,
      address: childSegments[i + 1]!,
    });
  }

  return {
    raw: normalised,
    root,
    levels,
    depth: levels.length,
  };
}

// ─── Building ───────────────────────────────────────────────────────

/**
 * Build a selection path from components.
 */
export function buildPath(root: string, levels?: PathLevel[]): string {
  if (!levels || levels.length === 0) return root;
  const parts = [root];
  for (const level of levels) {
    parts.push(level.levelName, level.address);
  }
  return parts.join('/');
}

// ─── Convenience Accessors ──────────────────────────────────────────

/**
 * Extract the root feature ID from a selection path.
 * Equivalent to `parsePath(path).root` but cheaper.
 */
export function getRoot(path: string): string {
  const slashIndex = path.indexOf('/');
  return slashIndex === -1 ? path : path.slice(0, slashIndex);
}

/**
 * Get the nesting depth of a selection path.
 * 0 = root only, 1 = one child level, etc.
 */
export function getDepth(path: string): number {
  if (!path.includes('/')) return 0;
  const segments = path.split('/');
  // (total segments - 1) / 2 = number of level/address pairs
  return (segments.length - 1) / 2;
}

/**
 * Check if a path is a root-only (whole-feature) selection.
 */
export function isRootPath(path: string): boolean {
  return !path.includes('/');
}

/**
 * Get the parent path by removing the last level.
 * Returns null for root paths.
 */
export function getParent(path: string): string | null {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash === -1) return null;
  // We need to remove the last two segments (levelName/address)
  const secondLastSlash = path.lastIndexOf('/', lastSlash - 1);
  if (secondLastSlash === -1) {
    // Only one level: root/levelName/address → root
    return path.slice(0, path.indexOf('/'));
  }
  return path.slice(0, secondLastSlash);
}

// ─── Validation ─────────────────────────────────────────────────────

/**
 * Check for invalid escape sequences (anything other than ~0 or ~1).
 */
function hasInvalidEscapes(path: string): boolean {
  // Match ~ followed by anything that isn't 0 or 1
  return /~[^01]/g.test(path);
}

/**
 * Validate structural well-formedness of a selection path.
 */
export function validatePathStructure(path: string): PathValidationResult {
  const errors: string[] = [];

  // Non-empty
  const normalised = normalisePath(path);
  if (normalised.length === 0) {
    return { valid: false, errors: ['Path must not be empty'] };
  }

  // Check for invalid escape sequences
  if (hasInvalidEscapes(normalised)) {
    errors.push('Invalid escape sequence (only ~0 and ~1 are valid)');
  }

  const segments = normalised.split('/');

  // No empty segments
  for (const seg of segments) {
    if (seg.length === 0) {
      errors.push('Path must not contain empty segments');
      break;
    }
  }

  // Even number of child segments
  const childCount = segments.length - 1;
  if (childCount > 0 && childCount % 2 !== 0) {
    errors.push('Incomplete level: level name without address');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a path against the level registry.
 * Checks that level names are known and addresses conform to the expected addressing mode.
 */
export function validatePathSemantics(
  path: string,
  registry?: ReadonlyMap<string, LevelDefinition>,
): PathValidationResult {
  const reg = registry ?? LEVEL_REGISTRY;
  const errors: string[] = [];

  // First check structural validity
  const structural = validatePathStructure(path);
  if (!structural.valid) {
    return structural;
  }

  let parsed: ParsedPath;
  try {
    parsed = parsePath(path);
  } catch (e) {
    return { valid: false, errors: [(e as Error).message] };
  }

  for (const level of parsed.levels) {
    const def = reg.get(level.levelName);
    if (!def) {
      errors.push(`Unknown level name: "${level.levelName}"`);
      continue;
    }

    // Check addressing mode conformance
    if (def.addressingMode === 'index') {
      if (!/^\d+$/.test(level.address)) {
        errors.push(`Level "${level.levelName}" requires numeric index, got "${level.address}"`);
      }
    }
    // For 'id' mode, any non-empty string is valid (already checked by parsePath)
  }

  // Spec 192: structural constraints on the vertex-bearing levels.
  // - `rings/R` MUST be followed by `vertices/V` (Polygon path is two levels).
  // - `vertex` is only valid as a single-level path with the literal address `0`
  //   (single-vertex Point geometry).
  for (let i = 0; i < parsed.levels.length; i++) {
    const level = parsed.levels[i]!;
    if (level.levelName === 'rings') {
      const next = parsed.levels[i + 1];
      if (!next || next.levelName !== 'vertices') {
        errors.push('Level "rings" must be followed by "vertices/<index>"');
      }
    }
    if (level.levelName === 'vertex') {
      if (level.address !== '0') {
        errors.push(`Level "vertex" only accepts address "0", got "${level.address}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
