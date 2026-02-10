/**
 * Branch Service unit tests.
 * Feature: 075-branching (E02, Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBranchService } from '../../../src/log/branchService.js';
import {
  findEntryInFeatures,
  trimProvenanceToEntry,
  createBranchRecord,
  createBranchOrigin,
  createBranchProvEntry,
} from '../../../src/log/branchService.js';
import type {
  BranchServiceDeps,
  GeoJsonFeatureCollection,
  BranchRecord,
  BranchOrigin,
  SnapshotLinks,
} from '../../../src/log/types.js';

// ─── Test Helpers ────────────────────────────────────────────────────────

function makeEntry(id: number) {
  return {
    activityId: `act-${id}`,
    timestamp: `2026-02-10T${String(10 + id).padStart(2, '0')}:00:00Z`,
    wasGeneratedBy: { tool: 'test-tool', toolVersion: '1.0.0', parameters: {} },
    used: ['track-1'],
    generated: [],
    executionDuration: 'PT0.1S',
    tune: null,
  };
}

function makeFC(opts?: {
  entryCount?: number;
  hasSystemRecord?: boolean;
  systemBranches?: BranchRecord[];
  systemBranchOrigin?: BranchOrigin | null;
  systemSnapshotLinks?: SnapshotLinks | null;
  systemProvenance?: unknown[];
}): GeoJsonFeatureCollection {
  const entryCount = opts?.entryCount ?? 5;
  const features: GeoJsonFeatureCollection['features'] = [];

  const provenance = [];
  for (let i = 1; i <= entryCount; i++) {
    provenance.push(makeEntry(i));
  }

  features.push({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
    id: 'track-1',
    properties: { featureType: 'track', provenance: [...provenance] },
  });

  if (opts?.hasSystemRecord !== false) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [] },
      properties: {
        featureType: 'system',
        snapshotLinks: opts?.systemSnapshotLinks ?? null,
        branches: opts?.systemBranches ?? [],
        branchOrigin: opts?.systemBranchOrigin ?? null,
        provenance: opts?.systemProvenance ?? [],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

let branchIdCounter = 0;

function createMockDeps(overrides?: Partial<BranchServiceDeps>): BranchServiceDeps {
  branchIdCounter = 0;
  return {
    loadGeoJson: vi.fn().mockResolvedValue(makeFC()),
    writeSnapshotAsset: vi.fn().mockResolvedValue('/path/to/snapshot.geojson'),
    loadSnapshotGeoJson: vi.fn().mockResolvedValue(null),
    writeGeoJson: vi.fn().mockResolvedValue(undefined),
    markDirty: vi.fn(),
    createItem: vi.fn().mockImplementation((_store: string, title: string) => ({
      itemPath: `${title}/item.json`,
      itemId: `item-${title}`,
      itemDir: `/store/${title}`,
    })),
    generateBranchId: vi.fn().mockImplementation(() => {
      branchIdCounter++;
      return `branch-test-${branchIdCounter}`;
    }),
    ...overrides,
  };
}

// =============================================================================
// Phase 2: Pure Helper Functions (T006-T011)
// =============================================================================

describe('findEntryInFeatures', () => {
  it('finds an entry by activityId in spatial features', () => {
    const fc = makeFC({ entryCount: 5 });
    expect(findEntryInFeatures(fc, 'act-3')).toBe(2);
  });

  it('returns -1 when entry not found', () => {
    const fc = makeFC({ entryCount: 3 });
    expect(findEntryInFeatures(fc, 'act-99')).toBe(-1);
  });

  it('ignores system record features', () => {
    const fc = makeFC({ entryCount: 3 });
    // System record has provenance too, but should be ignored
    expect(findEntryInFeatures(fc, 'act-1')).toBe(0);
  });
});

describe('trimProvenanceToEntry', () => {
  it('trims provenance to include entries up to branch point', () => {
    const fc = makeFC({ entryCount: 5 });
    const result = trimProvenanceToEntry(fc, 'act-3');

    const track = result.features.find(f => f.properties?.featureType === 'track');
    const prov = track!.properties!.provenance as unknown[];
    expect(prov).toHaveLength(3);
    expect((prov[2] as Record<string, unknown>).activityId).toBe('act-3');
  });

  it('returns a deep copy (source unchanged)', () => {
    const fc = makeFC({ entryCount: 5 });
    const original = JSON.parse(JSON.stringify(fc));
    trimProvenanceToEntry(fc, 'act-3');

    // Original should be unchanged
    const track = fc.features.find(f => f.properties?.featureType === 'track');
    expect((track!.properties!.provenance as unknown[]).length).toBe(5);
  });

  it('throws when entry not found', () => {
    const fc = makeFC({ entryCount: 3 });
    expect(() => trimProvenanceToEntry(fc, 'act-99')).toThrow('not found');
  });

  it('keeps all entries when trimming at last entry', () => {
    const fc = makeFC({ entryCount: 5 });
    const result = trimProvenanceToEntry(fc, 'act-5');

    const track = result.features.find(f => f.properties?.featureType === 'track');
    expect((track!.properties!.provenance as unknown[]).length).toBe(5);
  });

  it('keeps single entry when trimming at first entry', () => {
    const fc = makeFC({ entryCount: 5 });
    const result = trimProvenanceToEntry(fc, 'act-1');

    const track = result.features.find(f => f.properties?.featureType === 'track');
    expect((track!.properties!.provenance as unknown[]).length).toBe(1);
  });
});

describe('createBranchRecord', () => {
  it('builds a valid BranchRecord', () => {
    const record = createBranchRecord('branch-x', 'act-5', '2026-02-10T12:00:00Z', '../branch/plot.geojson');
    expect(record).toEqual({
      branchId: 'branch-x',
      branchedFrom: 'act-5',
      branchedAt: '2026-02-10T12:00:00Z',
      targetAsset: '../branch/plot.geojson',
    });
  });
});

describe('createBranchOrigin', () => {
  it('builds a valid BranchOrigin', () => {
    const origin = createBranchOrigin('../source/plot.geojson', 'act-5', '2026-02-10T12:00:00Z', 'branch-x');
    expect(origin).toEqual({
      sourceAsset: '../source/plot.geojson',
      branchedFrom: 'act-5',
      branchedAt: '2026-02-10T12:00:00Z',
      branchId: 'branch-x',
    });
  });
});

describe('createBranchProvEntry', () => {
  it('builds a source FileProvEntry', () => {
    const entry = createBranchProvEntry('ev-1', '2026-02-10T12:00:00Z', '../branch/plot.geojson', 'branch-x', 'source');
    expect(entry).toEqual({
      activityId: 'ev-1',
      type: 'branch',
      timestamp: '2026-02-10T12:00:00Z',
      asset: '../branch/plot.geojson',
      branchId: 'branch-x',
      direction: 'source',
    });
  });

  it('builds a target FileProvEntry', () => {
    const entry = createBranchProvEntry('ev-2', '2026-02-10T12:00:00Z', '../source/plot.geojson', 'branch-x', 'target');
    expect(entry.direction).toBe('target');
    expect(entry.type).toBe('branch');
  });
});

// =============================================================================
// Phase 3: US1 — Branch from a Log Entry (T012-T019)
// =============================================================================

describe('branchFrom (US1)', () => {
  it('T012: branches from mid-point — branch has trimmed Log', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    expect(result.branchedFrom).toBe('act-3');
    expect(result.entriesIncluded).toBe(3);
    expect(result.branchId).toBe('branch-test-1');

    // Verify branch GeoJSON was written with trimmed provenance
    const writeCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string).includes('branch-test-1')
    );
    expect(writeCall).toBeDefined();
    const branchFc = writeCall![2] as GeoJsonFeatureCollection;
    const branchTrack = branchFc.features.find(f => f.properties?.featureType === 'track');
    expect((branchTrack!.properties!.provenance as unknown[]).length).toBe(3);
  });

  it('T013: branches from first entry — branch has single entry', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-1',
    });

    expect(result.entriesIncluded).toBe(1);
  });

  it('T014: branches from last entry — branch is full duplicate', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-5',
    });

    expect(result.entriesIncluded).toBe(5);
  });

  it('T015: two-way links — source BranchRecord matches branch BranchOrigin', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    // Check source system record was updated
    const sourceWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string) === 'plot-alpha/item.json'
    );
    expect(sourceWriteCall).toBeDefined();
    const sourceFc = sourceWriteCall![2] as GeoJsonFeatureCollection;
    const sourceSysRec = sourceFc.features.find(f => f.properties?.featureType === 'system');
    const branches = sourceSysRec!.properties!.branches as BranchRecord[];
    expect(branches).toHaveLength(1);
    expect(branches[0].branchId).toBe('branch-test-1');
    expect(branches[0].branchedFrom).toBe('act-3');

    // Check branch system record
    const branchWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string).includes('branch-test-1')
    );
    const branchFc = branchWriteCall![2] as GeoJsonFeatureCollection;
    const branchSysRec = branchFc.features.find(f => f.properties?.featureType === 'system');
    const origin = branchSysRec!.properties!.branchOrigin as BranchOrigin;
    expect(origin).toBeDefined();
    expect(origin.branchId).toBe('branch-test-1');
    expect(origin.branchedFrom).toBe('act-3');
  });

  it('T016: source unchanged after branch — all original entries intact', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    // Source should still have all 5 entries on spatial features
    const sourceWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string) === 'plot-alpha/item.json'
    );
    const sourceFc = sourceWriteCall![2] as GeoJsonFeatureCollection;
    const track = sourceFc.features.find(f => f.properties?.featureType === 'track');
    expect((track!.properties!.provenance as unknown[]).length).toBe(5);
  });

  it('T017: file-level provenance — both system records have FileProvEntry type "branch"', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    // Source provenance
    const sourceWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string) === 'plot-alpha/item.json'
    );
    const sourceFc = sourceWriteCall![2] as GeoJsonFeatureCollection;
    const sourceSysRec = sourceFc.features.find(f => f.properties?.featureType === 'system');
    const sourceProv = sourceSysRec!.properties!.provenance as Array<Record<string, unknown>>;
    const sourceBranchProv = sourceProv.find(p => p.type === 'branch');
    expect(sourceBranchProv).toBeDefined();
    expect(sourceBranchProv!.direction).toBe('source');
    expect(sourceBranchProv!.branchId).toBe('branch-test-1');

    // Branch provenance
    const branchWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string).includes('branch-test-1')
    );
    const branchFc = branchWriteCall![2] as GeoJsonFeatureCollection;
    const branchSysRec = branchFc.features.find(f => f.properties?.featureType === 'system');
    const branchProv = branchSysRec!.properties!.provenance as Array<Record<string, unknown>>;
    const branchBranchProv = branchProv.find(p => p.type === 'branch');
    expect(branchBranchProv).toBeDefined();
    expect(branchBranchProv!.direction).toBe('target');
    expect(branchBranchProv!.branchId).toBe('branch-test-1');
  });

  it('T018: entry not found — error thrown with ENTRY_NOT_FOUND code', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    try {
      await service.branchFrom('/store', 'plot-alpha/item.json', {
        activityId: 'act-99',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Record<string, unknown>).code).toBe('ENTRY_NOT_FOUND');
    }
  });

  it('T019: markDirty called after successful branch', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    expect(deps.markDirty).toHaveBeenCalledOnce();
  });

  it('source load failed — error with SOURCE_LOAD_FAILED code', async () => {
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(null),
    });
    const service = createBranchService(deps);

    try {
      await service.branchFrom('/store', 'plot-alpha/item.json', {
        activityId: 'act-1',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Record<string, unknown>).code).toBe('SOURCE_LOAD_FAILED');
    }
  });
});

// =============================================================================
// Phase 4: US2 — Two-Way Navigation (T028-T035)
// =============================================================================

describe('getBranches (US2)', () => {
  it('T028: returns all branch records from source', async () => {
    const branches: BranchRecord[] = [
      { branchId: 'b-1', branchedFrom: 'act-3', branchedAt: '2026-02-10T12:00:00Z', targetAsset: '../b-1/plot.geojson' },
      { branchId: 'b-2', branchedFrom: 'act-5', branchedAt: '2026-02-10T13:00:00Z', targetAsset: '../b-2/plot.geojson' },
    ];
    const fc = makeFC({ entryCount: 5, systemBranches: branches });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.getBranches('/store', 'item.json');
    expect(result).toHaveLength(2);
    expect(result[0].branchId).toBe('b-1');
    expect(result[1].branchId).toBe('b-2');
  });

  it('T031: returns empty array when no branches', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.getBranches('/store', 'item.json');
    expect(result).toEqual([]);
  });
});

describe('getBranchOrigin (US2)', () => {
  it('T029: returns origin from branch plot', async () => {
    const origin: BranchOrigin = {
      sourceAsset: '../source/plot.geojson',
      branchedFrom: 'act-3',
      branchedAt: '2026-02-10T12:00:00Z',
      branchId: 'branch-abc',
    };
    const fc = makeFC({ entryCount: 3, systemBranchOrigin: origin });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.getBranchOrigin('/store', 'item.json');
    expect(result).toEqual(origin);
  });

  it('T032: returns null on original plot', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.getBranchOrigin('/store', 'item.json');
    expect(result).toBeNull();
  });
});

describe('multiple branches (US2)', () => {
  it('T030/T035: two branches from different points both listed correctly', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    // Create first branch
    await service.branchFrom('/store', 'plot-alpha/item.json', { activityId: 'act-2' });

    // Update the mock to return the modified source
    const firstSourceCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string) === 'plot-alpha/item.json'
    );
    const updatedSource = firstSourceCall![2] as GeoJsonFeatureCollection;
    (deps.loadGeoJson as ReturnType<typeof vi.fn>).mockResolvedValue(updatedSource);

    // Create second branch
    await service.branchFrom('/store', 'plot-alpha/item.json', { activityId: 'act-4' });

    // Check the source now has both branches
    const secondSourceCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => (c[1] as string) === 'plot-alpha/item.json'
    );
    const finalSource = secondSourceCall[secondSourceCall.length - 1]![2] as GeoJsonFeatureCollection;
    const sysRec = finalSource.features.find(f => f.properties?.featureType === 'system');
    const branches = sysRec!.properties!.branches as BranchRecord[];
    expect(branches).toHaveLength(2);
    expect(branches[0].branchedFrom).toBe('act-2');
    expect(branches[1].branchedFrom).toBe('act-4');
  });
});

// =============================================================================
// Phase 5: US3 — Pre-Snapshot Branching (T036-T043)
// =============================================================================

describe('locateBranchPoint (US3)', () => {
  it('T036: walks snapshot chain to find entry', async () => {
    const snapshotFc = makeFC({ entryCount: 3, systemSnapshotLinks: { prev: null, next: { asset: 'plot.geojson', provEntryCount: 2 } } });
    const workingFc = makeFC({
      entryCount: 2,
      systemSnapshotLinks: { prev: { asset: 'snap-1.geojson', provEntryCount: 3 }, next: null },
    });
    // Working file has entries act-1, act-2 but we want act-3 which is only in the snapshot
    // Actually, let's make it cleaner: working has entries 4-5, snapshot has 1-3
    const snapEntries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    const workEntries = [makeEntry(4), makeEntry(5)];

    const snapshotFcClean: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: snapEntries } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: null, next: { asset: 'plot.geojson', provEntryCount: 2 } }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };
    const workingFcClean: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: workEntries } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: { asset: 'snap-1.geojson', provEntryCount: 3 }, next: null }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };

    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(workingFcClean),
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFcClean),
    });
    const service = createBranchService(deps);

    const location = await service.locateBranchPoint('/store', 'item.json', 'act-2');
    expect(location).toBeDefined();
    // act-2 is in the middle of snapshot (not last entry), so it's pre-snapshot-arbitrary
    expect(location!.type).toBe('pre-snapshot-arbitrary');
  });

  it('finds entry in current segment first', async () => {
    const fc = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const location = await service.locateBranchPoint('/store', 'item.json', 'act-3');
    expect(location).toEqual({ type: 'current-segment', entryIndex: 2 });
  });

  it('returns null when entry not found anywhere', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const location = await service.locateBranchPoint('/store', 'item.json', 'act-99');
    expect(location).toBeNull();
  });
});

describe('branchFrom at snapshot boundary (US3)', () => {
  it('T037: branch contains snapshot state', async () => {
    // Snapshot has entries 1-3, working file has 4-5
    const snapshotFc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(1), makeEntry(2), makeEntry(3)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: null, next: { asset: 'plot.geojson', provEntryCount: 2 } }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };
    const workingFc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(4), makeEntry(5)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: { asset: 'snap-1.geojson', provEntryCount: 3 }, next: null }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };

    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(workingFc),
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFc),
    });
    const service = createBranchService(deps);

    // Branch from the last entry in the snapshot (act-3) = snapshot boundary
    const result = await service.branchFrom('/store', 'plot-alpha/item.json', {
      activityId: 'act-3',
    });

    expect(result.branchedFrom).toBe('act-3');
    // The branch contains the snapshot's features (3 entries)
    expect(result.entriesIncluded).toBe(3);
  });

  it('T038: pre-snapshot arbitrary entry — REPLAY_NOT_AVAILABLE error', async () => {
    // Snapshot has entries 1-3, want to branch from act-2 (mid-snapshot)
    const snapshotFc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(1), makeEntry(2), makeEntry(3)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: null, next: { asset: 'plot.geojson', provEntryCount: 2 } }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };
    const workingFc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(4), makeEntry(5)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: { asset: 'snap-1.geojson', provEntryCount: 3 }, next: null }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };

    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(workingFc),
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFc),
    });
    const service = createBranchService(deps);

    try {
      await service.branchFrom('/store', 'plot-alpha/item.json', {
        activityId: 'act-2',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Record<string, unknown>).code).toBe('REPLAY_NOT_AVAILABLE');
    }
  });

  it('T039: snapshot file missing — SNAPSHOT_NOT_FOUND error', async () => {
    // Working file references a snapshot, but it can't be loaded
    const workingFc: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(4), makeEntry(5)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: { asset: 'snap-1.geojson', provEntryCount: 3 }, next: null }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };

    // Snapshot with the entry that locateBranchPoint would find
    const snapshotWithEntry: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [[0, 0]] }, id: 'track-1',
          properties: { featureType: 'track', provenance: [makeEntry(3)] } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [] },
          properties: { featureType: 'system', snapshotLinks: { prev: null, next: null }, branches: [], branchOrigin: null, provenance: [] } },
      ],
    };

    // First call returns the snapshot (for locateBranchPoint), second returns null (for branchFrom)
    let callCount = 0;
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(workingFc),
      loadSnapshotGeoJson: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(snapshotWithEntry);
        return Promise.resolve(null);
      }),
    });
    const service = createBranchService(deps);

    try {
      await service.branchFrom('/store', 'plot-alpha/item.json', {
        activityId: 'act-3',
      });
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Record<string, unknown>).code).toBe('SNAPSHOT_NOT_FOUND');
    }
  });
});

describe('nested branching (T043)', () => {
  it('branch from a branch plot links to immediate parent', async () => {
    // This branch plot is itself a branch
    const branchOrigin: BranchOrigin = {
      sourceAsset: '../original/plot.geojson',
      branchedFrom: 'act-5',
      branchedAt: '2026-02-10T10:00:00Z',
      branchId: 'branch-parent',
    };
    const fc = makeFC({ entryCount: 3, systemBranchOrigin: branchOrigin });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createBranchService(deps);

    const result = await service.branchFrom('/store', 'branch-parent/item.json', {
      activityId: 'act-2',
    });

    // Check the new branch's origin points to branch-parent, not original
    const branchWriteCall = (deps.writeGeoJson as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => (c[1] as string).includes('branch-test-1')
    );
    const branchFc = branchWriteCall![2] as GeoJsonFeatureCollection;
    const branchSysRec = branchFc.features.find(f => f.properties?.featureType === 'system');
    const origin = branchSysRec!.properties!.branchOrigin as BranchOrigin;
    expect(origin.sourceAsset).toContain('branch-parent');
  });
});
