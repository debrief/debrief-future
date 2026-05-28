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
  it('returns {} for an FC with no SYSTEM features', () => {
    const geo: PlotFeature = {
      type: 'Feature',
      id: 'track-1',
      geometry: { type: 'LineString', coordinates: [] },
      properties: { kind: 'TRACK' },
    };
    expect(readSystemStateFromFeatureCollection(fc(geo))).toEqual({});
  });

  it('returns {} for an empty FC', () => {
    expect(readSystemStateFromFeatureCollection(fc())).toEqual({});
  });

  it('populates a well-formed variant', () => {
    const map = readSystemStateFromFeatureCollection(fc(VALID_SPATIAL));
    expect(map.spatial?.state_type).toBe('spatial');
    expect(map.spatial?.viewport.coordinates).toHaveLength(4);
  });

  it('is order-independent and does not mutate the input', () => {
    const input = fc(VALID_TEMPORAL, VALID_SPATIAL);
    const snapshot = JSON.parse(JSON.stringify(input));
    const map = readSystemStateFromFeatureCollection(input);
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

  it('throws cross-field-invariant when current_time is out of window', () => {
    const bad = sysFeature('state.temporal', {
      state_type: 'temporal',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-07T00:00:00Z',
      current_time: '2024-02-01T00:00:00Z',
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

  it('throws cross-field-invariant when start_time > end_time', () => {
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
});
