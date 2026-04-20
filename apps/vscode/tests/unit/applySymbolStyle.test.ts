/**
 * Golden example tests for apply-symbol-style tool (T032).
 *
 * Validates that execute() correctly modifies the point style on TRACK
 * features, handles default radius and fill_color fallback logic, creates
 * default styles when missing, and throws on invalid input.
 */

import { describe, it, expect } from 'vitest';
import { execute, toolDefinition } from '../../src/tools/track/styling/applySymbolStyle';
import type { ApplySymbolStyleParams } from '../../src/tools/track/styling/applySymbolStyle';
import { PointShapeEnum } from '@debrief/schemas';

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

describe('applySymbolStyle (T032)', () => {
  it('basic golden example: applies symbol, radius, and fill_color', () => {
    const feature = makeTrackFeature();
    const result = execute([feature], { symbol: 'diamond', radius: 6, fill_color: '#00FF00' });

    expect(result).toHaveLength(1);
    const point = result[0].properties.style.point;
    expect(point.shape).toBe('diamond');
    expect(point.radius).toBe(6);
    expect(point.fill_color).toBe('#00FF00');
  });

  it('default radius: omitting radius defaults to 4', () => {
    const feature = makeTrackFeature();
    // Remove existing point style so defaults are applied fresh
    delete feature.properties.style.point;

    const result = execute([feature], { symbol: 'square' });

    expect(result).toHaveLength(1);
    const point = result[0].properties.style.point;
    expect(point.shape).toBe('square');
    expect(point.radius).toBe(4);
  });

  it('fill_color defaults to line color when no fill_color given and no existing point.fill_color', () => {
    const feature = makeTrackFeature();
    // Remove existing point style so there is no prior fill_color
    delete feature.properties.style.point;
    // Line color is '#3388ff'

    const result = execute([feature], { symbol: 'triangle' });

    expect(result).toHaveLength(1);
    const point = result[0].properties.style.point;
    expect(point.shape).toBe('triangle');
    // fill_color should fall back to line.color since no fill_color param and no existing fill_color
    expect(point.fill_color).toBe('#3388ff');
  });

  it('no existing style: track without style gets default point style', () => {
    const feature = makeTrackFeature();
    delete feature.properties.style;

    const result = execute([feature], { symbol: 'cross', radius: 5, fill_color: '#AABBCC' });

    expect(result).toHaveLength(1);
    const point = result[0].properties.style.point;
    expect(point.shape).toBe('cross');
    expect(point.radius).toBe(5);
    expect(point.fill_color).toBe('#AABBCC');
    // Default point style values should be present
    expect(point.fill).toBe(true);
    expect(point.fill_opacity).toBe(0.8);
    expect(point.stroke).toBe(true);
    expect(point.color).toBe('#ffffff');
    expect(point.weight).toBe(1);
    expect(point.opacity).toBe(1.0);
  });

  it('error for invalid symbol: throws Error for unrecognized symbol name', () => {
    const feature = makeTrackFeature();

    expect(() => execute([feature], { symbol: 'hexagon' as unknown as ApplySymbolStyleParams['symbol'] })).toThrow(
      /^symbol must be one of: circle, square, triangle, diamond, cross$/,
    );
  });

  it('does not change show_symbol visibility on default_position_style', () => {
    const feature = makeTrackFeature();
    // show_symbol starts false
    expect(feature.properties.default_position_style.show_symbol).toBe(false);

    const result = execute([feature], { symbol: 'square' });

    // show_symbol must remain false — changing shape should not affect visibility
    const dps = result[0].properties.default_position_style;
    expect(dps.symbol).toBe('square');
    expect(dps.show_symbol).toBe(false);
  });

  it('default symbol: omitting symbol defaults to square', () => {
    const feature = makeTrackFeature();
    // Remove existing point style so we can verify the default shape
    delete feature.properties.style.point;

    const result = execute([feature], {} as ApplySymbolStyleParams);

    expect(result).toHaveLength(1);
    const point = result[0].properties.style.point;
    expect(point.shape).toBe('square');
  });
});

describe('apply-symbol-style — schema-derived enum (FR-014 / SC-006)', () => {
  it('toolDefinition.inputSchema.properties.params.properties.symbol.enum matches PointShapeEnum', () => {
    const params = (
      toolDefinition.inputSchema as {
        properties: {
          params: {
            properties: {
              symbol: { enum: string[] };
            };
          };
        };
      }
    ).properties.params.properties.symbol.enum;
    expect([...params].sort()).toEqual([...Object.values(PointShapeEnum)].sort());
  });
});
