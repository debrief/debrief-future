/**
 * Tests for the TypeScript area-summary tool.
 *
 * Mirrors the Python test suite in
 * services/calc/tests/tools/test_area_summary.py. Bug #107 (F-2.6) aligned
 * both implementations on a shared input contract:
 *
 *   1. An explicit bounding box (TS: ``params.bounds``; Python: ``context.bounds``)
 *      is consulted first.
 *   2. When no explicit bounds are supplied, the bbox is derived from the
 *      union of selected-feature coordinates.
 *   3. When neither path yields a valid bbox, the tool returns ``[]``.
 */

import { describe, it, expect } from 'vitest';
import { execute, toolDefinition } from '../areaSummary';
import type { DebriefFeature } from '@debrief/schemas';

/**
 * Statistics produced by area-summary. Defined explicitly so test
 * assertions don't need to cast through ``unknown`` (Constitution XV.7).
 */
interface AreaSummaryStatistics {
  area_sq_nm: number;
  width_nm: number;
  height_nm: number;
  centroid?: number[];
}

function asFeature(obj: unknown): DebriefFeature {
  return obj as DebriefFeature;
}

function statsOf(feature: { properties?: Record<string, unknown> | null }): AreaSummaryStatistics {
  if (!feature.properties) throw new Error('Expected non-null properties');
  return feature.properties.statistics as AreaSummaryStatistics;
}

const TRACK_FEATURE = asFeature({
  type: 'Feature',
  id: 't1',
  geometry: {
    type: 'LineString',
    coordinates: [[-5.0, 49.5], [-3.0, 51.0]],
  },
  properties: { kind: 'TRACK', name: 'HMS Test' },
});

const POINT_A = asFeature({
  type: 'Feature',
  id: 'p1',
  geometry: { type: 'Point', coordinates: [-4.0, 50.0] },
  properties: { kind: 'POINT' },
});

const POINT_B = asFeature({
  type: 'Feature',
  id: 'p2',
  geometry: { type: 'Point', coordinates: [-3.0, 51.0] },
  properties: { kind: 'POINT' },
});

const ZONE_POLYGON = asFeature({
  type: 'Feature',
  id: 'zone-1',
  geometry: {
    type: 'Polygon',
    coordinates: [[
      [-5.0, 49.5], [-3.0, 49.5], [-3.0, 51.0], [-5.0, 51.0], [-5.0, 49.5],
    ]],
  },
  properties: { kind: 'ZONE' },
});

describe('area-summary toolDefinition', () => {
  it('declares the canonical input kinds (#107 alignment)', () => {
    const kinds = toolDefinition.annotations['debrief:selectionRequirements'].map(
      (r: { kind: string }) => r.kind,
    );
    // Must match the Python ``input_kinds`` list (canonical FeatureKindEnum values)
    expect(new Set(kinds)).toEqual(
      new Set(['TRACK', 'POINT', 'RECTANGLE', 'CIRCLE', 'ZONE', 'POLY']),
    );
  });

  it('exposes an optional ``bounds`` parameter for the REGION-style input', () => {
    // MCP inputSchema declares ``properties`` as a loose schema bag (the
    // generated type is ``Record<string, unknown>``). ``inputSchema.properties.params``
    // is therefore ``unknown`` to TypeScript; cast it to the concrete JSON
    // Schema shape we author below to read its keys.
    interface ParamsJsonSchema { properties: { bounds?: object; include_centroid?: object } }
    const params = toolDefinition.inputSchema.properties.params as ParamsJsonSchema;
    expect(params.properties).toHaveProperty('bounds');
    expect(params.properties).toHaveProperty('include_centroid');
  });
});

describe('area-summary execute() — input alignment with Python', () => {
  it('uses explicit ``params.bounds`` when supplied (REGION-style path)', () => {
    // Bounds and features disagree on purpose: bounds wins.
    const wrongFeatures = [POINT_A]; // would yield a single-point bbox if used
    const results = execute(wrongFeatures, { bounds: [-5.0, 49.5, -3.0, 51.0] });

    expect(results).toHaveLength(1);
    expect(results[0].properties!.bounds).toEqual([-5.0, 49.5, -3.0, 51.0]);
  });

  it('falls back to feature-coordinate extraction when ``params.bounds`` is missing', () => {
    const results = execute([POINT_A, POINT_B], {});
    expect(results).toHaveLength(1);
    expect(results[0].properties!.bounds).toEqual([-4.0, 50.0, -3.0, 51.0]);
  });

  it('falls back to feature extraction when ``params.bounds`` has the wrong shape', () => {
    const results = execute([TRACK_FEATURE], { bounds: [1, 2, 3] }); // 3 elements
    expect(results).toHaveLength(1);
    expect(results[0].properties!.bounds).toEqual([-5.0, 49.5, -3.0, 51.0]);
  });

  it('falls back to feature extraction when ``params.bounds`` contains non-numeric values', () => {
    // ``params`` is intentionally Record<string, unknown> on the execute()
    // signature; we exercise the runtime validation path with a mixed-type
    // array. No cast through unknown is needed.
    const params: Record<string, unknown> = { bounds: [-5, 'x', -3, 51] };
    const results = execute([TRACK_FEATURE], params);
    expect(results).toHaveLength(1);
    expect(results[0].properties!.bounds).toEqual([-5.0, 49.5, -3.0, 51.0]);
  });

  it('returns [] when neither bounds nor features yield a valid bbox (matches Python)', () => {
    const results = execute([], {});
    expect(results).toEqual([]);
  });

  it('returns [] when bounds are absent and features have no usable coordinates', () => {
    const featureNoCoords = asFeature({
      type: 'Feature',
      id: 'narr-1',
      // No geometry at all
      properties: { kind: 'NARRATIVE' },
    });
    expect(execute([featureNoCoords], {})).toEqual([]);
  });

  it('accepts ZONE/POLY features and derives bounds from polygon coordinates', () => {
    const results = execute([ZONE_POLYGON], {});
    expect(results).toHaveLength(1);
    expect(results[0].properties!.bounds).toEqual([-5.0, 49.5, -3.0, 51.0]);
  });

  it('rounds the centroid to 4 decimals (matches Python)', () => {
    const results = execute([], { bounds: [-5.0, 49.5, -3.0, 51.0] });
    // Centroid of [-5.0, 49.5, -3.0, 51.0] is [-4.0, 50.25] — already finite.
    expect(statsOf(results[0]).centroid).toEqual([-4.0, 50.25]);
  });

  it('rounds centroid coordinates with >4 decimals (regression for unrounded TS centroid)', () => {
    // Bounds chosen so the midpoints have many decimal places but do NOT
    // land on an exact rounding-half boundary — that case differs between
    // Python's banker's rounding and JS Math.round (round-half-up) and is
    // not part of the input-contract alignment.
    const results = execute([], { bounds: [-5.12347, 49.11111, -3.98759, 51.22229] });
    expect(statsOf(results[0]).centroid).toEqual([-4.5555, 50.1667]);
  });

  it('omits centroid when include_centroid=false', () => {
    const results = execute([POINT_A, POINT_B], { include_centroid: false });
    expect(statsOf(results[0]).centroid).toBeUndefined();
  });

  it('produces a closed polygon geometry for the bbox', () => {
    const results = execute([], { bounds: [-5.0, 49.0, -3.0, 51.0] });
    const geom = results[0].geometry;
    if (!geom || geom.type !== 'Polygon') throw new Error('Expected Polygon geometry');
    // Polygon coordinates are number[][][] (outer ring + holes).
    const ring = (geom.coordinates as number[][][])[0];
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[ring.length - 1]); // closed ring
  });

  it('emits positive area / width / height for a non-degenerate bbox', () => {
    const results = execute([], { bounds: [-1.0, 49.0, 1.0, 51.0] });
    const stats = statsOf(results[0]);
    expect(stats.area_sq_nm).toBeGreaterThan(0);
    expect(stats.width_nm).toBeGreaterThan(0);
    expect(stats.height_nm).toBeGreaterThan(0);
  });
});
