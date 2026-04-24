/**
 * StacService.updateItemMetadata — atomic write invariants.
 *
 * Covers task T029: if the temp write succeeds but the rename step throws,
 * the original item.json must be left intact and the temp must be cleaned up.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Make fs exports assignable so the test can swap renameSync mid-suite.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: actual,
  };
});
import { StacService } from '../../src/services/stacService';
import { PROPERTIES_PANEL_TOOL_SENTINEL } from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { StacItem } from '../../src/types/stac';

function makeItem(): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-10, -20, 30, 40],
    properties: {
      datetime: '2024-06-15T12:00:00Z',
      title: 'Original Title',
    },
    links: [],
    assets: {},
  };
}

describe('StacService.updateItemMetadata atomic write', () => {
  let service: StacService;
  let storeDir: string;
  let itemRel: string;
  let itemFull: string;

  beforeEach(() => {
    service = new StacService();
    storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stac-uim-atomic-'));
    itemRel = path.join('items', 'item-1', 'item.json');
    itemFull = path.join(storeDir, itemRel);
    fs.mkdirSync(path.dirname(itemFull), { recursive: true });
    fs.writeFileSync(itemFull, JSON.stringify(makeItem(), null, 2));
  });

  afterEach(() => {
    try {
      fs.rmSync(storeDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('T029: if rename throws, original item.json is intact and temp is cleaned up', async () => {
    const originalPayload = fs.readFileSync(itemFull, 'utf-8');

    // Patch fs.renameSync to throw when writing item.json — simulates a
    // mid-operation crash after the temp has been written.
    const realRename = fs.renameSync;
    const fakeRename = ((from: fs.PathLike, to: fs.PathLike) => {
      if (String(to) === itemFull) {
        throw new Error('synthetic rename failure');
      }
      return realRename(from, to);
    }) as unknown as typeof fs.renameSync;
    (fs as unknown as { renameSync: typeof fs.renameSync }).renameSync = fakeRename;

    try {
      await expect(
        service.updateItemMetadata({
          storePath: storeDir,
          itemPath: itemRel,
          patch: { title: 'New Title' },
          overrideFields: ['title'],
          provenance: {
            tool: PROPERTIES_PANEL_TOOL_SENTINEL,
            fields: ['title'],
          },
          packageVersion: '1.0.0',
        }),
      ).rejects.toThrow(/synthetic rename failure/);
    } finally {
      (fs as unknown as { renameSync: typeof fs.renameSync }).renameSync = realRename;
    }

    // Original intact.
    expect(fs.readFileSync(itemFull, 'utf-8')).toBe(originalPayload);

    // No lingering .tmp files in the item directory.
    const leftover = fs
      .readdirSync(path.dirname(itemFull))
      .filter((f) => f.endsWith('.tmp'));
    expect(leftover).toEqual([]);
  });
});
