import { describe, it, expect } from 'vitest';
import { writeSystemStateIntoFeatureCollection } from '../write.js';
import { readSystemStateFromFeatureCollection } from '../read.js';
import { readHiddenFeatureIds, applyVisibilityToFeatureCollection } from '../visibility.js';
import type { PlotFeature, PlotFeatureCollection, SystemStateWriteInput } from '../types.js';

const track = (id: string): PlotFeature => ({
  type: 'Feature',
  id,
  geometry: { type: 'LineString', coordinates: [] },
  properties: { kind: 'TRACK', name: id },
});

describe('write/read structural round-trip', () => {
  it('write(read(fc)) is structurally stable for all four variants', () => {
    const input: SystemStateWriteInput = {
      temporal: {
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-07T00:00:00Z',
        current_time: '2024-01-03T00:00:00Z',
        display_mode: 'trail',
        step_size: { value: 1, unit: 'hour' },
        playback_rate: 2,
      },
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
        rotation: 0,
      },
      selection: { selected_ids: ['t1', 't2'], selected_primary: 't1' },
      active_storyboard: { active_storyboard_id: 'sb-1' },
    };
    const fc: PlotFeatureCollection = { type: 'FeatureCollection', features: [track('t1')] };
    const once = writeSystemStateIntoFeatureCollection(fc, input);
    const { map } = readSystemStateFromFeatureCollection(once);
    const twice = writeSystemStateIntoFeatureCollection(fc, {
      temporal: { ...map.temporal! },
      spatial: { ...map.spatial! },
      selection: { ...map.selection! },
      active_storyboard: { ...map.active_storyboard! },
    });
    // The state.* features in both writes carry identical properties.
    const norm = (c: PlotFeatureCollection) =>
      c.features
        .filter((f) => String(f.id).startsWith('state.'))
        .map((f) => f.properties)
        .sort((a, b) =>
          String((a as { state_type: string }).state_type).localeCompare(
            String((b as { state_type: string }).state_type),
          ),
        );
    expect(norm(twice)).toEqual(norm(once));
  });
});

describe('visibility helpers', () => {
  it('absent visible flag => visible (not hidden)', () => {
    const fc: PlotFeatureCollection = {
      type: 'FeatureCollection',
      features: [track('t1'), track('t2')],
    };
    expect(readHiddenFeatureIds(fc)).toEqual([]);
  });

  it('round-trips a hidden set via apply then read', () => {
    const fc: PlotFeatureCollection = {
      type: 'FeatureCollection',
      features: [track('t1'), track('t2'), track('t3')],
    };
    const applied = applyVisibilityToFeatureCollection(fc, ['t1', 't3']);
    expect(readHiddenFeatureIds(applied).sort()).toEqual(['t1', 't3']);
    // The hidden features carry visible:false; the visible one has no flag.
    const t2 = applied.features.find((f) => f.id === 't2');
    expect((t2?.properties as Record<string, unknown>).visible).toBeUndefined();
  });

  it('clears the flag when a previously-hidden feature is revealed', () => {
    const fc: PlotFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { ...track('t1'), properties: { kind: 'TRACK', name: 't1', visible: false } },
      ],
    };
    const revealed = applyVisibilityToFeatureCollection(fc, []);
    expect(readHiddenFeatureIds(revealed)).toEqual([]);
    expect('visible' in (revealed.features[0]!.properties as Record<string, unknown>)).toBe(false);
  });

  it('does not mutate the input FC', () => {
    const fc: PlotFeatureCollection = {
      type: 'FeatureCollection',
      features: [track('t1')],
    };
    const snapshot = JSON.parse(JSON.stringify(fc));
    applyVisibilityToFeatureCollection(fc, ['t1']);
    expect(fc).toEqual(snapshot);
  });
});
