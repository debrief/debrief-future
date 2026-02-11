# Research: Branching from History Point

**Feature**: 075-branching | **Date**: 2026-02-10

## Research Questions

### R1: How should the branch plot be stored as a STAC Item?

**Decision**: Create a new STAC Item in the same Collection as the source plot, with a separate directory containing its own `item.json` and `plot.geojson`.

**Rationale**: Branches are independent plots. They need their own STAC Item identity so they can:
- Be opened, saved, and closed independently
- Accumulate their own assets (results, future snapshots)
- Appear in catalog listings as separate plots

The source and branch are linked via system record metadata, not STAC relationships. This avoids introducing STAC extension dependencies.

**Alternatives considered**:
- Storing the branch GeoJSON as an asset of the source STAC Item (like snapshots) — rejected because branches are independent, mutable plots that accumulate their own history, assets, and snapshots. They are not read-only archives.
- Using STAC Link objects to connect source and branch — rejected as over-engineering; the system record's `branches[]` and `branchOrigin` fields are simpler and already defined in the schema.

**Naming convention**: `plot-branch-{branchId}.geojson` for the working file inside the new Item. The Item directory uses the branch identifier (e.g., `plot-alpha-branch-{shortId}/`).

### R2: How should state be reconstructed for branches from current-segment entries?

**Decision**: Deep-copy the current working file's FeatureCollection and trim provenance arrays to entries up to and including the branch point. No tool replay needed.

**Rationale**: The working file's feature geometry and properties already reflect all operations. Branching at entry K means:
1. Deep-copy the current FeatureCollection
2. For each spatial feature, trim `properties.provenance` to entries with timestamps ≤ the branch point entry's timestamp (or by position relative to the branch entry's activityId)
3. The system record gets fresh branch metadata

This is the same insight from #074's "Capture snapshot from here" (A-005): current geometry already reflects all operations, so we only need to trim the Log, not reconstruct state from scratch.

**Alternatives considered**:
- Full replay from empty state — rejected; massively complex and unnecessary since geometry is already correct.

### R3: How should state be reconstructed for branches from pre-snapshot entries?

**Decision**: Load the snapshot containing the branch point, then apply the same trim-provenance approach.

**Algorithm**:
1. Navigate the snapshot chain backward from the working file until finding the snapshot whose entries include the branch point activityId
2. Load that snapshot's GeoJSON
3. Load Log entries from all snapshots between the branch point snapshot and the working file (using the cross-snapshot timeline from #074)
4. The branch point may fall within a specific snapshot's entries — trim those entries
5. The snapshot's geometry already reflects all operations up to its capture point, but the branch point may be before the snapshot's capture — in this case, state reconstruction requires replaying entries from the previous snapshot up to the branch point

**Key insight**: Snapshot "Capture from here" at entry K means the snapshot geometry reflects ALL operations (not just 1-K). Therefore, if the branch point is at entry K within a snapshot that captured entries 1-M, the geometry reflects operations through M, not K.

**Resolution**: For pre-snapshot branches where the branch point is not at the snapshot's last entry, we need the snapshot that captured state AT OR BEFORE the branch point, then replay entries from that point forward to the branch point. This uses the same replay infrastructure planned for Phase 6 (#076).

**Practical simplification**: For the initial implementation, restrict pre-snapshot branching to snapshot boundaries only (branch from the state captured by a specific snapshot). Branching from arbitrary entries within a snapshot's range requires replay, which is a Phase 6 capability. This is documented as a known limitation, not a NEEDS CLARIFICATION, because the spec already acknowledges replay dependency (FR-008, FR-013).

**Alternatives considered**:
- Requiring replay for all pre-snapshot branches — deferred to when Phase 6 replay engine exists
- Blocking pre-snapshot branching entirely — rejected; branching from snapshot boundaries is achievable without replay

### R4: How should two-way links be maintained?

**Decision**: Source uses `BranchRecord` in `system.branches[]`; branch uses a new `BranchOrigin` in `system.branchOrigin`.

**Source plot system record** (existing `BranchRecord` type from 074):
```json
{
  "branches": [
    {
      "branchId": "branch-alt-tma",
      "branchedFrom": "act-008",
      "branchedAt": "2026-02-10T16:00:00Z",
      "targetAsset": "plot-branch-alt-tma/plot.geojson"
    }
  ]
}
```

**Branch plot system record** (new `BranchOrigin` type):
```json
{
  "branchOrigin": {
    "sourceAsset": "../plot-alpha/plot.geojson",
    "branchedFrom": "act-008",
    "branchedAt": "2026-02-10T16:00:00Z",
    "branchId": "branch-alt-tma"
  }
}
```

Both system records also receive a `FileProvEntry` with `type: "branch"`:
- Source: `direction: "source"`, `branchId: "branch-alt-tma"`
- Branch: `direction: "target"`, `branchId: "branch-alt-tma"`

**Rationale**: Using existing types wherever possible (BranchRecord is already in the 074 contracts). The BranchOrigin is a new type because a branch has exactly one origin (1:1) while a source can have many branches (1:N).

**Alternatives considered**:
- Storing origin info in the branches array with a special flag — rejected; the 1:1 vs 1:N relationship is better modeled with distinct types.
- Using relative paths vs absolute paths — decided on relative paths for portability (catalogs can be moved).

### R5: How should the branch service interact with existing services?

**Decision**: Follow the dependency injection pattern from #071 and #074.

```typescript
interface BranchServiceDeps extends SnapshotServiceDeps {
  createItem: (storePath: string, collectionPath: string, itemId: string) => Promise<string>;
  writeGeoJson: (storePath: string, itemPath: string, fc: GeoJsonFeatureCollection) => Promise<void>;
  generateBranchId: () => string;
}
```

**Rationale**: The branch service needs all snapshot service capabilities (loading snapshots, navigating the chain) plus the ability to create new STAC Items. Extending SnapshotServiceDeps avoids duplicating dependency declarations.

**Alternatives considered**:
- Direct stacService import — rejected per 074 precedent; breaks testability
- Separate service unrelated to snapshot service — rejected; branching depends heavily on snapshot infrastructure

### R6: What is the branch identifier format?

**Decision**: `branch-{short-descriptor}` where the short descriptor is derived from a UUID suffix (first 8 characters).

Examples: `branch-a1b2c3d4`, `branch-e5f6g7h8`

**Rationale**: Branch IDs must be unique, filesystem-safe, and human-distinguishable. A UUID suffix provides uniqueness while keeping identifiers short. User-defined branch names are out of scope per the spec.

**Alternatives considered**:
- Sequential numbering (`branch-001`) — rejected; risk of collision across independent sessions
- Full UUID — rejected; too long for display and filesystem paths
- Timestamp-based — rejected; less human-distinguishable than short hash

### R7: How should nested branching (branch-of-branch) work?

**Decision**: Identical to branching from a source plot. The branch service does not distinguish between source and branch plots — it only reads the current plot's state, system record, and snapshot chain.

**Rationale**: A branch plot is a fully independent plot with its own system record, snapshot chain, and Log history. The branching algorithm operates on the current plot's data regardless of whether it is an original or a branch. The `branchOrigin` on the new branch points to its immediate parent (the branch plot), not the root.

**No special handling required**: The algorithm is the same.

## Integration Findings

### Existing Types to Reuse

| Type | Source | Purpose |
|------|--------|---------|
| `BranchRecord` | `074-snapshots/contracts/snapshot-types.ts` | Source-side branch metadata |
| `FileProvEntry` | `074-snapshots/contracts/snapshot-types.ts` | File-level provenance with `type: 'branch'` |
| `SnapshotServiceDeps` | `074-snapshots/contracts/snapshot-service.ts` | Base dependencies for snapshot chain navigation |
| `SnapshotBoundary` | `074-snapshots/contracts/snapshot-types.ts` | Snapshot boundary detection |
| `SystemRecordProperties` | `074-snapshots/contracts/snapshot-types.ts` | System record structure |

### New Types Required

| Type | Purpose |
|------|---------|
| `BranchOrigin` | Reverse link on branch plot's system record |
| `BranchResult` | Return type from `branchFrom()` |
| `BranchServiceDeps` | Dependencies extending SnapshotServiceDeps |
| `BranchService` | Service interface |

### stacService Extensions

| Method | Purpose | Notes |
|--------|---------|-------|
| `createBranchItem()` | Create a new STAC Item for the branch plot | Creates Item directory, writes `item.json`, writes `plot.geojson` |

### System Record Schema

The LinkML schema at `shared/schemas/src/linkml/system-record.yaml` already defines:
- `BranchRecord` with `branchId`, `branchedFrom`, `branchedAt`, `targetAsset`
- `FileProvEntry` with `type: 'snapshot' | 'branch'`, `branchId`, `direction`

New addition needed: `BranchOrigin` type with `sourceAsset`, `branchedFrom`, `branchedAt`, `branchId`. This extends the LinkML schema.

### Known Limitation: Pre-Snapshot Arbitrary Entry Branching

Branching from an arbitrary entry within a previous snapshot's range requires state reconstruction via tool replay (Phase 6 capability). The initial implementation supports:
- Branching from any entry in the current working file's segment (no replay needed)
- Branching from a snapshot boundary (snapshot geometry is already correct)

Branching from an arbitrary entry within a snapshot range will be enabled when Phase 6 (#076) provides the replay engine. The system reports "Branch from pre-snapshot entries requires replay (not yet available)" for unsupported cases.
