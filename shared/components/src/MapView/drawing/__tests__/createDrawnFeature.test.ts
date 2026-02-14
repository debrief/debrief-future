import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReferenceLocation, RectangleAnnotation, PolyAnnotation, LineAnnotation } from '@debrief/schemas';
import { createDrawnFeature } from '../createDrawnFeature';
import {
  DEFAULT_DRAWN_POINT_STYLE,
  DEFAULT_DRAWN_RECTANGLE_STYLE,
  DEFAULT_DRAWN_POLYGON_STYLE,
  DEFAULT_DRAWN_POLYLINE_STYLE,
} from '../drawingDefaults';

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

  describe('polygon mode', () => {
    const validTriangleGeojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 50]]],
      },
      properties: {},
    };

    const validPentagonGeojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-4, 50], [-3.5, 50.5], [-3, 50], [-3.2, 49.5], [-3.8, 49.5], [-4, 50]]],
      },
      properties: {},
    };

    it('creates a PolyAnnotation with kind=POLY', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon');
      expect(result).not.toBeNull();
      expect(result!.properties.kind).toBe('POLY');
    });

    it('sets type to Feature', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon');
      expect(result!.type).toBe('Feature');
    });

    it('generates a unique UUID id', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon');
      expect(result!.id).toBe('test-uuid-1');
    });

    it('calculates vertex_count excluding closure point (triangle = 3)', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon') as PolyAnnotation;
      expect(result.properties.vertex_count).toBe(3);
    });

    it('calculates vertex_count for pentagon (5 unique vertices)', () => {
      const result = createDrawnFeature(validPentagonGeojson, 'polygon') as PolyAnnotation;
      expect(result.properties.vertex_count).toBe(5);
    });

    it('preserves the polygon geometry', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon');
      expect(result!.geometry.type).toBe('Polygon');
    });

    it('applies default polygon styling', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon');
      expect(result!.properties.style).toEqual(DEFAULT_DRAWN_POLYGON_STYLE);
    });

    it('sets default label', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon') as PolyAnnotation;
      expect(result.properties.label).toBe('Drawn Polygon');
    });

    it('allows custom label via options', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon', { label: 'Exclusion Zone' }) as PolyAnnotation;
      expect(result.properties.label).toBe('Exclusion Zone');
    });

    it('allows partial style overrides via options', () => {
      const result = createDrawnFeature(validTriangleGeojson, 'polygon', {
        polygonStyle: { fill_color: '#9C27B0', fill_opacity: 0.3 },
      }) as PolyAnnotation;
      expect(result.properties.style.fill_color).toBe('#9C27B0');
      expect(result.properties.style.fill_opacity).toBe(0.3);
      expect(result.properties.style.color).toBe('#E65100'); // Preserved default
    });

    it('returns null for invalid polygon (too few vertices)', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-4, 50]]],
        },
        properties: {},
      };
      expect(createDrawnFeature(geojson, 'polygon')).toBeNull();
    });
  });

  describe('polyline mode', () => {
    const validLineGeojson: GeoJSON.Feature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[-4, 50], [-3.5, 50.5], [-3, 51]],
      },
      properties: {},
    };

    it('creates a LineAnnotation with kind=LINE', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline');
      expect(result).not.toBeNull();
      expect(result!.properties.kind).toBe('LINE');
    });

    it('sets type to Feature', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline');
      expect(result!.type).toBe('Feature');
    });

    it('generates a unique UUID id', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline');
      expect(result!.id).toBe('test-uuid-1');
    });

    it('preserves the LineString geometry', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline');
      expect(result!.geometry.type).toBe('LineString');
      const coords = (result!.geometry as unknown as GeoJSON.LineString).coordinates;
      expect(coords.length).toBe(3);
    });

    it('applies default polyline styling', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline');
      expect(result!.properties.style).toEqual(DEFAULT_DRAWN_POLYLINE_STYLE);
    });

    it('sets default label', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline') as LineAnnotation;
      expect(result.properties.label).toBe('Drawn Path');
    });

    it('allows custom label via options', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline', { label: 'Patrol Route' }) as LineAnnotation;
      expect(result.properties.label).toBe('Patrol Route');
    });

    it('allows partial style overrides via options', () => {
      const result = createDrawnFeature(validLineGeojson, 'polyline', {
        polylineStyle: { color: '#FF5722', weight: 5 },
      }) as LineAnnotation;
      expect(result.properties.style.color).toBe('#FF5722');
      expect(result.properties.style.weight).toBe(5);
      expect(result.properties.style.opacity).toBe(0.9); // Preserved default
    });

    it('returns null for invalid polyline (too few vertices)', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-4, 50]] } as unknown as GeoJSON.LineString,
        properties: {},
      };
      expect(createDrawnFeature(geojson, 'polyline')).toBeNull();
    });
  });

  describe('schema compliance', () => {
    it('polygon output has all required PolyAnnotation fields', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 51], [-4, 50]]],
        },
        properties: {},
      };
      const result = createDrawnFeature(geojson, 'polygon') as PolyAnnotation;
      expect(result.type).toBe('Feature');
      expect(result.id).toBeDefined();
      expect(result.geometry.type).toBe('Polygon');
      expect(result.properties.kind).toBe('POLY');
      expect(result.properties.vertex_count).toBe(4);
      expect(result.properties.style).toBeDefined();
      expect(result.properties.style.fill_color).toBeDefined();
      expect(result.properties.style.color).toBeDefined();
    });

    it('polygon geometry has closed ring', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 50]]],
        },
        properties: {},
      };
      const result = createDrawnFeature(geojson, 'polygon');
      const coords = (result!.geometry as unknown as GeoJSON.Polygon).coordinates[0];
      expect(coords[0]).toEqual(coords[coords.length - 1]);
    });

    it('polyline output has all required LineAnnotation fields', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[-4, 50], [-3, 50], [-3, 51]],
        },
        properties: {},
      };
      const result = createDrawnFeature(geojson, 'polyline') as LineAnnotation;
      expect(result.type).toBe('Feature');
      expect(result.id).toBeDefined();
      expect(result.geometry.type).toBe('LineString');
      expect(result.properties.kind).toBe('LINE');
      expect(result.properties.style).toBeDefined();
      expect(result.properties.style.color).toBeDefined();
    });

    it('polyline geometry preserves all coordinate pairs', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[-4, 50], [-3, 50], [-3, 51]],
        },
        properties: {},
      };
      const result = createDrawnFeature(geojson, 'polyline');
      const coords = (result!.geometry as unknown as GeoJSON.LineString).coordinates;
      expect(coords).toHaveLength(3);
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

    it('generates unique IDs across different shape types', () => {
      const pointGeojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      const polyGeojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 50]]],
        },
        properties: {},
      };
      const lineGeojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-4, 50], [-3, 51]] },
        properties: {},
      };
      const r1 = createDrawnFeature(pointGeojson, 'point');
      const r2 = createDrawnFeature(polyGeojson, 'polygon');
      const r3 = createDrawnFeature(lineGeojson, 'polyline');
      const ids = new Set([r1!.id, r2!.id, r3!.id]);
      expect(ids.size).toBe(3);
    });
  });
});
