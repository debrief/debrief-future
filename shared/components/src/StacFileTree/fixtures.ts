/**
 * Test fixtures using memfs for StacFileTree component
 */

import { Volume } from 'memfs';
import type { FilesystemAdapter, DirectoryEntry, FileStat } from './types';

/**
 * Creates a memfs volume with a populated STAC catalog structure.
 * Includes 2 catalogs, multiple items, assets, and snapshot files.
 */
export function createPopulatedStore(): Volume {
  const vol = Volume.fromJSON({
    '/catalog-1/catalog.json': JSON.stringify({
      type: 'Catalog',
      id: 'catalog-1',
      description: 'Main Catalog',
    }),
    '/catalog-1/collection-a/collection.json': JSON.stringify({
      type: 'Collection',
      id: 'collection-a',
      description: 'Collection A',
    }),
    '/catalog-1/collection-a/item-001/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-001',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    }),
    '/catalog-1/collection-a/item-001/track.geojson': JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    }),
    '/catalog-1/collection-a/item-001/snapshot-1.json': JSON.stringify({
      id: 'snapshot-1',
      timestamp: '2024-01-15T10:00:00Z',
    }),
    '/catalog-1/collection-a/item-002/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-002',
      geometry: { type: 'Point', coordinates: [1, 1] },
      properties: {},
    }),
    '/catalog-1/collection-a/item-002/track.geojson': JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    }),
    '/catalog-2/catalog.json': JSON.stringify({
      type: 'Catalog',
      id: 'catalog-2',
      description: 'Second Catalog',
    }),
    '/catalog-2/item-003/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-003',
      geometry: { type: 'Point', coordinates: [2, 2] },
      properties: {},
    }),
    '/catalog-2/item-003/data.geojson': JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    }),
  });

  return vol;
}

/**
 * Creates a memfs volume with an empty STAC catalog structure.
 * Just root catalog.json with no children.
 */
export function createEmptyStore(): Volume {
  const vol = Volume.fromJSON({
    '/empty-catalog/catalog.json': JSON.stringify({
      type: 'Catalog',
      id: 'empty-catalog',
      description: 'Empty Catalog',
    }),
  });

  return vol;
}

/**
 * Creates a memfs volume with a single catalog and one item.
 */
export function createSingleItemStore(): Volume {
  const vol = Volume.fromJSON({
    '/catalog/catalog.json': JSON.stringify({
      type: 'Catalog',
      id: 'catalog',
      description: 'Single Item Catalog',
    }),
    '/catalog/item-001/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-001',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    }),
    '/catalog/item-001/track.geojson': JSON.stringify({
      type: 'FeatureCollection',
      features: [],
    }),
  });

  return vol;
}

/**
 * Creates a memfs volume with highlighted snapshot files for testing highlights.
 */
export function createStoreWithSnapshots(): Volume {
  const vol = Volume.fromJSON({
    '/catalog/catalog.json': JSON.stringify({
      type: 'Catalog',
      id: 'catalog',
      description: 'Catalog with Snapshots',
    }),
    '/catalog/item-001/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-001',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: {},
    }),
    '/catalog/item-001/snapshot-1.json': JSON.stringify({
      id: 'snapshot-1',
      timestamp: '2024-01-15T10:00:00Z',
    }),
    '/catalog/item-001/snapshot-2.json': JSON.stringify({
      id: 'snapshot-2',
      timestamp: '2024-01-15T11:00:00Z',
    }),
    '/catalog/item-002/item.json': JSON.stringify({
      type: 'Feature',
      id: 'item-002',
      geometry: { type: 'Point', coordinates: [1, 1] },
      properties: {},
    }),
    '/catalog/item-002/snapshot-3.json': JSON.stringify({
      id: 'snapshot-3',
      timestamp: '2024-01-15T12:00:00Z',
    }),
  });

  return vol;
}

/**
 * Creates a FilesystemAdapter from a memfs Volume.
 * Adapts memfs API to match FilesystemAdapter interface.
 *
 * @param vol - memfs Volume instance
 * @returns FilesystemAdapter implementation
 */
export function createMemfsAdapter(vol: Volume): FilesystemAdapter {
  return {
    async readDirectory(path: string): Promise<DirectoryEntry[]> {
      try {
        const entries = vol.readdirSync(path, { withFileTypes: true }) as Array<{
          name: string;
          isDirectory: () => boolean;
        }>;

        return entries.map((entry) => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
        }));
      } catch (err) {
        throw new Error(`Failed to read directory ${path}: ${err}`);
      }
    },

    async stat(path: string): Promise<FileStat> {
      try {
        const stats = vol.statSync(path) as {
          isDirectory: () => boolean;
          size: number;
          mtime: Date;
        };

        return {
          isDirectory: stats.isDirectory(),
          size: stats.size,
          modifiedTime: stats.mtime.getTime(),
        };
      } catch (err) {
        throw new Error(`Failed to stat ${path}: ${err}`);
      }
    },

    async readFile(path: string): Promise<string> {
      try {
        const content = vol.readFileSync(path, 'utf8') as string;
        return content;
      } catch (err) {
        throw new Error(`Failed to read file ${path}: ${err}`);
      }
    },
  };
}
