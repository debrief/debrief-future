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
import type { PlatformRecord, StacCatalog, StacItem } from '@debrief/schemas';
import type { FeatureCollection } from 'geojson';
import { getActiveStacWriter } from '../services/stacWriterRegistry';

// Import fixture data via Vite's JSON import (bundled fallback for production builds)
import exerciseAlphaItem from '@test-data/local-store/exercise-alpha/item.json';
import exerciseAlphaData from '@test-data/local-store/exercise-alpha/exercise-alpha.geojson';
import trainingRun1Item from '@test-data/local-store/training-run-1/item.json';
import trainingRun1Data from '@test-data/local-store/training-run-1/training-run-1.geojson';

// StacItem and StacCatalog are now LinkML-rooted at
// shared/schemas/src/linkml/stac.yaml and re-exported via @debrief/schemas
// per spec #223. The previous hand-typed local declarations carried the
// same on-disk drift risk that motivated the migration.

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
  // Narrow the schema's `number[]` bbox to the 4-tuple expected by the
  // overview row. STAC permits 4- or 6-element bboxes; the catalog
  // overview UI only needs the 2D corners.
  const bbox4: [number, number, number, number] | null =
    Array.isArray(item.bbox) && item.bbox.length >= 4
      ? [item.bbox[0]!, item.bbox[1]!, item.bbox[2]!, item.bbox[3]!]
      : null;
  // The on-disk JSON carries `debrief:*` extension keys; the schema's
  // StacItemProperties has an open-record `[key: string]: unknown`
  // (Article XV.2 exception per spec #223) so colon-bearing reads
  // return `unknown` and require explicit per-extension narrowing.
  // The hand-types previously declared these keys explicitly; we
  // preserve that narrowing here as the consumer-side equivalent of
  // the schema's open-record exception.
  const { properties } = item;
  return {
    id: item.id,
    title: (properties.title as string | undefined) ?? item.id,
    itemPath,
    bbox: bbox4,
    datetime: (properties.datetime as string | undefined) ?? null,
    startDatetime: (properties.start_datetime as string | undefined) ?? null,
    endDatetime: (properties.end_datetime as string | undefined) ?? null,
    platforms: (properties['debrief:platforms'] as readonly PlatformRecord[] | undefined) ?? [],
    tags: (properties['debrief:tags'] as readonly string[] | undefined) ?? [],
    featureTags: (properties['debrief:feature_tags'] as readonly string[] | undefined) ?? [],
    thumbnailHref:
      thumbAsset && typeof thumbAsset.href === 'string'
        ? resolveStacHref(itemPath, thumbAsset.href)
        : null,
    overviewHref:
      overviewAsset && typeof overviewAsset.href === 'string'
        ? resolveStacHref(itemPath, overviewAsset.href)
        : null,
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

  /**
   * #236 — re-apply IndexedDB overlays on top of the in-memory catalog.
   * Called by App.tsx after the writer becomes available, so any race
   * between catalog init and writer init still leaves the on-screen
   * catalog showing persisted overlays.
   */
  reapplyIdbOverlays(): Promise<void>;

  /**
   * #236 US3 — create a new standalone STAC item from user-drawn data.
   * Persists both the item.json record and the GeoJSON payload through
   * the StacWriter, then registers the item in the in-memory catalog so
   * subsequent getItems() includes it. Returns the new itemPath
   * (`user/<ULID>/item.json`) on success, null if no writer is available.
   */
  createStandaloneItem(input: {
    title: string;
    geojson: FeatureCollection;
    bbox?: [number, number, number, number];
    platforms?: PlatformRecord[];
    tags?: string[];
  }): Promise<string | null>;
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
    // #236 — apply IndexedDB overlays on top of the freshly-loaded
    // catalog so saved metadata edits survive a reload (FR-002 / FR-008)
    // and register any IDB-only standalone items (FR-003 / FR-008).
    await applyIdbOverlays();
    await loadStandaloneItems();
  }

  /**
   * Walk every IndexedDB stored record and merge its properties on top
   * of the matching in-memory item (overlay-wins shallow merge per
   * data-model.md Layer 4). Best-effort — no writer or no stored items
   * leaves the in-memory state unchanged.
   *
   * The writer's itemPath uses no leading `./` (e.g. `exercise-alpha/item.json`),
   * but the in-memory itemMap keys are catalog-relative (`./exercise-alpha/item.json`).
   * We normalise both ways during lookup.
   */
  async function applyIdbOverlays(): Promise<void> {
    const writer = getActiveStacWriter();
    if (writer === null) return;
    try {
      const stored = await writer.listStoredItems();
      for (const { itemPath, stored: rec } of stored) {
        const candidates = [itemPath, `./${itemPath}`];
        for (const key of candidates) {
          const existing = itemMap.get(key);
          if (existing === undefined) continue;
          // rec.record.properties is typed as Record<string, unknown> by
          // the StacWriter contract; spread directly without the cast.
          const overlayProps = rec.record.properties;
          const mergedProps: StacItem['properties'] = {
            ...existing.properties,
            ...overlayProps,
          };
          const merged: StacItem = {
            ...existing,
            properties: mergedProps,
          };
          itemMap.set(key, merged);
          const overview = toOverviewItem(key, merged);
          const idx = items.findIndex((i) => i.itemPath === key);
          if (idx >= 0) items[idx] = overview;
          break;
        }
      }
    } catch (err) {
      console.warn('[stacService] applyIdbOverlays failed:', err);
    }
  }

  /**
   * Walk every IndexedDB standalone record and register it in the
   * in-memory catalog. Standalone items have no bundled counterpart, so
   * they appear as fresh catalog rows after a reload. Best-effort.
   */
  async function loadStandaloneItems(): Promise<void> {
    const writer = getActiveStacWriter();
    if (writer === null) return;
    try {
      await loadStandaloneItemsViaWriter(writer, itemMap, items, geojsonCache);
    } catch (err) {
      console.warn('[stacService] loadStandaloneItems failed:', err);
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
        (a) =>
          a.roles?.includes('data') &&
          (a.type === 'application/geo+json' ||
            (typeof a.href === 'string' && a.href.endsWith('.geojson'))),
      );
      const dataAsset = dataEntry ?? item.assets?.['data'];
      if (!dataAsset || typeof dataAsset.href !== 'string') {
        throw new Error(`No data asset in ${itemPath}`);
      }

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
      // #236 FR-002 — persist the patch via the StacWriter so the edit
      // survives a reload. Best-effort; the in-memory mutation above is
      // already the user-visible source of truth for this session.
      const writer = getActiveStacWriter();
      if (writer !== null) {
        const writerItemPath = itemPath.replace(/^\.\//, '');
        void writer
          .patchItem({
            ctx: {
              kind: 'idb',
              nowMs: () => Date.now(),
              randomId: () =>
                typeof globalThis.crypto?.randomUUID === 'function'
                  ? globalThis.crypto.randomUUID()
                  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
            },
            itemPath: writerItemPath,
            patch,
            overrideFields: Object.keys(patch),
            provenance: {
              tool: 'debrief.propertiesPanel',
              fields: Object.keys(patch),
            },
            packageVersion: '1.0.0',
          })
          .catch((err) => {
            console.warn(
              `[stacService] IDB patchItem failed for ${itemPath}:`,
              err,
            );
          });
      }
    },

    onItemsChanged(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async reapplyIdbOverlays(): Promise<void> {
      await applyIdbOverlays();
      await loadStandaloneItems();
      // Notify listeners so the catalog re-renders any overlay-touched rows.
      for (const listener of listeners) listener('*');
    },

    async createStandaloneItem(input): Promise<string | null> {
      const writer = getActiveStacWriter();
      if (writer === null) return null;
      const id = makeUlidIsh();
      const itemPath = `user/${id}/item.json`;
      const nowIso = new Date().toISOString();
      // STAC requires bbox on every Item. Default to a zero-extent box
      // when the caller doesn't supply one — the downstream Properties
      // Panel re-computes from feature geometry on first commit.
      const bbox: number[] = input.bbox ?? [0, 0, 0, 0];
      // Synthesise a minimal point-at-origin geometry for the same
      // reason. The user's actual GeoJSON payload carries the real
      // shapes; the Item geometry is a coarse bbox-style envelope.
      const geometry = {
        type: 'Point' as const,
        coordinates: [bbox[0]!, bbox[1]!],
      };
      const properties: StacItem['properties'] = {
        title: input.title,
        datetime: nowIso,
        'debrief:platforms': input.platforms ?? [],
        'debrief:tags': input.tags ?? [],
        'debrief:feature_tags': [],
      };
      const item: StacItem = {
        type: 'Feature',
        stac_version: '1.1.0',
        id,
        geometry,
        bbox,
        properties,
        links: [{ rel: 'self', href: `./${id}/item.json` }],
        assets: {
          data: {
            href: `idb:${itemPath}::data`,
            type: 'application/geo+json',
            roles: ['data'],
          },
        },
      };
      const ctx = {
        kind: 'idb' as const,
        nowMs: () => Date.now(),
        randomId: () => id,
      };
      try {
        // Both the local StacItem and @debrief/stac-writer.StacItem now
        // reference @debrief/schemas.StacItem (spec #223 Decision 1B);
        // no projection cast required.
        await writer.writeItem({ ctx, itemPath, item, mode: 'create' });
        await writer.writeAsset({
          ctx,
          itemPath,
          assetHref: './data.geojson',
          body: JSON.stringify(input.geojson),
          mediaType: 'application/geo+json',
          assetEntry: { key: 'data', roles: ['data'], title: 'GeoJSON payload' },
        });
        // Register in the in-memory catalog so the next render pass shows it.
        itemMap.set(itemPath, item);
        geojsonCache.set(itemPath, input.geojson);
        items.unshift(toOverviewItem(itemPath, item));
        for (const listener of listeners) listener(itemPath);
        return itemPath;
      } catch (err) {
        console.warn(
          `[stacService] createStandaloneItem failed for ${itemPath}:`,
          err,
        );
        return null;
      }
    },
  };
}

/**
 * Walk every IndexedDB standalone record and register it in the in-memory
 * catalog. Standalone items have no bundled counterpart, so they appear
 * as fresh catalog rows after a reload. Best-effort.
 */
async function loadStandaloneItemsViaWriter(
  writer: NonNullable<ReturnType<typeof getActiveStacWriter>>,
  itemMap: Map<string, StacItem>,
  items: CatalogOverviewItem[],
  geojsonCache: Map<string, FeatureCollection>,
): Promise<void> {
  const stored = await writer.listStoredItems();
  for (const { itemPath, stored: rec } of stored) {
    if (rec.kind !== 'standalone') continue;
    if (itemMap.has(itemPath)) continue;
    // Both the writer's StacItem and the mock's StacItem now reference
    // the same @debrief/schemas.StacItem (spec #223 Decision 1B), so no
    // projection cast is required.
    const stacItem = rec.record;
    itemMap.set(itemPath, stacItem);
    items.unshift(toOverviewItem(itemPath, stacItem));
    // Fetch the GeoJSON payload from IDB if available so getPlotData
    // resolves locally for this item (no /stac-store/ round-trip).
    const payload = await writer.readPayload(itemPath);
    if (payload !== null) {
      try {
        geojsonCache.set(itemPath, JSON.parse(payload) as FeatureCollection);
      } catch {
        // ignore malformed payload
      }
    }
  }
}

/** Tiny ULID-ish ID — 26 chars, monotonic-enough via Date.now base. */
function makeUlidIsh(): string {
  // ULID alphabet
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const ts = Date.now();
  const tsChars: string[] = [];
  let n = ts;
  for (let i = 0; i < 10; i++) {
    tsChars.unshift(alphabet[n % 32] ?? '0');
    n = Math.floor(n / 32);
  }
  let rand = '';
  for (let i = 0; i < 16; i++) {
    const r = Math.floor(Math.random() * 32);
    rand += alphabet[r] ?? '0';
  }
  return tsChars.join('') + rand;
}

/** Singleton instance */
export const stacService = createMockStacService();
