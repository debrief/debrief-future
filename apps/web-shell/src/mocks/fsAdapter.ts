/**
 * Browser-safe writable FilesystemAdapter for the web-shell.
 * Wraps statically-imported test data into a FilesystemAdapter
 * so StacFileTree can render the local-store catalog.
 * Supports writeFile for persisting tool results to the in-memory store.
 */

import type { FilesystemAdapter, DirectoryEntry, FileStat } from '@debrief/components';

import catalogData from '@test-data/local-store/catalog.json';
import exerciseAlphaItem from '@test-data/local-store/exercise-alpha/item.json';
import exerciseAlphaData from '@test-data/local-store/exercise-alpha/exercise-alpha.geojson';
import trainingRun1Item from '@test-data/local-store/training-run-1/item.json';
import trainingRun1Data from '@test-data/local-store/training-run-1/training-run-1.geojson';

/** Build a flat path→content map from imported test data */
const files: Record<string, string> = {
  '/local-store/catalog.json': JSON.stringify(catalogData),
  '/local-store/exercise-alpha/item.json': JSON.stringify(exerciseAlphaItem),
  '/local-store/exercise-alpha/exercise-alpha.geojson': JSON.stringify(exerciseAlphaData),
  '/local-store/training-run-1/item.json': JSON.stringify(trainingRun1Item),
  '/local-store/training-run-1/training-run-1.geojson': JSON.stringify(trainingRun1Data),
};

interface FileEntry {
  content: string;
  isDirectory: false;
}

interface DirEntry {
  isDirectory: true;
}

type FsEntry = FileEntry | DirEntry;

/** Writable adapter: FilesystemAdapter + writeFile */
export interface WritableFsAdapter extends FilesystemAdapter {
  writeFile(path: string, content: string): void;
}

/**
 * Create a browser-safe writable FilesystemAdapter from the test data.
 */
export function createMockFsAdapter(): WritableFsAdapter {
  const entries = new Map<string, FsEntry>();

  for (const [path, content] of Object.entries(files)) {
    entries.set(path, { content, isDirectory: false });

    // Infer parent directories
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const dirPath = '/' + parts.slice(0, i).join('/');
      if (!entries.has(dirPath)) {
        entries.set(dirPath, { isDirectory: true });
      }
    }
    if (!entries.has('/')) {
      entries.set('/', { isDirectory: true });
    }
  }

  /** Ensure all parent directories exist for a given file path. */
  function ensureParentDirs(filePath: string): void {
    const parts = filePath.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      const dirPath = '/' + parts.slice(0, i).join('/');
      if (!entries.has(dirPath)) {
        entries.set(dirPath, { isDirectory: true });
      }
    }
  }

  return {
    writeFile(path: string, content: string): void {
      ensureParentDirs(path);
      entries.set(path, { content, isDirectory: false });
    },

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

        const rest = entryPath.slice(prefix.length);
        const slashIdx = rest.indexOf('/');
        const childName = slashIdx === -1 ? rest : rest.slice(0, slashIdx);

        if (childName && !children.has(childName)) {
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

/** Singleton mock filesystem adapter */
export const mockFsAdapter = createMockFsAdapter();
