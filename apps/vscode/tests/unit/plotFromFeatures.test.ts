/**
 * Unit tests for the `plotFromFeatures` helper (Feature 217, T110).
 */

import { describe, expect, it } from 'vitest';
import { plotFromFeatures } from '../../src/services/plotFromFeatures';
import type { DebriefFeature } from '@debrief/components';

function feature(id: string, kind: string): DebriefFeature {
  return {
    type: 'Feature',
    id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    properties: { kind, id, schema_version: 1 },
  } as unknown as DebriefFeature;
}

describe('plotFromFeatures', () => {
  it('wraps an empty array as an empty FeatureCollection', () => {
    const plot = plotFromFeatures([]);
    expect(plot.type).toBe('FeatureCollection');
    expect(plot.features).toEqual([]);
  });

  it('wraps a non-empty array as a FeatureCollection with the same features', () => {
    const f1 = feature('1', 'TRACK');
    const f2 = feature('2', 'STORYBOARD');
    const plot = plotFromFeatures([f1, f2]);
    expect(plot.type).toBe('FeatureCollection');
    expect(plot.features).toHaveLength(2);
  });

  it('preserves feature references — no deep copy', () => {
    const f1 = feature('1', 'TRACK');
    const plot = plotFromFeatures([f1]);
    expect(plot.features[0]).toBe(f1);
  });

  it('does not mutate the input array', () => {
    const features: DebriefFeature[] = [feature('1', 'TRACK')];
    const snapshot = [...features];
    plotFromFeatures(features);
    expect(features).toEqual(snapshot);
  });

  it('accepts a readonly array', () => {
    const features: readonly DebriefFeature[] = [feature('1', 'TRACK')];
    const plot = plotFromFeatures(features);
    expect(plot.features).toHaveLength(1);
  });
});
