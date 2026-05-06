/**
 * @vitest-environment node
 *
 * Unit tests for `stacWriterFs.writePlotThumbnailPair()` (Feature 242).
 *
 * Mirrors the behaviour previously owned by the deleted
 * `plotThumbnailWriter.ts` shim, with two additional invariants:
 *   - PNG writes go through the adaptor's `atomicWriteSync` helper
 *   - errors surface as `StacWriterError` with the documented `kind` taxonomy
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { StacWriterError } from '@debrief/stac-writer';
import { createStacWriterFs } from '../../src/services/stacWriterFs';
import type { StacService } from '../../src/services/stacService';

// `writePlotThumbnailPair` does not touch stacService, so the harness can
// pass an empty object as the dependency surface.
const stubStacService = {} as unknown as StacService;

const ctx = {
  kind: 'fs' as const,
  nowMs: () => 1_730_000_000_000,
  randomId: () => 'test',
};

function makePngBuffer(label: string): Buffer {
  // Real PNG signatures aren't required for the writer; we just need
  // non-empty deterministic bytes whose checksum we can predict.
  return Buffer.from(`PNG-${label}-${'x'.repeat(16)}`, 'utf8');
}

function multihashSha256Hex(buf: Buffer): string {
  return `1220${crypto.createHash('sha256').update(buf).digest('hex')}`;
}

describe('stacWriterFs.writePlotThumbnailPair', () => {
  let storePath: string;
  const itemSubpath = 'core--boat1/item.json';

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-stacwriter-'));
    fs.mkdirSync(path.join(storePath, 'core--boat1'), { recursive: true });
    fs.writeFileSync(
      path.join(storePath, itemSubpath),
      JSON.stringify(
        {
          id: 'core--boat1',
          type: 'Feature',
          properties: { created: '2026-01-01T00:00:00.000Z' },
          assets: { 'thumbnail-sm': { href: './legacy.png' } },
        },
        null,
        2,
      ),
    );
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  it('writes PNGs and a spec-241-shaped item.json (happy path)', async () => {
    const writer = createStacWriterFs({ storePath, stacService: stubStacService });
    const small = makePngBuffer('small');
    const large = makePngBuffer('large');

    const result = await writer.writePlotThumbnailPair({
      ctx,
      stacItemPath: itemSubpath,
      smallPngBase64: small.toString('base64'),
      largePngBase64: large.toString('base64'),
    });

    expect(result.thumbnailPath).toBe(path.join('core--boat1', 'thumbnail.png'));
    expect(result.overviewPath).toBe(path.join('core--boat1', 'overview.png'));

    const writtenSmall = fs.readFileSync(
      path.join(storePath, 'core--boat1', 'thumbnail.png'),
    );
    const writtenLarge = fs.readFileSync(
      path.join(storePath, 'core--boat1', 'overview.png'),
    );
    expect(writtenSmall.equals(small)).toBe(true);
    expect(writtenLarge.equals(large)).toBe(true);

    const item = JSON.parse(
      fs.readFileSync(path.join(storePath, itemSubpath), 'utf8'),
    ) as {
      assets: Record<string, Record<string, unknown>>;
      properties: Record<string, unknown>;
    };
    expect(item.assets['thumbnail-sm']).toBeUndefined();
    expect(item.assets['thumbnail']).toMatchObject({
      href: './thumbnail.png',
      type: 'image/png',
      title: 'Plot thumbnail (200x150)',
      roles: ['thumbnail'],
      'proj:shape': [150, 200],
      'file:size': small.byteLength,
      'file:checksum': multihashSha256Hex(small),
    });
    expect(item.assets['overview']).toMatchObject({
      href: './overview.png',
      type: 'image/png',
      title: 'Plot overview (800x600)',
      roles: ['overview'],
      'proj:shape': [600, 800],
      'file:size': large.byteLength,
      'file:checksum': multihashSha256Hex(large),
    });
    expect(item.properties['created']).toBe('2026-01-01T00:00:00.000Z'); // preserved
    expect(typeof item.properties['updated']).toBe('string');
    expect(item.properties['updated']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/,
    );
  });

  it("throws StacWriterError('empty-png') when smallPngBase64 decodes to zero bytes", async () => {
    const writer = createStacWriterFs({ storePath, stacService: stubStacService });
    await expect(
      writer.writePlotThumbnailPair({
        ctx,
        stacItemPath: itemSubpath,
        smallPngBase64: '',
        largePngBase64: makePngBuffer('large').toString('base64'),
      }),
    ).rejects.toMatchObject({
      name: 'StacWriterError',
      kind: 'empty-png',
    });
  });

  it("throws StacWriterError('empty-png') when largePngBase64 decodes to zero bytes", async () => {
    const writer = createStacWriterFs({ storePath, stacService: stubStacService });
    await expect(
      writer.writePlotThumbnailPair({
        ctx,
        stacItemPath: itemSubpath,
        smallPngBase64: makePngBuffer('small').toString('base64'),
        largePngBase64: '',
      }),
    ).rejects.toMatchObject({
      name: 'StacWriterError',
      kind: 'empty-png',
    });
  });

  it("throws StacWriterError('stac-item-not-found') when item.json is missing", async () => {
    const writer = createStacWriterFs({ storePath, stacService: stubStacService });
    await expect(
      writer.writePlotThumbnailPair({
        ctx,
        stacItemPath: 'no-such-item/item.json',
        smallPngBase64: makePngBuffer('small').toString('base64'),
        largePngBase64: makePngBuffer('large').toString('base64'),
      }),
    ).rejects.toBeInstanceOf(StacWriterError);
    await expect(
      writer.writePlotThumbnailPair({
        ctx,
        stacItemPath: 'no-such-item/item.json',
        smallPngBase64: makePngBuffer('small').toString('base64'),
        largePngBase64: makePngBuffer('large').toString('base64'),
      }),
    ).rejects.toMatchObject({ kind: 'stac-item-not-found' });
  });

  it("throws StacWriterError('item-json-malformed') on corrupt item.json", async () => {
    fs.writeFileSync(path.join(storePath, itemSubpath), '{ not valid json');
    const writer = createStacWriterFs({ storePath, stacService: stubStacService });
    await expect(
      writer.writePlotThumbnailPair({
        ctx,
        stacItemPath: itemSubpath,
        smallPngBase64: makePngBuffer('small').toString('base64'),
        largePngBase64: makePngBuffer('large').toString('base64'),
      }),
    ).rejects.toMatchObject({
      name: 'StacWriterError',
      kind: 'item-json-malformed',
    });
  });
});
