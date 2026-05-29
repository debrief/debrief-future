import { describe, it, expect } from 'vitest';
import { writeSystemStateIntoFeatureCollection } from '../write.js';
import { readSystemStateFromFeatureCollection } from '../read.js';
import type { PlotFeature, PlotFeatureCollection, SystemStateWriteInput } from '../types.js';

const geo: PlotFeature = {
  type: 'Feature',
  id: 'track-1',
  geometry: { type: 'LineString', coordinates: [] },
  properties: { kind: 'TRACK', name: 'Alpha' },
};

const baseFc = (): PlotFeatureCollection => ({ type: 'FeatureCollection', features: [geo] });

const INPUT: SystemStateWriteInput = {
  spatial: {
    viewport: {
      coordinates: [
        { longitude: -3.5, latitude: 51.5 },
        { longitude: 2.5, latitude: 51.5 },
        { longitude: 2.5, latitude: 50.0 },
        { longitude: -3.5, latitude: 50.0 },
      ],
      zoom: 8,
    },
    rotation: 10,
  },
  selection: { selected_ids: ['track-1'], selected_primary: 'track-1' },
};

describe('writeSystemStateIntoFeatureCollection', () => {
  it('does not mutate the input FC (deep-equal after call)', () => {
    const fc = baseFc();
    const snapshot = JSON.parse(JSON.stringify(fc));
    writeSystemStateIntoFeatureCollection(fc, INPUT);
    expect(fc).toEqual(snapshot);
  });

  it('returns a new FC with geographic features passed through untouched', () => {
    const out = writeSystemStateIntoFeatureCollection(baseFc(), INPUT);
    const track = out.features.find((f) => f.id === 'track-1');
    expect(track).toEqual(geo);
  });

  it('upserts one state.<type> feature per populated key with empty-Point geometry', () => {
    const out = writeSystemStateIntoFeatureCollection(baseFc(), INPUT);
    const spatial = out.features.find((f) => f.id === 'state.spatial');
    expect(spatial?.geometry).toEqual({ type: 'Point', coordinates: [] });
    expect((spatial?.properties as Record<string, unknown>).kind).toBe('SYSTEM');
    expect((spatial?.properties as Record<string, unknown>).state_type).toBe('spatial');
  });

  it('keeps cardinality <= 1 per state_type when re-writing', () => {
    const once = writeSystemStateIntoFeatureCollection(baseFc(), INPUT);
    const twice = writeSystemStateIntoFeatureCollection(once, INPUT);
    const spatialCount = twice.features.filter((f) => f.id === 'state.spatial').length;
    expect(spatialCount).toBe(1);
  });

  it('writes NO provenance array on state.* features (FR-013)', () => {
    const out = writeSystemStateIntoFeatureCollection(baseFc(), INPUT);
    for (const f of out.features.filter((x) => String(x.id).startsWith('state.'))) {
      expect((f.properties as Record<string, unknown>).provenance).toBeUndefined();
    }
  });

  it('leaves absent keys unchanged (no delete API)', () => {
    const withSpatial = writeSystemStateIntoFeatureCollection(baseFc(), { spatial: INPUT.spatial });
    // Now write only selection — spatial must survive untouched.
    const out = writeSystemStateIntoFeatureCollection(withSpatial, { selection: INPUT.selection });
    expect(out.features.find((f) => f.id === 'state.spatial')).toBeDefined();
    expect(out.features.find((f) => f.id === 'state.selection')).toBeDefined();
  });

  it('round-trips read(write(fc)) for all populated variants', () => {
    const out = writeSystemStateIntoFeatureCollection(baseFc(), INPUT);
    const map = readSystemStateFromFeatureCollection(out);
    expect(map.spatial?.viewport.coordinates).toHaveLength(4);
    expect(map.spatial?.rotation).toBe(10);
    expect(map.selection?.selected_ids).toEqual(['track-1']);
    expect(map.selection?.selected_primary).toBe('track-1');
  });
});
