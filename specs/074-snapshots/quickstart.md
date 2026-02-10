# Quickstart: Snapshots with Doubly-Linked Chain

**Feature**: 074-snapshots | **Date**: 2026-02-09

## Overview

This feature implements clean-state snapshot checkpoints for analytical plots. Snapshots create archival copies of the plot's GeoJSON with all Log entries stripped, linked via a doubly-linked chain through system records stored as STAC assets.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Log Panel (#072)                        │
│  "Show earlier history (12 earlier operations)"           │
│      │                                                    │
│      ▼ getSnapshotBoundary() → loadSnapshotEntries()     │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                  Snapshot Service (NEW)                    │
│  createSnapshot() | getSnapshotBoundary()                │
│  loadSnapshotEntries() | assembleCrossSnapshotTimeline()  │
│      │                                                    │
│      ├─ Pure helpers: stripSpatialProvenance(),           │
│      │    findSystemRecord(), countLogEntries()            │
│      │                                                    │
│      ▼ Dependency Injection                               │
└──────────────────────────┬───────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────┐
│                     stacService                           │
│  writeSnapshotAsset() | loadSnapshotGeoJson()            │
│  writeGeoJson() | loadGeoJson() | addResultAsset()       │
└──────────────────────────┬───────────────────────────────┘
                           │
                    Local Filesystem
                    (STAC Item directories)
```

## Implementation Order

### Step 1: Snapshot Types (types.ts)

Add snapshot-related types to `services/session-state/src/log/types.ts`:
- `SnapshotRef`, `SnapshotLinks`, `FileProvEntry`
- `CreateSnapshotOptions`, `SnapshotResult`
- `SnapshotBoundary`, `SnapshotEntriesResult`

See `contracts/snapshot-types.ts` for full definitions.

### Step 2: Pure Helper Functions (snapshotService.ts)

Implement testable pure functions:

```typescript
// Find system record in a FeatureCollection
function findSystemRecord(fc: GeoJsonFeatureCollection): GeoJsonFeature | null {
  return fc.features.find(f => f.properties?.featureType === 'system') ?? null;
}

// Create a minimal system record
function createSystemRecord(): GeoJsonFeature {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [] },
    properties: {
      featureType: 'system',
      snapshotLinks: null,
      branches: [],
      provenance: [],
    },
  };
}

// Strip provenance from spatial features (NOT system record)
function stripSpatialProvenance(fc: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const cleanFeatures = fc.features.map(f => {
    if (f.properties?.featureType === 'system') {
      return structuredClone(f); // Preserve system record provenance
    }
    const clean = structuredClone(f);
    if (clean.properties) {
      clean.properties.provenance = [];
    }
    return clean;
  });
  return { type: 'FeatureCollection', features: cleanFeatures };
}

// Count Log entries across all spatial features
function countLogEntries(fc: GeoJsonFeatureCollection): number {
  let count = 0;
  const seen = new Set<string>();
  for (const f of fc.features) {
    if (f.properties?.featureType === 'system') continue;
    const prov = f.properties?.provenance;
    if (!Array.isArray(prov)) continue;
    for (const entry of prov) {
      if (entry?.activityId && !seen.has(entry.activityId)) {
        seen.add(entry.activityId);
        count++;
      }
    }
  }
  return count;
}

// Generate snapshot filename
function generateSnapshotFilename(timestamp = new Date()): string {
  const iso = timestamp.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, '');
  return `plot-snap-${iso}.geojson`;
}
```

### Step 3: stacService Extensions

Add two methods to `apps/vscode/src/services/stacService.ts`:

```typescript
// Write a snapshot GeoJSON as a STAC asset with role "snapshot"
async writeSnapshotAsset(
  storePath: string,
  itemPath: string,
  filename: string,
  data: string
): Promise<string> {
  return this.addResultAsset(storePath, itemPath, filename, data, 'application/geo+json', {
    roles: ['snapshot'],
    'debrief:snapshotTimestamp': new Date().toISOString(),
  });
}

// Load a snapshot GeoJSON by asset filename
async loadSnapshotGeoJson(
  storePath: string,
  itemPath: string,
  assetFilename: string
): Promise<GeoJsonFeatureCollection | null> {
  const fullItemPath = path.join(storePath, itemPath);
  const item = await this.loadItem(fullItemPath);
  if (!item) return null;

  const assetKey = Object.keys(item.assets).find(k =>
    item.assets[k].href.endsWith(assetFilename)
  );
  if (!assetKey) return null;

  const itemDir = path.dirname(fullItemPath);
  const geoJsonPath = path.resolve(itemDir, item.assets[assetKey].href);
  return this.loadGeoJson(geoJsonPath);
}
```

### Step 4: Snapshot Service (createSnapshot)

Implement the core `createSnapshot()` in the factory function:

```typescript
export function createSnapshotService(deps: SnapshotServiceDeps): SnapshotService {
  return {
    async createSnapshot(storePath, itemPath, options) {
      // 1. Load working GeoJSON
      const working = await deps.loadGeoJson(storePath, itemPath);
      if (!working) throw new Error('Working GeoJSON not found');

      // 2. Ensure system record exists
      let sysRec = findSystemRecord(working);
      if (!sysRec) {
        sysRec = createSystemRecord();
        working.features.push(sysRec);
      }

      // 3. Count entries and build clean copy
      const totalEntries = countLogEntries(working);
      const cleanCopy = stripSpatialProvenance(working);

      // 4. Handle "capture from here" (trim entries if needed)
      let entriesCaptured = totalEntries;
      let entriesRemaining = 0;
      if (options?.fromEntryId) {
        // ... trim logic (see spec for details)
      }

      // 5. Generate filename and write snapshot (ATOMIC POINT)
      const timestamp = new Date();
      const filename = generateSnapshotFilename(timestamp);
      await deps.writeSnapshotAsset(storePath, itemPath, filename, JSON.stringify(cleanCopy, null, 2));
      // If writeSnapshotAsset throws, nothing below executes (FR-015)

      // 6. Update chain links
      const prevLink = sysRec.properties?.snapshotLinks?.prev ?? null;
      // ... update working file, snapshot, and previous snapshot system records

      // 7. Clear provenance on working file spatial features
      // ... (standard) or trim (capture from here)

      // 8. Write updated working file
      await deps.writeGeoJson(storePath, itemPath, working);

      // 9. Mark dirty (FR-016)
      deps.markDirty();

      return { snapshotAsset: filename, entriesCaptured, entriesRemaining, timestamp: timestamp.toISOString() };
    },

    async getSnapshotBoundary(storePath, itemPath) { /* ... */ },
    async loadSnapshotEntries(storePath, itemPath, assetFilename) { /* ... */ },
    assembleCrossSnapshotTimeline(currentFeatures, options) { /* ... */ },
  };
}
```

### Step 5: Cross-Snapshot Timeline Assembly

Extend `timeline.ts` with support for merging entries from multiple files:

```typescript
export function assembleTimeline(
  featureCollection: GeoJsonFeatureCollection,
  options?: { previousEntries?: LogEntry[] }
): LogEntry[] {
  const seen = new Map<string, LogEntry>();

  // Add previous snapshot entries first
  if (options?.previousEntries) {
    for (const entry of options.previousEntries) {
      if (entry.activityId && !seen.has(entry.activityId)) {
        seen.set(entry.activityId, entry);
      }
    }
  }

  // Add current entries (existing logic)
  for (const feature of featureCollection.features) {
    const entries = normaliseProvenance(feature.properties?.provenance);
    for (const raw of entries) {
      const activityId = raw.activityId;
      if (typeof activityId === 'string' && !seen.has(activityId)) {
        seen.set(activityId, raw as LogEntry);
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
```

### Step 6: Update LogService Stubs

Replace the `createSnapshot()` stub in `logService.ts` with a delegation to the snapshot service:

```typescript
// In createLogService:
createSnapshot: async () => {
  // Delegate to snapshotService once wired
  throw new Error('Use snapshotService.createSnapshot() directly');
},
```

### Step 7: Tests

Write tests in this order:
1. Pure helpers: `stripSpatialProvenance`, `findSystemRecord`, `countLogEntries`, `generateSnapshotFilename`
2. Standard snapshot creation with mock deps
3. "Capture from here" with mock deps
4. Chain maintenance (multiple snapshots)
5. Cross-snapshot timeline assembly
6. Snapshot boundary detection
7. Loading entries from previous snapshot
8. Edge cases: empty plot, missing system record, missing snapshot file

## Key Patterns

### Dependency Injection

```typescript
// Production wiring (in VS Code extension)
const snapshotService = createSnapshotService({
  loadGeoJson: (s, i) => stacService.loadGeoJson(s, i),
  writeSnapshotAsset: (s, i, f, d) => stacService.writeSnapshotAsset(s, i, f, d),
  loadSnapshotGeoJson: (s, i, a) => stacService.loadSnapshotGeoJson(s, i, a),
  writeGeoJson: (s, i, fc) => stacService.writeGeoJson(s, i, fc),
  markDirty: () => store.getState().markDirty(),
});

// Test wiring
const mockDeps: SnapshotServiceDeps = {
  loadGeoJson: vi.fn().mockResolvedValue(testFeatureCollection),
  writeSnapshotAsset: vi.fn().mockResolvedValue('/path/to/snapshot.geojson'),
  loadSnapshotGeoJson: vi.fn().mockResolvedValue(testSnapshotCollection),
  writeGeoJson: vi.fn().mockResolvedValue(undefined),
  markDirty: vi.fn(),
};
```

### System Record Lookup

```typescript
const SYSTEM_FEATURE_TYPE = 'system';

function findSystemRecord(fc: GeoJsonFeatureCollection): GeoJsonFeature | null {
  return fc.features.find(
    f => f.properties?.featureType === SYSTEM_FEATURE_TYPE
  ) ?? null;
}
```

### Provenance Normalisation

Follows #071 pattern — handle legacy single-object provenance by wrapping in array:

```typescript
function normaliseProvenance(prov: unknown): unknown[] {
  if (prov === undefined || prov === null) return [];
  if (Array.isArray(prov)) return prov;
  return [prov]; // Legacy single-object format
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `services/session-state/src/log/types.ts` | Modify | Add snapshot types |
| `services/session-state/src/log/snapshotService.ts` | Create | Snapshot service with DI |
| `services/session-state/src/log/timeline.ts` | Modify | Cross-snapshot timeline assembly |
| `services/session-state/src/log/logService.ts` | Modify | Update createSnapshot stub |
| `services/session-state/src/log/__tests__/snapshotService.test.ts` | Create | Snapshot unit tests |
| `services/session-state/src/log/__tests__/timeline.test.ts` | Modify | Cross-snapshot tests |
| `apps/vscode/src/services/stacService.ts` | Modify | Add writeSnapshotAsset, loadSnapshotGeoJson |
| `shared/schemas/fixtures/system-record/valid/snapshot-chain.json` | Create | Multi-snapshot chain fixture |
