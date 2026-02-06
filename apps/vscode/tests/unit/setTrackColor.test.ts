/**
 * Golden example tests for set-track-color tool (T031).
 *
 * Validates that execute() correctly modifies the line.color property
 * on TRACK features, creates default styles when missing, skips
 * non-track features, and throws on invalid input.
 */

import { describe, it, expect } from 'vitest';
import { execute } from '../../src/tools/track/styling/setTrackColor';

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

describe('setTrackColor (T031)', () => {
  it('basic golden example: applies color to line.color', () => {
    const feature = makeTrackFeature();
    const result = execute([feature], { color: '#FF0000' });

    expect(result).toHaveLength(1);
    expect(result[0].properties.style.line.color).toBe('#FF0000');
    // Other line properties should be preserved
    expect(result[0].properties.style.line.stroke).toBe(true);
    expect(result[0].properties.style.line.weight).toBe(3);
    expect(result[0].properties.style.line.opacity).toBe(1.0);
  });

  it('multiple tracks: applies color to all track features', () => {
    const feature1 = makeTrackFeature();
    feature1.id = 'track-001';
    const feature2 = makeTrackFeature();
    feature2.id = 'track-002';
    feature2.properties.platform_id = 'VESSEL-B';

    const result = execute([feature1, feature2], { color: '#00FF00' });

    expect(result).toHaveLength(2);
    expect(result[0].properties.style.line.color).toBe('#00FF00');
    expect(result[1].properties.style.line.color).toBe('#00FF00');
  });

  it('no existing style: track without style gets default style with applied color', () => {
    const feature = makeTrackFeature();
    delete feature.properties.style;

    const result = execute([feature], { color: '#ABCDEF' });

    expect(result).toHaveLength(1);
    const line = result[0].properties.style.line;
    expect(line.color).toBe('#ABCDEF');
    // Default values should be applied
    expect(line.stroke).toBe(true);
    expect(line.weight).toBe(3);
    expect(line.opacity).toBe(1.0);
  });

  it('skips non-track features: only TRACK kind features are modified', () => {
    const trackFeature = makeTrackFeature();
    const nonTrackFeature = structuredClone(makeTrackFeature());
    nonTrackFeature.id = 'zone-001';
    nonTrackFeature.properties.kind = 'ZONE';

    const result = execute([trackFeature, nonTrackFeature], { color: '#FF0000' });

    // Only the track feature should be returned
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('track-001');
    expect(result[0].properties.style.line.color).toBe('#FF0000');
  });

  it('error when no tracks: throws Error when no TRACK features found', () => {
    const nonTrackFeature = makeTrackFeature();
    nonTrackFeature.properties.kind = 'ZONE';

    expect(() => execute([nonTrackFeature], { color: '#FF0000' })).toThrow(
      'No track features found in input',
    );
  });

  it('error when missing color: throws Error when color param is absent', () => {
    const feature = makeTrackFeature();

    expect(() => execute([feature], { color: '' })).toThrow(
      'color parameter is required',
    );

    expect(() => execute([feature], {} as any)).toThrow(
      'color parameter is required',
    );
  });
});
