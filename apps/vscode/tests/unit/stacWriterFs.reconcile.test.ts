/**
 * @vitest-environment node
 *
 * FS `reconcilePlotSave` tests (#268, US3 — contracts C3/C5, SC-002).
 *
 * Seeds each mid-save leftover condition in a temp dir and asserts reconcile
 * resolves it to a single coherent state, leaving no `.tmp` / journal behind:
 *   - temps but NO journal     → rolled-back   (pre-commit; originals kept)
 *   - journal + pending renames → rolled-forward (post-commit; new version)
 *   - clean                     → clean         (no-op; idempotent)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import type { StoreContext } from '@debrief/stac-writer';
import { createStacWriterFs } from '../../src/services/stacWriterFs';
import { StacService } from '../../src/services/stacService';
import {
  SAVE_JOURNAL_FILENAME,
  SAVE_JOURNAL_VERSION,
  type SaveJournal,
} from '../../src/services/saveJournal';

const ITEM_REL = 'core--boat1/item.json';
const tmpTag = 'abcdef0123456789';

const ctx: StoreContext = {
  kind: 'fs',
  nowMs: () => 1_700_000_000_000,
  randomId: () => 'test-id',
};

describe('stacWriterFs.reconcilePlotSave (#268 US3)', () => {
  let storePath: string;
  let itemDir: string;
  let itemJson: string;
  let featuresPath: string;

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-reconcile-'));
    itemDir = path.join(storePath, 'core--boat1');
    fs.mkdirSync(itemDir, { recursive: true });
    itemJson = path.join(itemDir, 'item.json');
    featuresPath = path.join(itemDir, 'features.geojson');
    fs.writeFileSync(itemJson, 'ITEM_V1\n');
    fs.writeFileSync(featuresPath, 'FC_V1\n');
  });

  afterEach(() => {
    fs.rmSync(storePath, { recursive: true, force: true });
  });

  function writer() {
    return createStacWriterFs({ storePath, stacService: new StacService() });
  }

  function tempsLeft(): string[] {
    return fs.readdirSync(itemDir).filter((f) => f.endsWith('.tmp'));
  }
  function hasJournal(): boolean {
    return fs.existsSync(path.join(itemDir, SAVE_JOURNAL_FILENAME));
  }
  function writeJournal(renames: ReadonlyArray<{ temp: string; final: string }>): void {
    const journal: SaveJournal = {
      version: SAVE_JOURNAL_VERSION,
      stacItemPath: ITEM_REL,
      createdAtMs: ctx.nowMs(),
      renames,
    };
    fs.writeFileSync(path.join(itemDir, SAVE_JOURNAL_FILENAME), `${JSON.stringify(journal, null, 2)}\n`);
  }

  it('clean store → { recovered: false, outcome: "clean" } and mutates nothing', async () => {
    const result = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });
    expect(result).toEqual({ recovered: false, outcome: 'clean' });
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V1\n');
    expect(fs.readFileSync(itemJson, 'utf8')).toBe('ITEM_V1\n');
    expect(tempsLeft()).toEqual([]);
  });

  it('stray temps but NO journal → rolled-back: originals kept, temps removed', async () => {
    // Interrupted BEFORE the commit point: staged temps exist, no journal.
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${tmpTag}.tmp`), 'FC_V2\n');
    fs.writeFileSync(path.join(itemDir, `item.json.save-${tmpTag}.tmp`), 'ITEM_V2\n');

    const result = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });

    expect(result).toEqual({ recovered: true, outcome: 'rolled-back' });
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V1\n'); // last-good kept
    expect(fs.readFileSync(itemJson, 'utf8')).toBe('ITEM_V1\n');
    expect(tempsLeft()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('journal + pending renames → rolled-forward: new version applied, journal gone', async () => {
    // Interrupted AFTER the commit point: temps staged + journal present.
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${tmpTag}.tmp`), 'FC_V2\n');
    fs.writeFileSync(path.join(itemDir, `item.json.save-${tmpTag}.tmp`), 'ITEM_V2\n');
    writeJournal([
      { temp: `features.geojson.save-${tmpTag}.tmp`, final: 'features.geojson' },
      { temp: `item.json.save-${tmpTag}.tmp`, final: 'item.json' },
    ]);

    const result = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });

    expect(result).toEqual({ recovered: true, outcome: 'rolled-forward' });
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V2\n'); // new version
    expect(fs.readFileSync(itemJson, 'utf8')).toBe('ITEM_V2\n');
    expect(tempsLeft()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('roll-forward is idempotent when some renames already applied', async () => {
    // features temp already consumed (rename happened), item temp still pending.
    fs.writeFileSync(featuresPath, 'FC_V2\n'); // features already applied
    fs.writeFileSync(path.join(itemDir, `item.json.save-${tmpTag}.tmp`), 'ITEM_V2\n');
    writeJournal([
      { temp: `features.geojson.save-${tmpTag}.tmp`, final: 'features.geojson' }, // temp missing
      { temp: `item.json.save-${tmpTag}.tmp`, final: 'item.json' },
    ]);

    const result = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });

    expect(result).toEqual({ recovered: true, outcome: 'rolled-forward' });
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V2\n');
    expect(fs.readFileSync(itemJson, 'utf8')).toBe('ITEM_V2\n');
    expect(tempsLeft()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });

  it('a second reconcile after a roll-forward is a clean no-op (idempotent)', async () => {
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${tmpTag}.tmp`), 'FC_V2\n');
    writeJournal([{ temp: `features.geojson.save-${tmpTag}.tmp`, final: 'features.geojson' }]);

    const first = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });
    expect(first.outcome).toBe('rolled-forward');

    const second = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });
    expect(second).toEqual({ recovered: false, outcome: 'clean' });
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V2\n');
  });

  it('a malformed journal is treated as no usable journal → rolled-back, leftovers cleared', async () => {
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${tmpTag}.tmp`), 'FC_V2\n');
    fs.writeFileSync(path.join(itemDir, SAVE_JOURNAL_FILENAME), '{ not valid json');

    const result = await writer().reconcilePlotSave({ ctx, stacItemPath: ITEM_REL });

    expect(result.recovered).toBe(true);
    expect(result.outcome).toBe('rolled-back');
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V1\n'); // originals kept
    expect(tempsLeft()).toEqual([]);
    expect(hasJournal()).toBe(false);
  });
});
