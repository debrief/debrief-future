/**
 * IDB `commitPlotSave` atomicity tests (#268, US1 — contract C4).
 *
 * Uses `fake-indexeddb`. Asserts:
 *   - a single commitPlotSave performs exactly ONE readwrite transaction over
 *     the item + payload stores (C4);
 *   - aborting that transaction leaves the store byte-identical to before
 *     (atomic — the item record and payload land together or not at all);
 *   - a successful commit writes the item record + geojson payload together.
 */

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StacWriterError } from '@debrief/stac-writer';
import type {
  RawGeoJSONFeatureCollection,
  StoreContext,
} from '@debrief/stac-writer';
import { createStacWriterIdb, type StacWriterIdb } from '../stacWriterIdb';
import { WRITER_DB_NAME } from '../stacWriterCapability';

const ITEM_PATH = 'user/plot-1/item.json';

const ctx: StoreContext = {
  kind: 'idb',
  nowMs: () => 1_700_000_000_000,
  randomId: () => 'id-1',
};

function fc(label: string): RawGeoJSONFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: `t-${label}`,
        geometry: { type: 'Point', coordinates: [1, 2] },
        properties: { kind: 'TRACK', name: label },
      },
    ],
  };
}

let openWriters: StacWriterIdb[] = [];

async function freshWriter(): Promise<StacWriterIdb> {
  for (const w of openWriters) {
    try {
      await w.close();
    } catch {
      // ignore
    }
  }
  openWriters = [];
  await new Promise<void>((resolve) => {
    const req = globalThis.indexedDB.deleteDatabase(WRITER_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  const writer = await createStacWriterIdb({
    broadcastChannelCtor: null,
    fetchBundledItem: async () => null,
  });
  openWriters.push(writer);
  return writer;
}

afterEach(async () => {
  vi.restoreAllMocks();
  for (const w of openWriters) {
    try {
      await w.close();
    } catch {
      // ignore
    }
  }
  openWriters = [];
});

describe('stacWriterIdb.commitPlotSave (#268 US1)', () => {
  it('commits the item record + geojson payload together (create case)', async () => {
    const w = await freshWriter();
    const result = await w.commitPlotSave({
      ctx,
      stacItemPath: ITEM_PATH,
      featureCollection: fc('v1'),
    });

    expect(result.featuresPath).toBe(`idb:${ITEM_PATH}::data`);
    expect(result.thumbnailPath).toBeNull();
    expect(result.overviewPath).toBeNull();

    const stored = await w.readStoredItem(ITEM_PATH);
    expect(stored?.kind).toBe('standalone');
    expect((stored?.record.assets as Record<string, { href: string }>).data?.href).toBe(
      `idb:${ITEM_PATH}::data`,
    );
    const payload = await w.readPayload(ITEM_PATH);
    expect(JSON.parse(payload ?? 'null')).toMatchObject({ type: 'FeatureCollection' });
    expect((JSON.parse(payload ?? 'null') as RawGeoJSONFeatureCollection).features[0]?.properties)
      .toMatchObject({ name: 'v1' });
  });

  it('C4 — a save uses exactly ONE readwrite transaction touching items', async () => {
    const w = await freshWriter();
    // Prime first-write bookkeeping so onFirstWrite's meta puts don't count.
    await w.commitPlotSave({ ctx, stacItemPath: ITEM_PATH, featureCollection: fc('v1') });

    const seen: Array<{ stores: string[]; mode: IDBTransactionMode }> = [];
    const realTransaction = IDBDatabase.prototype.transaction;
    vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (
      this: IDBDatabase,
      stores: string | Iterable<string>,
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) {
      seen.push({
        stores: typeof stores === 'string' ? [stores] : Array.from(stores),
        mode: mode ?? 'readonly',
      });
      return realTransaction.call(this, stores, mode, options);
    });

    await w.commitPlotSave({ ctx, stacItemPath: ITEM_PATH, featureCollection: fc('v2') });

    const writeTxTouchingItems = seen.filter(
      (t) => t.mode === 'readwrite' && t.stores.includes('items'),
    );
    expect(writeTxTouchingItems).toHaveLength(1);
    // And that one transaction spans the payload store too (atomic pairing).
    expect(writeTxTouchingItems[0]?.stores).toContain('payloads');
  });

  it('C4 — aborting the commit transaction leaves the store byte-identical', async () => {
    const w = await freshWriter();
    await w.commitPlotSave({ ctx, stacItemPath: ITEM_PATH, featureCollection: fc('v1') });

    const itemBefore = JSON.stringify((await w.readStoredItem(ITEM_PATH))?.record);
    const payloadBefore = await w.readPayload(ITEM_PATH);

    // Abort the transaction the moment the item put is attempted — the payload
    // put queued just before is rolled back with it.
    const realPut = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value: unknown,
      key?: IDBValidKey,
    ) {
      if (this.name === 'items') {
        this.transaction.abort();
        throw new Error('synthetic abort: items put failed mid-commit');
      }
      return realPut.call(this, value, key);
    });

    await expect(
      w.commitPlotSave({ ctx, stacItemPath: ITEM_PATH, featureCollection: fc('v2') }),
    ).rejects.toBeTruthy();

    vi.restoreAllMocks();
    expect(JSON.stringify((await w.readStoredItem(ITEM_PATH))?.record)).toBe(itemBefore);
    expect(await w.readPayload(ITEM_PATH)).toBe(payloadBefore);
  });

  it('rejects a non-FeatureCollection payload before any write', async () => {
    const w = await freshWriter();
    await expect(
      w.commitPlotSave({
        ctx,
        stacItemPath: ITEM_PATH,
        // @ts-expect-error — deliberately wrong type at the runtime boundary.
        featureCollection: { type: 'Feature' },
      }),
    ).rejects.toBeInstanceOf(StacWriterError);
    expect(await w.readStoredItem(ITEM_PATH)).toBeNull();
  });
});
