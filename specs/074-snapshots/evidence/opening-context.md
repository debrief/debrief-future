## What We're Building

The log recording service (#071) captures every tool execution against features in a plot. That's useful, but provenance arrays grow. After a long analysis session with dozens of operations, you want a way to draw a line under the work so far and start fresh -- without losing access to what came before.

Snapshots are that line. When an analyst creates a snapshot, the system saves a clean copy of the current plot as a STAC asset (all provenance stripped from spatial features), links it to the working file via a doubly-linked chain through system records, then resets the working file's provenance arrays so the next session starts clean. The chain is navigable in both directions -- backward for "show me what I did last Tuesday" and forward for impact tracing when something upstream changes.

## How It Fits

This is Phase 4 of the PROV logging implementation. Phase 1 (#070) defined the provenance schema. Phase 3 (#071) built the recording service. Snapshots consume that infrastructure and add the checkpoint layer that Phases 5 and 6 (branching and replay) will build on. The snapshot files live as STAC assets alongside the working plot -- same Item, same catalog, no new storage concepts. The `snapshotService` extends the existing Log Service's dependency injection pattern, keeping everything testable with mocks.

## Key Decisions

- **Snapshots as STAC assets, not separate Items**: A snapshot is an asset with `roles: ["snapshot"]` inside the same STAC Item as the working plot. This keeps the catalog structure clean and means existing STAC tooling can discover them.
- **Write-then-link for atomicity**: We write the snapshot file to disk first. Only if that succeeds do we update the chain links in memory. If the write fails (disk full, permissions), nothing changes -- no half-linked chain.
- **"Capture from here" trims, doesn't replay**: When an analyst snapshots from a mid-session entry, we trim the provenance arrays rather than reconstructing state by replaying tools. The feature geometry already reflects all operations; we only need to decide which provenance entries go to the snapshot and which stay in the working file.
- **Lazy loading via entry count**: Each chain link carries a `provEntryCount` field. The Log Panel can display "Show earlier history (12 earlier operations)" without loading the snapshot file. The actual GeoJSON is only fetched when the analyst clicks through.
- **System record created on demand**: Older plots without a system record get one created automatically during the first snapshot. No migration scripts needed.
- **No new dependencies**: The entire feature builds on existing stacService methods and the Log Service's DI pattern from #071.
