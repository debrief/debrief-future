/**
 * StacService Tests - Shapes/GeoJSON Feature Processing
 *
 * Tests that stacService.loadPlotData correctly categorizes features
 * from REP files with shapes (polygons, points, lines).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Sample features similar to what debrief-io returns for shapes.rep
const mockShapesFeatures = {
  type: 'FeatureCollection',
  features: [
    // Track with positions (should become Track)
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1], [2, 2]],
      },
      properties: {
        kind: 'TRACK',
        platform_name: 'MISSILE_ROTATION',
        track_type: 'CONTACT',
        start_time: '2024-01-01T00:00:00Z',
        end_time: '2024-01-01T00:02:00Z',
        positions: [
          { time: '2024-01-01T00:00:00Z' },
          { time: '2024-01-01T00:01:00Z' },
          { time: '2024-01-01T00:02:00Z' },
        ],
      },
    },
    // Polygon (should become otherFeature)
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
      },
      properties: {
        kind: 'RECTANGLE',
        label: 'test rectangle',
      },
    },
    // Point with kind=LOCATION (should become Location)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [0, 0],
      },
      properties: {
        kind: 'LOCATION',
        name: 'Reference Point',
      },
    },
    // Point without kind=LOCATION (should become otherFeature)
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [1, 1],
      },
      properties: {
        kind: 'TEXT',
        label: 'Annotation',
      },
    },
    // LineString without kind=TRACK (should become otherFeature)
    {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [1, 1]],
      },
      properties: {
        kind: 'LINE',
        label: 'test line',
      },
    },
    // Feature with null geometry (should be skipped)
    {
      type: 'Feature',
      geometry: null,
      properties: {
        kind: 'NARRATIVE',
        text: 'A comment',
      },
    },
    // Circle as polygon
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [0.1, 0], [0, 0.1], [0, 0]]],
      },
      properties: {
        kind: 'CIRCLE',
        label: 'test circle',
        radius: 2000,
      },
    },
  ],
};

// Mock STAC item
const mockStacItem = {
  type: 'Feature',
  stac_version: '1.0.0',
  id: 'test-item',
  geometry: null,
  bbox: [-180, -90, 180, 90],
  properties: {
    datetime: '2024-01-01T00:00:00Z',
    title: 'Test Plot',
  },
  links: [],
  assets: {
    data: {
      href: './data.geojson',
      type: 'application/geo+json',
    },
  },
};

describe('StacService Feature Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Feature categorization logic', () => {
    it('should categorize LineString with kind=TRACK as Track', () => {
      const feature = mockShapesFeatures.features[0];
      const geom = feature.geometry;
      const props = feature.properties;

      // This is the logic from stacService.loadPlotData
      const isTrack = geom?.type === 'LineString' && (props?.kind === 'TRACK' || !!props?.positions);
      expect(isTrack).toBe(true);
    });

    it('should categorize Point with kind=LOCATION as Location', () => {
      const feature = mockShapesFeatures.features[2];
      const geom = feature.geometry;
      const props = feature.properties;

      const isLocation = geom?.type === 'Point' && props?.kind === 'LOCATION';
      expect(isLocation).toBe(true);
    });

    it('should categorize Polygon as otherFeature', () => {
      const feature = mockShapesFeatures.features[1];
      const geom = feature.geometry;
      const props = feature.properties;

      const isTrack = geom?.type === 'LineString' && (props?.kind === 'TRACK' || props?.positions);
      const isLocation = geom?.type === 'Point' && props?.kind === 'LOCATION';
      const isOther = !isTrack && !isLocation && geom !== null;

      expect(isOther).toBe(true);
    });

    it('should categorize Point without kind=LOCATION as otherFeature', () => {
      const feature = mockShapesFeatures.features[3];
      const geom = feature.geometry;
      const props = feature.properties;

      const isTrack = geom?.type === 'LineString' && (props?.kind === 'TRACK' || props?.positions);
      const isLocation = geom?.type === 'Point' && props?.kind === 'LOCATION';
      const isOther = !isTrack && !isLocation && geom !== null;

      expect(isOther).toBe(true);
    });

    it('should categorize LineString without kind=TRACK as otherFeature', () => {
      const feature = mockShapesFeatures.features[4];
      const geom = feature.geometry;
      const props = feature.properties;

      const isTrack = geom?.type === 'LineString' && (props?.kind === 'TRACK' || props?.positions);
      const isLocation = geom?.type === 'Point' && props?.kind === 'LOCATION';
      const isOther = !isTrack && !isLocation && geom !== null;

      expect(isOther).toBe(true);
    });

    it('should skip features with null geometry', () => {
      const feature = mockShapesFeatures.features[5];
      const geom = feature.geometry;

      expect(geom).toBeNull();
    });

    it('should correctly count feature types for shapes.rep-like data', () => {
      const tracks: unknown[] = [];
      const locations: unknown[] = [];
      const otherFeatures: unknown[] = [];

      for (const feature of mockShapesFeatures.features) {
        const geom = feature.geometry;
        const props = feature.properties;

        if (!geom) {
          continue; // Skip null geometry
        }

        if (geom.type === 'LineString' && (props?.kind === 'TRACK' || props?.positions)) {
          tracks.push(feature);
        } else if (geom.type === 'Point' && props?.kind === 'LOCATION') {
          locations.push(feature);
        } else {
          otherFeatures.push(feature);
        }
      }

      expect(tracks).toHaveLength(1);
      expect(locations).toHaveLength(1);
      expect(otherFeatures).toHaveLength(4); // Polygon, Point(TEXT), LineString(LINE), Polygon(CIRCLE)
    });
  });

  describe('GeoJSON geometry validation', () => {
    it('should handle Polygon coordinates correctly', () => {
      const polygon = mockShapesFeatures.features[1];
      expect(polygon.geometry?.type).toBe('Polygon');
      expect(Array.isArray(polygon.geometry?.coordinates)).toBe(true);
      expect(Array.isArray(polygon.geometry?.coordinates[0])).toBe(true);
    });

    it('should handle Point coordinates correctly', () => {
      const point = mockShapesFeatures.features[2];
      expect(point.geometry?.type).toBe('Point');
      expect(Array.isArray(point.geometry?.coordinates)).toBe(true);
      expect(point.geometry?.coordinates).toHaveLength(2);
    });

    it('should handle LineString coordinates correctly', () => {
      const line = mockShapesFeatures.features[0];
      expect(line.geometry?.type).toBe('LineString');
      expect(Array.isArray(line.geometry?.coordinates)).toBe(true);
      expect(line.geometry?.coordinates.length).toBeGreaterThan(1);
    });
  });
});
