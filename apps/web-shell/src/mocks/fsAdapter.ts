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

/** Sample dataset files for chart rendering demonstration */
const sampleTrackStats = JSON.stringify({
  type: 'track_statistics',
  title: 'Track Statistics — HMS Defender',
  displayHint: 'table',
  metadata: {
    xAxis: { label: 'Metric', type: 'nominal' },
    yAxis: { label: 'Value', type: 'quantitative' },
  },
  data: [
    { metric: 'Total Distance', value: 142.3, unit: 'nm' },
    { metric: 'Average Speed', value: 12.45, unit: 'kts' },
    { metric: 'Max Speed', value: 18.92, unit: 'kts' },
    { metric: 'Min Speed', value: 3.217, unit: 'kts' },
    { metric: 'Duration', value: '04:32:15', unit: 'hh:mm:ss' },
    { metric: 'Leg Count', value: 47, unit: '' },
    { metric: 'Average Course', value: 127.6, unit: 'deg' },
    { metric: 'Course Change Rate', value: 2.843, unit: 'deg/min' },
  ],
});

const sampleZoneHistogram = JSON.stringify({
  type: 'zone_histogram',
  title: 'Buffer Zone Point Distribution',
  metadata: {
    xAxis: { label: 'Zone', type: 'nominal' },
    yAxis: { label: 'Count', type: 'quantitative', units: 'points' },
  },
  data: [
    { zone: 'Zone A (0-5 nm)', count: 42 },
    { zone: 'Zone B (5-10 nm)', count: 17 },
    { zone: 'Zone C (10-15 nm)', count: 8 },
    { zone: 'Zone D (15-20 nm)', count: 3 },
  ],
});

const sampleRangeBearingSeries = JSON.stringify({
  type: 'range_bearing_series',
  title: 'Range over Time — HMS Defender vs USS Freedom',
  metadata: {
    xAxis: { label: 'Time', type: 'temporal' },
    yAxis: { label: 'Range', type: 'quantitative', units: 'nm' },
  },
  series: [
    {
      name: 'HMS Defender → USS Freedom',
      data: [
        { time: '2024-01-15T10:00:00Z', value: 12.5 },
        { time: '2024-01-15T10:05:00Z', value: 11.8 },
        { time: '2024-01-15T10:10:00Z', value: 10.2 },
        { time: '2024-01-15T10:15:00Z', value: 9.7 },
        { time: '2024-01-15T10:20:00Z', value: 8.3 },
        { time: '2024-01-15T10:25:00Z', value: 7.1 },
      ],
    },
  ],
});

/** Build a flat path→content map from imported test data */
const files: Record<string, string> = {
  '/local-store/catalog.json': JSON.stringify(catalogData),
  '/local-store/exercise-alpha/item.json': JSON.stringify(exerciseAlphaItem),
  '/local-store/exercise-alpha/exercise-alpha.geojson': JSON.stringify(exerciseAlphaData),
  '/local-store/exercise-alpha/assets/track-stats.dataset.json': sampleTrackStats,
  '/local-store/exercise-alpha/assets/zone-histogram.dataset.json': sampleZoneHistogram,
  '/local-store/exercise-alpha/assets/range-bearing-series.dataset.json': sampleRangeBearingSeries,
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
