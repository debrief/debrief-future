import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReferenceLocation, RectangleAnnotation } from '@debrief/schemas';
import { createDrawnFeature } from '../createDrawnFeature';
import { DEFAULT_DRAWN_POINT_STYLE, DEFAULT_DRAWN_RECTANGLE_STYLE } from '../drawingDefaults';

// Mock crypto.randomUUID for deterministic tests
beforeEach(() => {
  let callCount = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `test-uuid-${++callCount}`,
  });
});

describe('createDrawnFeature', () => {
  describe('point mode', () => {
    const validPointGeojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-4.1189, 50.3912] },
      properties: {},
    };

    it('creates a ReferenceLocation with kind=POINT', () => {
      const result = createDrawnFeature(validPointGeojson, 'point');
      expect(result).not.toBeNull();
      expect(result!.properties.kind).toBe('POINT');
    });

    it('sets type to Feature', () => {
      const result = createDrawnFeature(validPointGeojson, 'point');
      expect(result!.type).toBe('Feature');
    });

    it('generates a unique UUID id', () => {
      const result = createDrawnFeature(validPointGeojson, 'point');
      expect(result!.id).toBe('test-uuid-1');
    });

    it('preserves the clicked coordinates', () => {
      const result = createDrawnFeature(validPointGeojson, 'point');
      expect(result!.geometry.type).toBe('Point');
      expect((result!.geometry as unknown as GeoJSON.Point).coordinates).toEqual([-4.1189, 50.3912]);
    });

    it('applies default point styling', () => {
      const result = createDrawnFeature(validPointGeojson, 'point');
      expect(result!.properties.style).toEqual(DEFAULT_DRAWN_POINT_STYLE);
    });

    it('sets default name and location_type', () => {
      const result = createDrawnFeature(validPointGeojson, 'point') as ReferenceLocation;
      expect(result.properties.name).toBe('Drawn Point');
      expect(result.properties.location_type).toBe('REFERENCE');
    });

    it('allows custom name via options', () => {
      const result = createDrawnFeature(validPointGeojson, 'point', { name: 'Sighting A' }) as ReferenceLocation;
      expect(result.properties.name).toBe('Sighting A');
    });

    it('allows partial style overrides via options', () => {
      const result = createDrawnFeature(validPointGeojson, 'point', {
        pointStyle: { fill_color: '#FF0000' },
      }) as ReferenceLocation;
      expect(result.properties.style.fill_color).toBe('#FF0000');
      expect(result.properties.style.shape).toBe('circle'); // Preserved default
    });
  });

  describe('rectangle mode', () => {
    const validRectGeojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-4.16, 50.42], [-4.08, 50.42],
          [-4.08, 50.37], [-4.16, 50.37],
          [-4.16, 50.42],
        ]],
      },
      properties: {},
    };

    it('creates a RectangleAnnotation with kind=RECTANGLE', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle');
      expect(result).not.toBeNull();
      expect(result!.properties.kind).toBe('RECTANGLE');
    });

    it('generates a unique UUID id', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle');
      expect(result!.id).toBe('test-uuid-1');
    });

    it('preserves the polygon geometry with closed ring', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle');
      expect(result!.geometry.type).toBe('Polygon');
      const coords = (result!.geometry as unknown as GeoJSON.Polygon).coordinates[0];
      expect(coords!.length).toBe(5);
      expect(coords![0]).toEqual(coords![coords!.length - 1]); // Closed ring
    });

    it('applies default rectangle styling', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle');
      expect(result!.properties.style).toEqual(DEFAULT_DRAWN_RECTANGLE_STYLE);
    });

    it('sets default label', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle') as RectangleAnnotation;
      expect(result.properties.label).toBe('Drawn Rectangle');
    });

    it('allows custom label via options', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle', { label: 'Patrol Zone' }) as RectangleAnnotation;
      expect(result.properties.label).toBe('Patrol Zone');
    });

    it('allows partial style overrides via options', () => {
      const result = createDrawnFeature(validRectGeojson, 'rectangle', {
        rectangleStyle: { fill_color: '#FF5722', fill_opacity: 0.5 },
      });
      expect(result!.properties.style.fill_color).toBe('#FF5722');
      expect(result!.properties.style.fill_opacity).toBe(0.5);
      expect(result!.properties.style.color).toBe('#1976D2'); // Preserved default
    });
  });

  describe('rejection cases', () => {
    it('returns null for degenerate rectangle (zero area)', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-4.1, 50.3], [-4.1, 50.3],
            [-4.1, 50.3], [-4.1, 50.3],
            [-4.1, 50.3],
          ]],
        },
        properties: {},
      };
      expect(createDrawnFeature(geojson, 'rectangle')).toBeNull();
    });

    it('returns null for null mode', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      expect(createDrawnFeature(geojson, null)).toBeNull();
    });

    it('returns null for unsupported polygon mode', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 51], [-4, 50]]],
        },
        properties: {},
      };
      expect(createDrawnFeature(geojson, 'polygon')).toBeNull();
    });
  });

  describe('uniqueness', () => {
    it('generates different UUIDs for successive calls', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      const result1 = createDrawnFeature(geojson, 'point');
      const result2 = createDrawnFeature(geojson, 'point');
      expect(result1!.id).not.toBe(result2!.id);
    });
  });
});
