/**
 * IDB `reconcilePlotSave` tests (#268, US3 — contract C5).
 *
 * IndexedDB transactions are atomic: a tab/browser kill discards an
 * uncommitted transaction, so the browser host never has a partial save to
 * reconcile. `reconcilePlotSave` is therefore a clean no-op that mutates
 * nothing — proven here for both an empty store and one carrying a committed
 * plot.
 */

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

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

const FC: RawGeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', id: 't1', geometry: { type: 'Point', coordinates: [1, 2] }, properties: { kind: 'TRACK' } },
  ],
};

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
  const w = await createStacWriterIdb({ broadcastChannelCtor: null, fetchBundledItem: async () => null });
  openWriters.push(w);
  return w;
}

afterEach(async () => {
  for (const w of openWriters) {
    try {
      await w.close();
    } catch {
      // ignore
    }
  }
  openWriters = [];
});

describe('stacWriterIdb.reconcilePlotSave (#268 US3)', () => {
  it('empty store → { recovered: false, outcome: "clean" }', async () => {
    const w = await freshWriter();
    const result = await w.reconcilePlotSave({ ctx, stacItemPath: ITEM_PATH });
    expect(result).toEqual({ recovered: false, outcome: 'clean' });
  });

  it('is a no-op against a committed plot (mutates nothing)', async () => {
    const w = await freshWriter();
    await w.commitPlotSave({ ctx, stacItemPath: ITEM_PATH, featureCollection: FC });

    const itemBefore = JSON.stringify((await w.readStoredItem(ITEM_PATH))?.record);
    const payloadBefore = await w.readPayload(ITEM_PATH);

    const result = await w.reconcilePlotSave({ ctx, stacItemPath: ITEM_PATH });
    expect(result).toEqual({ recovered: false, outcome: 'clean' });

    expect(JSON.stringify((await w.readStoredItem(ITEM_PATH))?.record)).toBe(itemBefore);
    expect(await w.readPayload(ITEM_PATH)).toBe(payloadBefore);
  });

  it('is idempotent (repeat calls stay clean)', async () => {
    const w = await freshWriter();
    expect((await w.reconcilePlotSave({ ctx, stacItemPath: ITEM_PATH })).outcome).toBe('clean');
    expect((await w.reconcilePlotSave({ ctx, stacItemPath: ITEM_PATH })).outcome).toBe('clean');
  });
});
