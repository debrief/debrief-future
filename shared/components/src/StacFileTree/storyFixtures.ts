/**
 * Browser-safe in-memory filesystem adapter for Storybook stories.
 * Does NOT depend on memfs (which requires Node.js Buffer).
 * Uses a plain object map to simulate a filesystem.
 */

import type { FilesystemAdapter, DirectoryEntry, FileStat } from './types';

interface FileEntry {
  content: string;
  isDirectory: false;
}

interface DirEntry {
  isDirectory: true;
}

type FsEntry = FileEntry | DirEntry;

/**
 * Creates a browser-safe FilesystemAdapter from a flat path→content map.
 * Directories are inferred from file paths automatically.
 */
export function createMapAdapter(files: Record<string, string>): FilesystemAdapter {
  // Build the full entry map (files + inferred directories)
  const entries = new Map<string, FsEntry>();

  for (const [path, content] of Object.entries(files)) {
    // Add the file
    entries.set(path, { content, isDirectory: false });

    // Infer and add all parent directories
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const dirPath = '/' + parts.slice(0, i).join('/');
      if (!entries.has(dirPath)) {
        entries.set(dirPath, { isDirectory: true });
      }
    }
    // Root directory
    if (!entries.has('/')) {
      entries.set('/', { isDirectory: true });
    }
  }

  return {
    async readDirectory(path: string): Promise<DirectoryEntry[]> {
      const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
      const entry = entries.get(normalizedPath);
      if (!entry || !entry.isDirectory) {
        throw new Error(`Not a directory: ${path}`);
      }

      const prefix = normalizedPath === '/' ? '/' : normalizedPath + '/';
      const children = new Map<string, boolean>();

      for (const [entryPath] of entries) {
        if (entryPath === normalizedPath) continue;
        if (!entryPath.startsWith(prefix)) continue;

        // Get the immediate child name
        const rest = entryPath.slice(prefix.length);
        const slashIdx = rest.indexOf('/');
        const childName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);

        if (childName && !children.has(childName)) {
          // Check if this child is a directory
          const childPath = prefix + childName;
          const childEntry = entries.get(childPath);
          children.set(childName, childEntry ? childEntry.isDirectory : true);
        }
      }

      return Array.from(children.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, isDir]) => ({
          name,
          isDirectory: isDir,
        }));
    },

    async stat(path: string): Promise<FileStat> {
      const normalizedPath = path.endsWith('/') && path !== '/' ? path.slice(0, -1) : path;
      const entry = entries.get(normalizedPath);
      if (!entry) {
        throw new Error(`Path not found: ${path}`);
      }

      return {
        isDirectory: entry.isDirectory,
        size: entry.isDirectory ? 0 : (entry as FileEntry).content.length,
        modifiedTime: Date.now(),
      };
    },

    async readFile(path: string): Promise<string> {
      const entry = entries.get(path);
      if (!entry || entry.isDirectory) {
        throw new Error(`Not a file: ${path}`);
      }
      return (entry as FileEntry).content;
    },
  };
}

// --- Pre-built fixture data as plain objects (browser-safe) ---

const POPULATED_STORE_FILES: Record<string, string> = {
  '/catalog-1/catalog.json': JSON.stringify({ type: 'Catalog', id: 'catalog-1', description: 'Main Catalog' }),
  '/catalog-1/collection-a/collection.json': JSON.stringify({ type: 'Collection', id: 'collection-a', description: 'Collection A' }),
  '/catalog-1/collection-a/item-001/item.json': JSON.stringify({ type: 'Feature', id: 'item-001', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }),
  '/catalog-1/collection-a/item-001/track.geojson': JSON.stringify({ type: 'FeatureCollection', features: [] }),
  '/catalog-1/collection-a/item-001/snapshot-1.json': JSON.stringify({ id: 'snapshot-1', timestamp: '2024-01-15T10:00:00Z' }),
  '/catalog-1/collection-a/item-002/item.json': JSON.stringify({ type: 'Feature', id: 'item-002', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }),
  '/catalog-1/collection-a/item-002/track.geojson': JSON.stringify({ type: 'FeatureCollection', features: [] }),
  '/catalog-2/catalog.json': JSON.stringify({ type: 'Catalog', id: 'catalog-2', description: 'Second Catalog' }),
  '/catalog-2/item-003/item.json': JSON.stringify({ type: 'Feature', id: 'item-003', geometry: { type: 'Point', coordinates: [2, 2] }, properties: {} }),
  '/catalog-2/item-003/data.geojson': JSON.stringify({ type: 'FeatureCollection', features: [] }),
};

const EMPTY_STORE_FILES: Record<string, string> = {
  '/empty-catalog/catalog.json': JSON.stringify({ type: 'Catalog', id: 'empty-catalog', description: 'Empty Catalog' }),
};

const SINGLE_ITEM_STORE_FILES: Record<string, string> = {
  '/catalog/catalog.json': JSON.stringify({ type: 'Catalog', id: 'catalog', description: 'Single Item Catalog' }),
  '/catalog/item-001/item.json': JSON.stringify({ type: 'Feature', id: 'item-001', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }),
  '/catalog/item-001/track.geojson': JSON.stringify({ type: 'FeatureCollection', features: [] }),
};

const SNAPSHOT_STORE_FILES: Record<string, string> = {
  '/catalog/catalog.json': JSON.stringify({ type: 'Catalog', id: 'catalog', description: 'Catalog with Snapshots' }),
  '/catalog/item-001/item.json': JSON.stringify({ type: 'Feature', id: 'item-001', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }),
  '/catalog/item-001/snapshot-1.json': JSON.stringify({ id: 'snapshot-1', timestamp: '2024-01-15T10:00:00Z' }),
  '/catalog/item-001/snapshot-2.json': JSON.stringify({ id: 'snapshot-2', timestamp: '2024-01-15T11:00:00Z' }),
  '/catalog/item-002/item.json': JSON.stringify({ type: 'Feature', id: 'item-002', geometry: { type: 'Point', coordinates: [1, 1] }, properties: {} }),
  '/catalog/item-002/snapshot-3.json': JSON.stringify({ id: 'snapshot-3', timestamp: '2024-01-15T12:00:00Z' }),
};

/** Browser-safe populated STAC store adapter */
export function createPopulatedStoreAdapter(): FilesystemAdapter {
  return createMapAdapter(POPULATED_STORE_FILES);
}

/** Browser-safe empty STAC store adapter */
export function createEmptyStoreAdapter(): FilesystemAdapter {
  return createMapAdapter(EMPTY_STORE_FILES);
}

/** Browser-safe single-item STAC store adapter */
export function createSingleItemStoreAdapter(): FilesystemAdapter {
  return createMapAdapter(SINGLE_ITEM_STORE_FILES);
}

/** Browser-safe snapshot STAC store adapter */
export function createSnapshotStoreAdapter(): FilesystemAdapter {
  return createMapAdapter(SNAPSHOT_STORE_FILES);
}
