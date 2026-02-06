/**
 * Golden example tests for label-interval tool (T033).
 *
 * Validates that execute() correctly sets show_label and label_interval
 * on the default_position_style of TRACK features, creates the style
 * object when missing, and throws on invalid input.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../src/tools/track/styling/labelInterval';

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

describe('labelInterval (T033)', () => {
  it('basic golden example: sets show_label=true and label_interval', () => {
    const feature = makeTrackFeature();
    const result = execute([feature], { interval: 'PT15M' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_label).toBe(true);
    expect(dps.label_interval).toBe('PT15M');
    // Existing properties should be preserved
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol).toBe('circle');
  });

  it('no existing default_position_style: creates new style with show_label=true', () => {
    const feature = makeTrackFeature();
    delete feature.properties.default_position_style;

    const result = execute([feature], { interval: 'PT5M' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_label).toBe(true);
    expect(dps.label_interval).toBe('PT5M');
    // Default values should be present
    expect(dps.show_symbol).toBe(true);
    expect(dps.symbol).toBe('circle');
  });

  it('overwrites existing interval: replaces prior label_interval value', () => {
    const feature = makeTrackFeature();
    feature.properties.default_position_style.show_label = true;
    feature.properties.default_position_style.label_interval = 'PT10M';

    const result = execute([feature], { interval: 'PT30M' });

    expect(result).toHaveLength(1);
    const dps = result[0].properties.default_position_style;
    expect(dps.show_label).toBe(true);
    expect(dps.label_interval).toBe('PT30M');
  });

  it('error no tracks: throws Error when no TRACK features found', () => {
    const nonTrackFeature = makeTrackFeature();
    nonTrackFeature.properties.kind = 'ZONE';

    expect(() => execute([nonTrackFeature], { interval: 'PT15M' })).toThrow(
      'No track features found in input',
    );
  });

  it('error missing interval: throws Error when interval param is absent', () => {
    const feature = makeTrackFeature();

    expect(() => execute([feature], { interval: '' })).toThrow(
      'interval parameter is required',
    );

    expect(() => execute([feature], {} as any)).toThrow(
      'interval parameter is required',
    );
  });
});
