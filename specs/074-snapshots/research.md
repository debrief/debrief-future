# Research: Snapshots with Doubly-Linked Chain

**Feature**: 074-snapshots | **Date**: 2026-02-09

## Research Questions

### R1: How should snapshot GeoJSON files be stored as STAC assets?

**Decision**: Use `stacService.addResultAsset()` with `roles: ["snapshot"]` to store snapshot files in the `./assets/` subdirectory of the STAC Item.

**Rationale**: The existing `addResultAsset()` method already handles:
- Creating the `assets/` directory
- Writing the file
- Adding the asset reference to `item.json`
- Cache invalidation

The only adaptation needed is using `roles: ["snapshot"]` instead of `roles: ["result"]` and adding a `debrief:snapshotTimestamp` property for metadata.

**Alternatives considered**:
- Storing snapshots at the item root alongside `plot.geojson` — rejected because it breaks the established convention of ancillary files in `./assets/`
- Creating separate STAC Items for each snapshot — rejected per spec assumption A-003; snapshots are assets of the same plot Item

**File naming convention**: `plot-snap-{ISO-timestamp}.geojson` with hyphens replacing colons (e.g., `plot-snap-2026-02-09T14-30-00.geojson`) per assumption A-004.

### R2: How should the snapshot chain be maintained atomically?

**Decision**: Write-then-link pattern with rollback on failure.

**Algorithm**:
1. Build clean GeoJSON in memory (strip provenance from spatial features)
2. Write snapshot file to disk via `stacService.addResultAsset()`
3. If write succeeds: update system records (working file, new snapshot, previous snapshot)
4. If write fails: throw error, no system record changes (atomic guarantee per FR-015)
5. Clear provenance arrays on working file spatial features
6. Mark document dirty

**Rationale**: The stacService write is the only I/O operation that can fail (disk full, permissions). By writing the snapshot file first and only updating system records after success, we guarantee atomicity. The system record updates are in-memory mutations on the already-loaded FeatureCollection, which cannot fail.

**Alternatives considered**:
- Two-phase commit with temporary files — rejected as over-engineering; the existing stacService uses synchronous `fs.writeFileSync` which either succeeds or throws
- Transaction log — rejected; the STAC asset write is the single failure point

### R3: How should "Capture snapshot from here" reconstruct partial state?

**Decision**: Trim provenance arrays rather than reconstruct feature geometry.

**Rationale**: Per spec assumption A-005, the feature geometry and properties already reflect all operations up to the current point. "Capture snapshot from here" at entry N means:
1. The snapshot contains features with their **current** geometry/properties (all operations already applied)
2. The snapshot's system record records `provEntryCount: N` (entries 1-N)
3. The working file's features retain entries N+1 onward in their provenance arrays
4. The snapshot features get no provenance entries (clean, like a standard snapshot)

This avoids the complexity of tool replay or state reconstruction.

**Alternatives considered**:
- Full state reconstruction by replaying tools from the previous snapshot — rejected; massively complex, unreliable, and unnecessary since current geometry already reflects all operations
- Storing provenance entries 1-N on the snapshot features — rejected; snapshots are always clean (no provenance on spatial features per FR-001)

### R4: How should the Log Service interact with the stacService for snapshot operations?

**Decision**: Extend the dependency injection pattern from #071's `LogServiceDeps` with snapshot-specific operations.

**Rationale**: The Log Service (#071) uses dependency injection for testability:
```typescript
interface LogServiceDeps {
  appendProvenance: (...) => Promise<number>;
  loadGeoJson: (...) => Promise<FeatureCollection | null>;
  markDirty: () => void;
}
```

For snapshots, we extend this with:
```typescript
interface SnapshotServiceDeps extends LogServiceDeps {
  writeSnapshotAsset: (storePath, itemPath, filename, data) => Promise<string>;
  loadSnapshotGeoJson: (storePath, itemPath, assetFilename) => Promise<FeatureCollection | null>;
  writeGeoJson: (storePath, itemPath, featureCollection) => Promise<void>;
}
```

This keeps the snapshot logic testable with mock dependencies, consistent with the #071 pattern.

**Alternatives considered**:
- Direct stacService import — rejected; breaks testability and the established DI pattern
- Separate service class — rejected; snapshot operations are part of the Log Service's responsibility per the transition plan

### R5: How should cross-snapshot timeline assembly work with lazy loading?

**Decision**: Extend the existing `assembleTimeline()` with an optional `previousEntries` parameter for pre-loaded snapshot entries.

**Rationale**: The existing `assembleTimeline()` in `timeline.ts` collects entries from a single FeatureCollection. For cross-snapshot viewing:

1. `getTimeline()` returns entries from the current working file only (existing behaviour)
2. A new `getSnapshotBoundary()` function checks the system record for `snapshotLinks.prev` and returns `{ asset, provEntryCount } | null`
3. A new `loadSnapshotEntries()` function loads a snapshot file and returns its entries
4. `assembleTimeline()` gains an optional `previousEntries: LogEntry[]` parameter that gets merged, deduplicated on `activityId`, and sorted

The Log Panel (or any consumer) calls these in sequence:
```
boundary = getSnapshotBoundary(storePath, itemPath)
// Display "Show earlier history (N entries)" using boundary.provEntryCount
// On user click:
prevEntries = loadSnapshotEntries(storePath, itemPath, boundary.asset)
fullTimeline = assembleTimeline(currentFeatures, { previousEntries: prevEntries })
```

**Alternatives considered**:
- Automatic eager loading of all history — rejected; violates lazy loading requirement (FR-012 specifies on-demand)
- Paginated API with cursor — rejected; snapshot chain is the natural pagination boundary

### R6: What is the system record creation pattern when one doesn't exist?

**Decision**: Create a minimal system record feature and append it to the FeatureCollection.

Per FR-008, if no system record exists, the snapshot operation creates one:
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [] },
  "properties": {
    "featureType": "system",
    "snapshotLinks": { "prev": null, "next": null },
    "branches": [],
    "provenance": []
  }
}
```

This follows the existing schema in `system-record.yaml` and the SRD Annex A.4 structure. The system record is identified by `properties.featureType === "system"`.

**Rationale**: The system record may not exist on older plots created before #070. Creating it on-demand during the first snapshot operation is the safest approach — no migration needed.

### R7: How should the snapshot asset key be generated for item.json?

**Decision**: Use the timestamp-based filename stem as the asset key, with `plot-snap-` prefix replaced by `snapshot-`.

Example: `plot-snap-2026-02-09T14-30-00.geojson` → asset key `snapshot-2026-02-09T14-30-00`

**Rationale**: The existing `addResultAsset()` uses `path.parse(filename).name` as the key. Since our filenames already contain the timestamp, this gives unique, readable keys. The existing stacService pattern is followed exactly.

## Integration Findings

### Existing stacService Methods to Use

| Method | Purpose | Notes |
|--------|---------|-------|
| `addResultAsset()` | Write snapshot GeoJSON to `./assets/` | Change `roles` to `["snapshot"]` |
| `loadGeoJson()` | Read snapshot files for history loading | Already handles path resolution |
| `loadItem()` | Read STAC item.json for asset listing | Cached, returns full item |

### Existing stacService Methods to Add

| Method | Purpose | Notes |
|--------|---------|-------|
| `writeSnapshotAsset()` | Thin wrapper around `addResultAsset()` with `roles: ["snapshot"]` | Sets `debrief:snapshotTimestamp` metadata |
| `loadSnapshotGeoJson()` | Load a snapshot file by asset filename | Resolves path via item.json asset href |
| `writeGeoJson()` | Overwrite the working GeoJSON file (after clearing provenance) | Used after snapshot to persist cleared state |

### Session State Integration

The snapshot operation interacts with the Zustand store through:
1. `markDirty()` — called after snapshot creation (FR-016)
2. No direct store state changes — snapshots are a persistence operation, not a UI state change
3. The `featureCollectionUri` reference remains unchanged (working file path doesn't change)

### System Record Schema Alignment

The LinkML schema at `shared/schemas/src/linkml/system-record.yaml` already defines:
- `SnapshotLinks` with `prev` and `next` as `SnapshotRef | null`
- `SnapshotRef` with `asset` (string) and `prov_entry_count` (integer ≥ 0)
- `BranchRecord` (future, out of scope)
- `FileProvEntry` with type enum `snapshot | branch`

Golden fixture at `shared/schemas/fixtures/system-record/valid/populated-system-record.json` provides a reference implementation.

No schema changes required — all snapshot data structures are already defined.
