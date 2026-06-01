/**
 * @vitest-environment node
 *
 * Open-path reconcile integration (#268 US3). Seeds an "interrupted save"
 * fixture (staged temps + journal) in a real store, runs the open-path
 * reconcile hook with a REAL `stacWriterFs`, and asserts the plot is healed to
 * a single coherent state before the read and that the recovery notice fires
 * exactly once. Also asserts a clean plot opens silently.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { reconcileBeforeOpen } from '../../src/commands/reconcileOnOpen';
import { createStacWriterFs } from '../../src/services/stacWriterFs';
import { StacService } from '../../src/services/stacService';
import {
  SAVE_JOURNAL_FILENAME,
  SAVE_JOURNAL_VERSION,
  type SaveJournal,
} from '../../src/services/saveJournal';

const ITEM_REL = 'core--boat1/item.json';
const TOKEN = '0011223344556677';

describe('reconcileBeforeOpen — open-path integration (#268 US3)', () => {
  let storePath: string;
  let itemDir: string;
  let itemJson: string;
  let featuresPath: string;

  beforeEach(() => {
    storePath = fs.mkdtempSync(path.join(os.tmpdir(), 'debrief-openrec-'));
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

  const getStacWriter = (sp: string) => createStacWriterFs({ storePath: sp, stacService: new StacService() });

  it('rolls a committed-but-unapplied save forward and notifies once', async () => {
    // Interrupted AFTER the commit point: staged temps + journal present.
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${TOKEN}.tmp`), 'FC_V2\n');
    fs.writeFileSync(path.join(itemDir, `item.json.save-${TOKEN}.tmp`), 'ITEM_V2\n');
    const journal: SaveJournal = {
      version: SAVE_JOURNAL_VERSION,
      stacItemPath: ITEM_REL,
      createdAtMs: 1_700_000_000_000,
      renames: [
        { temp: `features.geojson.save-${TOKEN}.tmp`, final: 'features.geojson' },
        { temp: `item.json.save-${TOKEN}.tmp`, final: 'item.json' },
      ],
    };
    fs.writeFileSync(path.join(itemDir, SAVE_JOURNAL_FILENAME), `${JSON.stringify(journal)}\n`);

    const showWarning = vi.fn();
    const result = await reconcileBeforeOpen(getStacWriter, storePath, ITEM_REL, showWarning);

    expect(result?.outcome).toBe('rolled-forward');
    // The read that follows in openPlot will now see the coherent new version.
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V2\n');
    expect(fs.readFileSync(itemJson, 'utf8')).toBe('ITEM_V2\n');
    expect(fs.readdirSync(itemDir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    expect(fs.existsSync(path.join(itemDir, SAVE_JOURNAL_FILENAME))).toBe(false);
    expect(showWarning).toHaveBeenCalledTimes(1);
    expect(showWarning.mock.calls[0]?.[0]).toMatch(/Recovered an interrupted save/);
  });

  it('restores the last-good version when interrupted before the commit point', async () => {
    // Staged temps but NO journal → pre-commit → roll back to last-good.
    fs.writeFileSync(path.join(itemDir, `features.geojson.save-${TOKEN}.tmp`), 'FC_V2\n');

    const showWarning = vi.fn();
    const result = await reconcileBeforeOpen(getStacWriter, storePath, ITEM_REL, showWarning);

    expect(result?.outcome).toBe('rolled-back');
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V1\n'); // last-good
    expect(fs.readdirSync(itemDir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
    expect(showWarning).toHaveBeenCalledTimes(1);
  });

  it('opens a clean plot silently (no notice, no mutation)', async () => {
    const showWarning = vi.fn();
    const result = await reconcileBeforeOpen(getStacWriter, storePath, ITEM_REL, showWarning);

    expect(result).toEqual({ recovered: false, outcome: 'clean' });
    expect(showWarning).not.toHaveBeenCalled();
    expect(fs.readFileSync(featuresPath, 'utf8')).toBe('FC_V1\n');
  });

  it('is a no-op when no writer factory is provided', async () => {
    const showWarning = vi.fn();
    const result = await reconcileBeforeOpen(undefined, storePath, ITEM_REL, showWarning);
    expect(result).toBeNull();
    expect(showWarning).not.toHaveBeenCalled();
  });
});
