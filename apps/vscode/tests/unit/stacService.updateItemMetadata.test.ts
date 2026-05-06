/**
 * StacService.updateItemMetadata — service-side write path for the Properties
 * Panel feature (#191/#193).
 *
 * Covers tasks T024 (happy path), T025 (empty patch), T026 (stale mtime),
 * T028 (read-only filesystem).
 *
 * These tests use real filesystem fixtures under os.tmpdir() because the
 * implementation's atomic semantics, mtime check, and permission handling all
 * depend on real fs behaviour.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Vitest holds fs exports non-configurable via its ESM bridge. Make the
// selected methods we need to override into mutable slots so tests can swap
// them during a single test. Forward everything else to the real module.
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    default: actual,
  };
});
import {
  StacService,
  StaleItemJsonError,
  ReadOnlyFilesystemError,
} from '../../src/services/stacService';
import {
  PROPERTIES_PANEL_TOOL_SENTINEL,
  isValidPropertiesProvenanceEntry,
} from '@debrief/components/PropertiesPanel/provenanceTypes';
import type { StacItem } from '../../src/types/stac';

function makeItem(overrides: Partial<StacItem['properties']> = {}): StacItem {
  return {
    type: 'Feature',
    stac_version: '1.0.0',
    id: 'test-item',
    geometry: null as unknown as GeoJSON.Geometry,
    bbox: [-10, -20, 30, 40],
    properties: {
      datetime: '2024-06-15T12:00:00Z',
      title: 'Test Item',
      ...overrides,
    },
    links: [],
    assets: {},
  };
}

function writeItem(itemPath: string, item: StacItem): void {
  fs.mkdirSync(path.dirname(itemPath), { recursive: true });
  fs.writeFileSync(itemPath, JSON.stringify(item, null, 2));
}

describe('StacService.updateItemMetadata', () => {
  let service: StacService;
  let storeDir: string;
  let itemRel: string;
  let itemFull: string;

  beforeEach(() => {
    service = new StacService();
    storeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stac-uim-'));
    itemRel = path.join('items', 'item-1', 'item.json');
    itemFull = path.join(storeDir, itemRel);
    writeItem(itemFull, makeItem());
  });

  afterEach(() => {
    try {
      // Ensure directory is writable before rm (in case a test chmod-locked a file).
      for (const f of fs.readdirSync(path.dirname(itemFull))) {
        try {
          fs.chmodSync(path.join(path.dirname(itemFull), f), 0o644);
        } catch {
          /* ignore */
        }
      }
      fs.rmSync(storeDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('T024: happy path — writes item.json, appends provenance entry, returns result', async () => {
    const result = await service.updateItemMetadata({
      storePath: storeDir,
      itemPath: itemRel,
      patch: { title: 'Renamed Plot' },
      overrideFields: ['title'],
      provenance: {
        tool: PROPERTIES_PANEL_TOOL_SENTINEL,
        fields: ['title'],
      },
      packageVersion: '1.2.3',
    });

    // Return shape.
    expect(result.updatedProperties.title).toBe('Renamed Plot');
    expect(result.overrides).toEqual(['title']);
    expect(typeof result.activityId).toBe('string');
    expect(result.activityId.length).toBeGreaterThan(0);

    // Disk state.
    const onDisk = JSON.parse(fs.readFileSync(itemFull, 'utf-8')) as StacItem;
    expect(onDisk.properties.title).toBe('Renamed Plot');
    expect(onDisk.properties['debrief:overrides']).toEqual(['title']);

    const log = onDisk.properties['debrief:provenance_log'] as unknown[];
    expect(Array.isArray(log)).toBe(true);
    expect(log).toHaveLength(1);
    const entry = log[0];
    expect(isValidPropertiesProvenanceEntry(entry)).toBe(true);

    // Entry detail invariants.
    const e = entry as Record<string, unknown>;
    expect(e.activity_id).toBe(result.activityId);
    expect(e.tool).toBe(PROPERTIES_PANEL_TOOL_SENTINEL);
    expect(e.method).toBe('properties-panel@1.2.3');
    expect(e.source).toBe('user');
    expect(e.fields).toEqual(['title']);
    // timestamp is ISO-8601 parseable.
    expect(Number.isNaN(Date.parse(e.timestamp as string))).toBe(false);
  });

  it('T024: merges with existing overrides (dedup + sort)', async () => {
    writeItem(
      itemFull,
      makeItem({ 'debrief:overrides': ['title'] } as Record<string, unknown>),
    );

    const result = await service.updateItemMetadata({
      storePath: storeDir,
      itemPath: itemRel,
      patch: { description: 'Added later' },
      overrideFields: ['description', 'title'], // dup + unsorted input
      provenance: {
        tool: PROPERTIES_PANEL_TOOL_SENTINEL,
        fields: ['description'],
      },
      packageVersion: '0.0.1',
    });

    expect(result.overrides).toEqual(['description', 'title']); // sorted, deduped
    const onDisk = JSON.parse(fs.readFileSync(itemFull, 'utf-8')) as StacItem;
    expect(onDisk.properties['debrief:overrides']).toEqual([
      'description',
      'title',
    ]);
  });

  it('T025: empty patch is rejected', async () => {
    await expect(
      service.updateItemMetadata({
        storePath: storeDir,
        itemPath: itemRel,
        patch: {},
        overrideFields: [],
        provenance: {
          tool: PROPERTIES_PANEL_TOOL_SENTINEL,
          fields: ['anything'],
        },
        packageVersion: '1.0.0',
      }),
    ).rejects.toThrow(/patch must contain at least one field/);
  });

  it('T026: stale mtime throws StaleItemJsonError and does not write', async () => {
    // Simulate a concurrent external edit: the fingerprint stat (step 1)
    // must report an older mtime than the re-stat (step 8). We override
    // `statSync` so that on the FIRST call against item.json it returns a
    // proxied Stats whose mtimeMs is artificially old; subsequent calls
    // return the real (current) mtime.
    const realStatSync = fs.statSync;
    const realReadFileSync = fs.readFileSync;
    const before = realReadFileSync(itemFull, 'utf-8') as string;

    let statCalls = 0;
    const wrappedStat = ((p: fs.PathLike, opts?: fs.StatSyncOptions) => {
      const s = realStatSync(p, opts as never) as fs.Stats;
      if (String(p) === itemFull) {
        statCalls += 1;
        if (statCalls === 1) {
          return new Proxy(s, {
            get(target, prop, receiver) {
              if (prop === 'mtimeMs') {return (target.mtimeMs as number) - 1000;}
              return Reflect.get(target, prop, receiver) as unknown;
            },
          });
        }
      }
      return s;
    }) as typeof fs.statSync;
    (fs as unknown as { statSync: typeof fs.statSync }).statSync = wrappedStat;

    try {
      await expect(
        service.updateItemMetadata({
          storePath: storeDir,
          itemPath: itemRel,
          patch: { title: 'Will not land' },
          overrideFields: ['title'],
          provenance: {
            tool: PROPERTIES_PANEL_TOOL_SENTINEL,
            fields: ['title'],
          },
          packageVersion: '1.0.0',
        }),
      ).rejects.toBeInstanceOf(StaleItemJsonError);
    } finally {
      (fs as unknown as { statSync: typeof fs.statSync }).statSync = realStatSync;
    }

    const after = realReadFileSync(itemFull, 'utf-8') as string;
    expect(after).toBe(before);
  });

  it('T028: read-only filesystem throws ReadOnlyFilesystemError', async () => {
    // Force the atomic temp-write to fail with EACCES. We can't rely on
    // `chmod 0o555` of the parent directory because privileged runners
    // (root, CAP_DAC_OVERRIDE) bypass DAC permission checks and write
    // anyway — see #594. Mocking the underlying syscall is portable and
    // exercises the same `isReadOnlyFsError` branch.
    const realWriteFileSync = fs.writeFileSync;
    const wrappedWriteFileSync = ((p: fs.PathOrFileDescriptor, ...rest: unknown[]) => {
      // Only intercept the temp file the service writes next to item.json;
      // everything else (e.g. test fixtures) keeps real semantics.
      if (typeof p === 'string' && p.startsWith(`${itemFull}.`) && p.endsWith('.tmp')) {
        const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      }
      return (realWriteFileSync as (...args: unknown[]) => void)(p, ...rest);
    }) as typeof fs.writeFileSync;
    (fs as unknown as { writeFileSync: typeof fs.writeFileSync }).writeFileSync =
      wrappedWriteFileSync;

    try {
      await expect(
        service.updateItemMetadata({
          storePath: storeDir,
          itemPath: itemRel,
          patch: { title: 'Denied' },
          overrideFields: ['title'],
          provenance: {
            tool: PROPERTIES_PANEL_TOOL_SENTINEL,
            fields: ['title'],
          },
          packageVersion: '1.0.0',
        }),
      ).rejects.toBeInstanceOf(ReadOnlyFilesystemError);
    } finally {
      (fs as unknown as { writeFileSync: typeof fs.writeFileSync }).writeFileSync =
        realWriteFileSync;
    }
  });
});
