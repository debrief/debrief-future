/**
 * StacService Metadata Extraction Tests
 *
 * Tests that listItems() correctly extracts bbox, startDatetime,
 * and endDatetime from item.json files.
 *
 * @see specs/042-stac-catalog-overview-panel/spec.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { StacService } from '../../src/services/stacService';
import type { StacStore, StacCatalog, StacItem, Catalog } from '../../src/types/stac';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  copyFileSync: vi.fn(),
}));

function createMockCatalog(overrides: Partial<StacCatalog> = {}): StacCatalog {
  return {
    type: 'Catalog',
    stac_version: '1.0.0',
    id: 'test-catalog',
    description: 'Test catalog',
    links: [],
    ...overrides,
  };
}

function createMockItem(overrides: Partial<StacItem> = {}): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-10, -20, 30, 40],
    properties: {
      datetime: '2024-06-15T12:00:00Z',
      title: 'Test Item',
    },
    links: [],
    assets: {},
    ...overrides,
  };
}

const STORE: StacStore = {
  id: 'store-1',
  path: '/store',
  status: 'available',
};

const CATALOG: Catalog = {
  id: 'test-catalog',
  title: 'Test Catalog',
  catalogPath: 'catalog.json',
  storeId: 'store-1',
  itemCount: 1,
};

describe('StacService metadata extraction', () => {
  let service: StacService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new StacService();
  });

  it('extracts bbox from item.json', async () => {
    const catalog = createMockCatalog({
      links: [{ rel: 'item', href: 'items/item-1/item.json' }],
    });
    const item = createMockItem({
      bbox: [-5, 50, 2, 55],
    });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('catalog.json')) {
        return JSON.stringify(catalog);
      }
      if (s.endsWith('item.json')) {
        return JSON.stringify(item);
      }
      throw new Error(`Unexpected path: ${s}`);
    });

    const items = await service.listItems(STORE, CATALOG);
    expect(items).toHaveLength(1);
    expect(items[0].bbox).toEqual([-5, 50, 2, 55]);
  });

  it('extracts start_datetime and end_datetime from properties', async () => {
    const catalog = createMockCatalog({
      links: [{ rel: 'item', href: 'items/item-1/item.json' }],
    });
    const item = createMockItem({
      properties: {
        datetime: '2024-06-15T12:00:00Z',
        title: 'Range Item',
        start_datetime: '2024-06-01T00:00:00Z',
        end_datetime: '2024-06-30T23:59:59Z',
      },
    });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('catalog.json')) {
        return JSON.stringify(catalog);
      }
      if (s.endsWith('item.json')) {
        return JSON.stringify(item);
      }
      throw new Error(`Unexpected path: ${s}`);
    });

    const items = await service.listItems(STORE, CATALOG);
    expect(items).toHaveLength(1);
    expect(items[0].startDatetime).toBe('2024-06-01T00:00:00Z');
    expect(items[0].endDatetime).toBe('2024-06-30T23:59:59Z');
  });

  it('returns null for missing bbox and temporal fields', async () => {
    const catalog = createMockCatalog({
      links: [{ rel: 'item', href: 'items/item-1/item.json' }],
    });
    const item: StacItem = {
      type: 'Feature',
      stac_version: '1.0.0',
      id: 'no-meta',
      geometry: null as unknown as GeoJSON.Geometry,
      bbox: undefined as unknown as [number, number, number, number],
      properties: {
        datetime: '2024-01-01T00:00:00Z',
      },
      links: [],
      assets: {},
    };

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const s = String(p);
      if (s.endsWith('catalog.json')) {
        return JSON.stringify(catalog);
      }
      if (s.endsWith('item.json')) {
        return JSON.stringify(item);
      }
      throw new Error(`Unexpected path: ${s}`);
    });

    const items = await service.listItems(STORE, CATALOG);
    expect(items).toHaveLength(1);
    expect(items[0].bbox).toBeNull();
    expect(items[0].startDatetime).toBeNull();
    expect(items[0].endDatetime).toBeNull();
  });
});
