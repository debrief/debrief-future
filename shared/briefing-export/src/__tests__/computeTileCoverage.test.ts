import { describe, it, expect } from 'vitest';
import { computeTileCoverage } from '../index';
import type { SceneFeature } from '@debrief/components/storyboard';

function instant(centerLon: number, centerLat: number, zoom: number): SceneFeature {
  return {
    type: 'Feature',
    id: `S${centerLon}_${centerLat}_${zoom}`,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `S${centerLon}_${centerLat}_${zoom}`,
      storyboard_id: 'SB',
      title: 'S',
      timestamp: '2025-01-15T12:00:00Z',
      creation_order: 0,
      viewport: { center: [centerLon, centerLat], zoom, bearing: 0 },
      transition_duration_ms: 1000,
    },
  } as unknown as SceneFeature;
}

function timeRange(
  fromLon: number,
  fromLat: number,
  fromZoom: number,
  toLon: number,
  toLat: number,
  toZoom: number,
  durationMs = 4000,
): SceneFeature {
  return {
    type: 'Feature',
    id: `TR_${fromLon}_${toLon}`,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    properties: {
      kind: 'STORYBOARD_SCENE',
      id: `TR_${fromLon}_${toLon}`,
      storyboard_id: 'SB',
      title: 'TR',
      timestamp: '2025-01-15T12:00:00Z',
      creation_order: 0,
      viewport: { center: [fromLon, fromLat], zoom: fromZoom, bearing: 0 },
      viewport_end: { center: [toLon, toLat], zoom: toZoom, bearing: 0 },
      time_range: { start: '2025-01-15T12:00:00Z', end: '2025-01-15T12:01:00Z' },
      transition_duration_ms: durationMs,
    },
  } as unknown as SceneFeature;
}

describe('computeTileCoverage', () => {
  it('returns empty for empty scenes', () => {
    const out = computeTileCoverage({ scenes: [] });
    expect(out.tiles).toEqual([]);
    expect(out.maxZoom).toBe(0);
    expect(out.approxBytes).toBe(0);
  });

  it('covers a single instant Scene at its captured zoom only', () => {
    const out = computeTileCoverage({ scenes: [instant(-4, 50, 6)] });
    expect(out.tiles.length).toBeGreaterThan(0);
    expect(out.tiles.every((t) => t.z === 6)).toBe(true);
    expect(out.maxZoom).toBe(6);
  });

  it('deduplicates tiles when two instant Scenes share a viewport', () => {
    const one = computeTileCoverage({ scenes: [instant(-4, 50, 6)] });
    const two = computeTileCoverage({ scenes: [instant(-4, 50, 6), instant(-4, 50, 6)] });
    expect(two.tiles.length).toBe(one.tiles.length);
  });

  it('covers a time-range Scene across the integer zoom range between start and end', () => {
    const out = computeTileCoverage({ scenes: [timeRange(0, 0, 6, 0, 0, 8)] });
    const zooms = new Set(out.tiles.map((t) => t.z));
    expect(zooms.has(6)).toBe(true);
    expect(zooms.has(7)).toBe(true);
    expect(zooms.has(8)).toBe(true);
    expect(out.maxZoom).toBe(8);
  });

  it('honours tilePadding (0, 1, 2)', () => {
    const n0 = computeTileCoverage({ scenes: [instant(0, 0, 8)], tilePadding: 0 }).tiles.length;
    const n1 = computeTileCoverage({ scenes: [instant(0, 0, 8)], tilePadding: 1 }).tiles.length;
    const n2 = computeTileCoverage({ scenes: [instant(0, 0, 8)], tilePadding: 2 }).tiles.length;
    expect(n0).toBeLessThan(n1);
    expect(n1).toBeLessThan(n2);
  });

  it('uses the auto sample formula max(8, ceil(transition_duration_ms / 1000))', () => {
    // Cross a substantial geographic distance so the per-sample
    // viewport tile boxes don't all collapse to the same tiles.
    // 8 samples (sub-second tween, floor applies)
    const fast = computeTileCoverage({ scenes: [timeRange(-160, -60, 5, 160, 60, 5, 500)] });
    // 30 samples (30 s tween — ~1 sample per second)
    const slow = computeTileCoverage({ scenes: [timeRange(-160, -60, 5, 160, 60, 5, 30000)] });
    expect(slow.tiles.length).toBeGreaterThan(fast.tiles.length);
  });

  it('handles antimeridian-crossing time-range Scenes without exploding', () => {
    const out = computeTileCoverage({ scenes: [timeRange(170, 0, 4, -170, 0, 4)] });
    expect(out.tiles.length).toBeGreaterThan(0);
    expect(out.tiles.every((t) => t.x >= 0 && t.y >= 0)).toBe(true);
  });

  it('returns a deterministic sorted output', () => {
    const out1 = computeTileCoverage({ scenes: [instant(0, 0, 5), instant(2, 2, 5)] });
    const out2 = computeTileCoverage({ scenes: [instant(2, 2, 5), instant(0, 0, 5)] });
    expect(out1.tiles).toEqual(out2.tiles);
    for (let i = 1; i < out1.tiles.length; i++) {
      const a = out1.tiles[i - 1]!;
      const b = out1.tiles[i]!;
      const cmp = a.z - b.z || a.x - b.x || a.y - b.y;
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });

  it('respects maxZoomCap', () => {
    const out = computeTileCoverage({ scenes: [instant(0, 0, 8)], maxZoomCap: 12 });
    expect(out.maxZoom).toBe(12);
  });

  it('estimates approxBytes at ~5 KB per tile', () => {
    const out = computeTileCoverage({ scenes: [instant(0, 0, 5)] });
    expect(out.approxBytes).toBe(out.tiles.length * 5000);
  });
});
