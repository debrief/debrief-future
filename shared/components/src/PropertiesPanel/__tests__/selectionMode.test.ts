/**
 * Unit tests for resolveEditingMode (Spec 192 — Phase 2, T011).
 *
 * Covers all 16 cases from contracts/selection-mode.md.
 *
 * Article VII.1: tests authored before the implementation in selectionMode.ts.
 */

import { describe, it, expect } from 'vitest';
import type {
  DebriefFeature,
  TrackFeature,
  ReferenceLocation,
  MultiPointFeature,
  PolyAnnotation,
  LineAnnotation,
} from '@debrief/schemas';
import type { FeatureSelection } from '@debrief/session-state';
import { resolveEditingMode } from '../selectionMode';

// ─── Fixture builders ────────────────────────────────────────────────

function buildTrack(id: string, positionCount: number): TrackFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: positionCount }, (_, i) => [
        -5 + i * 0.1,
        50,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'TRACK',
      platform_id: 'PLT-001',
      track_type: 'OWNSHIP',
      start_time: '2024-01-15T08:00:00Z',
      end_time: '2024-01-15T12:00:00Z',
      positions: Array.from({ length: positionCount }, (_, i) => ({
        time: new Date(Date.UTC(2024, 0, 15, 8, i)).toISOString(),
      })),
    },
  } as TrackFeature;
}

function buildPolygon(
  id: string,
  ringSizes: number[],
): PolyAnnotation {
  const coordinates: number[][][] = ringSizes.map((size, ringIdx) =>
    Array.from({ length: size }, (_, vIdx) => [
      ringIdx + vIdx * 0.01,
      ringIdx + vIdx * 0.01,
    ]),
  );
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Polygon',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: coordinates as unknown as number[][][],
    },
    properties: {
      kind: 'ANNOTATION_POLY',
      vertex_count: ringSizes[0]! - 1,
    },
  } as PolyAnnotation;
}

function buildLineString(id: string, vertexCount: number): LineAnnotation {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'LineString',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: vertexCount }, (_, i) => [
        -1 + i * 0.1,
        2,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'ANNOTATION_LINE',
    },
  } as LineAnnotation;
}

function buildMultiPoint(id: string, vertexCount: number): MultiPointFeature {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'MultiPoint',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: Array.from({ length: vertexCount }, (_, i) => [
        10 + i,
        20 + i,
      ]) as unknown as number[],
    },
    properties: {
      kind: 'MULTI_POINT',
      points: Array.from({ length: vertexCount }, (_, i) => ({
        index: i,
        name: `Ref ${i + 1}`,
      })),
    },
  } as MultiPointFeature;
}

function buildPoint(id: string): ReferenceLocation {
  return {
    type: 'Feature',
    id,
    geometry: {
      type: 'Point',
      // eslint-disable-next-line no-restricted-syntax
      coordinates: [-3, 52] as unknown as number[],
    },
    properties: {
      kind: 'POINT',
    },
  } as ReferenceLocation;
}

function buildSelection(
  featureIds: string[],
  primary: string | null = null,
): FeatureSelection {
  return {
    featureIds,
    primary: primary ?? (featureIds.length > 0 ? featureIds[0]! : null),
    timestamp: { epoch: 0, iso: '1970-01-01T00:00:00.000Z' },
  };
}

// Canonical fixture map: a Track (50 positions), a Polygon (2 rings: 4 + 6),
// a LineString (5 vertices), a MultiPoint (3 vertices), and a Point.
function buildFeatures(): ReadonlyMap<string, DebriefFeature> {
  const m = new Map<string, DebriefFeature>();
  m.set('track-1', buildTrack('track-1', 50));
  m.set('poly-1', buildPolygon('poly-1', [4, 6]));
  m.set('line-1', buildLineString('line-1', 5));
  m.set('mp-1', buildMultiPoint('mp-1', 3));
  m.set('point-1', buildPoint('point-1'));
  return m;
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('resolveEditingMode', () => {
  it('empty selection → plot', () => {
    const features = buildFeatures();
    const sel = buildSelection([], null);
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'plot' });
  });

  it('one valid feature id → feature', () => {
    const features = buildFeatures();
    const sel = buildSelection(['track-1'], 'track-1');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'feature',
      featureId: 'track-1',
    });
  });

  it('one missing feature id → stale', () => {
    const features = buildFeatures();
    const sel = buildSelection(['ghost-99'], 'ghost-99');
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });

  it('two valid feature ids → multi (preserves order)', () => {
    const features = buildFeatures();
    const sel = buildSelection(['poly-1', 'track-1'], 'poly-1');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'multi',
      featureIds: ['poly-1', 'track-1'],
    });
  });

  it('two ids, one missing → feature (the surviving one)', () => {
    const features = buildFeatures();
    const sel = buildSelection(['ghost-99', 'track-1'], 'ghost-99');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'feature',
      featureId: 'track-1',
    });
  });

  it('two missing ids → stale', () => {
    const features = buildFeatures();
    const sel = buildSelection(['ghost-1', 'ghost-2'], 'ghost-1');
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });

  it('valid positions path → subfeature (path = "positions/N")', () => {
    const features = buildFeatures();
    const sel = buildSelection(['track-1/positions/4'], 'track-1/positions/4');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'subfeature',
      featureId: 'track-1',
      path: 'positions/4',
    });
  });

  it('valid polygon rings path → subfeature (path = "rings/R/vertices/V")', () => {
    const features = buildFeatures();
    const sel = buildSelection(
      ['poly-1/rings/1/vertices/5'],
      'poly-1/rings/1/vertices/5',
    );
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'subfeature',
      featureId: 'poly-1',
      path: 'rings/1/vertices/5',
    });
  });

  it('valid LineString vertices path → subfeature', () => {
    const features = buildFeatures();
    const sel = buildSelection(['line-1/vertices/2'], 'line-1/vertices/2');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'subfeature',
      featureId: 'line-1',
      path: 'vertices/2',
    });
  });

  it('valid MultiPoint vertices path → subfeature', () => {
    const features = buildFeatures();
    const sel = buildSelection(['mp-1/vertices/0'], 'mp-1/vertices/0');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'subfeature',
      featureId: 'mp-1',
      path: 'vertices/0',
    });
  });

  it('valid single-Point vertex/0 path → subfeature', () => {
    const features = buildFeatures();
    const sel = buildSelection(['point-1/vertex/0'], 'point-1/vertex/0');
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'subfeature',
      featureId: 'point-1',
      path: 'vertex/0',
    });
  });

  it('positions path with index === coords.length → stale', () => {
    const features = buildFeatures();
    // track-1 has 50 positions (indices 0..49); index 50 is out of range
    const sel = buildSelection(['track-1/positions/50'], 'track-1/positions/50');
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });

  it('polygon rings path with ring out of range → stale', () => {
    const features = buildFeatures();
    // poly-1 has 2 rings (indices 0..1); ring 2 is out of range
    const sel = buildSelection(
      ['poly-1/rings/2/vertices/0'],
      'poly-1/rings/2/vertices/0',
    );
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });

  it('polygon rings path with vertex out of range in a valid ring → stale', () => {
    const features = buildFeatures();
    // poly-1 ring 0 has 4 vertices (indices 0..3); vertex 4 is out of range
    const sel = buildSelection(
      ['poly-1/rings/0/vertices/4'],
      'poly-1/rings/0/vertices/4',
    );
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });

  it('non-vertex structured path (e.g., segments) → falls through to feature/multi rules', () => {
    const features = buildFeatures();
    // segments is registered but is NOT a vertex-bearing level for this resolver
    // (the contract enumerates vertex-bearing levels as positions/rings/vertices/vertex).
    // The featureId exists, so this should resolve to `feature`.
    const sel = buildSelection(
      ['track-1/segments/leg-alpha'],
      'track-1/segments/leg-alpha',
    );
    expect(resolveEditingMode(sel, features)).toEqual({
      kind: 'feature',
      featureId: 'track-1',
    });
  });

  it('path with unknown featureId → stale', () => {
    const features = buildFeatures();
    const sel = buildSelection(
      ['ghost-feature/positions/0'],
      'ghost-feature/positions/0',
    );
    expect(resolveEditingMode(sel, features)).toEqual({ kind: 'stale' });
  });
});
