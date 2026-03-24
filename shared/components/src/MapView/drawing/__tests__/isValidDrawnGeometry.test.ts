import { describe, it, expect } from 'vitest';
import { isValidDrawnGeometry } from '../isValidDrawnGeometry';

describe('isValidDrawnGeometry', () => {
  describe('point mode', () => {
    it('returns true for valid point geometry', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4.1, 50.3] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'point')).toBe(true);
    });

    it('returns false for non-point geometry', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 51], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'point')).toBe(false);
    });

    it('returns false for missing coordinates', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        // eslint-disable-next-line no-restricted-syntax
        geometry: { type: 'Point', coordinates: [] } as unknown as GeoJSON.Point,
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'point')).toBe(false);
    });

    it('returns false for non-finite coordinates', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [NaN, 50] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'point')).toBe(false);
    });

    it('returns false for null geometry', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        // eslint-disable-next-line no-restricted-syntax
        geometry: null as unknown as GeoJSON.Geometry,
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'point')).toBe(false);
    });
  });

  describe('rectangle mode', () => {
    it('returns true for valid rectangle polygon', () => {
      const geojson: GeoJSON.Feature = {
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
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(true);
    });

    it('returns false for zero-area rectangle (click without drag)', () => {
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
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(false);
    });

    it('returns false for zero-width rectangle', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [-4.1, 50.3], [-4.1, 50.4],
            [-4.1, 50.4], [-4.1, 50.3],
            [-4.1, 50.3],
          ]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(false);
    });

    it('returns false for too few coordinates', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 51], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(false);
    });

    it('returns false for non-polygon geometry in rectangle mode', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(false);
    });

    it('returns false for empty rings', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        // eslint-disable-next-line no-restricted-syntax
        geometry: { type: 'Polygon', coordinates: [] } as unknown as GeoJSON.Polygon,
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'rectangle')).toBe(false);
    });
  });

  describe('polygon mode', () => {
    it('returns true for valid polygon with 3 unique vertices + closure', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(true);
    });

    it('returns true for polygon with many vertices', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 51], [-4.5, 50.5], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(true);
    });

    it('returns false for polygon with fewer than 3 unique vertices', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(false);
    });

    it('returns false for non-Polygon geometry type', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(false);
    });

    it('returns false for empty rings', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        // eslint-disable-next-line no-restricted-syntax
        geometry: { type: 'Polygon', coordinates: [] } as unknown as GeoJSON.Polygon,
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(false);
    });

    it('returns false for non-finite coordinates', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[NaN, 50], [-3, 50], [-3, 51], [NaN, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polygon')).toBe(false);
    });
  });

  describe('polyline mode', () => {
    it('returns true for valid polyline with 2 vertices', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-4, 50], [-3, 51]] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polyline')).toBe(true);
    });

    it('returns true for polyline with many vertices', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[-4, 50], [-3, 50], [-3, 51], [-2, 51], [-1, 50]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polyline')).toBe(true);
    });

    it('returns false for polyline with only 1 vertex', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        // eslint-disable-next-line no-restricted-syntax
        geometry: { type: 'LineString', coordinates: [[-4, 50]] } as unknown as GeoJSON.LineString,
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polyline')).toBe(false);
    });

    it('returns false for non-LineString geometry type', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[[-4, 50], [-3, 50], [-3, 51], [-4, 50]]],
        },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polyline')).toBe(false);
    });

    it('returns false for non-finite coordinates', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[-4, 50], [Infinity, 51]] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, 'polyline')).toBe(false);
    });
  });

  describe('null mode', () => {
    it('returns false for null mode', () => {
      const geojson: GeoJSON.Feature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-4, 50] },
        properties: {},
      };
      expect(isValidDrawnGeometry(geojson, null)).toBe(false);
    });
  });
});
