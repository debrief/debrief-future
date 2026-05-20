/**
 * Selection → Editing-mode resolver (Spec 192, Phase 2, T012).
 *
 * Pure, total derivation of the current `EditingMode` from a `FeatureSelection`
 * and the resolved feature map. See contracts/selection-mode.md for the
 * resolution rules and the 16 covered Vitest cases.
 *
 * Boundary: the resolver MUST NOT mutate either input. Callers react to
 * `{ kind: 'stale' }` by dispatching `clearSelection()`.
 */

import type { DebriefFeature } from '@debrief/schemas';
import type { FeatureSelection } from '@debrief/session-state/browser';
import { parsePath } from '@debrief/session-state/browser';

// ─── Public types ────────────────────────────────────────────────────

export type EditingMode =
  | { kind: 'plot' }
  | { kind: 'feature'; featureId: string }
  | { kind: 'subfeature'; featureId: string; path: string }
  | { kind: 'multi'; featureIds: string[] }
  | { kind: 'stale' };

// The contract refers to a generic `Feature` type from `@debrief/schemas`.
// `@debrief/schemas` exports the discriminated union as `DebriefFeature`;
// we alias it here so the public signature matches the contract verbatim.
export type Feature = DebriefFeature;

// ─── Vertex-bearing level set ───────────────────────────────────────

const VERTEX_LEVEL_NAMES: ReadonlySet<string> = new Set([
  'positions',
  'rings',
  'vertices',
  'vertex',
]);

// ─── Geometry-aware bounds checks ───────────────────────────────────

/**
 * Read the addressable length of a Track's positions array.
 *
 * Per `TrackProperties`, the canonical addressed array for a `positions/N`
 * path is `properties.positions: TimestampedPosition[]`. Track geometry is
 * either a `LineString` (flat) or `MultiLineString` (compound); the metadata
 * array is parallel to the flattened coordinate sequence and is the source
 * of truth for vertex addressing.
 */
function trackPositionCount(feature: Feature): number | null {
  const properties = (feature as { properties?: unknown }).properties;
  if (properties === undefined || properties === null) return null;
  const positions = (properties as { positions?: unknown }).positions;
  if (!Array.isArray(positions)) return null;
  return positions.length;
}

interface MinimalGeometry {
  type?: unknown;
  coordinates?: unknown;
}

function getGeometry(feature: Feature): MinimalGeometry | null {
  const geometry = (feature as { geometry?: unknown }).geometry;
  if (geometry === undefined || geometry === null) return null;
  if (typeof geometry !== 'object') return null;
  return geometry as MinimalGeometry;
}

/** Parse a non-negative integer string. Returns null on any failure. */
function parseIndex(address: string): number | null {
  if (!/^\d+$/.test(address)) return null;
  const n = Number.parseInt(address, 10);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/**
 * Resolution rule (1)/(2): is the parsed-path's vertex-bearing tail valid
 * against the supplied feature's geometry?
 *
 * Returns:
 *   - { ok: true } when the indices are in range
 *   - { ok: false } when the path addresses a vertex-bearing level but the
 *     index is out of range → caller maps to `stale`
 *   - { ok: null } when the path's first child level is NOT vertex-bearing
 *     (e.g. `segments/...`) → caller falls through to feature/multi rules
 */
function checkVertexPathInRange(
  feature: Feature,
  levels: ReadonlyArray<{ levelName: string; address: string }>,
): { ok: true } | { ok: false } | { ok: null } {
  if (levels.length === 0) return { ok: null };
  const head = levels[0]!;
  if (!VERTEX_LEVEL_NAMES.has(head.levelName)) return { ok: null };

  if (head.levelName === 'positions') {
    // Track: addressed against properties.positions[]
    const count = trackPositionCount(feature);
    const index = parseIndex(head.address);
    if (count === null || index === null) return { ok: false };
    return { ok: index < count };
  }

  if (head.levelName === 'vertices') {
    // LineString / MultiPoint: addressed against geometry.coordinates[]
    const geom = getGeometry(feature);
    if (geom === null) return { ok: false };
    const coords = geom.coordinates;
    if (!Array.isArray(coords)) return { ok: false };
    const index = parseIndex(head.address);
    if (index === null) return { ok: false };
    return { ok: index < coords.length };
  }

  if (head.levelName === 'vertex') {
    // Point: only `vertex/0` is valid, and the geometry must be a Point
    // with a non-empty coordinates tuple.
    if (head.address !== '0') return { ok: false };
    const geom = getGeometry(feature);
    if (geom === null) return { ok: false };
    const coords = geom.coordinates;
    if (!Array.isArray(coords) || coords.length === 0) return { ok: false };
    return { ok: true };
  }

  if (head.levelName === 'rings') {
    // Polygon: addressed against geometry.coordinates[ring][vertex].
    // Must be followed by a `vertices/<index>` level.
    const geom = getGeometry(feature);
    if (geom === null) return { ok: false };
    const rings = geom.coordinates;
    if (!Array.isArray(rings)) return { ok: false };
    const ringIndex = parseIndex(head.address);
    if (ringIndex === null) return { ok: false };
    if (ringIndex >= rings.length) return { ok: false };
    const ring = rings[ringIndex];
    if (!Array.isArray(ring)) return { ok: false };

    const next = levels[1];
    if (!next || next.levelName !== 'vertices') return { ok: false };
    const vertexIndex = parseIndex(next.address);
    if (vertexIndex === null) return { ok: false };
    return { ok: vertexIndex < ring.length };
  }

  return { ok: null };
}

/**
 * Safely parse a selection-path string. Returns null on any parse failure.
 * `parsePath` is structural only; semantic validation (against the level
 * registry) is intentionally skipped here so the resolver can fall through
 * to feature/multi rules for non-vertex structured paths.
 */
function tryParse(
  path: string,
): { root: string; levels: ReadonlyArray<{ levelName: string; address: string }> } | null {
  try {
    const parsed = parsePath(path);
    return { root: parsed.root, levels: parsed.levels };
  } catch {
    return null;
  }
}

// ─── Public API ─────────────────────────────────────────────────────

export function resolveEditingMode(
  selection: FeatureSelection,
  featuresById: ReadonlyMap<string, Feature>,
): EditingMode {
  // Rule (1)/(2): vertex-bearing primary path.
  if (selection.primary !== null) {
    const parsed = tryParse(selection.primary);
    if (parsed !== null && parsed.levels.length > 0) {
      const feature = featuresById.get(parsed.root);
      const head = parsed.levels[0]!;
      if (VERTEX_LEVEL_NAMES.has(head.levelName)) {
        if (feature === undefined) return { kind: 'stale' };
        const check = checkVertexPathInRange(feature, parsed.levels);
        if (check.ok === true) {
          const levelsPath = parsed.levels
            .map(l => `${l.levelName}/${l.address}`)
            .join('/');
          return {
            kind: 'subfeature',
            featureId: parsed.root,
            path: levelsPath,
          };
        }
        if (check.ok === false) return { kind: 'stale' };
        // check.ok === null → fall through to feature/multi rules below
      }
      // Non-vertex structured path (e.g. `segments/...`): treat as
      // a whole-feature pointer for the purposes of mode resolution.
    }
  }

  // Rules (3)/(4)/(5): featureIds-based resolution.
  // The selection may contain structured paths; reduce each to its root
  // before checking against the feature map.
  const roots: string[] = [];
  for (const id of selection.featureIds) {
    const parsed = tryParse(id);
    roots.push(parsed !== null ? parsed.root : id);
  }
  const resolved = roots.filter(r => featuresById.has(r));

  if (selection.featureIds.length === 0 && selection.primary === null) {
    // Rule (6): plot
    return { kind: 'plot' };
  }

  if (roots.length === 1) {
    return resolved.length === 1
      ? { kind: 'feature', featureId: resolved[0]! }
      : { kind: 'stale' };
  }

  if (roots.length >= 2) {
    if (resolved.length >= 2) {
      return { kind: 'multi', featureIds: resolved };
    }
    if (resolved.length === 1) {
      return { kind: 'feature', featureId: resolved[0]! };
    }
    return { kind: 'stale' };
  }

  // featureIds.length === 0 but primary !== null (and primary didn't resolve
  // to a vertex/feature above) → treat as stale per rule (4)/(6) edge.
  return { kind: 'plot' };
}
