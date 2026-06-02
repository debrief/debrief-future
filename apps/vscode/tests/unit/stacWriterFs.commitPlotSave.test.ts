/**
 * @vitest-environment node
 *
 * FS `commitPlotSave` atomicity tests (#268, US1 — contract C1/C2).
 *
 * Drives the real fs adaptor against a temp dir and injects a failure at each
 * distinct phase of the four-phase commit (stage → journal → apply). Asserts:
 *   - pre-commit failure (stage / journal) → originals byte-identical, no stray
 *     `.tmp`, no journal (C1 / FR-001 / FR-010);
 *   - success → features.geojson + item.json (thumbnail asset entries) + both
 *     PNGs all reflect the new state (C2 / FR-002);
 *   - apply-phase failure (post-commit) → the journal REMAINS so the next open
 *     can roll forward (the reconcile half is proven in stacWriterFs.reconcile).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Make fs exports assignable so we can swap writeFileSync / renameSync to throw.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return { ...actual, default: actual };
});

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { StacWriterError } from '@debrief/stac-writer';
import type {
  RawGeoJSONFeatureCollection,
  StoreContext,
} from '@debrief/stac-writer';
import { createStacWriterFs } from '../../src/services/stacWriterFs';
import { StacService } from '../../src/services/stacService';
import { SAVE_JOURNAL_FILENAME } from '../../src/services/saveJournal';

const ITEM_REL = 'core--boat1/item.json';
// 1x1 transparent PNGs — distinct bytes for large vs small so we can assert.
const SMALL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const LARGE_PNG = Buffer.concat([SMALL_PNG, Buffer.from('LARGE')]);

const ctx: StoreContext = {
  kind: 'fs',
  nowMs: () => 1_700_000_000_000,
  randomId: () => 'test-id',
};

function newFc(label: string): RawGeoJSONFeatureCollection {
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

function originalItem(): Record<string, unknown> {
  return {
    type: 'Feature',
    stac_version: '1.1.0',
    id: 'boat1',
    geometry: { type: 'Point', coordinates: [0, 0] },
    bbox: [0, 0, 0, 0],
    properties: { datetime: '2024-01-01T00:00:00Z', title: 'Boat 1' },
    links: [{ rel: 'self', href: './item.json' }],
    assets: { data: { href: './features.geojson', type: 'application/geo+json', roles: ['data'] } },
  };
}

describe('stacWriterFs.commitPlotSave (#268 US1)', () => {
  let storePath: string;
  let itemDir: string;
  let itemJson: string;
  let featuresPath: string;
  let realWriteFileSync: typeof fs.writeFileSync;
  let realRenameSync: typeof fs.renameSync;

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-commit-'));
    itemDir = path.join(storePath, 'core--boat1');
    fs.mkdirSync(itemDir, { recursive: true });
    itemJson = path.join(itemDir, 'item.json');
    featuresPath = path.join(itemDir, 'features.geojson');
    fs.writeFileSync(itemJson, `${JSON.stringify(originalItem(), null, 2)}\n`);
    fs.writeFileSync(featuresPath, `${JSON.stringify(newFc('original'), null, 2)}\n`);
    realWriteFileSync = fs.writeFileSync;
    realRenameSync = fs.renameSync;
  });

  afterEach(() => {
    (fs as { writeFileSync: typeof fs.writeFileSync }).writeFileSync = realWriteFileSync;
    (fs as { renameSync: typeof fs.renameSync }).renameSync = realRenameSync;
    vi.restoreAllMocks();
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  function writer() {
    return createStacWriterFs({ storePath, stacService: new StacService() });
  }

  function leftoverTemps(): string[] {
    return fs.readdirSync(itemDir).filter((f) => f.endsWith('.tmp'));
  }

  function hasJournal(): boolean {
    return fs.existsSync(path.join(itemDir, SAVE_JOURNAL_FILENAME));
  }

  it('C2 — success without thumbnails writes only features.geojson, no leftovers', async () => {
    const result = await writer().commitPlotSave({
      ctx,
      stacItemPath: ITEM_REL,
      featureCollection: newFc('v2'),
    });

    const written = JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as RawGeoJSONFeatureCollection;
    expect(written.features[0]?.properties).toMatchObject({ name: 'v2' });
    expect(result.featuresPath).toBe('core--boat1/features.geojson');
    expect(result.thumbnailPath).toBeNull();
    expect(result.overviewPath).toBeNull();
    // item.json untouched when no thumbnails.
    expect(JSON.parse(fs.readFileSync(itemJson, 'utf8'))).toMatchObject({ id: 'boat1' });
    expect(leftoverTemps()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('C2 — success with thumbnails commits FC + PNGs + item.json asset entries', async () => {
    const result = await writer().commitPlotSave({
      ctx,
      stacItemPath: ITEM_REL,
      featureCollection: newFc('v2'),
      thumbnails: {
        smallPngBase64: SMALL_PNG.toString('base64'),
        largePngBase64: LARGE_PNG.toString('base64'),
      },
    });

    expect((JSON.parse(fs.readFileSync(featuresPath, 'utf8')) as RawGeoJSONFeatureCollection).features[0]?.properties).toMatchObject({ name: 'v2' });
    expect(fs.readFileSync(path.join(itemDir, 'thumbnail.png')).equals(SMALL_PNG)).toBe(true);
    expect(fs.readFileSync(path.join(itemDir, 'overview.png')).equals(LARGE_PNG)).toBe(true);

    const item = JSON.parse(fs.readFileSync(itemJson, 'utf8')) as { assets: Record<string, { href: string; 'file:size'?: number }> };
    expect(item.assets.thumbnail?.href).toBe('./thumbnail.png');
    expect(item.assets.overview?.href).toBe('./overview.png');
    expect(item.assets.thumbnail?.['file:size']).toBe(SMALL_PNG.byteLength);

    expect(result.thumbnailPath).toBe('core--boat1/thumbnail.png');
    expect(result.overviewPath).toBe('core--boat1/overview.png');
    expect(leftoverTemps()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('C1 — stage failure rolls back: originals byte-identical, no temps, no journal', async () => {
    const itemBefore = fs.readFileSync(itemJson);
    const fcBefore = fs.readFileSync(featuresPath);

    // Throw while staging the features.geojson temp (pre-commit).
    (fs as { writeFileSync: typeof fs.writeFileSync }).writeFileSync = ((
      target: fs.PathOrFileDescriptor,
      data: string | NodeJS.ArrayBufferView,
      opts?: fs.WriteFileOptions,
    ) => {
      if (String(target).includes('features.geojson.') && String(target).endsWith('.tmp')) {
        throw Object.assign(new Error('synthetic stage failure'), { code: 'ENOSPC' });
      }
      return realWriteFileSync(target, data, opts);
    }) as typeof fs.writeFileSync;

    await expect(
      writer().commitPlotSave({ ctx, stacItemPath: ITEM_REL, featureCollection: newFc('v2') }),
    ).rejects.toBeInstanceOf(StacWriterError);

    expect(fs.readFileSync(itemJson).equals(itemBefore)).toBe(true);
    expect(fs.readFileSync(featuresPath).equals(fcBefore)).toBe(true);
    expect(leftoverTemps()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('C1 — journal-write failure rolls back: originals intact, no temps, no journal', async () => {
    const itemBefore = fs.readFileSync(itemJson);
    const fcBefore = fs.readFileSync(featuresPath);

    // Let staging succeed; throw when renaming the journal temp into place
    // (the commit point). Originals are still untouched at this instant.
    (fs as { renameSync: typeof fs.renameSync }).renameSync = ((
      from: fs.PathLike,
      to: fs.PathLike,
    ) => {
      if (String(to).endsWith(SAVE_JOURNAL_FILENAME)) {
        throw Object.assign(new Error('synthetic journal failure'), { code: 'EROFS' });
      }
      return realRenameSync(from, to);
    }) as typeof fs.renameSync;

    await expect(
      writer().commitPlotSave({
        ctx,
        stacItemPath: ITEM_REL,
        featureCollection: newFc('v2'),
        thumbnails: { smallPngBase64: SMALL_PNG.toString('base64'), largePngBase64: LARGE_PNG.toString('base64') },
      }),
    ).rejects.toBeInstanceOf(StacWriterError);

    expect(fs.readFileSync(itemJson).equals(itemBefore)).toBe(true);
    expect(fs.readFileSync(featuresPath).equals(fcBefore)).toBe(true);
    expect(fs.existsSync(path.join(itemDir, 'thumbnail.png'))).toBe(false);
    expect(leftoverTemps()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('apply-phase failure leaves the journal in place for roll-forward on open', async () => {
    // Let staging + journal succeed; throw on the item.json apply rename
    // (post-commit). The journal must remain so reconcile can complete it.
    (fs as { renameSync: typeof fs.renameSync }).renameSync = ((
      from: fs.PathLike,
      to: fs.PathLike,
    ) => {
      if (String(to).endsWith('item.json')) {
        throw Object.assign(new Error('synthetic apply failure'), { code: 'EIO' });
      }
      return realRenameSync(from, to);
    }) as typeof fs.renameSync;

    await expect(
      writer().commitPlotSave({
        ctx,
        stacItemPath: ITEM_REL,
        featureCollection: newFc('v2'),
        thumbnails: { smallPngBase64: SMALL_PNG.toString('base64'), largePngBase64: LARGE_PNG.toString('base64') },
      }),
    ).rejects.toBeInstanceOf(StacWriterError);

    // The commit point was reached: a journal remains, listing the pending
    // renames, so the next open rolls forward rather than reading a partial.
    expect(hasJournal()).toBe(true);
  });
});
