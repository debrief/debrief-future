# Usage Example: Branching from History Point

**Feature**: 075-branching

## Creating a Branch Service

```typescript
import { createBranchService } from '@debrief/session-state/log';
import type { BranchServiceDeps } from '@debrief/session-state/log';

// Wire dependencies (same pattern as SnapshotService)
const branchService = createBranchService({
  loadGeoJson: stacService.loadGeoJsonForItem.bind(stacService),
  writeSnapshotAsset: stacService.writeSnapshotAsset.bind(stacService),
  loadSnapshotGeoJson: stacService.loadSnapshotGeoJson.bind(stacService),
  writeGeoJson: stacService.writeGeoJson.bind(stacService),
  markDirty: () => store.getState().markDirty(),
  createItem: (storePath, title) => stacService.createItem(storePath, { title }),
  generateBranchId: () => `branch-${crypto.randomUUID().slice(0, 8)}`,
});
```

## Branch from a Log Entry (US1)

```typescript
// Analyst selects entry "act-008" in the Log Panel and clicks "Branch from here"
const result = await branchService.branchFrom(
  '/catalogs/exercise-alpha',
  'plot-alpha/item.json',
  { activityId: 'act-008' }
);

console.log(result);
// {
//   branchId: 'branch-a1b2c3d4',
//   branchItemPath: 'plot-alpha-branch-a1b2c3d4/item.json',
//   branchGeoJsonPath: '/catalogs/exercise-alpha/plot-alpha-branch-a1b2c3d4/plot.geojson',
//   branchedFrom: 'act-008',
//   entriesIncluded: 8,
//   timestamp: '2026-02-10T16:00:00.000Z'
// }
```

## Navigate Between Source and Branch (US2)

```typescript
// From the source plot: list all branches
const branches = await branchService.getBranches(
  '/catalogs/exercise-alpha',
  'plot-alpha/item.json'
);
// [{ branchId: 'branch-a1b2c3d4', branchedFrom: 'act-008', ... }]

// From the branch plot: find the source
const origin = await branchService.getBranchOrigin(
  '/catalogs/exercise-alpha',
  'plot-alpha-branch-a1b2c3d4/item.json'
);
// { sourceAsset: '../plot-alpha/plot.geojson', branchedFrom: 'act-008', ... }
```

## Locate a Branch Point (US3)

```typescript
// Check where an entry lives in the history
const location = await branchService.locateBranchPoint(
  '/catalogs/exercise-alpha',
  'plot-alpha/item.json',
  'act-003'
);

// Possible results:
// { type: 'current-segment', entryIndex: 2 }           -- in working file
// { type: 'snapshot-boundary', snapshotAsset: '...' }   -- at snapshot edge
// { type: 'pre-snapshot-arbitrary', ... }                -- needs replay (Phase 6)
// null                                                   -- not found
```

## Error Handling

```typescript
try {
  await branchService.branchFrom(storePath, itemPath, { activityId: 'nonexistent' });
} catch (err) {
  switch ((err as any).code) {
    case 'ENTRY_NOT_FOUND':
      // Entry doesn't exist in history
      break;
    case 'REPLAY_NOT_AVAILABLE':
      // Mid-snapshot entry requires Phase 6 replay
      break;
    case 'SNAPSHOT_NOT_FOUND':
      // Referenced snapshot file is missing
      break;
    case 'WRITE_FAILED':
      // Disk write failed (branch plot not created)
      break;
    case 'SOURCE_LOAD_FAILED':
      // Source plot couldn't be loaded
      break;
  }
}
```
