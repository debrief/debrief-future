/**
 * IndexedDB adaptor for the host-agnostic StacWriter interface.
 *
 *   ┌────────────────────────────┐         ┌──────────────────────────────┐
 *   │ StacWriter (browser-safe)  │ <───── │ stacWriterIdb (this file)     │
 *   │ @debrief/stac-writer       │ implements                              │
 *   └────────────────────────────┘         │ backend: IndexedDB v3 via idb │
 *                                          │  - items     (overlay+stand.) │
 *                                          │  - assets    ([itemPath,key]) │
 *                                          │  - payloads  (geojson, large) │
 *                                          │  - meta      (capability flag)│
 *                                          └──────────────────────────────┘
 *
 * Article IV.4: this is one of two production files allowed to read
 * browser persistence globals directly. Everywhere else routes through
 * `@debrief/stac-writer`.
 *
 * Transaction shapes (per data-model.md Layer 3):
 *
 *   ┌────────────────────────────────┬───────────────────────────┬─────────┐
 *   │ Operation                      │ Stores in transaction      │ Mode    │
 *   ├────────────────────────────────┼───────────────────────────┼─────────┤
 *   │ writeItem                      │ items, meta                │ readwrite│
 *   │ patchItem                      │ items, meta                │ readwrite│
 *   │ writeAsset (binary)            │ assets, items, meta        │ readwrite│
 *   │ writeAsset (geojson)           │ payloads, items, meta      │ readwrite│
 *   │ writeSceneThumbnailPair        │ assets, items, meta        │ readwrite│
 *   │ deleteItem                     │ items, assets, payloads, meta│ readwrite│
 *   │ deleteAsset                    │ assets, items, meta        │ readwrite│
 *   └────────────────────────────────┴───────────────────────────┴─────────┘
 *
 * Atomicity = one IndexedDB transaction per logical operation. On error
 * the transaction aborts and readers never see a partial state.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- idb's type surface
   uses any in a few places; we narrow at the boundaries. */

import { openDB } from 'idb';
import type {
  CapabilityReport,
  DeleteAssetInput,
  DeleteAssetResult,
  DeleteItemInput,
  DeleteItemResult,
  PatchItemInput,
  PatchItemResult,
  PropertiesProvenanceEntry,
  StacItem,
  StacWriter,
  StoredItem,
  WriteAssetInput,
  WriteAssetResult,
  WriteItemInput,
  WriteItemResult,
  WritePlotThumbnailPairInput,
  WritePlotThumbnailPairResult,
  WriteSceneThumbnailPairInput,
  WriteSceneThumbnailPairResult,
} from '@debrief/stac-writer';
import {
  StacWriterError,
  pathGuard,
  validateSceneId,
} from '@debrief/stac-writer';
import {
  WRITER_DB_NAME,
  probeIndexedDbCapability,
  requestPersistOnce,
} from './stacWriterCapability';

const DB_VERSION = 1;
const PROVENANCE_LOG_CAP = 500;
const PROPERTIES_PANEL_TOOL_SENTINEL = 'debrief.propertiesPanel' as const;
const BROADCAST_CHANNEL_NAME = 'debrief-stac-writer-v1';

interface AssetRecord {
  readonly blob: Blob;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly mtimeMs: number;
}

interface PayloadRecord {
  readonly payload: string;
  readonly mediaType: 'application/geo+json';
  readonly byteLength: number;
  readonly mtimeMs: number;
}

interface MetaValue {
  readonly value: unknown;
}

export interface WriterBroadcast {
  readonly kind: 'item-changed' | 'item-deleted' | 'capability-changed';
  readonly itemPath?: string;
  readonly mtimeMs?: number;
}

export interface StacWriterIdbOptions {
  /** Override the IndexedDB factory (used by `fake-indexeddb` in tests). */
  readonly factory?: IDBFactory;
  /**
   * Override the BroadcastChannel constructor (used by tests; some test
   * environments don't ship a real BroadcastChannel).
   */
  readonly broadcastChannelCtor?: typeof BroadcastChannel | null;
  /** Optional clock for deterministic mtimeMs in tests. */
  readonly nowMs?: () => number;
  /** Optional resolver for bundled item.json (catalog-relative GET prefix). */
  readonly fetchBundledItem?: (itemPath: string) => Promise<StacItem | null>;
}

export interface StacWriterIdb extends StacWriter {
  /** Read an overlay/standalone record from IndexedDB. Used by catalogReadView. */
  readStoredItem(itemPath: string): Promise<StoredItem | null>;
  /** Read every overlay/standalone record. Used by catalogReadView listings. */
  listStoredItems(): Promise<ReadonlyArray<{ itemPath: string; stored: StoredItem }>>;
  /** Read an asset blob by [itemPath, assetKey]. Used by useResolvedAssetHref. */
  readAssetBlob(itemPath: string, assetKey: string): Promise<Blob | null>;
  /** Read a GeoJSON payload by itemPath. */
  readPayload(itemPath: string): Promise<string | null>;
  /** Close the underlying database (test cleanup). */
  close(): Promise<void>;
}

/**
 * Factory for the IndexedDB-backed StacWriter. Constructed once at App boot.
 */
export async function createStacWriterIdb(
  opts: StacWriterIdbOptions = {},
): Promise<StacWriterIdb> {
  const factory = opts.factory ?? globalThis.indexedDB;
  if (factory === undefined || factory === null) {
    throw new StacWriterError(
      'indexeddb-unavailable',
      'IndexedDB is not available in this browser configuration',
    );
  }
  const nowMs = opts.nowMs ?? (() => Date.now());

  const broadcastCtor =
    opts.broadcastChannelCtor === null
      ? null
      : opts.broadcastChannelCtor ??
        (typeof BroadcastChannel === 'undefined' ? null : BroadcastChannel);
  const channel: BroadcastChannel | null =
    broadcastCtor === null ? null : new broadcastCtor(BROADCAST_CHANNEL_NAME);

  const db = await openDB(WRITER_DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('items')) {
        database.createObjectStore('items');
      }
      if (!database.objectStoreNames.contains('assets')) {
        const assets = database.createObjectStore('assets');
        assets.createIndex('byItem', 'itemPath');
      }
      if (!database.objectStoreNames.contains('payloads')) {
        database.createObjectStore('payloads');
      }
      if (!database.objectStoreNames.contains('meta')) {
        database.createObjectStore('meta');
      }
    },
  });

  // First-write detection — used by capability() and writeAsset/writeItem
  // to fire `navigator.storage.persist()` exactly once.
  let firstWritePersistRequested = false;

  function broadcast(message: WriterBroadcast): void {
    if (channel === null) return;
    try {
      channel.postMessage(message);
    } catch {
      // best-effort
    }
  }

  async function onFirstWrite(): Promise<void> {
    if (firstWritePersistRequested) return;
    firstWritePersistRequested = true;
    const meta = await db.get('meta', 'firstWriteAt');
    if ((meta as MetaValue | undefined)?.value !== undefined) return;
    const ts = new Date(nowMs()).toISOString();
    await db.put('meta', { value: ts } satisfies MetaValue, 'firstWriteAt');
    const granted = await requestPersistOnce();
    await db.put(
      'meta',
      { value: granted } satisfies MetaValue,
      'persistGranted',
    );
  }

  async function fetchBundledItem(itemPath: string): Promise<StacItem | null> {
    if (opts.fetchBundledItem) return opts.fetchBundledItem(itemPath);
    if (typeof globalThis.fetch !== 'function') return null;
    try {
      const url = `/stac-store/${itemPath.replace(/^\//, '')}`;
      const res = await globalThis.fetch(url);
      if (!res.ok) return null;
      const json = (await res.json()) as StacItem;
      return json;
    } catch {
      return null;
    }
  }

  const writer: StacWriterIdb = {
    async capability(): Promise<CapabilityReport> {
      return probeIndexedDbCapability();
    },

    async writeItem(input: WriteItemInput): Promise<WriteItemResult> {
      pathGuard('writeItem.itemPath', input.itemPath);
      // create vs replace semantics: 'create' rejects if the path is bundled
      // (would require an overlay, not a standalone) AND if a standalone
      // record already exists at that path.
      const existing = (await db.get('items', input.itemPath)) as
        | StoredItem
        | undefined;
      if (input.mode === 'create' && existing !== undefined) {
        throw new StacWriterError(
          'validation-failed',
          `writeItem(create): record already exists at ${input.itemPath}`,
          { path: input.itemPath },
        );
      }
      if (input.mode === 'replace') {
        if (existing === undefined) {
          // Bundled-only items are read-only — replace must go through patchItem.
          throw new StacWriterError(
            'bundled-item-read-only',
            `writeItem(replace): cannot replace a bundled item directly; use patchItem to land an overlay (${input.itemPath})`,
            { path: input.itemPath },
          );
        }
        if (existing.kind === 'overlay') {
          // OK to whole-replace an existing overlay (it's mutable user state).
        }
      }
      const record: StoredItem = {
        kind: input.mode === 'create' ? 'standalone' : existing!.kind,
        record: input.item,
        mtimeMs: nowMs(),
      };
      const tx = db.transaction(['items', 'meta'], 'readwrite');
      await tx.objectStore('items').put(record, input.itemPath);
      await tx.done;
      await onFirstWrite();
      broadcast({
        kind: 'item-changed',
        itemPath: input.itemPath,
        mtimeMs: record.mtimeMs,
      });
      return { writtenPath: input.itemPath };
    },

    async patchItem(input: PatchItemInput): Promise<PatchItemResult> {
      pathGuard('patchItem.itemPath', input.itemPath);
      if (Object.keys(input.patch).length === 0) {
        throw new StacWriterError(
          'validation-failed',
          'patchItem: patch must contain at least one field',
          { path: input.itemPath },
        );
      }
      if (input.provenance.fields.length === 0) {
        throw new StacWriterError(
          'validation-failed',
          'patchItem: provenance.fields must be non-empty',
          { path: input.itemPath },
        );
      }
      const existing = (await db.get('items', input.itemPath)) as
        | StoredItem
        | undefined;

      // Resolve the base record:
      //   - existing overlay → mutate in place
      //   - existing standalone → mutate in place
      //   - no overlay yet, bundled exists → seed overlay from bundled
      //   - no overlay, no bundled → error
      let baseItem: StacItem;
      let kind: 'overlay' | 'standalone';
      let baseMtimeMs: number;
      if (existing !== undefined) {
        baseItem = existing.record;
        kind = existing.kind;
        baseMtimeMs = existing.mtimeMs;
      } else {
        const bundled = await fetchBundledItem(input.itemPath);
        if (bundled === null) {
          throw new StacWriterError(
            'stac-item-not-found',
            `patchItem: no bundled or stored item at ${input.itemPath}`,
            { path: input.itemPath },
          );
        }
        baseItem = bundled;
        kind = 'overlay';
        baseMtimeMs = 0;
      }

      // baseItem.properties is typed as Record<string, unknown> by the
      // StacWriter contract — the spread copies it exactly.
      const props: Record<string, unknown> = { ...baseItem.properties };
      for (const [k, v] of Object.entries(input.patch)) {
        props[k] = v;
      }

      const existingOverrides = Array.isArray(props['debrief:overrides'])
        ? (props['debrief:overrides'] as unknown[]).filter(
            (x): x is string => typeof x === 'string',
          )
        : [];
      const overridesSet = new Set<string>(existingOverrides);
      for (const f of input.overrideFields) overridesSet.add(f);
      const mergedOverrides = Array.from(overridesSet).sort();
      props['debrief:overrides'] = mergedOverrides;

      // ULID-ish; we don't import the `ulid` package here to keep this
      // module's dep surface minimal — `crypto.randomUUID` is sufficient
      // for activity correlation in v1.
      const activityId = (
        typeof globalThis.crypto?.randomUUID === 'function'
          ? globalThis.crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
      );
      const entry: PropertiesProvenanceEntry = {
        activity_id: activityId,
        timestamp: new Date(nowMs()).toISOString(),
        tool: PROPERTIES_PANEL_TOOL_SENTINEL,
        method: `properties-panel@${input.packageVersion}`,
        source: 'user',
        fields: [...input.provenance.fields].sort(),
      };

      const existingLog = Array.isArray(props['debrief:provenance_log'])
        ? (props['debrief:provenance_log'] as PropertiesProvenanceEntry[])
        : [];
      const log: PropertiesProvenanceEntry[] = [...existingLog, entry];

      // Optional cap+archive — overflow entries land in a sibling asset
      // blob `provenance-archive` so consumers can read history without
      // schema changes. Best-effort.
      let archiveOverflow: PropertiesProvenanceEntry[] = [];
      if (log.length > PROVENANCE_LOG_CAP) {
        const overflow = log.length - PROVENANCE_LOG_CAP;
        archiveOverflow = log.slice(0, overflow);
        log.splice(0, overflow);
      }
      props['debrief:provenance_log'] = log;

      // Re-stat fingerprint check.
      if (
        existing !== undefined &&
        existing.mtimeMs !== baseMtimeMs
      ) {
        throw new StacWriterError(
          'stale-fingerprint',
          'patchItem: record was updated externally between read and write',
          { path: input.itemPath },
        );
      }

      const updatedRecord: StacItem = {
        ...baseItem,
        properties: props,
      };
      const stored: StoredItem = {
        kind,
        record: updatedRecord,
        mtimeMs: nowMs(),
      };

      const tx = db.transaction(['items', 'assets', 'meta'], 'readwrite');
      await tx.objectStore('items').put(stored, input.itemPath);
      if (archiveOverflow.length > 0) {
        const archiveBlob = await readAssetBlobInTx(
          tx,
          input.itemPath,
          'provenance-archive',
        );
        const existingText =
          archiveBlob === null ? '' : await archiveBlob.text();
        const newText =
          existingText +
          archiveOverflow.map((e) => JSON.stringify(e)).join('\n') +
          '\n';
        const blob = new Blob([newText], { type: 'application/x-ndjson' });
        await tx.objectStore('assets').put(
          {
            blob,
            mediaType: 'application/x-ndjson',
            byteLength: blob.size,
            mtimeMs: nowMs(),
            itemPath: input.itemPath,
          },
          [input.itemPath, 'provenance-archive'],
        );
      }
      await tx.done;
      await onFirstWrite();
      broadcast({
        kind: 'item-changed',
        itemPath: input.itemPath,
        mtimeMs: stored.mtimeMs,
      });
      return {
        updatedProperties: props,
        overrides: mergedOverrides,
        activityId,
      };
    },

    async writeAsset(input: WriteAssetInput): Promise<WriteAssetResult> {
      pathGuard('writeAsset.itemPath', input.itemPath);
      pathGuard('writeAsset.assetHref', input.assetHref);
      const isGeoJson = input.mediaType === 'application/geo+json';
      const stores: ReadonlyArray<'assets' | 'payloads' | 'items' | 'meta'> = isGeoJson
        ? (['payloads', 'items', 'meta'] as const)
        : (['assets', 'items', 'meta'] as const);

      // Stage blob bytes outside the transaction (Blob construction is sync).
      const bodyBytes: BlobPart =
        typeof input.body === 'string'
          ? input.body
          : (input.body as Uint8Array<ArrayBuffer>);
      const blob = isGeoJson
        ? null
        : new Blob([bodyBytes], { type: input.mediaType });
      const byteLength =
        typeof input.body === 'string'
          ? new TextEncoder().encode(input.body).length
          : input.body.byteLength;

      // Resolve the item record we'll patch.
      const existing = (await db.get('items', input.itemPath)) as
        | StoredItem
        | undefined;
      let baseItem: StacItem;
      let kind: 'overlay' | 'standalone';
      if (existing !== undefined) {
        baseItem = existing.record;
        kind = existing.kind;
      } else {
        const bundled = await fetchBundledItem(input.itemPath);
        if (bundled === null) {
          throw new StacWriterError(
            'stac-item-not-found',
            `writeAsset: owning item not found at ${input.itemPath}`,
            { path: input.itemPath },
          );
        }
        baseItem = bundled;
        kind = 'overlay';
      }

      const synthHref = `idb:${input.itemPath}::${input.assetEntry.key}`;
      const nextAssets: Record<string, unknown> = {
        ...((baseItem.assets as Record<string, unknown> | undefined) ?? {}),
        [input.assetEntry.key]: {
          href: synthHref,
          type: input.mediaType,
          ...(input.assetEntry.title ? { title: input.assetEntry.title } : {}),
          ...(input.assetEntry.roles ? { roles: input.assetEntry.roles } : {}),
          ...(input.assetEntry.extra ?? {}),
        },
      };
      const updated: StacItem = {
        ...baseItem,
        assets: nextAssets as StacItem['assets'],
      };
      const stored: StoredItem = {
        kind,
        record: updated,
        mtimeMs: nowMs(),
      };

      // idb's transaction overload expects a writable string[] tuple; the
      // ReadonlyArray<string> here is structurally compatible. Spreading
      // gives idb an array it can iterate without an `as unknown` cast.
      const tx = db.transaction([...stores], 'readwrite');
      if (isGeoJson) {
        const payloadText =
          typeof input.body === 'string'
            ? input.body
            : new TextDecoder().decode(input.body);
        await tx.objectStore('payloads').put(
          {
            payload: payloadText,
            mediaType: 'application/geo+json',
            byteLength,
            mtimeMs: nowMs(),
          } satisfies PayloadRecord,
          input.itemPath,
        );
      } else {
        await tx.objectStore('assets').put(
          {
            blob: blob!,
            mediaType: input.mediaType,
            byteLength,
            mtimeMs: nowMs(),
            itemPath: input.itemPath,
          },
          [input.itemPath, input.assetEntry.key],
        );
      }
      await tx.objectStore('items').put(stored, input.itemPath);
      await tx.done;
      await onFirstWrite();
      broadcast({
        kind: 'item-changed',
        itemPath: input.itemPath,
        mtimeMs: stored.mtimeMs,
      });
      return {
        assetPath: synthHref,
        assetKey: input.assetEntry.key,
      };
    },

    async writeSceneThumbnailPair(
      input: WriteSceneThumbnailPairInput,
    ): Promise<WriteSceneThumbnailPairResult> {
      pathGuard('writeSceneThumbnailPair.stacItemPath', input.stacItemPath);
      validateSceneId(input.sceneId);
      const itemPath = `${input.stacItemPath}/item.json`;

      const largeBytes = decodeBase64(input.largePngBase64);
      const smallBytes = decodeBase64(input.smallPngBase64);

      const largeBlob = new Blob([largeBytes as Uint8Array<ArrayBuffer>], {
        type: 'image/png',
      });
      const smallBlob = new Blob([smallBytes as Uint8Array<ArrayBuffer>], {
        type: 'image/png',
      });

      const largeKey = `scene-thumbnail-${input.sceneId}`;
      const smallKey = `scene-thumbnail-${input.sceneId}-sm`;
      const largeHref = `idb:${itemPath}::${largeKey}`;
      const smallHref = `idb:${itemPath}::${smallKey}`;

      // Resolve the item record we'll patch.
      const existing = (await db.get('items', itemPath)) as
        | StoredItem
        | undefined;
      let baseItem: StacItem;
      let kind: 'overlay' | 'standalone';
      if (existing !== undefined) {
        baseItem = existing.record;
        kind = existing.kind;
      } else {
        const bundled = await fetchBundledItem(itemPath);
        if (bundled === null) {
          throw new StacWriterError(
            'stac-item-not-found',
            `writeSceneThumbnailPair: owning item not found at ${itemPath}`,
            { path: itemPath },
          );
        }
        baseItem = bundled;
        kind = 'overlay';
      }

      const nextAssets: Record<string, unknown> = {
        ...((baseItem.assets as Record<string, unknown> | undefined) ?? {}),
        [largeKey]: {
          href: largeHref,
          type: 'image/png',
          title: 'Scene thumbnail',
          roles: ['thumbnail'],
        },
        [smallKey]: {
          href: smallHref,
          type: 'image/png',
          title: 'Scene thumbnail (small)',
          roles: ['thumbnail'],
        },
      };
      const updated: StacItem = {
        ...baseItem,
        assets: nextAssets as StacItem['assets'],
      };
      const stored: StoredItem = {
        kind,
        record: updated,
        mtimeMs: nowMs(),
      };

      const tx = db.transaction(['assets', 'items', 'meta'], 'readwrite');
      const assetStore = tx.objectStore('assets');
      await assetStore.put(
        {
          blob: largeBlob,
          mediaType: 'image/png',
          byteLength: largeBlob.size,
          mtimeMs: nowMs(),
          itemPath,
        },
        [itemPath, largeKey],
      );
      await assetStore.put(
        {
          blob: smallBlob,
          mediaType: 'image/png',
          byteLength: smallBlob.size,
          mtimeMs: nowMs(),
          itemPath,
        },
        [itemPath, smallKey],
      );
      await tx.objectStore('items').put(stored, itemPath);
      await tx.done;
      await onFirstWrite();
      broadcast({
        kind: 'item-changed',
        itemPath,
        mtimeMs: stored.mtimeMs,
      });
      return {
        assetKey: largeKey,
        largePath: largeHref,
        smallPath: smallHref,
      };
    },

    // eslint-disable-next-line @typescript-eslint/require-await -- StacWriter interface mandates Promise return; this stub throws synchronously at the boundary.
    async writePlotThumbnailPair(
      _input: WritePlotThumbnailPairInput,
    ): Promise<WritePlotThumbnailPairResult> {
      throw new StacWriterError(
        'validation-failed',
        'writePlotThumbnailPair is not supported in the web-shell host',
      );
    },

    async deleteItem(input: DeleteItemInput): Promise<DeleteItemResult> {
      pathGuard('deleteItem.itemPath', input.itemPath);
      const existing = (await db.get('items', input.itemPath)) as
        | StoredItem
        | undefined;
      if (existing === undefined || existing.kind === 'overlay') {
        throw new StacWriterError(
          'bundled-item-read-only',
          `deleteItem: bundled items are read-only (${input.itemPath})`,
          { path: input.itemPath },
        );
      }
      const tx = db.transaction(
        ['items', 'assets', 'payloads', 'meta'],
        'readwrite',
      );
      await tx.objectStore('items').delete(input.itemPath);
      await tx.objectStore('payloads').delete(input.itemPath);
      const idx = tx.objectStore('assets').index('byItem');
      const keys = await idx.getAllKeys(IDBKeyRange.only(input.itemPath));
      for (const k of keys) {
        await tx.objectStore('assets').delete(k);
      }
      await tx.done;
      broadcast({ kind: 'item-deleted', itemPath: input.itemPath });
      return { removedPath: input.itemPath };
    },

    async deleteAsset(input: DeleteAssetInput): Promise<DeleteAssetResult> {
      pathGuard('deleteAsset.itemPath', input.itemPath);
      const existing = (await db.get('items', input.itemPath)) as
        | StoredItem
        | undefined;
      if (existing === undefined) {
        throw new StacWriterError(
          'bundled-item-read-only',
          `deleteAsset: cannot delete from a bundled-only item (${input.itemPath})`,
          { path: input.itemPath },
        );
      }
      const assets = (existing.record.assets as Record<string, unknown> | undefined) ?? {};
      if (assets[input.assetKey] === undefined) {
        return { removedAssetPath: null };
      }
      const nextAssets: Record<string, unknown> = { ...assets };
      delete nextAssets[input.assetKey];
      const stored: StoredItem = {
        ...existing,
        record: {
          ...existing.record,
          assets: nextAssets as StacItem['assets'],
        },
        mtimeMs: nowMs(),
      };
      const tx = db.transaction(['items', 'assets', 'meta'], 'readwrite');
      await tx.objectStore('items').put(stored, input.itemPath);
      try {
        await tx.objectStore('assets').delete(
          [input.itemPath, input.assetKey],
        );
      } catch {
        // best-effort
      }
      await tx.done;
      broadcast({
        kind: 'item-changed',
        itemPath: input.itemPath,
        mtimeMs: stored.mtimeMs,
      });
      return { removedAssetPath: `idb:${input.itemPath}::${input.assetKey}` };
    },

    async readStoredItem(itemPath: string): Promise<StoredItem | null> {
      const v = (await db.get('items', itemPath)) as StoredItem | undefined;
      return v ?? null;
    },

    async listStoredItems(): Promise<
      ReadonlyArray<{ itemPath: string; stored: StoredItem }>
    > {
      const keys = (await db.getAllKeys('items')) as string[];
      const values = (await db.getAll('items')) as StoredItem[];
      const out: Array<{ itemPath: string; stored: StoredItem }> = [];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = values[i];
        if (k !== undefined && v !== undefined) {
          out.push({ itemPath: k, stored: v });
        }
      }
      return out;
    },

    async readAssetBlob(itemPath: string, assetKey: string): Promise<Blob | null> {
      const rec = (await db.get(
        'assets',
        [itemPath, assetKey],
      )) as AssetRecord | undefined;
      return rec?.blob ?? null;
    },

    async readPayload(itemPath: string): Promise<string | null> {
      const rec = (await db.get('payloads', itemPath)) as
        | PayloadRecord
        | undefined;
      return rec?.payload ?? null;
    },

    async close(): Promise<void> {
      db.close();
      if (channel !== null) channel.close();
    },
  };

  return writer;
}

// ─── helpers ───────────────────────────────────────────────────────────────

async function readAssetBlobInTx(
  tx: any,
  itemPath: string,
  assetKey: string,
): Promise<Blob | null> {
  try {
    const rec = (await tx.objectStore('assets').get(
      [itemPath, assetKey],
    )) as AssetRecord | undefined;
    return rec?.blob ?? null;
  } catch {
    return null;
  }
}

function decodeBase64(b64: string): Uint8Array {
  if (typeof b64 !== 'string' || b64.length === 0) {
    throw new StacWriterError('empty-png', 'decodeBase64: input is empty');
  }
  // Strip data URL prefix if present.
  const cleaned = b64.replace(/^data:[^,]+,/, '');
  const bin = globalThis.atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  if (out.length === 0) {
    throw new StacWriterError(
      'empty-png',
      'decodeBase64: decoded payload is zero bytes',
    );
  }
  return out;
}

