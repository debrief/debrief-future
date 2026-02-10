# Usage Example: Snapshots with Doubly-Linked Chain

**Feature**: 074-snapshots

## Creating a Snapshot Service

```typescript
import { createSnapshotService } from '@debrief/session-state';

// Wire up with real dependencies (VS Code extension)
const snapshotService = createSnapshotService({
  loadGeoJson: (s, i) => stacService.loadGeoJsonForItem(s, i),
  writeSnapshotAsset: (s, i, f, d) => stacService.writeSnapshotAsset(s, i, f, d),
  loadSnapshotGeoJson: (s, i, a) => stacService.loadSnapshotGeoJson(s, i, a),
  writeGeoJson: (s, i, fc) => stacService.writeGeoJson(s, i, fc),
  markDirty: () => store.getState().markDirty(),
});
```

## US1: Creating a Standard Snapshot

```typescript
// Create a clean checkpoint of the current plot state
const result = await snapshotService.createSnapshot(storePath, itemPath);

console.log(result);
// {
//   snapshotAsset: "plot-snap-2026-02-09T14-30-00.geojson",
//   entriesCaptured: 12,
//   entriesRemaining: 0,
//   timestamp: "2026-02-09T14:30:00.000Z"
// }

// After snapshot:
// - Clean GeoJSON saved as STAC asset (no provenance on spatial features)
// - Working file's provenance arrays cleared (fresh Log session)
// - Doubly-linked chain: working file ↔ snapshot
```

## US2: Detecting and Loading Earlier History

```typescript
// Check if a snapshot boundary exists
const boundary = await snapshotService.getSnapshotBoundary(storePath, itemPath);

if (boundary) {
  console.log(`Show earlier history (${boundary.provEntryCount} earlier operations)`);
  // Output: "Show earlier history (12 earlier operations)"

  // User clicks "Show earlier history"
  const { entries, nextBoundary } = await snapshotService.loadSnapshotEntries(
    storePath, itemPath, boundary.asset
  );

  console.log(`Loaded ${entries.length} entries from previous snapshot`);
  // Output: "Loaded 12 entries from previous snapshot"

  if (nextBoundary) {
    console.log(`Another ${nextBoundary.provEntryCount} entries available`);
  }
}
```

## US3: Capture Snapshot from a Specific Entry

```typescript
// Analyst selects entry "act-005" in the Log Panel
const result = await snapshotService.createSnapshot(storePath, itemPath, {
  fromEntryId: 'act-005',
});

console.log(result);
// {
//   snapshotAsset: "plot-snap-2026-02-09T15-00-00.geojson",
//   entriesCaptured: 5,   // entries 1-5 go to snapshot
//   entriesRemaining: 7,  // entries 6-12 stay in working file
//   timestamp: "2026-02-09T15:00:00.000Z"
// }
```

## US4: Cross-Snapshot Timeline Assembly

```typescript
// Load current plot
const currentFC = await stacService.loadGeoJsonForItem(storePath, itemPath);

// Load entries from previous snapshot
const { entries: prevEntries } = await snapshotService.loadSnapshotEntries(
  storePath, itemPath, 'plot-snap-2026-02-09T14-30-00.geojson'
);

// Assemble unified timeline
const fullTimeline = snapshotService.assembleCrossSnapshotTimeline(
  currentFC,
  { previousEntries: prevEntries }
);

console.log(`Full timeline: ${fullTimeline.length} entries (deduplicated, sorted)`);
// Output: "Full timeline: 17 entries (deduplicated, sorted)"
```

## System Record After Snapshot

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [] },
  "properties": {
    "featureType": "system",
    "snapshotLinks": {
      "prev": {
        "asset": "plot-snap-2026-02-09T14-30-00.geojson",
        "provEntryCount": 12
      },
      "next": null
    },
    "branches": [],
    "provenance": [
      {
        "activityId": "a1b2c3d4-...",
        "type": "snapshot",
        "timestamp": "2026-02-09T14:30:00.000Z",
        "asset": "plot-snap-2026-02-09T14-30-00.geojson",
        "branchId": null,
        "direction": null
      }
    ]
  }
}
```
