---
layout: future-post
title: "Shipped: Branching from History"
date: 2026-02-10
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, prov-logging, branching]
excerpt: "Fork analysis paths from any point in history. Branch plots are independent STAC Items with two-way navigation and trimmed provenance."
---

## What We Built

Select any entry in your analysis log, click "Branch from here," and get a new, independent plot whose state matches that moment in history. The branch plot accumulates its own log, takes its own snapshots, and can spawn further branches. Both plots know about each other — the source records the branch, the branch records its origin — so you can navigate between them and compare results.

The BranchService implements three user stories: create branches from log entries (US1), navigate between source and branch (US2), and branch from snapshot boundaries (US3). 33 unit tests, all passing, zero regressions to the existing 292 tests across the session-state package.

## How It Works

The core branching operation takes two paths depending on where the entry lives in history.

For entries in the current working segment, it's a deep-copy operation with provenance trimming. The feature geometry already reflects all operations up to now — we don't need to reconstruct anything. The service loads the source GeoJSON, deep-copies the FeatureCollection, walks every feature's `properties.provenance` array, and trims it to entries up to the branch point. If you branch from entry 8 out of 15, the branch plot gets entries 1-8. Everything after that is discarded.

For entries at snapshot boundaries, the service loads the snapshot's GeoJSON directly. Snapshots are already clean, saved states with trimmed provenance. If you branch from a snapshot boundary, that snapshot is your starting point — no trimming needed, no replay required.

The two-way link system uses distinct record types. The source plot gets a `BranchRecord` in its system feature's `branches[]` array:

```json
{
  "branchId": "branch-a1b2c3d4",
  "branchedFrom": "act-008",
  "createdAt": "2026-02-10T16:00:00.000Z",
  "branchAsset": "../plot-alpha-branch-a1b2c3d4/plot.geojson"
}
```

The branch plot gets a `BranchOrigin` in its system feature's `branchOrigin` field:

```json
{
  "sourceAsset": "../plot-alpha/plot.geojson",
  "branchedFrom": "act-008"
}
```

Both plots also get a file-level provenance entry with `type: "branch"`. When the UI lists branches or displays "Return to source," it reads these records. Relative paths keep everything portable — move the collection folder and the links still work.

Branches are independent STAC Items, not assets within the source Item. A branch gets its own directory, its own `plot.geojson`, its own snapshot chain. This means branches show up as separate plots in catalog listings and can be opened, worked on, and saved independently.

The write-then-link atomicity pattern (same as snapshots) means we write the branch plot to disk first, then update the source's system record only on success. If the write fails, the source plot remains unchanged. No orphaned references, no corrupted metadata.

## Lessons Learned

Pre-snapshot arbitrary branching got deferred to Phase 6. Initially, we thought we could branch from any entry in the full history. We can, but only if the entry sits at a snapshot boundary. Branching from entry 7 inside a snapshot that spans entries 1-20 would require loading the snapshot and replaying entries 1-7 to reconstruct the state at entry 7. That's the replay engine, which is Phase 6 work.

So for this phase, pre-snapshot branches are limited to snapshot boundaries. The service detects the case via `locateBranchPoint()` and returns a clear error: `REPLAY_NOT_AVAILABLE`. When the replay engine lands, we'll update the branching code to use it.

The branch-of-branch case worked identically to first-level branching, which meant no special-case logic. A branch plot has a `branchOrigin` field instead of `branches[]`? Doesn't matter. The branching algorithm only cares about the current plot's GeoJSON and log. It creates a new branch that points back to the immediate parent, not to the root. This means unbounded nesting depth, which felt risky at first but turned out to be fine — the provenance chain always unambiguously identifies ancestry.

Dependency injection made testing straightforward, exactly as it did for snapshots and the log service. The test suite mocks `loadGeoJson`, `writeGeoJson`, `loadSnapshotGeoJson`, and `createItem`, verifies the outputs, never touches the filesystem. Test execution time: 27ms.

## What's Next

Phase 6 of the PROV logging epic is the replay engine. Once that lands, arbitrary pre-snapshot branching becomes possible — select any entry in a previous snapshot, and the system loads the appropriate snapshot, replays up to the branch point, and creates the branch. That's the final piece for full-history branching.

The Log Panel UI (already in place from #072) gets a "Branch from here" button wired to `branchService.branchFrom()`. The catalog overview panel will need a way to show branch relationships — probably a tree view or branch badges on plot listings. But the plumbing is done.

→ [See the code](https://github.com/debrief/debrief-future/tree/main/specs/075-branching)
