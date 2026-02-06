/**
 * Golden example tests for symbol-interval tool (T034).
 *
 * Validates that execute() correctly sets show_symbol and symbol_interval
 * on the default_position_style of TRACK features, creates the style
 * object when missing, and throws on invalid input.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../src/tools/track/styling/symbolInterval';

function makeTrackFeature(): any {
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
      default_position_style: { show_symbol: true, symbol: 'circle', show_label: false },
    },
  };
}

describe('symbolInterval (T034)', () => {
  it('basic golden example: sets show_symbol=true and symbol_interval', () => {
    const feature = makeTrackFeature();
    const result = execute([feature], { interval: 'PT30M' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol_interval).toBe('PT30M');
    // Existing properties should be preserved
    expect(dps.symbol).toBe('circle');
  });

  it('no existing default_position_style: creates new style with show_symbol=true', () => {
    const feature = makeTrackFeature();
    delete feature.properties.default_position_style;

    const result = execute([feature], { interval: 'PT10M' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol_interval).toBe('PT10M');
    // Default values should be present
    expect(dps.symbol).toBe('circle');
    expect(dps.show_label).toBe(false);
  });

  it('overwrites existing interval: replaces prior symbol_interval value', () => {
    const feature = makeTrackFeature();
    feature.properties.default_position_style.show_symbol = true;
    feature.properties.default_position_style.symbol_interval = 'PT5M';

    const result = execute([feature], { interval: 'PT1H' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol_interval).toBe('PT1H');
  });

  it('error no tracks: throws Error when no TRACK features found', () => {
    const nonTrackFeature = makeTrackFeature();
    nonTrackFeature.properties.kind = 'ZONE';

    expect(() => execute([nonTrackFeature], { interval: 'PT30M' })).toThrow(
      'No track features found in input',
    );
  });

  it('default interval: uses PT15M when interval param is absent', () => {
    const feature = makeTrackFeature();

    const result1 = execute([feature], { interval: '' });
    expect(result1).toHaveLength(1);
    expect(result1[0].properties.default_position_style.symbol_interval).toBe('PT15M');

    const feature2 = makeTrackFeature();
    const result2 = execute([feature2], {} as any);
    expect(result2).toHaveLength(1);
    expect(result2[0].properties.default_position_style.symbol_interval).toBe('PT15M');
  });
});
