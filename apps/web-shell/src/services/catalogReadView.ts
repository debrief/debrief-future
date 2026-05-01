/**
 * Catalog read view for the web-shell — merges the bundled static catalog
 * served by the existing `/stac-store/` GET handler with the IndexedDB
 * overlay/standalone records into a single homogeneous list for the UI.
 *
 *   bundled item.json  ─┐
 *                       ├──►  mergeOverlay()  ──►  merged StacItem
 *   IDB stored record  ─┘                            (UI consumes)
 *
 * The cross-tab BroadcastChannel listener lives here (review 1A): every
 * mutation in any same-origin tab flows through the writer's broadcast,
 * the read view re-fetches the affected itemPath from IndexedDB, and
 * fires its own subscribers. Coalesced over a 50 ms window.
 */

import { mergeOverlay, type StacItem, type StoredItem } from '@debrief/stac-writer';
import type { StacWriterIdb, WriterBroadcast } from './stacWriterIdb';

const BROADCAST_CHANNEL_NAME = 'debrief-stac-writer-v1';
const COALESCE_MS = 50;

export interface CatalogReadViewOptions {
  readonly writer: StacWriterIdb;
  /** Override the BroadcastChannel ctor (used by tests). */
  readonly broadcastChannelCtor?: typeof BroadcastChannel | null;
  /** Resolver for bundled item.json. */
  readonly fetchBundledItem?: (itemPath: string) => Promise<StacItem | null>;
  /** Resolver for the bundled item-paths list (catalog index). */
  readonly listBundledItems?: () => Promise<ReadonlyArray<string>>;
}

export interface CatalogReadView {
  /** Merged read of a single item by catalog-relative `<plot>/item.json` path. */
  getItem(itemPath: string): Promise<StacItem | null>;
  /** Merged listing — bundled items first (insertion order), then standalone. */
  listItems(): Promise<ReadonlyArray<{ itemPath: string; item: StacItem }>>;
  /** Subscribe to merged changes from any tab. */
  subscribe(listener: (changed: { itemPath: string }) => void): () => void;
  /** Tear down the BroadcastChannel listener. */
  close(): void;
}

export function createCatalogReadView(
  opts: CatalogReadViewOptions,
): CatalogReadView {
  const { writer } = opts;
  const fetchBundled = opts.fetchBundledItem ?? defaultFetchBundled;
  const listBundled = opts.listBundledItems ?? defaultListBundled;

  const channelCtor =
    opts.broadcastChannelCtor === null
      ? null
      : opts.broadcastChannelCtor ??
        (typeof BroadcastChannel === 'undefined' ? null : BroadcastChannel);
  const channel: BroadcastChannel | null =
    channelCtor === null ? null : new channelCtor(BROADCAST_CHANNEL_NAME);

  const subscribers = new Set<(changed: { itemPath: string }) => void>();
  const pending = new Map<string, ReturnType<typeof setTimeout>>();

  function flush(itemPath: string): void {
    pending.delete(itemPath);
    for (const sub of subscribers) {
      try {
        sub({ itemPath });
      } catch {
        // listeners must not throw
      }
    }
  }

  function scheduleFlush(itemPath: string): void {
    const existing = pending.get(itemPath);
    if (existing !== undefined) clearTimeout(existing);
    pending.set(
      itemPath,
      setTimeout(() => flush(itemPath), COALESCE_MS),
    );
  }

  if (channel !== null) {
    channel.onmessage = (event: MessageEvent<WriterBroadcast>) => {
      const data = event.data;
      if (data?.itemPath) {
        scheduleFlush(data.itemPath);
      }
    };
  }

  return {
    async getItem(itemPath: string): Promise<StacItem | null> {
      const [bundled, stored] = await Promise.all([
        fetchBundled(itemPath),
        writer.readStoredItem(itemPath),
      ]);
      return mergeOverlay(bundled, stored);
    },

    async listItems(): Promise<
      ReadonlyArray<{ itemPath: string; item: StacItem }>
    > {
      const [bundledIndex, stored] = await Promise.all([
        listBundled(),
        writer.listStoredItems(),
      ]);
      const storedByPath = new Map<string, StoredItem>();
      for (const { itemPath, stored: rec } of stored) {
        storedByPath.set(itemPath, rec);
      }
      const out: Array<{ itemPath: string; item: StacItem }> = [];
      // Bundled items first (preserve catalog order).
      for (const itemPath of bundledIndex) {
        const bundled = await fetchBundled(itemPath);
        const merged = mergeOverlay(bundled, storedByPath.get(itemPath) ?? null);
        if (merged !== null) out.push({ itemPath, item: merged });
      }
      // Standalone items appended sorted by mtimeMs descending.
      const standalone = stored
        .filter(({ stored: rec }) => rec.kind === 'standalone')
        .sort((a, b) => b.stored.mtimeMs - a.stored.mtimeMs);
      for (const { itemPath, stored: rec } of standalone) {
        out.push({ itemPath, item: rec.record });
      }
      return out;
    },

    subscribe(listener) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },

    close() {
      if (channel !== null) channel.close();
      for (const t of pending.values()) clearTimeout(t);
      pending.clear();
      subscribers.clear();
    },
  };
}

async function defaultFetchBundled(itemPath: string): Promise<StacItem | null> {
  if (typeof globalThis.fetch !== 'function') return null;
  try {
    const url = `/stac-store/${itemPath.replace(/^\//, '')}`;
    const res = await globalThis.fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as StacItem;
  } catch {
    return null;
  }
}

async function defaultListBundled(): Promise<ReadonlyArray<string>> {
  if (typeof globalThis.fetch !== 'function') return [];
  try {
    const res = await globalThis.fetch('/stac-store/catalog.json');
    if (!res.ok) return [];
    const cat = (await res.json()) as {
      links?: Array<{ rel: string; href: string }>;
    };
    const out: string[] = [];
    for (const link of cat.links ?? []) {
      if (link.rel === 'item' || link.rel === 'child') {
        const href = link.href.replace(/^\.\//, '');
        out.push(href.endsWith('item.json') ? href : `${href}/item.json`);
      }
    }
    return out;
  } catch {
    return [];
  }
}
