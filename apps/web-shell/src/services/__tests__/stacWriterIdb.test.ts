/**
 * vitest unit tests for the IndexedDB-backed StacWriter.
 *
 * Uses `fake-indexeddb` to drive the writer in Node — the same code path
 * runs in the browser at runtime. The test environment is node (per
 * vitest.config.ts); we install `fake-indexeddb/auto` to expose
 * `globalThis.indexedDB`.
 */

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';

import { StacWriterError, type StacItem } from '@debrief/stac-writer';
import { createStacWriterIdb, type StacWriterIdb } from '../stacWriterIdb';
import { WRITER_DB_NAME } from '../stacWriterCapability';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const VALID_ULID = '01HFA8B7C2D3E4F5G6H7J8K9M0';

// Helper: synthesise a fully-formed StacItem from the minimal subset
// these tests actually care about. The schema now requires `type`,
// `stac_version`, `geometry`, `bbox`, `links` etc.; the writer-layer
// tests previously stubbed only `id`, `properties`, `assets`. Wrap
// minimal stubs in this helper to keep test intent legible.
function mkItem(stub: {
  id: string;
  properties?: Record<string, unknown>;
  assets?: Record<string, unknown>;
}): StacItem {
  const properties: StacItem['properties'] = {
    datetime: '2024-01-01T00:00:00Z',
    ...(stub.properties ?? {}),
  };
  const assets: StacItem['assets'] = (stub.assets ?? {}) as StacItem['assets'];
  return {
    type: 'Feature',
    stac_version: '1.1.0',
    id: stub.id,
    geometry: { type: 'Point', coordinates: [0, 0] },
    bbox: [0, 0, 0, 0],
    properties,
    links: [{ rel: 'self', href: `./${stub.id}/item.json` }],
    assets,
  };
}

const SAMPLE_BUNDLED: StacItem = mkItem({
  id: 'exercise-alpha',
  properties: { title: 'Bundled', 'debrief:platforms': ['HMS Boat'] },
  assets: {
    thumbnail: { href: './thumb.png', type: 'image/png' },
  },
});

const ctx = {
  kind: 'idb' as const,
  nowMs: () => 1234567890,
  randomId: () => 'id-1',
};

let openWriters: StacWriterIdb[] = [];

async function freshWriter(
  fetchBundledItem?: (p: string) => Promise<typeof SAMPLE_BUNDLED | null>,
): Promise<StacWriterIdb> {
  // Close any previously-opened writer so deleteDatabase doesn't block.
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
    fetchBundledItem:
      fetchBundledItem === undefined
        ? async () => null
        : fetchBundledItem,
  });
  openWriters.push(writer);
  return writer;
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

describe('stacWriterIdb.writeSceneThumbnailPair', () => {
  it('writes both PNGs and an items overlay in a single transaction', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    const result = await w.writeSceneThumbnailPair({
      ctx,
      stacItemPath: 'exercise-alpha',
      sceneId: VALID_ULID,
      largePngBase64: TINY_PNG_BASE64,
      smallPngBase64: TINY_PNG_BASE64,
    });
    expect(result.assetKey).toBe(`scene-thumbnail-${VALID_ULID}`);
    expect(result.largePath).toBe(
      `idb:exercise-alpha/item.json::scene-thumbnail-${VALID_ULID}`,
    );
    expect(result.smallPath).toBe(
      `idb:exercise-alpha/item.json::scene-thumbnail-${VALID_ULID}-sm`,
    );
    const stored = await w.readStoredItem('exercise-alpha/item.json');
    expect(stored).not.toBeNull();
    expect(stored!.kind).toBe('overlay');
    expect(stored!.record.assets?.[`scene-thumbnail-${VALID_ULID}`]).toBeDefined();
    const blob = await w.readAssetBlob(
      'exercise-alpha/item.json',
      `scene-thumbnail-${VALID_ULID}`,
    );
    expect(blob).not.toBeNull();
    expect(blob!.size).toBeGreaterThan(0);
  });

  it('rejects an invalid sceneId via the path-guard helpers', async () => {
    const w = await freshWriter();
    await expect(
      w.writeSceneThumbnailPair({
        ctx,
        stacItemPath: 'exercise-alpha',
        sceneId: 'not-a-ulid',
        largePngBase64: TINY_PNG_BASE64,
        smallPngBase64: TINY_PNG_BASE64,
      }),
    ).rejects.toBeInstanceOf(StacWriterError);
  });

  it('rejects a path-traversal stacItemPath', async () => {
    const w = await freshWriter();
    await expect(
      w.writeSceneThumbnailPair({
        ctx,
        stacItemPath: '../etc/passwd',
        sceneId: VALID_ULID,
        largePngBase64: TINY_PNG_BASE64,
        smallPngBase64: TINY_PNG_BASE64,
      }),
    ).rejects.toBeInstanceOf(StacWriterError);
  });

  it('rejects when the bundled item is missing and no overlay exists', async () => {
    const w = await freshWriter();
    await expect(
      w.writeSceneThumbnailPair({
        ctx,
        stacItemPath: 'never-existed',
        sceneId: VALID_ULID,
        largePngBase64: TINY_PNG_BASE64,
        smallPngBase64: TINY_PNG_BASE64,
      }),
    ).rejects.toMatchObject({ kind: 'stac-item-not-found' });
  });
});

describe('stacWriterIdb.patchItem', () => {
  it('creates an overlay record for a bundled-only item on first patch', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    const result = await w.patchItem({
      ctx,
      itemPath: 'exercise-alpha/item.json',
      patch: { title: 'My edit' },
      overrideFields: ['title'],
      provenance: { tool: 'debrief.propertiesPanel', fields: ['title'] },
      packageVersion: '1.0.0',
    });
    expect(result.updatedProperties.title).toBe('My edit');
    expect(result.overrides).toEqual(['title']);
    expect(result.activityId.length).toBeGreaterThan(0);
    const stored = await w.readStoredItem('exercise-alpha/item.json');
    expect(stored!.kind).toBe('overlay');
    expect(
      Array.isArray(stored!.record.properties['debrief:provenance_log']),
    ).toBe(true);
  });

  it('rejects an empty patch with validation-failed', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    await expect(
      w.patchItem({
        ctx,
        itemPath: 'exercise-alpha/item.json',
        patch: {},
        overrideFields: [],
        provenance: { tool: 'debrief.propertiesPanel', fields: ['x'] },
        packageVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({ kind: 'validation-failed' });
  });

  it('appends to the provenance log on the second patch (no record duplication)', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    await w.patchItem({
      ctx,
      itemPath: 'exercise-alpha/item.json',
      patch: { title: 'first' },
      overrideFields: ['title'],
      provenance: { tool: 'debrief.propertiesPanel', fields: ['title'] },
      packageVersion: '1.0.0',
    });
    await w.patchItem({
      ctx,
      itemPath: 'exercise-alpha/item.json',
      patch: { title: 'second' },
      overrideFields: ['title'],
      provenance: { tool: 'debrief.propertiesPanel', fields: ['title'] },
      packageVersion: '1.0.0',
    });
    const stored = await w.readStoredItem('exercise-alpha/item.json');
    const log = stored!.record.properties['debrief:provenance_log'] as unknown[];
    expect(log).toHaveLength(2);
  });
});

describe('stacWriterIdb.writeItem (standalone create)', () => {
  it('creates a standalone record under a user/ path', async () => {
    const w = await freshWriter();
    const itemPath = 'user/01HX/item.json';
    await w.writeItem({
      ctx,
      itemPath,
      mode: 'create',
      item: mkItem({ id: 'user-track-1', properties: { title: 'My track' } }),
    });
    const stored = await w.readStoredItem(itemPath);
    expect(stored!.kind).toBe('standalone');
  });

  it('rejects a duplicate create', async () => {
    const w = await freshWriter();
    const itemPath = 'user/01HX/item.json';
    await w.writeItem({
      ctx,
      itemPath,
      mode: 'create',
      item: mkItem({ id: 'x' }),
    });
    await expect(
      w.writeItem({
        ctx,
        itemPath,
        mode: 'create',
        item: mkItem({ id: 'x' }),
      }),
    ).rejects.toMatchObject({ kind: 'validation-failed' });
  });

  it('rejects replace of a bundled-only item', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    await expect(
      w.writeItem({
        ctx,
        itemPath: 'exercise-alpha/item.json',
        mode: 'replace',
        item: SAMPLE_BUNDLED,
      }),
    ).rejects.toMatchObject({ kind: 'bundled-item-read-only' });
  });
});

describe('stacWriterIdb.writeAsset (geojson payload)', () => {
  it('routes geo+json payload to the payloads store', async () => {
    const w = await freshWriter();
    await w.writeItem({
      ctx,
      itemPath: 'user/01HX/item.json',
      mode: 'create',
      item: mkItem({ id: 'user-track-1' }),
    });
    const fc = JSON.stringify({ type: 'FeatureCollection', features: [] });
    const res = await w.writeAsset({
      ctx,
      itemPath: 'user/01HX/item.json',
      assetHref: './track.geojson',
      body: fc,
      mediaType: 'application/geo+json',
      assetEntry: { key: 'data', roles: ['data'] },
    });
    expect(res.assetKey).toBe('data');
    const payload = await w.readPayload('user/01HX/item.json');
    expect(payload).toBe(fc);
  });
});

describe('stacWriterIdb.deleteItem', () => {
  it('rejects bundled-only items', async () => {
    const w = await freshWriter(async () => SAMPLE_BUNDLED);
    await expect(
      w.deleteItem({ ctx, itemPath: 'exercise-alpha/item.json' }),
    ).rejects.toMatchObject({ kind: 'bundled-item-read-only' });
  });

  it('cascades for standalone items (items + assets + payloads)', async () => {
    const w = await freshWriter();
    await w.writeItem({
      ctx,
      itemPath: 'user/01HX/item.json',
      mode: 'create',
      item: mkItem({ id: 'x' }),
    });
    await w.writeAsset({
      ctx,
      itemPath: 'user/01HX/item.json',
      assetHref: './track.geojson',
      body: '{"type":"FeatureCollection","features":[]}',
      mediaType: 'application/geo+json',
      assetEntry: { key: 'data' },
    });
    await w.deleteItem({ ctx, itemPath: 'user/01HX/item.json' });
    expect(await w.readStoredItem('user/01HX/item.json')).toBeNull();
    expect(await w.readPayload('user/01HX/item.json')).toBeNull();
  });
});
