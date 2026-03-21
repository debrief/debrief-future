/**
 * Mock STAC service for web-shell.
 * Loads fixture data from @test-data alias to simulate STAC catalog operations.
 */

import type { CatalogOverviewItem } from '@debrief/components';
import type { FeatureCollection } from 'geojson';

// Import fixture data via Vite's JSON import
import catalogData from '@test-data/local-store/catalog.json';
import exerciseAlphaItem from '@test-data/local-store/exercise-alpha/item.json';
import exerciseAlphaData from '@test-data/local-store/exercise-alpha/exercise-alpha.geojson';
import trainingRun1Item from '@test-data/local-store/training-run-1/item.json';
import trainingRun1Data from '@test-data/local-store/training-run-1/training-run-1.geojson';

/** STAC Item structure from fixture data */
interface StacItem {
  id: string;
  bbox?: [number, number, number, number];
  properties: {
    title?: string;
    datetime?: string;
    start_datetime?: string;
    end_datetime?: string;
    'debrief:vessel_classes'?: string[];
    'debrief:tags'?: string[];
    'debrief:feature_tags'?: string[];
    'debrief:nationalities'?: string[];
    'debrief:track_names'?: string[];
  };
}

/** Map of item paths to their data */
const itemDataMap: Record<string, { item: StacItem; data: FeatureCollection }> = {
  './exercise-alpha/item.json': {
    item: exerciseAlphaItem as unknown as StacItem,
    data: exerciseAlphaData as unknown as FeatureCollection,
  },
  './training-run-1/item.json': {
    item: trainingRun1Item as unknown as StacItem,
    data: trainingRun1Data as unknown as FeatureCollection,
  },
};

/**
 * Parse catalog links to extract item paths.
 */
function getItemPaths(): string[] {
  const catalog = catalogData as { links?: Array<{ rel: string; href: string; title?: string }> };
  return (catalog.links ?? [])
    .filter(link => link.rel === 'item')
    .map(link => link.href);
}

/**
 * Convert a STAC item to CatalogOverviewItem format.
 */
function toOverviewItem(itemPath: string, item: StacItem): CatalogOverviewItem {
  return {
    id: item.id,
    title: item.properties.title ?? item.id,
    itemPath,
    bbox: item.bbox ?? null,
    datetime: item.properties.datetime ?? null,
    startDatetime: item.properties.start_datetime ?? null,
    endDatetime: item.properties.end_datetime ?? null,
    vesselClasses: item.properties['debrief:vessel_classes'] ?? [],
    tags: item.properties['debrief:tags'] ?? [],
    featureTags: item.properties['debrief:feature_tags'] ?? [],
    nationalities: item.properties['debrief:nationalities'] ?? [],
    trackNames: item.properties['debrief:track_names'] ?? [],
  };
}

/**
 * Mock STAC service interface.
 */
export interface MockStacService {
  /** Get all items in the catalog */
  getItems(): CatalogOverviewItem[];

  /** Get plot data (GeoJSON FeatureCollection) for an item */
  getPlotData(itemPath: string): FeatureCollection;

  /** Get item metadata */
  getItem(itemPath: string): StacItem | null;
}

/**
 * Create a mock STAC service instance.
 */
export function createMockStacService(): MockStacService {
  return {
    getItems(): CatalogOverviewItem[] {
      const paths = getItemPaths();
      return paths
        .map(path => {
          const entry = itemDataMap[path];
          if (!entry) return null;
          return toOverviewItem(path, entry.item);
        })
        .filter((item): item is CatalogOverviewItem => item !== null);
    },

    getPlotData(itemPath: string): FeatureCollection {
      const entry = itemDataMap[itemPath];
      if (!entry) {
        throw new Error(`Unknown item path: ${itemPath}`);
      }
      return entry.data;
    },

    getItem(itemPath: string): StacItem | null {
      const entry = itemDataMap[itemPath];
      return entry?.item ?? null;
    },
  };
}

/** Singleton instance */
export const stacService = createMockStacService();
