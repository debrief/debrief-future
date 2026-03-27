/**
 * Golden example tests for label-interval tool (T033).
 *
 * Validates that execute() correctly sets label_interval on the top-level
 * track properties WITHOUT modifying default_position_style visibility,
 * and throws on invalid input.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../src/tools/track/styling/labelInterval';

interface TestTrackFeature {
  type: 'Feature';
  id: string;
  geometry: { type: string; coordinates: number[][] };
  properties: Record<string, unknown>;
}

function makeTrackFeature(): TestTrackFeature {
  return {
    type: 'Feature' as const,
    id: 'track-001',
    geometry: { type: 'LineString', coordinates: [[-1.0, 50.0], [-1.1, 50.1]] },
    properties: {
      kind: 'TRACK',
      platform_id: 'VESSEL-A',
      platform_name: 'Vessel Alpha',
      track_type: 'SURFACE',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-01T01:00:00Z',
      positions: [
        { time: '2024-01-01T00:00:00Z', coordinates: [-1.0, 50.0] },
        { time: '2024-01-01T01:00:00Z', coordinates: [-1.1, 50.1] },
      ],
      style: {
        line: { stroke: true, color: '#3388ff', weight: 3, opacity: 1.0 },
        point: { shape: 'circle', radius: 4, fill: true, fill_color: '#3388ff', fill_opacity: 0.8, stroke: true, color: '#ffffff', weight: 1, opacity: 1.0 },
      },
      default_position_style: { show_symbol: false, symbol: 'circle', show_label: false },
    },
  };
}

describe('labelInterval (T033)', () => {
  it('basic golden example: sets label_interval on top-level properties', () => {
    const feature = makeTrackFeature();
    const result = execute([feature], { interval: 'PT15M' });

    expect(result).toHaveLength(1);
    expect(result[0].properties.label_interval).toBe('PT15M');
    // default_position_style visibility must NOT be changed
    const dps = result[0].properties.default_position_style;
    expect(dps.show_symbol).toBe(false);
    expect(dps.symbol).toBe('circle');
    expect(dps.show_label).toBe(false);
  });

  it('does not modify default_position_style visibility', () => {
    const feature = makeTrackFeature();
    feature.properties.default_position_style = { show_symbol: true, symbol: 'square', show_label: false };

    const result = execute([feature], { interval: 'PT5M' });

    expect(result).toHaveLength(1);
    expect(result[0].properties.label_interval).toBe('PT5M');
    // Existing default_position_style must be completely preserved
    const dps = result[0].properties.default_position_style;
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol).toBe('square');
    expect(dps.show_label).toBe(false);
  });

  it('overwrites existing interval: replaces prior label_interval value', () => {
    const feature = makeTrackFeature();
    feature.properties.label_interval = 'PT10M';

    const result = execute([feature], { interval: 'PT30M' });

    expect(result).toHaveLength(1);
    expect(result[0].properties.label_interval).toBe('PT30M');
  });

  it('error no tracks: throws Error when no TRACK features found', () => {
    const nonTrackFeature = makeTrackFeature();
    nonTrackFeature.properties.kind = 'ZONE';

    expect(() => execute([nonTrackFeature], { interval: 'PT15M' })).toThrow(
      'No track features found in input',
    );
  });

  it('default interval: uses PT15M when interval param is absent', () => {
    const feature = makeTrackFeature();

    const result1 = execute([feature], { interval: '' });
    expect(result1).toHaveLength(1);
    expect(result1[0].properties.label_interval).toBe('PT15M');

    const feature2 = makeTrackFeature();
    const result2 = execute([feature2], {} as Record<string, unknown>);
    expect(result2).toHaveLength(1);
    expect(result2[0].properties.label_interval).toBe('PT15M');
  });
});
