/**
 * StacService Unit Tests
 *
 * Comprehensive tests for stacService.ts covering all public methods.
 * Tests invoke actual service methods with mocked file system operations.
 *
 * @see specs/028-stacservice-unit-tests/spec.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { StacService } from '../../src/services/stacService';
import type { StacStore, StacCatalog, StacItem, Catalog } from '../../src/types/stac';

// =============================================================================
// Phase 1: Test Infrastructure - Mock fs module
// =============================================================================

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
  rmSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

// =============================================================================
// Phase 2: Mock Helper Functions
// =============================================================================

/**
 * Mock a valid catalog at the specified path
 */
function mockValidCatalog(catalogPath: string, catalog: Partial<StacCatalog> = {}): void {
  const fullCatalog = createMockCatalog(catalog);
  vi.mocked(fs.existsSync).mockImplementation((p) => p === catalogPath);
  vi.mocked(fs.readFileSync).mockImplementation((p) => {
    if (p === catalogPath) {
      return JSON.stringify(fullCatalog);
    }
    throw new Error(`File not found: ${p}`);
  });
}

/**
 * Mock a missing file scenario
 */
function mockMissingFile(): void {
  vi.mocked(fs.existsSync).mockReturnValue(false);
}

/**
 * Mock a read error
 */
function mockReadError(error: Error): void {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockImplementation(() => {
    throw error;
  });
}

/**
 * Mock malformed JSON
 */
function mockMalformedJson(): void {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue('{ invalid json }}}');
}

// =============================================================================
// Phase 2: Mock Data Factories
// =============================================================================

/**
 * Create a mock STAC catalog
 */
function createMockCatalog(overrides: Partial<StacCatalog> = {}): StacCatalog {
  return {
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'test-catalog',
    description: 'Test catalog for unit tests',
    links: [],
    ...overrides,
  };
}

/**
 * Create a mock STAC item
 */
function createMockItem(overrides: Partial<StacItem> = {}): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-180, -90, 180, 90],
    properties: {
      datetime: '2024-01-01T00:00:00Z',
      title: 'Test Item',
    },
    links: [],
    assets: {},
    ...overrides,
  };
}

/**
 * Create a mock FeatureCollection
 */
function createMockFeatureCollection(features: unknown[] = []): object {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Create a mock track feature (LineString with positions)
 */
function createMockTrackFeature(overrides: Partial<{
  id: string;
  name: string;
  positions: Array<{ time: string }>;
  coordinates: number[][];
}> = {}): object {
  const positions = overrides.positions ?? [
    { time: '2024-01-01T00:00:00Z' },
    { time: '2024-01-01T01:00:00Z' },
    { time: '2024-01-01T02:00:00Z' },
  ];
  const coordinates = overrides.coordinates ?? [
    [0, 0],
    [1, 1],
    [2, 2],
  ];

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates,
    },
    properties: {
      kind: 'TRACK',
      id: overrides.id ?? 'track-1',
      platform_name: overrides.name ?? 'Test Track',
      start_time: positions[0]?.time ?? '',
      end_time: positions[positions.length - 1]?.time ?? '',
      positions,
    },
  };
}

/**
 * Create a mock location feature (Point with kind=LOCATION)
 */
function createMockLocationFeature(overrides: Partial<{
  id: string;
  name: string;
  coordinates: number[];
}> = {}): object {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: overrides.coordinates ?? [0, 0],
    },
    properties: {
      id: overrides.id ?? 'location-1',
      name: overrides.name ?? 'Test Location',
      kind: 'LOCATION',
    },
  };
}

/**
 * Create a mock polygon feature
 */
function createMockPolygonFeature(overrides: Partial<{
  id: string;
  kind: string;
}> = {}): object {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
    properties: {
      id: overrides.id ?? 'polygon-1',
      kind: overrides.kind ?? 'RECTANGLE',
    },
  };
}

/**
 * Create a feature with null geometry
 */
function createNullGeometryFeature(): object {
  return {
    type: 'Feature',
    geometry: null,
    properties: {
      kind: 'NARRATIVE',
      text: 'A comment with no spatial representation',
    },
  };
}

/**
 * Create a mock StacStore
 */
function createMockStore(overrides: Partial<StacStore> = {}): StacStore {
  return {
    id: 'store-1',
    path: '/mock/store',
    status: 'available',
    ...overrides,
  };
}

/**
 * Create a mock Catalog
 */
function createMockCatalogSummary(overrides: Partial<Catalog> = {}): Catalog {
  return {
    id: 'catalog-1',
    title: 'Test Catalog',
    catalogPath: 'catalog.json',
    storeId: 'store-1',
    itemCount: 0,
    ...overrides,
  };
}

// =============================================================================
// Test Suite
// =============================================================================

describe('StacService', () => {
  let service: StacService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StacService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ===========================================================================
  // Phase 3: loadPlotData() Tests (CRITICAL)
  // ===========================================================================

  describe('loadPlotData', () => {
    it('should return a FeatureCollection with tracks, locations, and annotations', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createMockTrackFeature(),
        createMockLocationFeature(),
        createMockPolygonFeature(),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        throw new Error(`Unexpected path: ${p}`);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('FeatureCollection');
      const tracks = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'TRACK');
      const locations = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'POINT');
      const annotations = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind !== 'TRACK' && f.properties.kind !== 'POINT');
      expect(tracks).toHaveLength(1);
      expect(locations).toHaveLength(1);
      expect(annotations).toHaveLength(1);
    });

    it('should categorize LineString with kind=TRACK as Track', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createMockTrackFeature({ name: 'Vessel Alpha' }),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      const tracks = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'TRACK');
      expect(tracks).toHaveLength(1);
      expect((tracks[0].properties as Record<string, unknown>).platform_name).toBe('Vessel Alpha');
    });

    it('should categorize Point with kind=LOCATION as Location', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createMockLocationFeature({ name: 'Waypoint A' }),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      const locations = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'POINT');
      expect(locations).toHaveLength(1);
      expect((locations[0].properties as Record<string, unknown>).name).toBe('Waypoint A');
    });

    it('should categorize other geometries as annotation features', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createMockPolygonFeature({ kind: 'CIRCLE' }),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      const annotations = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind !== 'TRACK' && f.properties.kind !== 'POINT');
      expect(annotations).toHaveLength(1);
    });

    it('should return empty features when no GeoJSON asset (BUG FIX)', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {}, // No GeoJSON asset
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.loadPlotData(store, 'items/test.json');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('FeatureCollection');
      expect(result!.features).toEqual([]);
    });

    it('should return empty features when GeoJSON file missing', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.endsWith('.json'); // Item exists, GeoJSON doesn't
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.loadPlotData(store, 'items/test.json');

      expect(result).not.toBeNull();
      expect(result!.type).toBe('FeatureCollection');
      expect(result!.features).toEqual([]);
    });

    it('should return null when item not found', async () => {
      const store = createMockStore();
      mockMissingFile();

      const result = await service.loadPlotData(store, 'items/missing.json');

      expect(result).toBeNull();
    });

    it('should skip features with null geometry', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createNullGeometryFeature(),
        createMockTrackFeature(),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      // Only the track should survive (null geometry skipped)
      expect(result!.features).toHaveLength(1);
      expect((result!.features[0].properties as Record<string, unknown>).kind).toBe('TRACK');
    });

    it('should handle LineString without kind=TRACK as annotation feature', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const lineFeature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[0, 0], [1, 1]],
        },
        properties: {
          kind: 'LINE',
          // No times array
        },
      };
      const features = createMockFeatureCollection([lineFeature]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      const tracks = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'TRACK');
      expect(tracks).toHaveLength(0);
      // LINE without kind=TRACK is an annotation
      expect(result!.features).toHaveLength(1);
      expect((result!.features[0].properties as Record<string, unknown>).kind).toBe('LINE');
    });

    it('should handle Point without kind=LOCATION as annotation feature', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const pointFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [0, 0],
        },
        properties: {
          kind: 'TEXT', // Not LOCATION
          label: 'Annotation',
        },
      };
      const features = createMockFeatureCollection([pointFeature]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(features);
      });

      const result = await service.loadPlotData(store, 'items/test.json');

      const locations = result!.features.filter((f: { properties: Record<string, unknown> }) => f.properties.kind === 'POINT');
      expect(locations).toHaveLength(0);
      // TEXT annotation
      expect(result!.features).toHaveLength(1);
      expect((result!.features[0].properties as Record<string, unknown>).kind).toBe('TEXT');
    });

    it('should always return consistent FeatureCollection structure or null', async () => {
      const store = createMockStore();

      // Test various edge cases all return the same structure
      const testCases = [
        // Item with empty assets
        createMockItem({ assets: {} }),
        // Item with GeoJSON asset but empty features
        createMockItem({
          assets: { data: { href: './data.geojson', type: 'application/geo+json' } },
        }),
      ];

      for (const item of testCases) {
        vi.clearAllMocks();
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockImplementation((p) => {
          const pathStr = String(p);
          if (pathStr.endsWith('.json')) {
            return JSON.stringify(item);
          }
          return JSON.stringify(createMockFeatureCollection([]));
        });

        const result = await service.loadPlotData(store, 'items/test.json');

        expect(result).not.toBeNull();
        expect(result).toHaveProperty('type', 'FeatureCollection');
        expect(result).toHaveProperty('features');
        expect(Array.isArray(result!.features)).toBe(true);
      }
    });
  });

  // ===========================================================================
  // Phase 4: validateStorePath() Tests
  // ===========================================================================

  describe('validateStorePath', () => {
    it('should return valid:true for valid STAC catalog', async () => {
      const catalogPath = path.join('/test/store', 'catalog.json');
      mockValidCatalog(catalogPath);

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid:false when catalog.json missing', async () => {
      mockMissingFile();

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No catalog.json found in directory');
    });

    it('should return valid:false for invalid STAC format', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ type: 'NotACatalog', id: 'test' })
      );

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid STAC catalog format');
    });

    it('should return valid:false for malformed JSON', async () => {
      mockMalformedJson();

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Failed to read catalog');
    });

    it('should return valid:false for null catalog', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('null');

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid STAC catalog format');
    });

    it('should handle read errors gracefully', async () => {
      mockReadError(new Error('Permission denied'));

      const result = await service.validateStorePath('/test/store');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Permission denied');
    });
  });

  // ===========================================================================
  // Phase 5: listCatalogs() Tests
  // ===========================================================================

  describe('listCatalogs', () => {
    it('should return root catalog', async () => {
      const store = createMockStore();
      const catalog = createMockCatalog({ id: 'root', title: 'Root Catalog' });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      const result = await service.listCatalogs(store);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root');
      expect(result[0].title).toBe('Root Catalog');
    });

    it('should return child catalogs from links', async () => {
      const store = createMockStore();
      const rootCatalog = createMockCatalog({
        id: 'root',
        links: [
          { rel: 'child', href: 'child/catalog.json' },
        ],
      });
      const childCatalog = createMockCatalog({ id: 'child', title: 'Child Catalog' });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('child')) {
          return JSON.stringify(childCatalog);
        }
        return JSON.stringify(rootCatalog);
      });

      const result = await service.listCatalogs(store);

      expect(result).toHaveLength(2);
      expect(result[1].id).toBe('child');
    });

    it('should count items in each catalog', async () => {
      const store = createMockStore();
      const catalog = createMockCatalog({
        id: 'root',
        links: [
          { rel: 'item', href: 'item1.json' },
          { rel: 'item', href: 'item2.json' },
        ],
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      const result = await service.listCatalogs(store);

      // listCatalogs now returns -1 (deferred); counts are filled by countItemsForCatalogs
      expect(result[0].itemCount).toBe(-1);
    });

    it('should return empty array when root catalog missing', async () => {
      const store = createMockStore();
      mockMissingFile();

      const result = await service.listCatalogs(store);

      expect(result).toEqual([]);
    });

    it('should handle child catalog load failures gracefully', async () => {
      const store = createMockStore();
      const rootCatalog = createMockCatalog({
        id: 'root',
        links: [
          { rel: 'child', href: 'missing/catalog.json' },
        ],
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return !pathStr.includes('missing');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(rootCatalog));

      const result = await service.listCatalogs(store);

      // Should still return root catalog even if child fails
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('root');
    });

    it('should use cached catalogs on repeated calls', async () => {
      const store = createMockStore();
      const catalog = createMockCatalog({ id: 'root' });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      // First call
      await service.listCatalogs(store);
      const readCount1 = vi.mocked(fs.readFileSync).mock.calls.length;

      // Second call should use cache
      await service.listCatalogs(store);
      const readCount2 = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCount2).toBe(readCount1); // No additional reads
    });

    it('should use title from catalog, falling back to id', async () => {
      const store = createMockStore();
      const catalogWithTitle = createMockCatalog({ id: 'cat1', title: 'My Title' });
      const catalogWithoutTitle = createMockCatalog({ id: 'cat2', title: undefined });

      // Test with title
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalogWithTitle));

      let result = await service.listCatalogs(store);
      expect(result[0].title).toBe('My Title');

      // Clear cache and test without title
      service.clearCache();
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalogWithoutTitle));

      result = await service.listCatalogs(store);
      expect(result[0].title).toBe('cat2'); // Falls back to id
    });
  });

  // ===========================================================================
  // Phase 6: listItems() Tests
  // ===========================================================================

  describe('listItems', () => {
    it('should return items from catalog links', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({
        links: [
          { rel: 'item', href: 'items/item1.json' },
        ],
      });
      const item = createMockItem({ id: 'item1' });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('item1')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(catalog);
      });

      const result = await service.listItems(store, catalogSummary);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item1');
    });

    it('should sort items by datetime descending', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({
        links: [
          { rel: 'item', href: 'items/item1.json' },
          { rel: 'item', href: 'items/item2.json' },
        ],
      });
      const item1 = createMockItem({
        id: 'older',
        properties: { datetime: '2024-01-01T00:00:00Z' },
      });
      const item2 = createMockItem({
        id: 'newer',
        properties: { datetime: '2024-06-01T00:00:00Z' },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('item1')) {
          return JSON.stringify(item1);
        }
        if (pathStr.includes('item2')) {
          return JSON.stringify(item2);
        }
        return JSON.stringify(catalog);
      });

      const result = await service.listItems(store, catalogSummary);

      expect(result[0].id).toBe('newer'); // Most recent first
      expect(result[1].id).toBe('older');
    });

    it('should return empty array for catalog with no items', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({ links: [] });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      const result = await service.listItems(store, catalogSummary);

      expect(result).toEqual([]);
    });

    it('should handle item load failures gracefully', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({
        links: [
          { rel: 'item', href: 'items/missing.json' },
        ],
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.endsWith('catalog.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      const result = await service.listItems(store, catalogSummary);

      expect(result).toEqual([]);
    });

    it('should use cached items on repeated calls', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({
        links: [{ rel: 'item', href: 'items/item1.json' }],
      });
      const item = createMockItem({ id: 'item1' });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('item1')) {
          return JSON.stringify(item);
        }
        return JSON.stringify(catalog);
      });

      // First call
      await service.listItems(store, catalogSummary);
      const readCount1 = vi.mocked(fs.readFileSync).mock.calls.length;

      // Second call should use cache for items
      await service.listItems(store, catalogSummary);
      const readCount2 = vi.mocked(fs.readFileSync).mock.calls.length;

      // Catalog is re-read but items should be cached
      expect(readCount2).toBeLessThan(readCount1 * 2);
    });

    it('should use title from properties, falling back to id', async () => {
      const store = createMockStore();
      const catalogSummary = createMockCatalogSummary();
      const catalog = createMockCatalog({
        links: [{ rel: 'item', href: 'items/item1.json' }],
      });
      const itemWithTitle = createMockItem({
        id: 'item1',
        properties: { datetime: '2024-01-01T00:00:00Z', title: 'Custom Title' },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('item1')) {
          return JSON.stringify(itemWithTitle);
        }
        return JSON.stringify(catalog);
      });

      const result = await service.listItems(store, catalogSummary);

      expect(result[0].title).toBe('Custom Title');
    });
  });

  // ===========================================================================
  // Phase 7: loadPlot() Tests
  // ===========================================================================

  describe('loadPlot', () => {
    it('should return plot with correct metadata', async () => {
      const store = createMockStore();
      const item = createMockItem({
        id: 'plot-1',
        properties: {
          datetime: '2024-01-01T00:00:00Z',
          title: 'Test Plot',
        },
        bbox: [-10, -20, 10, 20],
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('plot-1');
      expect(result!.title).toBe('Test Plot');
      expect(result!.bbox).toEqual([-10, -20, 10, 20]);
    });

    it('should count tracks (LineString features)', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[2, 2], [3, 3]] }, properties: {} },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.trackCount).toBe(2);
    });

    it('should count locations (Point features)', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [2, 2] }, properties: {} },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.locationCount).toBe(3);
    });

    it('should calculate time extent from track start_time/end_time', async () => {
      const store = createMockStore();
      const item = createMockItem({
        properties: { datetime: '2024-06-01T00:00:00Z' },
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: {
            kind: 'TRACK',
            start_time: '2024-01-01T00:00:00Z',
            end_time: '2024-12-31T23:59:59Z',
          },
        },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.timeExtent[0]).toBe('2024-01-01T00:00:00Z');
      expect(result!.timeExtent[1]).toBe('2024-12-31T23:59:59Z');
    });

    it('should return null when item not found', async () => {
      const store = createMockStore();
      mockMissingFile();

      const result = await service.loadPlot(store, 'items/missing.json');

      expect(result).toBeNull();
    });

    it('should handle missing GeoJSON asset', async () => {
      const store = createMockStore();
      const item = createMockItem({ assets: {} });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result).not.toBeNull();
      expect(result!.trackCount).toBe(0);
      expect(result!.locationCount).toBe(0);
    });

    it('should handle empty feature collection', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.trackCount).toBe(0);
      expect(result!.locationCount).toBe(0);
    });

    it('should skip features with null geometry', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        createNullGeometryFeature(),
        { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.locationCount).toBe(1); // Only the Point, not the null geometry
    });

    it('should handle features without times array', async () => {
      const store = createMockStore();
      const item = createMockItem({
        properties: { datetime: '2024-06-01T00:00:00Z' },
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: {}, // No times array
        },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.trackCount).toBe(1);
      // Time extent should default to item datetime
      expect(result!.timeExtent[0]).toBe('2024-06-01T00:00:00Z');
    });

    it('should use start_datetime/end_datetime from STAC item when available', async () => {
      const store = createMockStore();
      const item = createMockItem({
        properties: {
          datetime: '2010-01-12T12:13:14+00:00',
          start_datetime: '2010-01-12T12:13:14+00:00',
          end_datetime: '2010-01-12T13:13:14+00:00',
        },
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: {}, // No times array or start_time/end_time
        },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.timeExtent[0]).toBe('2010-01-12T12:13:14+00:00');
      expect(result!.timeExtent[1]).toBe('2010-01-12T13:13:14+00:00');
    });

    it('should extract time extent from track start_time/end_time properties', async () => {
      const store = createMockStore();
      const item = createMockItem({
        properties: { datetime: '2010-01-12T12:13:14+00:00' },
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const features = createMockFeatureCollection([
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
          properties: {
            kind: 'TRACK',
            start_time: '2010-01-12T12:13:14+00:00',
            end_time: '2010-01-12T13:13:14+00:00',
          },
        },
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(features);
        }
        return JSON.stringify(item);
      });

      const result = await service.loadPlot(store, 'items/plot.json');

      expect(result!.timeExtent[0]).toBe('2010-01-12T12:13:14+00:00');
      expect(result!.timeExtent[1]).toBe('2010-01-12T13:13:14+00:00');
    });
  });

  // ===========================================================================
  // Phase 8: Write Methods Tests
  // ===========================================================================

  describe('addAsset', () => {
    it('should copy source file to assets directory', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.endsWith('.json') || pathStr.includes('assets');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      await service.addAsset('/store', 'items/test.json', '/source/file.rep');

      expect(vi.mocked(fs.copyFileSync)).toHaveBeenCalled();
    });

    it('should create assets directory if needed', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.includes('assets')) {
          return false; // Assets directory doesn't exist
        }
        return pathStr.endsWith('.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      await service.addAsset('/store', 'items/test.json', '/source/file.rep');

      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        expect.stringContaining('assets'),
        { recursive: true }
      );
    });

    it('should add asset reference to item JSON', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });
      let writtenContent: string | undefined;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = String(content);
      });

      await service.addAsset('/store', 'items/test.json', '/source/file.rep');

      expect(writtenContent).toBeDefined();
      const written = JSON.parse(writtenContent!);
      expect(written.assets.file).toBeDefined();
      expect(written.assets.file.href).toContain('file.rep');
    });

    it('should use filename stem as default asset key', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });
      let writtenContent: string | undefined;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = String(content);
      });

      const key = await service.addAsset('/store', 'items/test.json', '/source/my-data.rep');

      expect(key).toBe('my-data');
      const written = JSON.parse(writtenContent!);
      expect(written.assets['my-data']).toBeDefined();
    });

    it('should use provided asset key when specified', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });
      let writtenContent: string | undefined;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = String(content);
      });

      const key = await service.addAsset('/store', 'items/test.json', '/source/file.rep', 'custom-key');

      expect(key).toBe('custom-key');
      const written = JSON.parse(writtenContent!);
      expect(written.assets['custom-key']).toBeDefined();
    });

    it('should throw when item not found', async () => {
      mockMissingFile();

      await expect(
        service.addAsset('/store', 'items/missing.json', '/source/file.rep')
      ).rejects.toThrow('Item not found');
    });

    it('should clear item cache after update', async () => {
      const item = createMockItem({ id: 'test-item', assets: {} });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      // First load to populate cache
      const store = createMockStore({ path: '/store' });
      await service.loadPlot(store, 'items/test.json');

      // Add asset (should clear cache)
      await service.addAsset('/store', 'items/test.json', '/source/file.rep');

      // Next load should re-read from disk
      const readCountBefore = vi.mocked(fs.readFileSync).mock.calls.length;
      await service.loadPlot(store, 'items/test.json');
      const readCountAfter = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCountAfter).toBeGreaterThan(readCountBefore);
    });
  });

  describe('addFeatures', () => {
    it('should append features to existing GeoJSON', async () => {
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const existingFeatures = createMockFeatureCollection([
        createMockTrackFeature({ id: 'existing' }),
      ]);
      let writtenGeoJson: string | undefined;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(existingFeatures);
        }
        return JSON.stringify(item);
      });
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          writtenGeoJson = String(content);
        }
      });

      const newFeature = {
        type: 'Feature' as const,
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: { id: 'new' },
      };

      const count = await service.addFeatures('/store', 'items/test.json', [newFeature as never]);

      expect(count).toBe(2); // 1 existing + 1 new
      const written = JSON.parse(writtenGeoJson!);
      expect(written.features).toHaveLength(2);
    });

    it('should create new GeoJSON file when none exists', async () => {
      const item = createMockItem({ assets: {} });
      let writtenGeoJson: string | undefined;
      let writtenItem: string | undefined;

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.endsWith('.json'); // Only item exists
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          writtenGeoJson = String(content);
        } else if (pathStr.endsWith('.json')) {
          writtenItem = String(content);
        }
      });

      const newFeature = {
        type: 'Feature' as const,
        geometry: { type: 'Point', coordinates: [0, 0] },
        properties: {},
      };

      await service.addFeatures('/store', 'items/test.json', [newFeature as never]);

      expect(writtenGeoJson).toBeDefined();
      expect(writtenItem).toBeDefined();
      const writtenItemObj = JSON.parse(writtenItem!);
      expect(writtenItemObj.assets.data).toBeDefined();
    });

    it('should update item bbox from features', async () => {
      const item = createMockItem({ assets: {}, bbox: [0, 0, 0, 0] });
      let writtenItem: string | undefined;

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.endsWith('.json');
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.json')) {
          writtenItem = String(content);
        }
      });

      const feature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString',
          coordinates: [[-10, -20], [30, 40]],
        },
        properties: {},
      };

      await service.addFeatures('/store', 'items/test.json', [feature as never]);

      const written = JSON.parse(writtenItem!);
      expect(written.bbox).toEqual([-10, -20, 30, 40]);
    });

    // #212 VR-1 / SC-004: a `geometry: null` feature (RFC 7946 "unlocated" —
    // SYSTEM_RECORD / STORYBOARD / NarrativeEntry) must be PRESERVED, not
    // dropped, through the migrated addFeatures → writeGeoJson boundary, and
    // must not corrupt the bbox (calculateBounds skips null geometry).
    it('preserves a geometry:null feature and excludes it from bbox', async () => {
      const item = createMockItem({ assets: {}, bbox: [0, 0, 0, 0] });
      let writtenGeoJson: string | undefined;
      let writtenItem: string | undefined;

      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('.json'));
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          writtenGeoJson = String(content);
        } else if (pathStr.endsWith('.json')) {
          writtenItem = String(content);
        }
      });

      const features = [
        // unlocated SYSTEM feature — geometry is null
        { type: 'Feature' as const, id: 'system-1', geometry: null, properties: { kind: 'SYSTEM_RECORD' } },
        // located feature — drives the bbox
        { type: 'Feature' as const, geometry: { type: 'LineString', coordinates: [[-10, -20], [30, 40]] }, properties: {} },
      ];

      const count = await service.addFeatures('/store', 'items/test.json', features as never[]);

      // both features written — the null-geometry one survives
      expect(count).toBe(2);
      const writtenFc = JSON.parse(writtenGeoJson!);
      expect(writtenFc.features).toHaveLength(2);
      const systemFeature = writtenFc.features.find((f: { id?: string }) => f.id === 'system-1');
      expect(systemFeature).toBeDefined();
      expect(systemFeature.geometry).toBeNull();

      // bbox computed only from the located feature (null geometry skipped)
      const writtenItemObj = JSON.parse(writtenItem!);
      expect(writtenItemObj.bbox).toEqual([-10, -20, 30, 40]);
    });

    // #212 VR-3: the bbox now comes from the shared `calculateBounds`, which
    // covers all seven geometry types. The deleted local `extractCoordinates`
    // silently omitted Multi* geometries, so a MultiPolygon-only collection
    // previously produced no/incorrect bbox; it is now correct.
    it('computes a correct bbox for a MultiPolygon feature (Multi* fix)', async () => {
      const item = createMockItem({ assets: {}, bbox: [0, 0, 0, 0] });
      let writtenItem: string | undefined;

      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('.json'));
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        if (String(p).endsWith('.json')) {
          writtenItem = String(content);
        }
      });

      const feature = {
        type: 'Feature' as const,
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[-5, -5], [5, -5], [5, 5], [-5, 5], [-5, -5]]],
            [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
          ],
        },
        properties: {},
      };

      await service.addFeatures('/store', 'items/test.json', [feature as never]);

      const writtenItemObj = JSON.parse(writtenItem!);
      // spans both polygons: min corner of polygon 1, max corner of polygon 2
      expect(writtenItemObj.bbox).toEqual([-5, -5, 20, 20]);
    });

    it('should throw when item not found', async () => {
      mockMissingFile();

      await expect(
        service.addFeatures('/store', 'items/missing.json', [])
      ).rejects.toThrow('Item not found');
    });

    it('should clear item cache after update', async () => {
      const item = createMockItem({ assets: {} });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      // Populate cache
      const store = createMockStore({ path: '/store' });
      await service.loadPlot(store, 'items/test.json');

      // Add features
      await service.addFeatures('/store', 'items/test.json', []);

      // Verify cache was cleared by checking reads increase
      const readCountBefore = vi.mocked(fs.readFileSync).mock.calls.length;
      await service.loadPlot(store, 'items/test.json');
      const readCountAfter = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCountAfter).toBeGreaterThan(readCountBefore);
    });

    it('should return updated feature count', async () => {
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json' },
        },
      });
      const existingFeatures = createMockFeatureCollection([
        createMockTrackFeature(),
        createMockLocationFeature(),
      ]);

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = String(p);
        if (pathStr.endsWith('.geojson')) {
          return JSON.stringify(existingFeatures);
        }
        return JSON.stringify(item);
      });

      const newFeatures = [
        { type: 'Feature' as const, geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature' as const, geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} },
      ];

      const count = await service.addFeatures('/store', 'items/test.json', newFeatures as never[]);

      expect(count).toBe(4); // 2 existing + 2 new
    });

    it('should handle various geometry types', async () => {
      const item = createMockItem({ assets: {} });
      let writtenGeoJson: string | undefined;

      vi.mocked(fs.existsSync).mockImplementation((p) => String(p).endsWith('.json'));
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((p, content) => {
        if (String(p).endsWith('.geojson')) {
          writtenGeoJson = String(content);
        }
      });

      const features = [
        { type: 'Feature' as const, geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} },
        { type: 'Feature' as const, geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: {} },
        { type: 'Feature' as const, geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }, properties: {} },
      ];

      await service.addFeatures('/store', 'items/test.json', features as never[]);

      const written = JSON.parse(writtenGeoJson!);
      expect(written.features).toHaveLength(3);
    });
  });

  describe('hasAsset', () => {
    it('should return true when asset exists', async () => {
      const item = createMockItem({
        assets: {
          'my-asset': { href: './my-asset.rep', type: 'application/x-rep' },
        },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.hasAsset('/store', 'items/test.json', 'my-asset');

      expect(result).toBe(true);
    });

    it('should return false when asset does not exist', async () => {
      const item = createMockItem({ assets: {} });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.hasAsset('/store', 'items/test.json', 'missing-asset');

      expect(result).toBe(false);
    });

    it('should return false when item not found', async () => {
      mockMissingFile();

      const result = await service.hasAsset('/store', 'items/missing.json', 'any-asset');

      expect(result).toBe(false);
    });
  });

  describe('saveTrackColors', () => {
    it('should update item properties with track colors', async () => {
      const item = createMockItem();
      let writtenContent: string | undefined;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation((_, content) => {
        writtenContent = String(content);
      });

      const colors = { 'track-1': '#ff0000', 'track-2': '#00ff00' };
      await service.saveTrackColors(createMockStore(), 'items/test.json', colors);

      const written = JSON.parse(writtenContent!);
      expect(written.properties.trackColors).toEqual(colors);
    });

    it('should write updated item to disk', async () => {
      const item = createMockItem();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      await service.saveTrackColors(createMockStore(), 'items/test.json', {});

      expect(vi.mocked(fs.writeFileSync)).toHaveBeenCalled();
    });

    it('should clear item cache after update', async () => {
      const item = createMockItem();
      const store = createMockStore();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      // Populate cache
      await service.loadPlot(store, 'items/test.json');

      // Save colors
      await service.saveTrackColors(store, 'items/test.json', {});

      // Verify cache was cleared
      const readCountBefore = vi.mocked(fs.readFileSync).mock.calls.length;
      await service.loadPlot(store, 'items/test.json');
      const readCountAfter = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCountAfter).toBeGreaterThan(readCountBefore);
    });

    it('should return true on success', async () => {
      const item = createMockItem();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      const result = await service.saveTrackColors(createMockStore(), 'items/test.json', {});

      expect(result).toBe(true);
    });

    it('should return false when item not found', async () => {
      mockMissingFile();

      const result = await service.saveTrackColors(createMockStore(), 'items/missing.json', {});

      expect(result).toBe(false);
    });

    it('should return false on write error', async () => {
      const item = createMockItem();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed');
      });

      const result = await service.saveTrackColors(createMockStore(), 'items/test.json', {});

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // Phase 9: Utility Methods Tests
  // ===========================================================================

  describe('clearCache', () => {
    it('should clear catalog cache', async () => {
      const store = createMockStore();
      const catalog = createMockCatalog();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(catalog));

      // Populate cache
      await service.listCatalogs(store);
      const readCount1 = vi.mocked(fs.readFileSync).mock.calls.length;

      // Clear cache
      service.clearCache();

      // Next call should re-read
      await service.listCatalogs(store);
      const readCount2 = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCount2).toBeGreaterThan(readCount1);
    });

    it('should clear item cache', async () => {
      const store = createMockStore();
      const item = createMockItem();

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));

      // Populate cache
      await service.loadPlot(store, 'items/test.json');
      const readCount1 = vi.mocked(fs.readFileSync).mock.calls.length;

      // Verify cache is being used
      await service.loadPlot(store, 'items/test.json');
      const readCount2 = vi.mocked(fs.readFileSync).mock.calls.length;
      expect(readCount2).toBe(readCount1); // Same count = cache hit

      // Clear cache
      service.clearCache();

      // Next call should re-read
      await service.loadPlot(store, 'items/test.json');
      const readCount3 = vi.mocked(fs.readFileSync).mock.calls.length;

      expect(readCount3).toBeGreaterThan(readCount2);
    });
  });

  // ===========================================================================
  // Phase: createItem tests (Feature 043)
  // ===========================================================================

  describe('createItem', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should create item directory, assets directory, and item.json', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = String(p);
        // Item dir does not exist yet; catalog.json does
        if (s.endsWith('my-plot')) {return false;}
        if (s.endsWith('catalog.json')) {return true;}
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(createMockCatalog({ links: [] }))
      );

      const result = await service.createItem('/store', { title: 'My Plot' });

      expect(result.itemId).toBe('test-uuid-1234');
      expect(result.itemPath).toBe('my-plot/item.json');
      expect(result.itemDir).toBe(path.join('/store', 'my-plot'));

      // Should create item dir and assets dir
      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        path.join('/store', 'my-plot'),
        { recursive: true }
      );
      expect(vi.mocked(fs.mkdirSync)).toHaveBeenCalledWith(
        path.join('/store', 'my-plot', 'assets'),
        { recursive: true }
      );

      // Should write item.json
      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        (c) => String(c[0]).endsWith('item.json')
      );
      expect(writeCall).toBeDefined();
      const itemJson = JSON.parse(writeCall![1] as string);
      expect(itemJson.type).toBe('Feature');
      expect(itemJson.stac_version).toBe('1.0.0');
      expect(itemJson.id).toBe('test-uuid-1234');
      expect(itemJson.properties.title).toBe('My Plot');
      expect(itemJson.bbox).toBeNull();
      expect(itemJson.geometry).toBeNull();
      expect(itemJson.assets).toEqual({});
    });

    it('should update catalog.json with item link', async () => {
      const originalCatalog = createMockCatalog({
        links: [
          { rel: 'root', href: './catalog.json', type: 'application/json' },
        ],
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('new-plot')) {return false;}
        if (s.endsWith('catalog.json')) {return true;}
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(originalCatalog));

      await service.createItem('/store', { title: 'New Plot' });

      // Find the catalog.json write
      const catalogWrite = vi.mocked(fs.writeFileSync).mock.calls.find(
        (c) => String(c[0]).endsWith('catalog.json')
      );
      expect(catalogWrite).toBeDefined();
      const updatedCatalog = JSON.parse(catalogWrite![1] as string);
      const itemLink = updatedCatalog.links.find(
        (l: { rel: string }) => l.rel === 'item'
      );
      expect(itemLink).toBeDefined();
      expect(itemLink.href).toBe('./new-plot/item.json');
      expect(itemLink.title).toBe('New Plot');
    });

    it('should use provided ID instead of generating one', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('custom-id-plot')) {return false;}
        if (s.endsWith('catalog.json')) {return true;}
        return false;
      });
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(createMockCatalog({ links: [] }))
      );

      const result = await service.createItem('/store', {
        title: 'Custom ID Plot',
        id: 'my-custom-id',
      });

      expect(result.itemId).toBe('my-custom-id');
      expect(result.itemPath).toBe('custom-id-plot/item.json');
    });

    it('should throw if item directory already exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true); // dir exists

      expect(() =>
        service.createItem('/store', { title: 'Duplicate' })
      ).toThrow('Item already exists');
    });
  });

  // ===========================================================================
  // Phase: updateTemporalMetadata tests (Feature 043)
  // ===========================================================================

  describe('updateTemporalMetadata', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should set start_datetime and end_datetime from track start_time/end_time', async () => {
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json', title: 'Data' },
        },
      });

      const fc = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
            properties: {
              kind: 'TRACK',
              start_time: '2024-01-01T00:00:00.000Z',
              end_time: '2024-01-01T12:00:00.000Z',
            },
          },
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[2, 2], [3, 3]] },
            properties: {
              kind: 'TRACK',
              start_time: '2024-01-02T00:00:00.000Z',
              end_time: '2024-01-02T18:00:00.000Z',
            },
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('item.json')) {return JSON.stringify(item);}
        if (s.endsWith('.geojson')) {return JSON.stringify(fc);}
        throw new Error(`Unexpected: ${s}`);
      });

      await service.updateTemporalMetadata('/store', 'test-item/item.json');

      const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(
        (c) => String(c[0]).endsWith('item.json')
      );
      expect(writeCall).toBeDefined();
      const updatedItem = JSON.parse(writeCall![1] as string);
      expect(updatedItem.properties.start_datetime).toBe('2024-01-01T00:00:00.000Z');
      expect(updatedItem.properties.end_datetime).toBe('2024-01-02T18:00:00.000Z');
    });

    it('should not write if no temporal data found', async () => {
      const item = createMockItem({
        assets: {
          data: { href: './data.geojson', type: 'application/geo+json', title: 'Data' },
        },
      });

      const fc = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { name: 'loc1' },
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const s = String(p);
        if (s.endsWith('item.json')) {return JSON.stringify(item);}
        if (s.endsWith('.geojson')) {return JSON.stringify(fc);}
        throw new Error(`Unexpected: ${s}`);
      });

      await service.updateTemporalMetadata('/store', 'test-item/item.json');

      // Should not write item.json (no temporal data)
      expect(vi.mocked(fs.writeFileSync)).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Phase: Result File Extraction tests (Feature 051)
  // ===========================================================================

  describe('parseViewerType', () => {
    it('should parse viewer type from multi-suffix filename', () => {
      expect(service.parseViewerType('range-bearing.2d.json')).toBe('2d');
      expect(service.parseViewerType('result.table.geojson')).toBe('table');
      expect(service.parseViewerType('analysis.chart.csv')).toBe('chart');
    });

    it('should return undefined for single-suffix filename', () => {
      expect(service.parseViewerType('data.json')).toBeUndefined();
      expect(service.parseViewerType('result.geojson')).toBeUndefined();
    });

    it('should return undefined for unknown viewer types', () => {
      expect(service.parseViewerType('file.custom.json')).toBeUndefined();
      expect(service.parseViewerType('file.unknown.json')).toBeUndefined();
    });

    it('should be case-insensitive', () => {
      expect(service.parseViewerType('result.TABLE.json')).toBe('table');
      expect(service.parseViewerType('data.2D.csv')).toBe('2d');
    });
  });

  describe('parseFileFormat', () => {
    it('should return lowercase file extension', () => {
      expect(service.parseFileFormat('data.json')).toBe('json');
      expect(service.parseFileFormat('result.GeoJSON')).toBe('geojson');
      expect(service.parseFileFormat('export.CSV')).toBe('csv');
    });

    it('should return empty string for files without extension', () => {
      expect(service.parseFileFormat('noextension')).toBe('');
    });
  });

  describe('isResultAsset', () => {
    it('should return true for asset with result role', () => {
      const asset = { href: './assets/data.json', roles: ['result'] };
      expect(service.isResultAsset(asset, 'data')).toBe(true);
    });

    it('should return true for asset with debrief:toolId', () => {
      const asset = {
        href: './assets/range-bearing.json',
        'debrief:toolId': 'range-bearing',
      };
      expect(service.isResultAsset(asset as never, 'range-bearing')).toBe(true);
    });

    it('should return true for asset matching result patterns', () => {
      const patterns = [
        { href: './assets/range-bearing-t1-t2.json' },
        { href: './assets/analysis-result.json' },
        { href: './assets/track-analysis.json' },
      ];

      expect(service.isResultAsset(patterns[0], 'rb')).toBe(true);
      expect(service.isResultAsset(patterns[1], 'ar')).toBe(true);
    });

    it('should return false for source files', () => {
      const asset = { href: './assets/source.rep', roles: ['source'] };
      expect(service.isResultAsset(asset, 'source')).toBe(false);
    });

    it('should return false for data files without result indicators', () => {
      const asset = { href: './data.geojson', type: 'application/geo+json' };
      expect(service.isResultAsset(asset, 'data')).toBe(false);
    });
  });

  describe('assetToAssociatedFile', () => {
    it('should transform asset to AssociatedFile', () => {
      const asset = {
        href: './assets/range-bearing.json',
        title: 'Range Bearing Analysis',
        type: 'application/json',
      };

      const result = service.assetToAssociatedFile(asset, 'range-bearing');

      expect(result.name).toBe('Range Bearing Analysis');
      expect(result.path).toBe('assets/range-bearing.json');
      expect(result.category).toBe('result');
      expect(result.format).toBe('json');
    });

    it('should use filename as name when title missing', () => {
      const asset = { href: './assets/data.json' };

      const result = service.assetToAssociatedFile(asset, 'data');

      expect(result.name).toBe('data.json');
    });

    it('should parse viewer type from multi-suffix filename', () => {
      const asset = { href: './assets/result.table.json', title: 'Results Table' };

      const result = service.assetToAssociatedFile(asset, 'result');

      expect(result.viewerType).toBe('table');
    });

    it('should strip leading ./ from path', () => {
      const asset = { href: './assets/data.json' };

      const result = service.assetToAssociatedFile(asset, 'data');

      expect(result.path).toBe('assets/data.json');
    });
  });

  describe('getResultFilesFromItem', () => {
    it('should extract result files from item assets', () => {
      const item = createMockItem({
        assets: {
          'range-bearing': {
            href: './assets/range-bearing.json',
            title: 'Range Bearing',
            type: 'application/json',
            roles: ['result'],
          },
          source: {
            href: './assets/source.rep',
            type: 'application/x-rep',
            roles: ['source'],
          },
        },
      });

      const results = service.getResultFilesFromItem(item);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Range Bearing');
      expect(results[0].category).toBe('result');
    });

    it('should extract multiple result files', () => {
      const item = createMockItem({
        assets: {
          'result-1': {
            href: './assets/result-1.json',
            roles: ['result'],
          },
          'result-2': {
            href: './assets/result-2.json',
            roles: ['result'],
          },
          'result-3': {
            href: './assets/result-3.json',
            'debrief:toolId': 'some-tool',
          },
        },
      });

      const results = service.getResultFilesFromItem(item);

      expect(results).toHaveLength(3);
    });

    it('should return empty array when no assets', () => {
      const item = createMockItem({ assets: {} });

      const results = service.getResultFilesFromItem(item);

      expect(results).toEqual([]);
    });

    it('should return empty array when assets undefined', () => {
      const item = createMockItem();
      // @ts-expect-error - testing undefined assets
      item.assets = undefined;

      const results = service.getResultFilesFromItem(item);

      expect(results).toEqual([]);
    });

    it('should filter non-result assets', () => {
      const item = createMockItem({
        assets: {
          data: {
            href: './data.geojson',
            type: 'application/geo+json',
            roles: ['data'],
          },
          thumbnail: {
            href: './preview.png',
            type: 'image/png',
            roles: ['thumbnail'],
          },
          result: {
            href: './assets/analysis.json',
            roles: ['result'],
          },
        },
      });

      const results = service.getResultFilesFromItem(item);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe('assets/analysis.json');
    });

    it('should skip assets with missing href gracefully', () => {
      const item = createMockItem({
        assets: {
          valid: {
            href: './assets/valid.json',
            roles: ['result'],
          },
          invalid: {
            // Missing href
            roles: ['result'],
          } as never,
        },
      });

      // Should not throw, just skip invalid
      const results = service.getResultFilesFromItem(item);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('loadResultFiles', () => {
    it('should load result files from store and item path', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          'range-bearing': {
            href: './assets/range-bearing.json',
            title: 'Range Bearing',
            roles: ['result'],
          },
        },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 1000 } as fs.Stats);

      const results = await service.loadResultFiles(store, 'test-item/item.json');

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Range Bearing');
    });

    it('should return empty array when item not found', async () => {
      const store = createMockStore();
      mockMissingFile();

      const results = await service.loadResultFiles(store, 'missing/item.json');

      expect(results).toEqual([]);
    });

    it('should return empty array on load error', async () => {
      const store = createMockStore();
      mockReadError(new Error('Permission denied'));

      const results = await service.loadResultFiles(store, 'test/item.json');

      expect(results).toEqual([]);
    });

    it('should populate mtime from filesystem and sort by mtime descending', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          'old-result': {
            href: './assets/old-result.json',
            title: 'Old Result',
            roles: ['result'],
          },
          'new-result': {
            href: './assets/new-result.json',
            title: 'New Result',
            roles: ['result'],
          },
          'mid-result': {
            href: './assets/mid-result.json',
            title: 'Mid Result',
            roles: ['result'],
          },
        },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.statSync).mockImplementation((p) => {
        const filePath = String(p);
        if (filePath.includes('old-result')) return { mtimeMs: 1000 } as fs.Stats;
        if (filePath.includes('new-result')) return { mtimeMs: 3000 } as fs.Stats;
        if (filePath.includes('mid-result')) return { mtimeMs: 2000 } as fs.Stats;
        return { mtimeMs: 0 } as fs.Stats;
      });

      const results = await service.loadResultFiles(store, 'test-item/item.json');

      expect(results).toHaveLength(3);
      // Most recent first
      expect(results[0].name).toBe('New Result');
      expect(results[0].mtime).toBe(3000);
      expect(results[1].name).toBe('Mid Result');
      expect(results[1].mtime).toBe(2000);
      expect(results[2].name).toBe('Old Result');
      expect(results[2].mtime).toBe(1000);
    });

    it('should handle missing files gracefully when populating mtime', async () => {
      const store = createMockStore();
      const item = createMockItem({
        assets: {
          'exists': {
            href: './assets/exists.json',
            title: 'Exists',
            roles: ['result'],
          },
          'missing': {
            href: './assets/missing.json',
            title: 'Missing',
            roles: ['result'],
          },
        },
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(item));
      vi.mocked(fs.statSync).mockImplementation((p) => {
        const filePath = String(p);
        if (filePath.includes('missing')) throw new Error('ENOENT');
        return { mtimeMs: 5000 } as fs.Stats;
      });

      const results = await service.loadResultFiles(store, 'test-item/item.json');

      expect(results).toHaveLength(2);
      // File with mtime should come first, missing mtime last
      expect(results[0].mtime).toBe(5000);
      expect(results[1].mtime).toBeUndefined();
    });
  });

  // ===========================================================================
  // Phase: Performance tests (Feature 051 - T028)
  // ===========================================================================

  describe('getResultFilesFromItem - performance', () => {
    it('should handle 50+ assets in under 500ms', () => {
      // Generate 60 result assets
      const assets: Record<string, { href: string; title: string; roles: string[] }> = {};
      for (let i = 0; i < 60; i++) {
        assets[`result-${i}`] = {
          href: `./assets/result-${i}.2d.json`,
          title: `Result ${i}`,
          roles: ['result'],
        };
      }
      // Add 20 non-result assets for filtering
      for (let i = 0; i < 20; i++) {
        assets[`source-${i}`] = {
          href: `./sources/data-${i}.rep`,
          title: `Source ${i}`,
          roles: ['source'],
        };
      }

      const item = createMockItem({ assets });

      const start = performance.now();
      const results = service.getResultFilesFromItem(item);
      const elapsed = performance.now() - start;

      expect(results).toHaveLength(60);
      expect(elapsed).toBeLessThan(500);
    });
  });
});
