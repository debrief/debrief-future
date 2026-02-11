# Branch Creation Flow

**Feature**: 075-branching

This document traces the complete flow of creating a branch from a Log entry, showing the state transitions and data structures at each step.

## Scenario

**Source plot**: `plot-alpha/item.json` with 5 Log entries (act-001 through act-005)
**Branch point**: `act-003` (the analyst wants to explore an alternative from entry 3)

---

## Step 1: Load Source Plot

```
branchService.branchFrom('/catalogs/exercise-alpha', 'plot-alpha/item.json', { activityId: 'act-003' })
```

The service calls `deps.loadGeoJson(storePath, itemPath)` to load the source FeatureCollection.

**Source plot state**:
- Feature "VANGUARD": provenance = [act-001, act-003, act-005]
- Feature "AMBUSH": provenance = [act-002, act-004]
- System record: branches=[], branchOrigin=null

## Step 2: Locate Branch Point

The service calls `locateBranchPoint(storePath, itemPath, 'act-003')`.

1. Calls `findEntryInFeatures(fc, 'act-003')` on the current segment
2. Finds `act-003` at index 1 in VANGUARD's provenance array
3. Returns `{ type: 'current-segment', entryIndex: 1 }`

## Step 3: Build Branch FeatureCollection

Since the location is `current-segment`, the service:

1. Deep-copies the source FeatureCollection via `JSON.parse(JSON.stringify(source))`
2. Finds the timestamp of `act-003` (e.g., `"2026-02-10T14:30:00.000Z"`)
3. Filters each spatial feature's provenance to entries with `timestamp <= splitTimestamp`

**Branch plot state after trim**:
- Feature "VANGUARD": provenance = [act-001, act-003] (act-005 removed)
- Feature "AMBUSH": provenance = [act-002] (act-004 removed, since its timestamp > act-003)
- Geometry is preserved as-is (no tool replay needed)

## Step 4: Generate Branch Identity

```
branchId = deps.generateBranchId()  // e.g., "branch-a1b2c3d4"
timestamp = new Date().toISOString() // e.g., "2026-02-10T16:00:00.000Z"
```

## Step 5: Configure Branch System Record

The branch plot's system record is set up with:

```json
{
  "featureType": "system",
  "snapshotLinks": { "prev": null, "next": null },
  "branches": [],
  "branchOrigin": {
    "sourceAsset": "../plot-alpha/plot.geojson",
    "branchedFrom": "act-003",
    "branchedAt": "2026-02-10T16:00:00.000Z",
    "branchId": "branch-a1b2c3d4"
  },
  "provenance": [
    {
      "activityId": "<uuid>",
      "type": "branch",
      "timestamp": "2026-02-10T16:00:00.000Z",
      "asset": "../plot-alpha/plot.geojson",
      "branchId": "branch-a1b2c3d4",
      "direction": "target"
    }
  ]
}
```

Key design decisions:
- `snapshotLinks` reset to `{ prev: null, next: null }` — branch starts a fresh snapshot chain
- `branches` empty — the branch itself has no sub-branches yet
- `branchOrigin` points back to the source plot
- File-level provenance records the branch event with `direction: "target"`

## Step 6: Create STAC Item

```
deps.createItem(storePath, 'plot-alpha-branch-a1b2c3d4')
// Creates: plot-alpha-branch-a1b2c3d4/item.json
```

The branch is stored as an independent STAC Item, following the convention `{source-title}-{branchId}`.

## Step 7: Write Branch GeoJSON

```
deps.writeGeoJson(storePath, branchItemPath, branchFc)
// Writes: plot-alpha-branch-a1b2c3d4/plot.geojson
```

## Step 8: Update Source System Record

The source plot's system record is updated with a forward link:

```json
{
  "branches": [
    {
      "branchId": "branch-a1b2c3d4",
      "branchedFrom": "act-003",
      "branchedAt": "2026-02-10T16:00:00.000Z",
      "targetAsset": "../plot-alpha-branch-a1b2c3d4/plot.geojson"
    }
  ],
  "provenance": [
    "...existing entries...",
    {
      "activityId": "<uuid>",
      "type": "branch",
      "timestamp": "2026-02-10T16:00:00.000Z",
      "asset": "../plot-alpha-branch-a1b2c3d4/plot.geojson",
      "branchId": "branch-a1b2c3d4",
      "direction": "source"
    }
  ]
}
```

## Step 9: Write Updated Source & Mark Dirty

```
deps.writeGeoJson(storePath, itemPath, source)  // Writes updated source
deps.markDirty()                                  // Signals unsaved changes
```

## Step 10: Return Result

```json
{
  "branchId": "branch-a1b2c3d4",
  "branchItemPath": "plot-alpha-branch-a1b2c3d4/item.json",
  "branchGeoJsonPath": "/catalogs/exercise-alpha/plot-alpha-branch-a1b2c3d4/plot.geojson",
  "branchedFrom": "act-003",
  "entriesIncluded": 3,
  "timestamp": "2026-02-10T16:00:00.000Z"
}
```

---

## Verification Checklist

After branch creation, the following invariants hold:

| Check | Expected |
|-------|----------|
| Branch GeoJSON exists | `plot-alpha-branch-a1b2c3d4/plot.geojson` written |
| Branch has trimmed Log | Only entries at or before act-003 |
| Branch has BranchOrigin | Points to `../plot-alpha/plot.geojson` |
| Source has BranchRecord | Lists branch-a1b2c3d4 in branches[] |
| Two-way branchId match | Source BranchRecord.branchId === Branch BranchOrigin.branchId |
| File provenance on both | Source has direction="source", branch has direction="target" |
| Source entries unchanged | All 5 original entries intact |
| Branch is independent STAC Item | Has its own item.json directory |
| markDirty() called | Source document flagged as modified |

---

## Snapshot Boundary Flow (US3 Variant)

When the branch point is at a snapshot boundary:

1. `locateBranchPoint()` walks the snapshot chain via `snapshotLinks.prev`
2. Returns `{ type: 'snapshot-boundary', snapshotAsset: 'snapshots/snap-001.geojson' }`
3. `branchFrom()` loads the snapshot file via `deps.loadSnapshotGeoJson()`
4. Deep-copies the snapshot (already has clean state at that point in time)
5. Proceeds with steps 4-10 as above

**Key difference**: No provenance trimming needed — the snapshot already represents the exact state at the boundary.
