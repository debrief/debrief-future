# Data Model: Snapshots with Doubly-Linked Chain

**Feature**: 074-snapshots | **Date**: 2026-02-09

## Entity Relationship Diagram

```
┌─────────────────────┐
│   Working File      │
│   (plot.geojson)    │
│                     │
│ features[]:         │
│   ├─ TrackFeature   │──── properties.provenance: LogEntry[]
│   ├─ ShapeFeature   │──── properties.provenance: LogEntry[]
│   └─ SystemRecord   │──── properties.snapshotLinks
│                     │     properties.branches
│                     │     properties.provenance (file-level)
└─────────┬───────────┘
          │ snapshotLinks.prev
          ▼
┌─────────────────────┐
│   Snapshot B        │
│   (plot-snap-B.geo) │
│                     │
│ features[]:         │
│   ├─ TrackFeature   │──── properties.provenance: [] (stripped)
│   ├─ ShapeFeature   │──── properties.provenance: [] (stripped)
│   └─ SystemRecord   │──── properties.snapshotLinks
│                     │       .prev → Snapshot A
│                     │       .next → Working File
└─────────┬───────────┘
          │ snapshotLinks.prev
          ▼
┌─────────────────────┐
│   Snapshot A        │
│   (plot-snap-A.geo) │
│                     │
│ features[]:         │
│   ├─ TrackFeature   │──── properties.provenance: [] (stripped)
│   └─ SystemRecord   │──── properties.snapshotLinks
│                     │       .prev → null (chain start)
│                     │       .next → Snapshot B
└─────────────────────┘
```

## Entities

### SnapshotLinks

Carried on the system record's `properties.snapshotLinks`. Defines the doubly-linked chain.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prev` | `SnapshotRef \| null` | Yes | Link to the previous file in the chain |
| `next` | `SnapshotRef \| null` | Yes | Link to the next file in the chain |

**Invariants**:
- If `prev` is non-null, the referenced file's `next` must point back to this file
- If `next` is non-null, the referenced file's `prev` must point back to this file
- The working file always has `next: null`
- The earliest snapshot always has `prev: null`

### SnapshotRef

A reference to another file in the snapshot chain.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | `string` | Yes | Filename of the referenced GeoJSON asset (e.g., `plot-snap-2026-02-09T14-30-00.geojson`) |
| `provEntryCount` | `number` (≥0) | Yes | Count of Log entries in the referenced file at snapshot time |

**Purpose of `provEntryCount`**: Enables the Log Panel to display "Show earlier history (12 earlier operations)" without loading the snapshot file. This is the lazy loading mechanism.

### FileProvEntry (snapshot type)

Recorded on the system record's `properties.provenance` array when a snapshot is created.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `activityId` | `string` | Yes | UUID for the snapshot event |
| `type` | `"snapshot"` | Yes | Discriminator for file-level event type |
| `timestamp` | `string` (ISO 8601) | Yes | When the snapshot was created |
| `asset` | `string` | Yes | Filename of the snapshot GeoJSON |
| `branchId` | `null` | Yes | Not applicable for snapshot events |
| `direction` | `null` | Yes | Not applicable for snapshot events |

### System Record Feature

Non-spatial GeoJSON Feature carrying plot-level metadata. Created on demand if absent.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON Feature type |
| `geometry` | `{ type: "Point", coordinates: [] }` | Yes | Empty Point (non-spatial) |
| `properties.featureType` | `"system"` | Yes | Discriminator |
| `properties.snapshotLinks` | `SnapshotLinks \| null` | No | Chain links (null until first snapshot) |
| `properties.branches` | `BranchRecord[]` | No | Branch records (out of scope for #074) |
| `properties.provenance` | `FileProvEntry[]` | No | File-level event log |

### Snapshot GeoJSON File

A clean-state FeatureCollection stored as a STAC asset.

| Characteristic | Value |
|----------------|-------|
| Format | GeoJSON FeatureCollection |
| Spatial features | Identical geometry/properties to working file at snapshot time |
| Provenance on spatial features | Empty arrays (`[]`) — all Log entries stripped |
| System record | Present, with `snapshotLinks` linking to adjacent files |
| File-level provenance | Preserved (not stripped) |
| STAC asset role | `["snapshot"]` |
| Naming | `plot-snap-{ISO-timestamp}.geojson` |

## State Transitions

### Snapshot Creation (standard)

```
BEFORE:
  Working File:
    features[0..N].properties.provenance = [entry1, entry2, ..., entryM]
    systemRecord.snapshotLinks.prev = prevSnapshot (or null)

  Previous Snapshot (if exists):
    systemRecord.snapshotLinks.next = workingFile

AFTER:
  New Snapshot File (clean):
    features[0..N].properties.provenance = []
    systemRecord.snapshotLinks.prev = prevSnapshot (or null)
    systemRecord.snapshotLinks.next = { asset: workingFile, provEntryCount: 0 }
    systemRecord.provenance += { type: "snapshot", ... }

  Working File (reset):
    features[0..N].properties.provenance = []
    systemRecord.snapshotLinks.prev = { asset: newSnapshot, provEntryCount: M }
    systemRecord.provenance += { type: "snapshot", ... }

  Previous Snapshot (updated if exists):
    systemRecord.snapshotLinks.next = { asset: newSnapshot, provEntryCount: M }
```

### Snapshot Creation ("Capture from here" at entry K of M)

```
BEFORE:
  Working File:
    features[0..N].properties.provenance = [entry1, ..., entryK, ..., entryM]

AFTER:
  New Snapshot File (clean):
    features[0..N].properties.provenance = []
    systemRecord.snapshotLinks.prev = prevSnapshot (or null)
    systemRecord.snapshotLinks.next = { asset: workingFile, provEntryCount: M-K }
    systemRecord.provenance += { type: "snapshot", ... }

  Working File (partial reset):
    features[0..N].properties.provenance = [entryK+1, ..., entryM]  (entries after K retained)
    systemRecord.snapshotLinks.prev = { asset: newSnapshot, provEntryCount: K }
```

### Chain Navigation (read-only)

```
Consumer calls getSnapshotBoundary(storePath, itemPath):
  → reads system record from working file
  → returns { asset, provEntryCount } or null

Consumer calls loadSnapshotEntries(storePath, itemPath, assetFilename):
  → loads referenced snapshot GeoJSON via stacService
  → collects Log entries from all features (same as getTimeline)
  → returns LogEntry[]

Consumer calls assembleTimeline(currentFeatures, { previousEntries }):
  → merges current + previous entries
  → deduplicates on activityId
  → sorts by timestamp ascending
  → returns unified LogEntry[]
```

## Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| V-001 | SnapshotRef.asset | Must be a non-empty string matching a valid asset filename |
| V-002 | SnapshotRef.provEntryCount | Must be ≥ 0 |
| V-003 | Chain integrity | `file.prev.next` must reference `file` (bidirectional) |
| V-004 | Working file | `snapshotLinks.next` must always be `null` |
| V-005 | Chain head | Earliest snapshot `snapshotLinks.prev` must be `null` |
| V-006 | Snapshot features | All spatial features must have `provenance: []` (empty) |
| V-007 | System record provenance | Must NOT be stripped during snapshot (preserved) |
| V-008 | activityId uniqueness | No duplicate activityIds across the full chain |
