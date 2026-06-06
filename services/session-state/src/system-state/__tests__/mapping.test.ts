import { describe, it, expect } from 'vitest';
import {
  temporalSliceToInput,
  temporalVariantToSlice,
  spatialSliceToInput,
  spatialVariantToSlice,
  selectionSliceToInput,
  selectionVariantToSlice,
  activeStoryboardIdToInput,
  activeStoryboardVariantToId,
} from '../mapping.js';
import { DEFAULT_TEMPORAL_SLICE } from '../../types/temporal.js';
import { DEFAULT_SPATIAL_SLICE } from '../../types/spatial.js';
import { DEFAULT_FEATURES_SLICE, createSelection } from '../../types/features.js';
import type { TemporalSlice } from '../../types/temporal.js';
import type { SpatialSlice } from '../../types/spatial.js';

const viewport = {
  coordinates: [
    { longitude: -3.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 51.5 },
    { longitude: 2.5, latitude: 50.0 },
    { longitude: -3.5, latitude: 50.0 },
  ],
  zoom: 8,
};

describe('temporal mapping', () => {
  it('omits the variant when timeRange is null', () => {
    expect(temporalSliceToInput(DEFAULT_TEMPORAL_SLICE)).toBeUndefined();
  });

  it('round-trips epoch <-> ISO with second precision', () => {
    const start = Date.parse('2024-01-01T00:00:00Z');
    const end = Date.parse('2024-01-07T00:00:00Z');
    const current = Date.parse('2024-01-03T14:30:00Z');
    const slice: TemporalSlice = {
      ...DEFAULT_TEMPORAL_SLICE,
      timeRange: { start, end },
      currentTime: current,
      timeFilter: { start: Date.parse('2024-01-02T00:00:00Z'), end: undefined },
      displayMode: 'trail',
      stepSize: { value: 2, unit: 'hour' },
      playbackRate: 3,
    };
    const input = temporalSliceToInput(slice)!;
    expect(input.start_time).toBe('2024-01-01T00:00:00.000Z');
    expect(input.current_time).toBe('2024-01-03T14:30:00.000Z');
    expect(input.filter_start_time).toBe('2024-01-02T00:00:00.000Z');
    expect(input.filter_end_time).toBeUndefined();

    const back = temporalVariantToSlice({ kind: 'SYSTEM', state_type: 'temporal', ...input });
    expect(back.timeRange).toEqual({ start, end });
    expect(back.currentTime).toBe(current);
    expect(back.displayMode).toBe('trail');
    expect(back.stepSize).toEqual({ value: 2, unit: 'hour' });
    expect(back.playbackRate).toBe(3);
    expect(back.timeFilter?.start).toBe(Date.parse('2024-01-02T00:00:00Z'));
  });

  it('returns {} for an absent temporal variant (defaults on load)', () => {
    expect(temporalVariantToSlice(undefined)).toEqual({});
  });
});

describe('spatial mapping', () => {
  it('omits the variant when viewport is null', () => {
    expect(spatialSliceToInput(DEFAULT_SPATIAL_SLICE)).toBeUndefined();
  });

  it('round-trips viewport + rotation by identity', () => {
    const slice: SpatialSlice = { ...DEFAULT_SPATIAL_SLICE, viewport, rotation: 42 };
    const input = spatialSliceToInput(slice)!;
    expect(input.viewport).toEqual(viewport);
    expect(input.rotation).toBe(42);
    const back = spatialVariantToSlice({ kind: 'SYSTEM', state_type: 'spatial', ...input });
    expect(back.viewport).toEqual(viewport);
    expect(back.rotation).toBe(42);
  });
});

describe('selection mapping', () => {
  it('omits the variant for an empty selection', () => {
    expect(selectionSliceToInput(DEFAULT_FEATURES_SLICE)).toBeUndefined();
  });

  it('splits FeatureSelection into selected_ids + selected_primary and regenerates timestamp on load', () => {
    const slice = { ...DEFAULT_FEATURES_SLICE, selection: createSelection(['a', 'b'], 'a') };
    const input = selectionSliceToInput(slice)!;
    expect(input.selected_ids).toEqual(['a', 'b']);
    expect(input.selected_primary).toBe('a');

    const back = selectionVariantToSlice({ kind: 'SYSTEM', state_type: 'selection', ...input });
    expect(back.selection?.featureIds).toEqual(['a', 'b']);
    expect(back.selection?.primary).toBe('a');
    expect(typeof back.selection?.timestamp.epoch).toBe('number');
  });
});

describe('active_storyboard mapping', () => {
  it('omits the variant for a null id', () => {
    expect(activeStoryboardIdToInput(null)).toBeUndefined();
  });

  it('round-trips the id by identity', () => {
    const input = activeStoryboardIdToInput('sb-1')!;
    expect(input.active_storyboard_id).toBe('sb-1');
    expect(
      activeStoryboardVariantToId({
        kind: 'SYSTEM',
        state_type: 'active_storyboard',
        active_storyboard_id: 'sb-1',
      }),
    ).toBe('sb-1');
    expect(activeStoryboardVariantToId(undefined)).toBeNull();
  });
});
