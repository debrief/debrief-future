/**
 * Snapshot Service integration test — real filesystem, no mocks.
 * Feature: 074-snapshots (E02, Phase 4)
 *
 * Exercises the full flow: create snapshot → verify files on disk →
 * detect boundary → load entries → create second snapshot → verify chain →
 * assemble cross-snapshot timeline.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createSnapshotService } from '../../src/log/snapshotService.js';
import type {
  SnapshotServiceDeps,
  GeoJsonFeatureCollection,
} from '../../src/log/types.js';

// ── Filesystem-backed SnapshotServiceDeps ──────────────────────────────

/**
 * Minimal STAC item.json structure (matches what stacService expects).
 */
interface MinimalStacItem {
  type: 'Feature';
  stac_version: string;
  id: string;
  geometry: { type: 'Point'; coordinates: number[] };
  bbox: [number, number, number, number];
  properties: { datetime: string };
  links: Array<{ rel: string; href: string }>;
  assets: Record<string, {
    href: string;
    type: string;
    title?: string;
    roles?: string[];
    [key: string]: unknown;
  }>;
}

/**
 * Create real filesystem-backed deps that mirror stacService behaviour.
 * storePath + itemPath → full path to item.json.
 * GeoJSON is the first asset with type application/geo+json.
 */
function createFilesystemDeps(): SnapshotServiceDeps & { dirtyCount: number } {
  let dirtyCount = 0;

  function resolveItemPath(storePath: string, itemPath: string): string {
    return path.join(storePath, itemPath);
  }

  function loadItem(fullItemPath: string): MinimalStacItem | null {
    if (!fs.existsSync(fullItemPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(fullItemPath, 'utf-8')) as MinimalStacItem;
  }

  return {
    get dirtyCount() {
      return dirtyCount;
    },

    async loadGeoJson(
      storePath: string,
      itemPath: string
    ): Promise<GeoJsonFeatureCollection | null> {
      const fullItemPath = resolveItemPath(storePath, itemPath);
      const item = loadItem(fullItemPath);
      if (!item) {
        return null;
      }

      const geoJsonAsset = Object.values(item.assets).find(
        (a) => a.type === 'application/geo+json' || a.href.endsWith('.geojson')
      );
      if (!geoJsonAsset) {
        return null;
      }

      const itemDir = path.dirname(fullItemPath);
      const geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);
      if (!fs.existsSync(geoJsonPath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8')) as GeoJsonFeatureCollection;
    },

    async writeSnapshotAsset(
      storePath: string,
      itemPath: string,
      filename: string,
      data: string
    ): Promise<string> {
      const fullItemPath = resolveItemPath(storePath, itemPath);
      const item = loadItem(fullItemPath);
      if (!item) {
        throw new Error(`Item not found: ${itemPath}`);
      }

      // Create assets directory if needed
      const itemDir = path.dirname(fullItemPath);
      const assetsDir = path.join(itemDir, 'assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      // Write snapshot file
      const destPath = path.join(assetsDir, filename);
      fs.writeFileSync(destPath, data, 'utf-8');

      // Register asset in item.json (mirrors stacService.addResultAsset)
      const key = path.parse(filename).name;
      item.assets[key] = {
        href: `./assets/${filename}`,
        type: 'application/geo+json',
        title: filename,
        roles: ['snapshot'],
      };
      fs.writeFileSync(fullItemPath, JSON.stringify(item, null, 2));

      return destPath;
    },

    async loadSnapshotGeoJson(
      storePath: string,
      itemPath: string,
      assetFilename: string
    ): Promise<GeoJsonFeatureCollection | null> {
      const fullItemPath = resolveItemPath(storePath, itemPath);
      const item = loadItem(fullItemPath);
      if (!item) {
        return null;
      }

      const assetEntry = Object.values(item.assets).find((a) =>
        a.href.endsWith(assetFilename)
      );
      if (!assetEntry) {
        return null;
      }

      const itemDir = path.dirname(fullItemPath);
      const geoJsonPath = path.resolve(itemDir, assetEntry.href);
      if (!fs.existsSync(geoJsonPath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(geoJsonPath, 'utf-8')) as GeoJsonFeatureCollection;
    },

    async writeGeoJson(
      storePath: string,
      itemPath: string,
      featureCollection: GeoJsonFeatureCollection
    ): Promise<void> {
      const fullItemPath = resolveItemPath(storePath, itemPath);
      const item = loadItem(fullItemPath);
      if (!item) {
        throw new Error(`Item not found: ${itemPath}`);
      }

      const geoJsonAsset = Object.values(item.assets).find(
        (a) => a.type === 'application/geo+json' || a.href.endsWith('.geojson')
      );
      if (!geoJsonAsset) {
        throw new Error(`No GeoJSON asset for item: ${itemPath}`);
      }

      const itemDir = path.dirname(fullItemPath);
      const geoJsonPath = path.resolve(itemDir, geoJsonAsset.href);
      fs.writeFileSync(geoJsonPath, JSON.stringify(featureCollection, null, 2));
    },

    markDirty() {
      dirtyCount++;
    },
  };
}

// ── Test Fixtures ──────────────────────────────────────────────────────

/**
 * Build a minimal STAC item.json on disk.
 */
function createStacItem(itemDir: string, itemId: string): void {
  const item: MinimalStacItem = {
    type: 'Feature',
    stac_version: '1.0.0',
    id: itemId,
    geometry: { type: 'Point', coordinates: [0, 0] },
    bbox: [0, 0, 0, 0],
    properties: { datetime: new Date().toISOString() },
    links: [{ rel: 'self', href: `./${itemId}.json` }],
    assets: {
      plot: {
        href: './plot.geojson',
        type: 'application/geo+json',
        title: 'Working plot',
        roles: ['data'],
      },
    },
  };
  fs.writeFileSync(path.join(itemDir, `${itemId}.json`), JSON.stringify(item, null, 2));
}

/**
 * Build a working GeoJSON with spatial features carrying provenance entries.
 */
function createWorkingGeoJson(entryCount: number, featureCount: number = 2): GeoJsonFeatureCollection {
  const features: GeoJsonFeatureCollection['features'] = [];

  for (let fi = 0; fi < featureCount; fi++) {
    const provenance: unknown[] = [];
    for (let ei = 0; ei < entryCount; ei++) {
      provenance.push({
        activityId: `act-${ei + 1}`,
        timestamp: `2026-02-09T10:${String(ei).padStart(2, '0')}:00.000Z`,
        wasGeneratedBy: {
          tool: `tool-${ei + 1}`,
          toolVersion: '1.0.0',
          parameters: {},
        },
        used: [`track-${fi + 1}`],
        generated: [],
        executionDuration: 'PT1S',
        tune: null,
      });
    }

    features.push({
      type: 'Feature',
      id: `track-${fi + 1}`,
      geometry: { type: 'Point', coordinates: [fi, fi] },
      properties: {
        name: `Track ${fi + 1}`,
        featureType: 'track',
        provenance,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('Snapshot Service Integration (real filesystem)', () => {
  let tmpDir: string;
  let storePath: string;
  let itemPath: string;
  let itemDir: string;
  let deps: SnapshotServiceDeps & { dirtyCount: number };

  beforeEach(() => {
    // Create temp directory structure: store/items/plot-001/
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-integ-'));
    storePath = tmpDir;
    itemPath = 'items/plot-001/plot-001.json';
    itemDir = path.join(storePath, 'items', 'plot-001');
    fs.mkdirSync(itemDir, { recursive: true });

    // Create STAC item
    createStacItem(itemDir, 'plot-001');

    deps = createFilesystemDeps();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // ── US1: Create a Snapshot ──────────────────────────────────────────

  it('creates a snapshot file on disk with provenance stripped', async () => {
    // Seed working GeoJSON with 5 entries across 2 features
    const working = createWorkingGeoJson(5, 2);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working, null, 2));

    const service = createSnapshotService(deps);
    const result = await service.createSnapshot(storePath, itemPath);

    // Verify result
    expect(result.entriesCaptured).toBe(5);
    expect(result.entriesRemaining).toBe(0);
    expect(result.snapshotAsset).toMatch(/^plot-snap-.*\.geojson$/);
    expect(result.timestamp).toBeTruthy();

    // Verify snapshot file exists on disk
    const assetsDir = path.join(itemDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);
    const snapshotPath = path.join(assetsDir, result.snapshotAsset);
    expect(fs.existsSync(snapshotPath)).toBe(true);

    // Read and verify snapshot content
    const snapshot = JSON.parse(
      fs.readFileSync(snapshotPath, 'utf-8')
    ) as GeoJsonFeatureCollection;

    // Spatial features should have empty provenance
    const spatialFeatures = snapshot.features.filter(
      (f) => f.properties?.featureType !== 'system'
    );
    expect(spatialFeatures.length).toBe(2);
    for (const f of spatialFeatures) {
      expect(f.properties?.provenance).toEqual([]);
    }

    // System record should exist with snapshot links
    const sysRec = snapshot.features.find(
      (f) => f.properties?.featureType === 'system'
    );
    expect(sysRec).toBeTruthy();
    expect(sysRec!.properties!.snapshotLinks).toEqual({
      prev: null,
      next: expect.objectContaining({ asset: 'plot.geojson' }),
    });

    // Verify item.json was updated with asset reference
    const item = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot-001.json'), 'utf-8')
    );
    const assetKey = path.parse(result.snapshotAsset).name;
    expect(item.assets[assetKey]).toBeTruthy();
    expect(item.assets[assetKey].roles).toContain('snapshot');
    expect(item.assets[assetKey].href).toContain(result.snapshotAsset);

    // Verify working file was updated
    const updatedWorking = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    // Working file spatial features should have cleared provenance
    const workingSpatial = updatedWorking.features.filter(
      (f) => f.properties?.featureType !== 'system'
    );
    for (const f of workingSpatial) {
      expect(f.properties?.provenance).toEqual([]);
    }

    // Working file system record should link back to snapshot
    const workingSysRec = updatedWorking.features.find(
      (f) => f.properties?.featureType === 'system'
    );
    expect(workingSysRec).toBeTruthy();
    const workingLinks = workingSysRec!.properties!.snapshotLinks as {
      prev: { asset: string; provEntryCount: number } | null;
      next: unknown;
    };
    expect(workingLinks.prev).toEqual({
      asset: result.snapshotAsset,
      provEntryCount: 5,
    });
    expect(workingLinks.next).toBeNull();

    // markDirty should have been called
    expect(deps.dirtyCount).toBe(1);
  });

  it('creates a system record if none exists', async () => {
    // GeoJSON with no system record
    const working = createWorkingGeoJson(3, 1);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working, null, 2));

    const service = createSnapshotService(deps);
    await service.createSnapshot(storePath, itemPath);

    // Both working and snapshot files should now have system records
    const updatedWorking = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;
    const sysRec = updatedWorking.features.find(
      (f) => f.properties?.featureType === 'system'
    );
    expect(sysRec).toBeTruthy();
    expect(sysRec!.properties!.snapshotLinks).toBeTruthy();
  });

  // ── Multi-snapshot chain ────────────────────────────────────────────

  it('builds a doubly-linked chain across 3 snapshots', async () => {
    const service = createSnapshotService(deps);

    // === Snapshot A: 3 entries ===
    const workingA = createWorkingGeoJson(3, 1);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(workingA, null, 2));

    const resultA = await service.createSnapshot(storePath, itemPath);

    // === Snapshot B: add 4 new entries, take another snapshot ===
    // Read the working file (provenance was cleared), add fresh entries
    const afterA = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    // Add new provenance entries to the spatial feature
    const spatialB = afterA.features.find((f) => f.properties?.featureType !== 'system');
    if (spatialB && spatialB.properties) {
      spatialB.properties.provenance = [];
      for (let i = 0; i < 4; i++) {
        (spatialB.properties.provenance as unknown[]).push({
          activityId: `act-b-${i + 1}`,
          timestamp: `2026-02-09T11:${String(i).padStart(2, '0')}:00.000Z`,
          wasGeneratedBy: { tool: `tool-b-${i + 1}`, toolVersion: '1.0.0', parameters: {} },
          used: ['track-1'],
          generated: [],
          executionDuration: 'PT1S',
          tune: null,
        });
      }
    }
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(afterA, null, 2));

    const resultB = await service.createSnapshot(storePath, itemPath);

    // === Snapshot C: add 2 more entries, take a third snapshot ===
    const afterB = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    const spatialC = afterB.features.find((f) => f.properties?.featureType !== 'system');
    if (spatialC && spatialC.properties) {
      spatialC.properties.provenance = [];
      for (let i = 0; i < 2; i++) {
        (spatialC.properties.provenance as unknown[]).push({
          activityId: `act-c-${i + 1}`,
          timestamp: `2026-02-09T12:${String(i).padStart(2, '0')}:00.000Z`,
          wasGeneratedBy: { tool: `tool-c-${i + 1}`, toolVersion: '1.0.0', parameters: {} },
          used: ['track-1'],
          generated: [],
          executionDuration: 'PT1S',
          tune: null,
        });
      }
    }
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(afterB, null, 2));

    const resultC = await service.createSnapshot(storePath, itemPath);

    // === Verify the chain on disk ===
    const assetsDir = path.join(itemDir, 'assets');

    // Read all three snapshot files
    const snapA = JSON.parse(
      fs.readFileSync(path.join(assetsDir, resultA.snapshotAsset), 'utf-8')
    ) as GeoJsonFeatureCollection;
    const snapB = JSON.parse(
      fs.readFileSync(path.join(assetsDir, resultB.snapshotAsset), 'utf-8')
    ) as GeoJsonFeatureCollection;
    const snapC = JSON.parse(
      fs.readFileSync(path.join(assetsDir, resultC.snapshotAsset), 'utf-8')
    ) as GeoJsonFeatureCollection;
    const finalWorking = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    // Helper to extract snapshotLinks from a FeatureCollection
    function getLinks(fc: GeoJsonFeatureCollection) {
      const sys = fc.features.find((f) => f.properties?.featureType === 'system');
      return sys?.properties?.snapshotLinks as {
        prev: { asset: string; provEntryCount: number } | null;
        next: { asset: string; provEntryCount: number } | null;
      } | null;
    }

    // Snapshot A: prev=null, next=B
    const linksA = getLinks(snapA);
    expect(linksA!.prev).toBeNull();
    expect(linksA!.next!.asset).toBe(resultB.snapshotAsset);

    // Snapshot B: prev=A, next=C
    const linksB = getLinks(snapB);
    expect(linksB!.prev!.asset).toBe(resultA.snapshotAsset);
    expect(linksB!.next!.asset).toBe(resultC.snapshotAsset);

    // Snapshot C: prev=B, next=working
    const linksC = getLinks(snapC);
    expect(linksC!.prev!.asset).toBe(resultB.snapshotAsset);
    expect(linksC!.next!.asset).toBe('plot.geojson');

    // Working file: prev=C, next=null
    const linksWorking = getLinks(finalWorking);
    expect(linksWorking!.prev!.asset).toBe(resultC.snapshotAsset);
    expect(linksWorking!.next).toBeNull();

    // Entry counts should be correct
    expect(linksA!.next!.provEntryCount).toBe(4);  // B had 4 entries
    expect(linksB!.prev!.provEntryCount).toBe(3);  // A had 3 entries
    expect(linksB!.next!.provEntryCount).toBe(2);  // C had 2 entries
    expect(linksC!.prev!.provEntryCount).toBe(4);  // B had 4 entries
    expect(linksWorking!.prev!.provEntryCount).toBe(2); // C had 2 entries

    // Verify item.json has all 3 snapshot assets registered
    const item = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot-001.json'), 'utf-8')
    );
    const assetKeys = Object.keys(item.assets);
    expect(assetKeys).toContain('plot'); // original
    expect(assetKeys).toContain(path.parse(resultA.snapshotAsset).name);
    expect(assetKeys).toContain(path.parse(resultB.snapshotAsset).name);
    expect(assetKeys).toContain(path.parse(resultC.snapshotAsset).name);
  });

  // ── US2: Detect boundary and load entries ───────────────────────────

  it('detects snapshot boundary without loading snapshot file', async () => {
    const working = createWorkingGeoJson(7, 2);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working, null, 2));

    const service = createSnapshotService(deps);

    // No boundary before first snapshot
    const noBoundary = await service.getSnapshotBoundary(storePath, itemPath);
    expect(noBoundary).toBeNull();

    // Create snapshot
    const result = await service.createSnapshot(storePath, itemPath);

    // Now boundary should exist
    const boundary = await service.getSnapshotBoundary(storePath, itemPath);
    expect(boundary).not.toBeNull();
    expect(boundary!.asset).toBe(result.snapshotAsset);
    expect(boundary!.provEntryCount).toBe(7);
  });

  it('loads entries from a snapshot file on disk', async () => {
    const working = createWorkingGeoJson(5, 2);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working, null, 2));

    const service = createSnapshotService(deps);
    const result = await service.createSnapshot(storePath, itemPath);

    // Load entries from the snapshot
    const loaded = await service.loadSnapshotEntries(
      storePath,
      itemPath,
      result.snapshotAsset
    );

    // Spatial features in the snapshot have empty provenance (stripped).
    // However, the system record has file-level provenance (the snapshot
    // event recorded in step 8 of createSnapshot), which assembleTimeline
    // picks up because it iterates ALL features. So loadSnapshotEntries
    // returns 1 entry — the file-level snapshot provenance event.
    expect(loaded.entries).toHaveLength(1);
    expect((loaded.entries[0] as Record<string, unknown>).type).toBe('snapshot');
    expect(loaded.nextBoundary).toBeNull(); // first snapshot, no prev
  });

  // ── US3: Capture from specific entry ────────────────────────────────

  it('captures snapshot from a specific entry, leaving remaining in working file', async () => {
    const working = createWorkingGeoJson(5, 1);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working, null, 2));

    const service = createSnapshotService(deps);

    // Capture from entry 3 (act-3): entries 1-3 go to snapshot, 4-5 stay
    const result = await service.createSnapshot(storePath, itemPath, {
      fromEntryId: 'act-3',
    });

    expect(result.entriesCaptured).toBe(3);
    expect(result.entriesRemaining).toBe(2);

    // Verify working file still has entries 4 and 5
    const updatedWorking = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    const spatial = updatedWorking.features.find(
      (f) => f.properties?.featureType !== 'system'
    );
    const prov = spatial!.properties!.provenance as Array<{ activityId: string }>;
    expect(prov).toHaveLength(2);
    expect(prov[0].activityId).toBe('act-4');
    expect(prov[1].activityId).toBe('act-5');

    // Verify chain metadata
    const sysRec = updatedWorking.features.find(
      (f) => f.properties?.featureType === 'system'
    );
    const links = sysRec!.properties!.snapshotLinks as {
      prev: { asset: string; provEntryCount: number };
    };
    expect(links.prev.provEntryCount).toBe(3);
  });

  // ── US4: Cross-snapshot timeline assembly ───────────────────────────

  it('assembles a unified timeline across snapshot + working file', async () => {
    const service = createSnapshotService(deps);

    // Create working file with 3 entries
    const working1 = createWorkingGeoJson(3, 1);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(working1, null, 2));

    // Snapshot A
    await service.createSnapshot(storePath, itemPath);

    // Add 2 new entries to working file
    const afterSnap = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;
    const spatial = afterSnap.features.find((f) => f.properties?.featureType !== 'system');
    if (spatial && spatial.properties) {
      spatial.properties.provenance = [
        {
          activityId: 'act-new-1',
          timestamp: '2026-02-09T14:00:00.000Z',
          wasGeneratedBy: { tool: 'tool-new-1', toolVersion: '1.0.0', parameters: {} },
          used: ['track-1'],
          generated: [],
          executionDuration: 'PT1S',
          tune: null,
        },
        {
          activityId: 'act-new-2',
          timestamp: '2026-02-09T14:01:00.000Z',
          wasGeneratedBy: { tool: 'tool-new-2', toolVersion: '1.0.0', parameters: {} },
          used: ['track-1'],
          generated: [],
          executionDuration: 'PT1S',
          tune: null,
        },
      ];
    }
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(afterSnap, null, 2));

    // Read current working file from disk
    const currentFC = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;

    // Detect boundary and load previous entries
    const boundary = await service.getSnapshotBoundary(storePath, itemPath);
    expect(boundary).not.toBeNull();

    const previous = await service.loadSnapshotEntries(
      storePath,
      itemPath,
      boundary!.asset
    );

    // Assemble cross-snapshot timeline
    const timeline = service.assembleCrossSnapshotTimeline(currentFC, {
      previousEntries: previous.entries,
    });

    // Timeline includes:
    // - 1 file-level snapshot event from previous snapshot's system record
    // - 1 file-level snapshot event from working file's system record
    // - 2 spatial provenance entries from working file (act-new-1, act-new-2)
    // Total: 4 unique entries (each has a distinct activityId)
    expect(timeline.length).toBe(4);

    // Verify the spatial entries are present and in chronological order
    const spatialEntries = timeline.filter(
      (e) => (e as Record<string, unknown>).type !== 'snapshot'
    );
    expect(spatialEntries).toHaveLength(2);
    expect(spatialEntries[0].activityId).toBe('act-new-1');
    expect(spatialEntries[1].activityId).toBe('act-new-2');
  });

  // ── Round-trip: full workflow ───────────────────────────────────────

  it('full round-trip: record → snapshot → more work → snapshot → navigate chain', async () => {
    const service = createSnapshotService(deps);

    // Phase 1: Initial work — 4 entries on 2 features
    const initial = createWorkingGeoJson(4, 2);
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(initial, null, 2));

    // Phase 2: Snapshot A
    const snapA = await service.createSnapshot(storePath, itemPath);
    expect(snapA.entriesCaptured).toBe(4);

    // Phase 3: More work — 3 new entries
    const afterA = JSON.parse(
      fs.readFileSync(path.join(itemDir, 'plot.geojson'), 'utf-8')
    ) as GeoJsonFeatureCollection;
    for (const f of afterA.features) {
      if (f.properties && f.properties.featureType !== 'system') {
        f.properties.provenance = [];
        for (let i = 0; i < 3; i++) {
          (f.properties.provenance as unknown[]).push({
            activityId: `act-phase3-${i + 1}`,
            timestamp: `2026-02-09T15:${String(i).padStart(2, '0')}:00.000Z`,
            wasGeneratedBy: { tool: `tool-phase3-${i + 1}`, toolVersion: '1.0.0', parameters: {} },
            used: [f.id],
            generated: [],
            executionDuration: 'PT1S',
            tune: null,
          });
        }
      }
    }
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(afterA, null, 2));

    // Phase 4: Snapshot B
    const snapB = await service.createSnapshot(storePath, itemPath);
    expect(snapB.entriesCaptured).toBe(3);

    // Phase 5: Navigate the chain
    // Working file → boundary → Snapshot B → boundary → Snapshot A

    // Step 1: Get boundary from working file
    const boundaryFromWorking = await service.getSnapshotBoundary(storePath, itemPath);
    expect(boundaryFromWorking).not.toBeNull();
    expect(boundaryFromWorking!.asset).toBe(snapB.snapshotAsset);

    // Step 2: Load entries from Snapshot B
    const fromB = await service.loadSnapshotEntries(
      storePath,
      itemPath,
      boundaryFromWorking!.asset
    );
    // Snapshot B is a clean file — no spatial provenance entries
    expect(fromB.nextBoundary).not.toBeNull();
    expect(fromB.nextBoundary!.asset).toBe(snapA.snapshotAsset);

    // Step 3: Load entries from Snapshot A
    const fromA = await service.loadSnapshotEntries(
      storePath,
      itemPath,
      fromB.nextBoundary!.asset
    );
    expect(fromA.nextBoundary).toBeNull(); // end of chain

    // Verify all files on disk are valid JSON
    const assetsDir = path.join(itemDir, 'assets');
    const assetFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith('.geojson'));
    expect(assetFiles).toHaveLength(2); // snapA + snapB

    for (const file of assetFiles) {
      const content = fs.readFileSync(path.join(assetsDir, file), 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.type).toBe('FeatureCollection');
      expect(Array.isArray(parsed.features)).toBe(true);
    }

    // Verify dirty was called once per snapshot
    expect(deps.dirtyCount).toBe(2);
  });

  // ── Edge case: empty plot ───────────────────────────────────────────

  it('handles snapshot of a plot with zero provenance entries', async () => {
    const empty: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [1, 1] },
          properties: {
            name: 'Empty track',
            featureType: 'track',
            provenance: [],
          },
        },
      ],
    };
    fs.writeFileSync(path.join(itemDir, 'plot.geojson'), JSON.stringify(empty, null, 2));

    const service = createSnapshotService(deps);
    const result = await service.createSnapshot(storePath, itemPath);

    expect(result.entriesCaptured).toBe(0);
    expect(result.entriesRemaining).toBe(0);

    // Snapshot file should still exist
    const snapshotPath = path.join(itemDir, 'assets', result.snapshotAsset);
    expect(fs.existsSync(snapshotPath)).toBe(true);

    // Chain should be valid
    const boundary = await service.getSnapshotBoundary(storePath, itemPath);
    expect(boundary).not.toBeNull();
    expect(boundary!.provEntryCount).toBe(0);
  });
});
