/**
 * Unit test for the web-shell `stacWriterIdb.writePlotThumbnailPair()` stub
 * (Feature 242). Plot thumbnail captures originate from the VS Code MapPanel
 * and have no web-shell call-path; the IndexedDB adaptor therefore declares
 * the operation explicitly unsupported rather than silently no-oping.
 */

import 'fake-indexeddb/auto';
import { describe, expect, it, afterEach } from 'vitest';
import { StacWriterError } from '@debrief/stac-writer';
import { createStacWriterIdb, type StacWriterIdb } from '../stacWriterIdb';
import { WRITER_DB_NAME } from '../stacWriterCapability';

const ctx = {
  kind: 'idb' as const,
  nowMs: () => 1_730_000_000_000,
  randomId: () => 'test',
};

let writer: StacWriterIdb | null = null;

async function freshWriter(): Promise<StacWriterIdb> {
  if (writer !== null) {
    try {
      await writer.close();
    } catch {
      // ignore
    }
    writer = null;
  }
  await new Promise<void>((resolve) => {
    const req = globalThis.indexedDB.deleteDatabase(WRITER_DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
  writer = await createStacWriterIdb({
    broadcastChannelCtor: null,
    fetchBundledItem: async () => null,
  });
  return writer;
}

afterEach(async () => {
  if (writer !== null) {
    try {
      await writer.close();
    } catch {
      // ignore
    }
    writer = null;
  }
});

describe('stacWriterIdb.writePlotThumbnailPair', () => {
  it("rejects with StacWriterError(kind='validation-failed')", async () => {
    const w = await freshWriter();
    await expect(
      w.writePlotThumbnailPair({
        ctx,
        stacItemPath: 'core--boat1/item.json',
        smallPngBase64: 'AAAA',
        largePngBase64: 'BBBB',
      }),
    ).rejects.toBeInstanceOf(StacWriterError);
    await expect(
      w.writePlotThumbnailPair({
        ctx,
        stacItemPath: 'core--boat1/item.json',
        smallPngBase64: 'AAAA',
        largePngBase64: 'BBBB',
      }),
    ).rejects.toMatchObject({
      kind: 'validation-failed',
      message: expect.stringContaining('not supported in the web-shell host'),
    });
  });
});
