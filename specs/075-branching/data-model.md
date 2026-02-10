# Data Model: Branching from History Point

**Feature**: 075-branching | **Date**: 2026-02-10

## Entity Relationship Diagram

```
┌─────────────────────────────┐
│   Source Plot (STAC Item)   │
│   plot-alpha/               │
│                             │
│ plot.geojson:               │
│   features[]:               │
│     ├─ TrackFeature         │──── properties.provenance: LogEntry[]
│     ├─ ShapeFeature         │──── properties.provenance: LogEntry[]
│     └─ SystemRecord         │──── properties.branches: BranchRecord[]
│                             │     properties.branchOrigin: null
│                             │     properties.snapshotLinks: SnapshotLinks
│                             │     properties.provenance: FileProvEntry[]
└──────────┬──────────────────┘
           │ branches[0].targetAsset
           ▼
┌─────────────────────────────┐
│   Branch Plot (STAC Item)   │
│   plot-alpha-branch-a1b2/   │
│                             │
│ plot.geojson:               │
│   features[]:               │
│     ├─ TrackFeature         │──── properties.provenance: LogEntry[] (trimmed to branch point)
│     ├─ ShapeFeature         │──── properties.provenance: LogEntry[] (trimmed to branch point)
│     └─ SystemRecord         │──── properties.branches: []
│                             │     properties.branchOrigin: BranchOrigin
│                             │     properties.snapshotLinks: { prev: null, next: null }
│                             │     properties.provenance: FileProvEntry[]
└─────────────────────────────┘
           ▲
           │ branchOrigin.sourceAsset
           │
    (two-way link)
```

## Entities

### BranchRecord (existing — from #074)

Carried on the source plot's system record in `properties.branches[]`. Records a branch that was created from this plot.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string` | Yes | Unique identifier for the branch (e.g., `branch-a1b2c3d4`) |
| `branchedFrom` | `string` | Yes | Activity ID of the Log entry at the branch point |
| `branchedAt` | `string` (ISO 8601) | Yes | Timestamp when the branch was created |
| `targetAsset` | `string` | Yes | Relative path to the branch plot's GeoJSON (e.g., `../plot-alpha-branch-a1b2/plot.geojson`) |

**Cardinality**: 0..N per source plot (a source can have many branches).

### BranchOrigin (new)

Carried on the branch plot's system record in `properties.branchOrigin`. Records the source plot this branch was created from.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceAsset` | `string` | Yes | Relative path to the source plot's GeoJSON (e.g., `../plot-alpha/plot.geojson`) |
| `branchedFrom` | `string` | Yes | Activity ID of the Log entry at the branch point |
| `branchedAt` | `string` (ISO 8601) | Yes | Timestamp when the branch was created |
| `branchId` | `string` | Yes | Unique identifier matching the source's BranchRecord |

**Cardinality**: 0..1 per plot (a plot is either an original or a branch; nested branches reference only immediate parent).

### FileProvEntry (branch type — existing from #074)

Recorded on both system records' `properties.provenance` array when a branch is created.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `activityId` | `string` | Yes | UUID for the branch event |
| `type` | `"branch"` | Yes | Discriminator for file-level event type |
| `timestamp` | `string` (ISO 8601) | Yes | When the branch was created |
| `asset` | `string` | Yes | Path to the other plot's GeoJSON |
| `branchId` | `string` | Yes | Branch identifier (same on both sides) |
| `direction` | `"source" \| "target"` | Yes | `"source"` on the source plot; `"target"` on the branch plot |

### BranchResult

Return type from the `branchFrom()` operation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branchId` | `string` | Yes | Unique identifier of the created branch |
| `branchItemPath` | `string` | Yes | Filesystem path to the new STAC Item directory |
| `branchGeoJsonPath` | `string` | Yes | Filesystem path to the branch plot's GeoJSON |
| `branchedFrom` | `string` | Yes | Activity ID of the branch point entry |
| `entriesIncluded` | `number` | Yes | Count of Log entries in the branch plot |
| `timestamp` | `string` | Yes | ISO 8601 timestamp of the branch creation |

### SystemRecordProperties (extended)

The system record properties structure with branching support. Extends #074's definition.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureType` | `"system"` | Yes | Discriminator |
| `snapshotLinks` | `SnapshotLinks \| null` | No | Snapshot chain links (from #074) |
| `branches` | `BranchRecord[]` | No | Branches created from this plot |
| `branchOrigin` | `BranchOrigin \| null` | No | Source plot reference (if this is a branch) |
| `provenance` | `FileProvEntry[]` | No | File-level event log (snapshots + branches) |

## State Transitions

### Branch Creation (from current segment)

```
BEFORE:
  Source Plot (Working File):
    features[0..N].properties.provenance = [entry1, entry2, ..., entryM]
    systemRecord.branches = [...existingBranches]
    systemRecord.branchOrigin = null (or existing origin if branch-of-branch)

OPERATION: branchFrom(activityId = "act-K")  where entry K is in current segment

AFTER:
  Source Plot (unchanged except system record):
    features[0..N].properties.provenance = [entry1, ..., entryM]  (unchanged)
    systemRecord.branches = [...existingBranches, newBranchRecord]
    systemRecord.provenance += { type: "branch", direction: "source", ... }

  New Branch Plot (new STAC Item):
    features[0..N].properties.provenance = [entry1, ..., entryK]  (trimmed)
    systemRecord.branches = []
    systemRecord.branchOrigin = { sourceAsset: "../source/plot.geojson", ... }
    systemRecord.snapshotLinks = { prev: null, next: null }  (fresh — no history chain)
    systemRecord.provenance = [{ type: "branch", direction: "target", ... }]
```

### Branch Creation (from snapshot boundary)

```
BEFORE:
  Source Plot has snapshot chain:
    Working File → Snapshot B → Snapshot A

OPERATION: branchFrom(activityId = "act-K")  where act-K is the last entry in Snapshot A

AFTER:
  Source Plot (updated system record only):
    systemRecord.branches += newBranchRecord
    systemRecord.provenance += { type: "branch", direction: "source", ... }

  New Branch Plot (new STAC Item):
    features = deep copy of Snapshot A's features (geometry reflects state at A)
    features[0..N].properties.provenance = []  (clean — snapshot features have no provenance)
    systemRecord.branchOrigin = { sourceAsset: "../source/plot.geojson", ... }
    systemRecord.snapshotLinks = { prev: null, next: null }
    systemRecord.provenance = [{ type: "branch", direction: "target", ... }]
```

### Nested Branching (branch-of-branch)

```
BEFORE:
  Branch Plot A (itself a branch):
    systemRecord.branchOrigin = { sourceAsset: "../original/plot.geojson", ... }
    features[0..N].properties.provenance = [entry1, ..., entryP]

OPERATION: branchFrom(activityId = "act-J")  where J ≤ P

AFTER:
  Branch Plot A (updated):
    systemRecord.branches = [newBranchRecord]
    systemRecord.provenance += { type: "branch", direction: "source", ... }

  New Branch Plot B (new STAC Item):
    features[0..N].properties.provenance = [entry1, ..., entryJ]  (trimmed)
    systemRecord.branchOrigin = { sourceAsset: "../branch-a/plot.geojson", ... }
    (points to Branch A, not to original)
```

## Validation Rules

| Rule | Scope | Description |
|------|-------|-------------|
| V-001 | BranchRecord.branchId | Must be a non-empty string matching pattern `branch-[a-z0-9]+` |
| V-002 | BranchRecord.branchedFrom | Must be a valid activityId present in the plot's Log history |
| V-003 | BranchRecord.targetAsset | Must be a valid relative path to an existing GeoJSON file |
| V-004 | BranchOrigin.sourceAsset | Must be a valid relative path to the source plot's GeoJSON |
| V-005 | Bidirectional integrity | If source has `BranchRecord` with `branchId X`, the target must have `BranchOrigin` with matching `branchId X` |
| V-006 | Branch uniqueness | No two `BranchRecord` entries in the same system record may share the same `branchId` |
| V-007 | Branch provenance | Both source and branch system records must have a `FileProvEntry` with `type: "branch"` and matching `branchId` |
| V-008 | Trimmed Log | Branch plot's Log entries must all have timestamps ≤ the branch point entry's timestamp |
| V-009 | Branch independence | After creation, changes to source do not propagate to branch and vice versa |
