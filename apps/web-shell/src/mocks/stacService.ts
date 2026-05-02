/**
 * Mock STAC service for web-shell.
 *
 * Reads the full STAC catalog from the VS Code local-store via the Vite
 * stac-store middleware plugin (/stac-store/...). This allows the web-shell
 * to display all ~80 plots without hardcoding imports (#174).
 *
 * Falls back to bundled fixture imports for the two original test items
 * when the /stac-store/ endpoint is unavailable (e.g. in production builds).
 */

import type { CatalogOverviewItem } from '@debrief/components';
import type { PlatformRecord } from '@debrief/schemas';
import type { FeatureCollection } from 'geojson';

// Import fixture data via Vite's JSON import (bundled fallback for production builds)
import exerciseAlphaItem from '@test-data/local-store/exercise-alpha/item.json';
import exerciseAlphaData from '@test-data/local-store/exercise-alpha/exercise-alpha.geojson';
import trainingRun1Item from '@test-data/local-store/training-run-1/item.json';
import trainingRun1Data from '@test-data/local-store/training-run-1/training-run-1.geojson';

/** STAC Item structure from item.json */
interface StacItem {
  id: string;
  bbox?: [number, number, number, number];
  properties: {
    title?: string;
    datetime?: string;
    start_datetime?: string;
    end_datetime?: string;
    'debrief:platforms'?: PlatformRecord[];
    'debrief:tags'?: string[];
    'debrief:feature_tags'?: string[];
  };
  assets?: Record<string, { href: string; type?: string; roles?: string[] }>;
  links?: Array<{ rel: string; href: string }>;
}

interface StacCatalog {
  links: Array<{ rel: string; href: string; title?: string }>;
}

function asStacItem(data: unknown): StacItem { return data as StacItem; }
function asFeatureCollection(data: unknown): FeatureCollection { return data as FeatureCollection; }

/** Bundled fixture items — used for production builds and when /stac-store/ is unavailable. */
const BUNDLED_ITEMS: Array<{ itemPath: string; item: StacItem; data: FeatureCollection }> = [
  {
    itemPath: './exercise-alpha/item.json',
    item: asStacItem(exerciseAlphaItem),
    data: asFeatureCollection(exerciseAlphaData),
  },
  {
    itemPath: './training-run-1/item.json',
    item: asStacItem(trainingRun1Item),
    data: asFeatureCollection(trainingRun1Data),
  },
];

/** Prefix for the Vite middleware that serves the VS Code STAC store.
 * Uses Vite's BASE_URL so it works on GitHub Pages (e.g. /debrief-future/web-shell/stac-store). */
const STORE_PREFIX = `${import.meta.env.BASE_URL}stac-store`.replace(/\/\//g, '/');

/**
 * Resolve a relative STAC asset href to an absolute URL via the store middleware.
 * itemPath "./exercise-alpha/item.json", href "./thumbnail.png"
 *   → "/stac-store/exercise-alpha/thumbnail.png"
 */
function resolveStacHref(itemPath: string, href: string): string {
  const dir = itemPath.replace(/\/[^/]+$/, '').replace(/^\.\//, '');
  const file = href.replace(/^\.\//, '');
  return `${STORE_PREFIX}/${dir}/${file}`;
}

/** Convert a STAC item + its catalog-relative itemPath to a CatalogOverviewItem. */
function toOverviewItem(itemPath: string, item: StacItem): CatalogOverviewItem {
  // spec 241: assets.thumbnail is the small (200x150); assets.overview is
  // the large (800x600). Naming follows STAC convention.
  const thumbAsset = item.assets?.['thumbnail'];
  const overviewAsset = item.assets?.['overview'];
  return {
    id: item.id,
    title: item.properties.title ?? item.id,
    itemPath,
    bbox: item.bbox ?? null,
    datetime: item.properties.datetime ?? null,
    startDatetime: item.properties.start_datetime ?? null,
    endDatetime: item.properties.end_datetime ?? null,
    platforms: item.properties['debrief:platforms'] ?? [],
    tags: item.properties['debrief:tags'] ?? [],
    featureTags: item.properties['debrief:feature_tags'] ?? [],
    thumbnailHref: thumbAsset ? resolveStacHref(itemPath, thumbAsset.href) : null,
    overviewHref: overviewAsset ? resolveStacHref(itemPath, overviewAsset.href) : null,
  };
}

/** Pre-fetched GeoJSON data keyed by item path (loaded on demand). */
const geojsonCache = new Map<string, FeatureCollection>();

// Seed cache with bundled test data (always available)
geojsonCache.set('./exercise-alpha/item.json', asFeatureCollection(exerciseAlphaData));
geojsonCache.set('./training-run-1/item.json', asFeatureCollection(trainingRun1Data));

/**
 * Mock STAC service interface.
 */
export interface MockStacService {
  /** Load catalog and return all items. Must be called before getItems(). */
  init(): Promise<void>;

  /** Get all items in the catalog (call init() first). */
  getItems(): CatalogOverviewItem[];

  /** Get plot data (GeoJSON FeatureCollection) for an item — fetches on demand. */
  getPlotData(itemPath: string): Promise<FeatureCollection>;

  /** Get item metadata */
  getItem(itemPath: string): StacItem | null;

  /**
   * Patch one or more properties on an in-memory item, rebuild its
   * overview row, and notify subscribers. Mirrors the real
   * `stacService.updateItemMetadata` contract (#193) without the
   * disk write — suitable for the web-shell demo.
   */
  updateItemMetadata(itemPath: string, patch: Record<string, unknown>): void;

  /**
   * Subscribe to item-change events. The listener is called with the
   * itemPath after every successful updateItemMetadata. Returns an
   * unsubscribe function.
   */
  onItemsChanged(listener: (itemPath: string) => void): () => void;
}

/**
 * Create a mock STAC service that reads from the /stac-store/ middleware.
 */
export function createMockStacService(): MockStacService {
  const itemMap = new Map<string, StacItem>();
  const listeners = new Set<(itemPath: string) => void>();
  /** Guard against concurrent init calls (React 18 StrictMode fires effects twice). */
  let initPromise: Promise<void> | null = null;

  // Seed with bundled items immediately so getItems() returns data before init() completes.
  // This avoids blank exercise lists while the /stac-store/ fetch is in progress.
  let items: CatalogOverviewItem[] = BUNDLED_ITEMS.map(entry => {
    itemMap.set(entry.itemPath, entry.item);
    geojsonCache.set(entry.itemPath, entry.data);
    return toOverviewItem(entry.itemPath, entry.item);
  });

  /** Populate from bundled fixture data (production fallback). */
  function loadBundledFallback(): void {
    // Already seeded — nothing to do
  }

  /** Perform the actual catalog load (called once). */
  async function doInit(): Promise<void> {
    try {
      // Fetch the catalog.json to discover all item links
      const catalogRes = await fetch(`${STORE_PREFIX}/catalog.json`);
      if (!catalogRes.ok) throw new Error(`catalog.json: ${catalogRes.status}`);
      const catalog = await catalogRes.json() as StacCatalog;

      const itemPaths = catalog.links
        .filter(link => link.rel === 'item')
        .map(link => link.href);

      // Fetch each item.json in parallel
      const results = await Promise.allSettled(
        itemPaths.map(async (itemPath) => {
          const resolvedPath = itemPath.replace(/^\.\//, '');
          const res = await fetch(`${STORE_PREFIX}/${resolvedPath}`);
          if (!res.ok) throw new Error(`${resolvedPath}: ${res.status}`);
          const item = await res.json() as StacItem;
          return { itemPath, item };
        }),
      );

      items = [];
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { itemPath, item } = result.value;
          items.push(toOverviewItem(itemPath, item));
          itemMap.set(itemPath, item);
        }
      }

      // Sort by datetime descending
      items.sort((a, b) => {
        const da = a.datetime ? new Date(a.datetime).getTime() : 0;
        const db = b.datetime ? new Date(b.datetime).getTime() : 0;
        return db - da;
      });

      console.log(`[stacService] Loaded ${items.length} items from STAC store`);
    } catch (err) {
      console.warn('[stacService] Failed to load from /stac-store/, using bundled fallback:', err);
      loadBundledFallback();
    }
  }

  return {
    async init(): Promise<void> {
      if (!initPromise) {
        initPromise = doInit();
      }
      return initPromise;
    },

    getItems(): CatalogOverviewItem[] {
      return items;
    },

    async getPlotData(itemPath: string): Promise<FeatureCollection> {
      // Check cache first (includes bundled fallback data)
      const cached = geojsonCache.get(itemPath);
      if (cached) return cached;

      // Fetch the GeoJSON data asset from the store (find by role, not key)
      const item = itemMap.get(itemPath);
      if (!item) throw new Error(`Unknown item path: ${itemPath}`);

      const dataEntry = Object.values(item.assets ?? {}).find(
        (a) => a.roles?.includes('data') && (a.type === 'application/geo+json' || a.href.endsWith('.geojson')),
      );
      const dataAsset = dataEntry ?? item.assets?.['data'];
      if (!dataAsset) throw new Error(`No data asset in ${itemPath}`);

      const url = resolveStacHref(itemPath, dataAsset.href);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`GeoJSON fetch failed: ${url} (${res.status})`);
      const data = await res.json() as FeatureCollection;
      geojsonCache.set(itemPath, data);
      return data;
    },

    getItem(itemPath: string): StacItem | null {
      return itemMap.get(itemPath) ?? null;
    },

    updateItemMetadata(itemPath: string, patch: Record<string, unknown>): void {
      const item = itemMap.get(itemPath);
      if (!item) return;
      // Shallow-merge the patch into item.properties. Real hosts run
      // a schema validator here and write an atomic temp+rename; this
      // demo just mutates in place.
      const nextProps = { ...item.properties, ...patch };
      item.properties = nextProps as StacItem['properties'];
      // Rebuild the cached overview row so `getItems()` returns the
      // new values on the next render pass.
      const overview = toOverviewItem(itemPath, item);
      const idx = items.findIndex((i) => i.itemPath === itemPath);
      if (idx >= 0) items[idx] = overview;
      for (const listener of listeners) listener(itemPath);
    },

    onItemsChanged(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Singleton instance */
export const stacService = createMockStacService();
