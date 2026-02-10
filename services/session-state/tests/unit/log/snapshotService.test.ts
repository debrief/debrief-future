/**
 * Snapshot Service unit tests.
 * Feature: 074-snapshots (T010, T015, T016, T020)
 */

import { createSnapshotService } from '../../../src/log/snapshotService.js';
import type { SnapshotServiceDeps, GeoJsonFeatureCollection } from '../../../src/log/types.js';

/** Create a test FeatureCollection with provenance entries. */
function makeFC(opts?: {
  entryCount?: number;
  hasSystemRecord?: boolean;
  systemSnapshotLinks?: unknown;
  systemProvenance?: unknown[];
}): GeoJsonFeatureCollection {
  const entryCount = opts?.entryCount ?? 3;
  const features: GeoJsonFeatureCollection['features'] = [];

  // Spatial features with provenance
  const provenance = [];
  for (let i = 1; i <= entryCount; i++) {
    provenance.push({
      activityId: `act-${i}`,
      timestamp: `2026-02-09T${String(10 + i).padStart(2, '0')}:00:00Z`,
      wasGeneratedBy: { tool: 'test-tool', toolVersion: '1.0.0', parameters: {} },
      used: ['track-1'],
      generated: [],
      executionDuration: 'PT0.1S',
      tune: null,
    });
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
        branches: [],
        provenance: opts?.systemProvenance ?? [],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

function createMockDeps(overrides?: Partial<SnapshotServiceDeps>): SnapshotServiceDeps {
  return {
    loadGeoJson: vi.fn().mockResolvedValue(makeFC()),
    writeSnapshotAsset: vi.fn().mockResolvedValue('/path/to/snapshot.geojson'),
    loadSnapshotGeoJson: vi.fn().mockResolvedValue(null),
    writeGeoJson: vi.fn().mockResolvedValue(undefined),
    markDirty: vi.fn(),
    ...overrides,
  };
}

// =============================================================================
// US1: Create a Snapshot Checkpoint (T010)
// =============================================================================

describe('createSnapshot (US1)', () => {
  it('creates a clean snapshot with provenance stripped', async () => {
    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json');

    // Snapshot file was written
    expect(deps.writeSnapshotAsset).toHaveBeenCalledWith(
      '/store',
      'item.json',
      expect.stringMatching(/^plot-snap-.*\.geojson$/),
      expect.any(String)
    );

    // Parse the clean copy that was written
    const writtenData = JSON.parse(
      (deps.writeSnapshotAsset as ReturnType<typeof vi.fn>).mock.calls[0][3]
    );
    // Spatial features should have empty provenance
    const spatialFeatures = writtenData.features.filter(
      (f: Record<string, unknown>) => (f.properties as Record<string, unknown>)?.featureType !== 'system'
    );
    for (const f of spatialFeatures) {
      expect((f.properties as Record<string, unknown>).provenance).toEqual([]);
    }

    expect(result.entriesCaptured).toBe(3);
    expect(result.entriesRemaining).toBe(0);
    expect(result.snapshotAsset).toMatch(/^plot-snap-.*\.geojson$/);
  });

  it('creates system record if missing (FR-008)', async () => {
    const fcNoSysRec = makeFC({ hasSystemRecord: false });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fcNoSysRec),
    });
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    // System record should have been created and added to the working FC
    const sysRec = fcNoSysRec.features.find(
      f => f.properties?.featureType === 'system'
    );
    expect(sysRec).toBeDefined();
    expect(sysRec!.properties!.snapshotLinks).toBeDefined();
  });

  it('links working file prev to the new snapshot', async () => {
    const fc = makeFC();
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json');

    // Working file's system record should have prev pointing to snapshot
    const sysRec = fc.features.find(f => f.properties?.featureType === 'system');
    const links = sysRec!.properties!.snapshotLinks as { prev: { asset: string } | null };
    expect(links.prev).not.toBeNull();
    expect(links.prev!.asset).toBe(result.snapshotAsset);
  });

  it('sets snapshot next to working file', async () => {
    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    const writtenData = JSON.parse(
      (deps.writeSnapshotAsset as ReturnType<typeof vi.fn>).mock.calls[0][3]
    );
    const snapshotSysRec = writtenData.features.find(
      (f: Record<string, unknown>) => (f.properties as Record<string, unknown>)?.featureType === 'system'
    );
    const links = (snapshotSysRec.properties as Record<string, unknown>).snapshotLinks as {
      next: { asset: string } | null;
    };
    expect(links.next).not.toBeNull();
    expect(links.next!.asset).toBe('plot.geojson');
  });

  it('clears provenance on working file spatial features after snapshot (FR-005)', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    // Working file spatial features should have empty provenance
    const spatialFeatures = fc.features.filter(f => f.properties?.featureType !== 'system');
    for (const f of spatialFeatures) {
      expect(f.properties!.provenance).toEqual([]);
    }
  });

  it('preserves system record provenance (FR-006)', async () => {
    const existingProv = [{ activityId: 'old-snap', type: 'snapshot', timestamp: '2026-01-01T00:00:00Z' }];
    const fc = makeFC({ systemProvenance: existingProv });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    const sysRec = fc.features.find(f => f.properties?.featureType === 'system');
    const prov = sysRec!.properties!.provenance as unknown[];
    // Should have the old entry PLUS the new snapshot entry
    expect(prov.length).toBeGreaterThanOrEqual(2);
    expect(prov[0]).toEqual(existingProv[0]);
  });

  it('records file-level provenance entry of type snapshot (FR-007)', async () => {
    const fc = makeFC();
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    const sysRec = fc.features.find(f => f.properties?.featureType === 'system');
    const prov = sysRec!.properties!.provenance as Array<{ type: string; asset: string }>;
    const snapshotEntry = prov.find(e => e.type === 'snapshot');
    expect(snapshotEntry).toBeDefined();
    expect(snapshotEntry!.asset).toMatch(/^plot-snap-.*\.geojson$/);
  });

  it('handles empty plot with no Log entries', async () => {
    const fc = makeFC({ entryCount: 0 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json');

    expect(result.entriesCaptured).toBe(0);
    expect(result.entriesRemaining).toBe(0);
  });

  it('does not modify working file if snapshot write fails (FR-015)', async () => {
    const fc = makeFC({ entryCount: 3 });
    const originalProv = JSON.parse(JSON.stringify(fc.features[0].properties!.provenance));
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
      writeSnapshotAsset: vi.fn().mockRejectedValue(new Error('Disk full')),
    });
    const service = createSnapshotService(deps);

    await expect(service.createSnapshot('/store', 'item.json')).rejects.toThrow('Disk full');

    // Working file should NOT have been modified
    expect(deps.writeGeoJson).not.toHaveBeenCalled();
    expect(deps.markDirty).not.toHaveBeenCalled();
  });

  it('calls markDirty after snapshot (FR-016)', async () => {
    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    expect(deps.markDirty).toHaveBeenCalled();
  });

  it('updates previous snapshot next link for second snapshot', async () => {
    const prevSnapshotFC = makeFC({ entryCount: 0 });
    const prevSysRec = prevSnapshotFC.features.find(f => f.properties?.featureType === 'system');
    prevSysRec!.properties!.snapshotLinks = { prev: null, next: { asset: 'plot.geojson', provEntryCount: 3 } };

    const fc = makeFC({
      entryCount: 5,
      systemSnapshotLinks: {
        prev: { asset: 'plot-snap-2026-02-09T10-00-00.geojson', provEntryCount: 3 },
        next: null,
      },
    });

    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(prevSnapshotFC),
    });
    const service = createSnapshotService(deps);

    await service.createSnapshot('/store', 'item.json');

    // Previous snapshot's next should be updated to point to new snapshot
    expect(deps.writeSnapshotAsset).toHaveBeenCalledTimes(2); // new snapshot + updated prev snapshot
  });

  it('throws if working GeoJSON not found', async () => {
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(null),
    });
    const service = createSnapshotService(deps);

    await expect(service.createSnapshot('/store', 'item.json')).rejects.toThrow('not found');
  });
});

// =============================================================================
// US2: Navigate Earlier History (T015, T016)
// =============================================================================

describe('getSnapshotBoundary (US2)', () => {
  it('returns boundary when prev link exists', async () => {
    const fc = makeFC({
      systemSnapshotLinks: {
        prev: { asset: 'plot-snap-2026-02-09T10-00-00.geojson', provEntryCount: 12 },
        next: null,
      },
    });
    const deps = createMockDeps({ loadGeoJson: vi.fn().mockResolvedValue(fc) });
    const service = createSnapshotService(deps);

    const boundary = await service.getSnapshotBoundary('/store', 'item.json');

    expect(boundary).toEqual({
      asset: 'plot-snap-2026-02-09T10-00-00.geojson',
      provEntryCount: 12,
    });
  });

  it('returns null when no previous snapshot', async () => {
    const fc = makeFC();
    const deps = createMockDeps({ loadGeoJson: vi.fn().mockResolvedValue(fc) });
    const service = createSnapshotService(deps);

    const boundary = await service.getSnapshotBoundary('/store', 'item.json');
    expect(boundary).toBeNull();
  });

  it('returns null when snapshotLinks is null', async () => {
    const fc = makeFC({ systemSnapshotLinks: null });
    const deps = createMockDeps({ loadGeoJson: vi.fn().mockResolvedValue(fc) });
    const service = createSnapshotService(deps);

    const boundary = await service.getSnapshotBoundary('/store', 'item.json');
    expect(boundary).toBeNull();
  });

  it('returns null when GeoJSON not found', async () => {
    const deps = createMockDeps({ loadGeoJson: vi.fn().mockResolvedValue(null) });
    const service = createSnapshotService(deps);

    const boundary = await service.getSnapshotBoundary('/store', 'item.json');
    expect(boundary).toBeNull();
  });
});

describe('loadSnapshotEntries (US2)', () => {
  it('loads entries from snapshot file', async () => {
    const snapshotFC = makeFC({ entryCount: 5 });
    const deps = createMockDeps({
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFC),
    });
    const service = createSnapshotService(deps);

    const result = await service.loadSnapshotEntries('/store', 'item.json', 'snap.geojson');

    expect(result.entries).toHaveLength(5);
    expect(result.entries[0].activityId).toBe('act-1');
  });

  it('returns next boundary if snapshot has prev link', async () => {
    const snapshotFC = makeFC({
      entryCount: 3,
      systemSnapshotLinks: {
        prev: { asset: 'older-snap.geojson', provEntryCount: 8 },
        next: { asset: 'plot.geojson', provEntryCount: 5 },
      },
    });
    const deps = createMockDeps({
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFC),
    });
    const service = createSnapshotService(deps);

    const result = await service.loadSnapshotEntries('/store', 'item.json', 'snap.geojson');

    expect(result.nextBoundary).toEqual({
      asset: 'older-snap.geojson',
      provEntryCount: 8,
    });
  });

  it('returns null boundary at chain end', async () => {
    const snapshotFC = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(snapshotFC),
    });
    const service = createSnapshotService(deps);

    const result = await service.loadSnapshotEntries('/store', 'item.json', 'snap.geojson');
    expect(result.nextBoundary).toBeNull();
  });

  it('throws when snapshot file not found', async () => {
    const deps = createMockDeps({
      loadSnapshotGeoJson: vi.fn().mockResolvedValue(null),
    });
    const service = createSnapshotService(deps);

    await expect(
      service.loadSnapshotEntries('/store', 'item.json', 'missing.geojson')
    ).rejects.toThrow('not found');
  });
});

// =============================================================================
// US3: Capture Snapshot from a Specific Entry (T020)
// =============================================================================

describe('createSnapshot with fromEntryId (US3)', () => {
  it('captures at entry 2 of 3: snapshot gets 2 entries, working retains 1', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json', { fromEntryId: 'act-2' });

    expect(result.entriesCaptured).toBe(2);
    expect(result.entriesRemaining).toBe(1);

    // Working file should only have entries after act-2
    const spatialFeatures = fc.features.filter(f => f.properties?.featureType !== 'system');
    for (const f of spatialFeatures) {
      const prov = f.properties!.provenance as Array<{ activityId: string }>;
      for (const entry of prov) {
        expect(entry.activityId).toBe('act-3');
      }
    }
  });

  it('capture at last entry is equivalent to standard snapshot', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json', { fromEntryId: 'act-3' });

    expect(result.entriesCaptured).toBe(3);
    expect(result.entriesRemaining).toBe(0);
  });

  it('capture at first entry retains rest', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    const result = await service.createSnapshot('/store', 'item.json', { fromEntryId: 'act-1' });

    expect(result.entriesCaptured).toBe(1);
    expect(result.entriesRemaining).toBe(2);
  });

  it('throws for invalid entry ID', async () => {
    const fc = makeFC({ entryCount: 3 });
    const deps = createMockDeps({
      loadGeoJson: vi.fn().mockResolvedValue(fc),
    });
    const service = createSnapshotService(deps);

    await expect(
      service.createSnapshot('/store', 'item.json', { fromEntryId: 'nonexistent' })
    ).rejects.toThrow('not found');
  });
});

// =============================================================================
// US4: Cross-Snapshot Timeline Assembly (T024)
// =============================================================================

describe('assembleCrossSnapshotTimeline (US4)', () => {
  it('merges current and previous entries sorted by timestamp', () => {
    const currentFC = makeFC({ entryCount: 2 }); // act-1 at 11:00, act-2 at 12:00
    const previousEntries = [
      {
        activityId: 'prev-1',
        timestamp: '2026-02-09T08:00:00Z',
        wasGeneratedBy: { tool: 'test', toolVersion: '1.0.0', parameters: {} },
        used: [],
        generated: [],
        executionDuration: 'PT0.1S',
        tune: null,
      },
      {
        activityId: 'prev-2',
        timestamp: '2026-02-09T09:00:00Z',
        wasGeneratedBy: { tool: 'test', toolVersion: '1.0.0', parameters: {} },
        used: [],
        generated: [],
        executionDuration: 'PT0.1S',
        tune: null,
      },
    ];

    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    const timeline = service.assembleCrossSnapshotTimeline(currentFC, { previousEntries });

    expect(timeline).toHaveLength(4);
    expect(timeline[0].activityId).toBe('prev-1');
    expect(timeline[1].activityId).toBe('prev-2');
    expect(timeline[2].activityId).toBe('act-1');
    expect(timeline[3].activityId).toBe('act-2');
  });

  it('deduplicates on activityId', () => {
    const currentFC: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: null,
          properties: {
            provenance: [
              { activityId: 'shared', timestamp: '2026-02-09T12:00:00Z' },
            ],
          },
        },
      ],
    };
    const previousEntries = [
      {
        activityId: 'shared',
        timestamp: '2026-02-09T12:00:00Z',
        wasGeneratedBy: { tool: 'test', toolVersion: '1.0.0', parameters: {} },
        used: [],
        generated: [],
        executionDuration: 'PT0.1S',
        tune: null,
      },
    ];

    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    const timeline = service.assembleCrossSnapshotTimeline(currentFC, { previousEntries });
    expect(timeline).toHaveLength(1);
  });

  it('returns current entries unchanged when no previous entries', () => {
    const currentFC = makeFC({ entryCount: 3 });
    const deps = createMockDeps();
    const service = createSnapshotService(deps);

    const timeline = service.assembleCrossSnapshotTimeline(currentFC);
    expect(timeline).toHaveLength(3);
  });
});
