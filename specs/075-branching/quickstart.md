# Quickstart: Branching from History Point

**Feature**: 075-branching | **Date**: 2026-02-10

## Prerequisites

- Feature #070 (PROV Schema Foundation) complete — LinkML system record schema with `BranchRecord`, `FileProvEntry`
- Feature #071 (Log Recording Service) complete — Log Service with `branchFrom()` stub, `getTimeline()`, `recordToolResult()`
- Feature #074 (Snapshots) complete — Snapshot Service with chain navigation, `createSnapshot()`, `loadSnapshotEntries()`
- Golden fixtures exist for system records at `shared/schemas/fixtures/system-record/valid/`

## Implementation Sequence

### Step 1: Add BranchOrigin to Types

**File**: `services/session-state/src/log/types.ts`

Add the `BranchOrigin` interface alongside the existing types:

```typescript
export interface BranchOrigin {
  sourceAsset: string;
  branchedFrom: string;
  branchedAt: string;
  branchId: string;
}
```

Extend `SystemRecordProperties` to include `branchOrigin: BranchOrigin | null`.

### Step 2: Extend LinkML Schema

**File**: `shared/schemas/src/linkml/system-record.yaml`

Add `BranchOrigin` class and add `branchOrigin` slot to the system record class. Run generators to update derived schemas.

### Step 3: Add Golden Fixture

**File**: `shared/schemas/fixtures/system-record/valid/branched-system-record.json`

Create a fixture for a system record that has both `branches` (source side) and `branchOrigin` (branch side). Validate against generated JSON Schema.

### Step 4: Implement Branch Service

**File**: `services/session-state/src/log/branchService.ts`

Create the branch service following the factory pattern from snapshot service:

```typescript
export function createBranchService(deps: BranchServiceDeps): BranchService {
  return {
    async branchFrom(storePath, itemPath, collectionPath, options) {
      // 1. Load source plot
      // 2. Locate branch point (current segment or snapshot chain)
      // 3. Build branch FeatureCollection (deep-copy + trim provenance)
      // 4. Create system record with BranchOrigin
      // 5. Write branch as new STAC Item
      // 6. Update source system record with BranchRecord + FileProvEntry
      // 7. Mark dirty
    },
    // ... other methods
  };
}
```

Key pure helpers to implement:
- `trimProvenanceToEntry()` — deep-copy features, keep entries up to branch point
- `findEntryInFeatures()` — search for activityId across all feature provenance arrays
- `createBranchRecord()` — build the source-side metadata
- `createBranchOrigin()` — build the branch-side reverse link

### Step 5: Add stacService.createBranchItem()

**File**: `apps/vscode/src/services/stacService.ts`

Add a method to create a new STAC Item directory for the branch plot:

```typescript
async createBranchItem(
  storePath: string,
  collectionPath: string,
  itemId: string,
  geojson: GeoJsonFeatureCollection
): Promise<string> {
  // 1. Create directory: {collectionPath}/{itemId}/
  // 2. Write item.json with STAC Item metadata
  // 3. Write plot.geojson with the branch FeatureCollection
  // 4. Return path to the new Item directory
}
```

### Step 6: Wire branchFrom() into Log Service

**File**: `services/session-state/src/log/logService.ts`

Replace the `branchFrom()` stub (thrown by #071) with a call to the branch service:

```typescript
async branchFrom(activityId: string): Promise<string> {
  const result = await branchService.branchFrom(
    storePath, itemPath, collectionPath,
    { activityId }
  );
  return result.branchItemPath;
}
```

### Step 7: Write Unit Tests

**File**: `services/session-state/src/log/__tests__/branchService.test.ts`

Test cases (priority order):

1. **Branch from mid-point in current segment**: Create a plot with 5 entries, branch from entry 3. Verify: branch has 3 entries, source unchanged, two-way links correct.
2. **Branch from last entry**: Branch from entry 5. Verify: branch is a full duplicate with complete Log.
3. **Branch from first entry**: Branch from entry 1. Verify: branch has single entry.
4. **Branch from snapshot boundary**: Set up snapshot chain, branch from snapshot. Verify: branch contains snapshot state.
5. **Multiple branches from same source**: Create two branches from different points. Verify: both listed in source's branches[].
6. **Nested branching**: Branch from a branch. Verify: new branch's origin points to the branch, not the root.
7. **Entry not found**: Attempt to branch from non-existent activityId. Verify: error thrown.
8. **Pre-snapshot arbitrary entry**: Attempt to branch from mid-snapshot entry. Verify: error with REPLAY_NOT_AVAILABLE.

### Step 8: Verify No Regressions

Run existing test suites:
- `services/session-state/` — all Log Service and snapshot tests
- `shared/schemas/` — schema adherence tests with new fixture
- `services/calc/` — no changes expected, but verify

## Architecture Notes

### Why Deep-Copy + Trim (not Replay)

The branch algorithm copies the current feature geometry as-is and only trims the provenance arrays. This works because:

1. GeoJSON features already reflect all applied operations (geometry is cumulative)
2. Provenance is metadata about what happened, not the source of truth for state
3. Trimming provenance to entry K means "the branch knows about operations 1-K"
4. The feature geometry still reflects all operations through the current state, which is acceptable because the branch will diverge from here anyway

This avoids the complexity of tool replay entirely for current-segment branches.

### Pre-Snapshot Branching Limitation

For entries within a snapshot's range (not at the boundary), the geometry reflects state at the snapshot capture point, which may be after the desired branch point. Correctly branching from an arbitrary pre-snapshot entry requires:

1. Loading the snapshot before the branch point
2. Replaying Log entries from that snapshot forward to the branch point

This is Phase 6 (replay engine) functionality. The initial implementation limits pre-snapshot branching to snapshot boundaries and reports a clear error for other cases.

### Relative Paths for Portability

Branch links use relative paths (e.g., `../plot-alpha/plot.geojson`) so STAC catalogs can be relocated without breaking links. The stacService resolves relative paths to absolute at read time.
