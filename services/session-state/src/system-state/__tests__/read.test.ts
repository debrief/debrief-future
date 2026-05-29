import { describe, it, expect } from 'vitest';
import { readSystemStateFromFeatureCollection } from '../read.js';
import { SystemStateLoadError } from '../errors.js';
import type { PlotFeature, PlotFeatureCollection } from '../types.js';

function fc(...features: PlotFeature[]): PlotFeatureCollection {
  return { type: 'FeatureCollection', features };
}

const sysFeature = (id: string, props: Record<string, unknown>): PlotFeature => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates: [] },
  properties: { kind: 'SYSTEM', ...props },
});

const VALID_SPATIAL = sysFeature('state.spatial', {
  state_type: 'spatial',
  viewport: {
    coordinates: [
      { longitude: -3.5, latitude: 51.5 },
      { longitude: 2.5, latitude: 51.5 },
      { longitude: 2.5, latitude: 50.0 },
      { longitude: -3.5, latitude: 50.0 },
    ],
    zoom: 8,
  },
  rotation: 0,
});

const VALID_TEMPORAL = sysFeature('state.temporal', {
  state_type: 'temporal',
  start_time: '2024-01-01T00:00:00Z',
  end_time: '2024-01-07T00:00:00Z',
  current_time: '2024-01-03T14:30:00Z',
});

describe('readSystemStateFromFeatureCollection', () => {
  it('returns an empty map for an FC with no SYSTEM features', () => {
    const geo: PlotFeature = {
      type: 'Feature',
      id: 'track-1',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { kind: 'TRACK' },
    };
    expect(readSystemStateFromFeatureCollection(fc(geo))).toEqual({ map: {}, playheadClamps: [] });
  });

  it('returns an empty map for an empty FC', () => {
    expect(readSystemStateFromFeatureCollection(fc())).toEqual({ map: {}, playheadClamps: [] });
  });

  it('populates a well-formed variant', () => {
    const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc(VALID_SPATIAL));
    expect(map.spatial?.state_type).toBe('spatial');
    expect(map.spatial?.viewport.coordinates).toHaveLength(4);
    expect(playheadClamps).toEqual([]);
  });

  it('is order-independent and does not mutate the input', () => {
    const input = fc(VALID_TEMPORAL, VALID_SPATIAL);
    const snapshot = JSON.parse(JSON.stringify(input));
    const { map } = readSystemStateFromFeatureCollection(input);
    expect(map.temporal).toBeDefined();
    expect(map.spatial).toBeDefined();
    expect(input).toEqual(snapshot);
  });

  it('throws multiple-features-with-same-state-type for duplicate state_type', () => {
    const dup = sysFeature('state.spatial', VALID_SPATIAL.properties as Record<string, unknown>);
    try {
      readSystemStateFromFeatureCollection(fc(VALID_SPATIAL, dup));
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SystemStateLoadError);
      expect((e as SystemStateLoadError).kind).toBe('multiple-features-with-same-state-type');
      expect((e as SystemStateLoadError).featureIds).toContain('state.spatial');
    }
  });

  it('throws missing-discriminator when state_type is absent', () => {
    const bad = sysFeature('state.spatial', { viewport: {} });
    const err = (() => {
      try {
        readSystemStateFromFeatureCollection(fc(bad));
      } catch (e) {
        return e as SystemStateLoadError;
      }
    })();
    expect(err?.kind).toBe('missing-discriminator');
  });

  it('throws unknown-state-type for an unrecognised discriminator', () => {
    const bad = sysFeature('state.frobnicate', { state_type: 'frobnicate' });
    const err = (() => {
      try {
        readSystemStateFromFeatureCollection(fc(bad));
      } catch (e) {
        return e as SystemStateLoadError;
      }
    })();
    expect(err?.kind).toBe('unknown-state-type');
  });

  it('throws malformed-feature when a variant fails its schema', () => {
    const bad = sysFeature('state.selection', { state_type: 'selection', selected_ids: [1, 2] });
    const err = (() => {
      try {
        readSystemStateFromFeatureCollection(fc(bad));
      } catch (e) {
        return e as SystemStateLoadError;
      }
    })();
    expect(err?.kind).toBe('malformed-feature');
    expect(err?.featureIds).toEqual(['state.selection']);
  });

  // ── spec 267: tolerant path (US1) — out-of-window playhead clamps, no throw ──
  it('clamps (no throw) when current_time is after end_time and reports the clamp', () => {
    const orphaned = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      current_time: '2024-02-01T00:00:00Z',
    });
    const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc(orphaned));
    // The in-memory value is healed to the window edge before it enters the map.
    expect(map.temporal?.current_time).toBe('2024-01-07T00:00:00Z');
    expect(playheadClamps).toHaveLength(1);
    expect(playheadClamps[0]).toEqual({
      kind: 'playhead-clamped',
      feature_id: 'state.temporal',
      edge: 'end',
      originalCurrentTime: '2024-02-01T00:00:00Z',
      clampedCurrentTime: '2024-01-07T00:00:00Z',
    });
  });

  it('clamps to the window start when current_time is before start_time', () => {
    const orphaned = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      current_time: '2023-12-20T00:00:00Z',
    });
    const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc(orphaned));
    expect(map.temporal?.current_time).toBe('2024-01-01T00:00:00Z');
    expect(playheadClamps[0]?.edge).toBe('start');
    expect(playheadClamps[0]?.originalCurrentTime).toBe('2023-12-20T00:00:00Z');
  });

  it('does not mutate the input FeatureCollection when clamping', () => {
    const orphaned = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      current_time: '2024-02-01T00:00:00Z',
    });
    const input = fc(orphaned);
    const snapshot = JSON.parse(JSON.stringify(input));
    readSystemStateFromFeatureCollection(input);
    expect(input).toEqual(snapshot);
  });

  it('produces no clamp for an in-window current_time (byte-identical to 261)', () => {
    const { map, playheadClamps } = readSystemStateFromFeatureCollection(fc(VALID_TEMPORAL));
    expect(map.temporal?.current_time).toBe('2024-01-03T14:30:00Z');
    expect(playheadClamps).toEqual([]);
  });

  // ── spec 267: guard rail (US2) — incoherent windows still hard-fail ─────────
  it('still throws cross-field-invariant when start_time > end_time (FR-004)', () => {
    const bad = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-07T00:00:00Z',
      end_time: '2024-01-01T00:00:00Z',
    });
    const err = (() => {
      try {
        readSystemStateFromFeatureCollection(fc(bad));
      } catch (e) {
        return e as SystemStateLoadError;
      }
    })();
    expect(err?.kind).toBe('cross-field-invariant');
  });

  it('throws (precedence) when BOTH start>end AND current_time is out of range (FR-005)', () => {
    const bad = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-07T00:00:00Z',
      end_time: '2024-01-01T00:00:00Z',
      current_time: '2024-02-01T00:00:00Z',
    });
    let thrown: SystemStateLoadError | undefined;
    try {
      readSystemStateFromFeatureCollection(fc(bad));
    } catch (e) {
      thrown = e as SystemStateLoadError;
    }
    expect(thrown).toBeInstanceOf(SystemStateLoadError);
    expect(thrown?.kind).toBe('cross-field-invariant');
  });

  it('throws (fatal) when start_time/end_time are unparseable', () => {
    const bad = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: 'not-a-date',
      end_time: '2024-01-07T00:00:00Z',
    });
    expect(() => readSystemStateFromFeatureCollection(fc(bad))).toThrow(SystemStateLoadError);
  });

  it('throws (fatal) when current_time is present but unparseable', () => {
    const bad = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      current_time: 'not-a-date',
    });
    expect(() => readSystemStateFromFeatureCollection(fc(bad))).toThrow(SystemStateLoadError);
  });
});
