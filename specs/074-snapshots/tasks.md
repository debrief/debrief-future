# Tasks: Snapshots with Doubly-Linked Chain

**Input**: Design documents from `/specs/074-snapshots/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution requires unit tests for service code (Article VI).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected.

**Evidence Directory**: `specs/074-snapshots/evidence/`
**Media Directory**: `specs/074-snapshots/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with pass/fail counts | After all tests pass |
| usage-example.md | Code example showing snapshot creation and chain navigation | After US1 + US2 complete |
| snapshot-chain-demo.json | Sample STAC Item with working file + 2 snapshots | After US1 complete |
| system-record-before-after.json | System record state before/after snapshot | After US1 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Type definitions and schema fixtures needed by all phases

- [x] T001 [US1] Add snapshot-related types to session-state log types `services/session-state/src/log/types.ts`
  - Add: `SnapshotRef`, `SnapshotLinks`, `FileProvEntry`, `SystemRecordProperties`
  - Add: `CreateSnapshotOptions`, `SnapshotResult`, `SnapshotBoundary`, `SnapshotEntriesResult`
  - Add: `CrossSnapshotTimelineOptions`
  - Reference: `specs/074-snapshots/contracts/snapshot-types.ts`
- [x] T002 [P] Add multi-snapshot chain golden fixture `shared/schemas/fixtures/system-record/valid/snapshot-chain.json`
  - Chain of 3 files: Snapshot A → Snapshot B → Working File
  - Each with correct prev/next links and provEntryCount values
- [x] T003 [P] Add snapshot-boundary golden fixture `shared/schemas/fixtures/system-record/valid/snapshot-boundary.json`
  - Working file with single prev snapshot link, demonstrating boundary detection

**Checkpoint**: Types and fixtures ready — foundation can begin

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Pure helper functions and stacService extensions that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation

> **NOTE**: Write tests FIRST, ensure they FAIL before implementation

- [x] T004 [test] Write tests for pure helper functions `services/session-state/src/log/__tests__/snapshotHelpers.test.ts`
  - `findSystemRecord()` — finds system record, returns null if missing
  - `createSystemRecord()` — creates minimal system record with correct structure
  - `stripSpatialProvenance()` — strips spatial features, preserves system record provenance
  - `countLogEntries()` — counts unique entries across features (deduplicates on activityId)
  - `generateSnapshotFilename()` — generates correct format with hyphens replacing colons

### Implementation for Foundation

- [x] T005 Create snapshot helpers module with pure functions `services/session-state/src/log/snapshotHelpers.ts`
  - `findSystemRecord(fc)` — find feature with `properties.featureType === "system"`
  - `createSystemRecord()` — minimal system record Feature with empty snapshotLinks/branches/provenance
  - `stripSpatialProvenance(fc)` — deep clone, clear provenance on spatial features, preserve system record
  - `countLogEntries(fc)` — count unique activityIds across all spatial features
  - `generateSnapshotFilename(timestamp?)` — `plot-snap-{ISO-with-hyphens}.geojson`
  - `normaliseProvenance(prov)` — reuse #071 pattern for legacy single-object handling
- [x] T006 Add `writeSnapshotAsset()` method to stacService `apps/vscode/src/services/stacService.ts`
  - Thin wrapper around `addResultAsset()` with `roles: ["snapshot"]`
  - Adds `debrief:snapshotTimestamp` metadata property
- [x] T007 [P] Add `loadSnapshotGeoJson()` method to stacService `apps/vscode/src/services/stacService.ts`
  - Resolve asset filename to full path via item.json asset registry
  - Load and return FeatureCollection, or null if not found
- [x] T008 [P] Add `writeGeoJson()` method to stacService `apps/vscode/src/services/stacService.ts`
  - Overwrite the working GeoJSON file with updated FeatureCollection
  - Invalidate cache after write
- [x] T009 Verify all foundation tests pass

**Checkpoint**: Foundation ready — pure helpers tested, stacService extended. User story implementation can now begin.

---

## Phase 3: User Story 1 — Create a Snapshot Checkpoint (Priority: P1) MVP

**Goal**: Analyst creates a clean checkpoint, archiving current state with Log entries stripped, linked via doubly-linked chain, working file reset for fresh recording.

**Independent Test**: Create a plot with several Log entries, trigger a snapshot, verify: (a) clean GeoJSON with no provenance on spatial features, (b) working file's system record has `snapshotLinks.prev` pointing to snapshot, (c) snapshot's system record has `snapshotLinks.next` pointing to working file, (d) working file features have cleared provenance.

### Tests for User Story 1

> **NOTE**: Write tests FIRST, ensure they FAIL before implementation

- [x] T010 [test] Write unit tests for `createSnapshot()` `services/session-state/src/log/__tests__/snapshotService.test.ts`
  - Standard snapshot: clean file saved, provenance stripped, chain linked
  - First snapshot (no prior): prev=null on snapshot, prev=snapshot on working file
  - Second snapshot: chain of 3 files, previous snapshot's next updated
  - Empty plot (no Log entries): snapshot still created with provEntryCount=0
  - Missing system record: created on demand (FR-008)
  - Atomic failure: if writeSnapshotAsset throws, working file unchanged (FR-015)
  - File-level provenance recorded on system record (FR-007)
  - System record provenance preserved when clearing spatial features (FR-006)
  - markDirty() called after snapshot (FR-016)

### Implementation for User Story 1

- [x] T011 Create snapshot service factory with `createSnapshot()` `services/session-state/src/log/snapshotService.ts`
  - Define `SnapshotServiceDeps` interface (extends LogServiceDeps pattern)
  - Implement `createSnapshotService(deps)` factory function
  - Algorithm:
    1. Load working GeoJSON via deps.loadGeoJson
    2. Ensure system record exists (create if missing per FR-008)
    3. Count entries, build clean copy via stripSpatialProvenance
    4. Generate filename, write snapshot via deps.writeSnapshotAsset (atomic point)
    5. Set snapshot system record links (prev=previous snapshot, next=working file)
    6. Update previous snapshot's next link if exists (via loadSnapshotGeoJson + writeGeoJson)
    7. Clear provenance on working file spatial features
    8. Record file-level provenance entry of type "snapshot" on both system records (FR-007)
    9. Write updated working file via deps.writeGeoJson
    10. Call deps.markDirty() (FR-016)
  - Return SnapshotResult with snapshotAsset, entriesCaptured, entriesRemaining, timestamp
- [x] T012 Update LogService `createSnapshot` stub to delegate to snapshot service `services/session-state/src/log/logService.ts`
  - Replace `throw "Not implemented"` with note to use snapshotService directly
  - Or wire snapshotService.createSnapshot through LogService deps
- [x] T013 Export snapshot service from session-state package index `services/session-state/src/index.ts`
  - Export `createSnapshotService`, `SnapshotServiceDeps`, `SnapshotService`
  - Export snapshot types from types.ts
- [x] T014 Verify US1 tests pass — all snapshot creation scenarios green

**Checkpoint**: Standard snapshot creation works. Clean GeoJSON saved, chain linked, working file reset.

---

## Phase 4: User Story 2 — Navigate Earlier History in Log Panel (Priority: P2)

**Goal**: Log Panel detects snapshot boundary and displays entry count. On click, previous snapshot's entries are loaded and appended to the timeline.

**Independent Test**: Create a plot, record ops, take snapshot, record more ops. Verify: (a) boundary detected with correct count, (b) loading returns previous entries, (c) entries are appended in chronological order.

### Tests for User Story 2

- [x] T015 [test] Write unit tests for `getSnapshotBoundary()` `services/session-state/src/log/__tests__/snapshotService.test.ts`
  - Returns boundary with asset + provEntryCount when prev link exists
  - Returns null when no previous snapshot
  - Returns null when snapshotLinks is null
- [x] T016 [P][test] Write unit tests for `loadSnapshotEntries()` `services/session-state/src/log/__tests__/snapshotService.test.ts`
  - Loads entries from snapshot file
  - Returns next boundary if snapshot has its own prev link
  - Returns null boundary at chain end
  - Handles missing snapshot file gracefully (throws descriptive error)

### Implementation for User Story 2

- [x] T017 Add `getSnapshotBoundary()` to snapshot service `services/session-state/src/log/snapshotService.ts`
  - Load working GeoJSON, find system record
  - Read `snapshotLinks.prev` — return `{ asset, provEntryCount }` or null
  - No snapshot file loading required (lazy — just reads the link)
- [x] T018 Add `loadSnapshotEntries()` to snapshot service `services/session-state/src/log/snapshotService.ts`
  - Load snapshot GeoJSON via deps.loadSnapshotGeoJson
  - Extract Log entries from all features using assembleTimeline (existing #071 function)
  - Find snapshot's own system record, read its snapshotLinks.prev for next boundary
  - Return `{ entries, nextBoundary }`
  - Throw descriptive error if snapshot file not found
- [x] T019 Verify US2 tests pass — boundary detection and entry loading green

**Checkpoint**: Snapshot boundary detection works. Entries loadable on demand without modifying snapshot files.

---

## Phase 5: User Story 3 — Capture Snapshot from a Specific Entry (Priority: P3)

**Goal**: Analyst selects a Log entry and creates a snapshot at that point. Entries after the selected point remain in the working file.

**Independent Test**: Create plot with 5 entries, select entry 3, capture snapshot. Verify: (a) snapshot has provEntryCount=3, (b) working file retains entries 4-5, (c) chain correctly maintained.

### Tests for User Story 3

- [x] T020 [test] Write unit tests for "capture from here" `services/session-state/src/log/__tests__/snapshotService.test.ts`
  - Capture at entry 3 of 5: snapshot provEntryCount=3, working file retains entries 4-5
  - Capture at last entry: equivalent to standard snapshot (all entries captured)
  - Capture at first entry: snapshot has 1 entry's worth, working file retains rest
  - Invalid entry ID: throws descriptive error
  - Provenance arrays trimmed correctly per feature (entries after K removed from snapshot features)

### Implementation for User Story 3

- [x] T021 Add `fromEntryId` support to `createSnapshot()` `services/session-state/src/log/snapshotService.ts`
  - When `options.fromEntryId` provided:
    1. Find the entry by activityId across all features
    2. Determine entry index K in the timeline
    3. For snapshot: strip all provenance (same as standard — clean file)
    4. For working file: trim provenance arrays to keep only entries with timestamp > entry K's timestamp
    5. Set provEntryCount on snapshot link = K (entries captured)
    6. Set provEntryCount on working file link = total - K (entries remaining)
  - Add helper: `trimProvenanceAfterEntry(fc, entryId)` — returns FC with only post-entry provenance
- [x] T022 Verify US3 tests pass — "capture from here" scenarios green

**Checkpoint**: Partial snapshots work. Analyst can create checkpoints at any point in the timeline.

---

## Phase 6: User Story 4 — Cross-Snapshot Timeline Assembly (Priority: P4)

**Goal**: When earlier history is loaded across snapshot boundaries, produce a unified, chronologically sorted, deduplicated timeline.

**Independent Test**: Create chain of 3 snapshots, load full history. Verify: (a) all entries in chronological order, (b) no duplicate activityIds, (c) boundary markers at correct positions.

### Tests for User Story 4

- [x] T023 [test] Write unit tests for cross-snapshot timeline assembly `services/session-state/src/log/__tests__/timeline.test.ts`
  - Merge current + one snapshot: entries sorted, deduplicated
  - Merge current + two snapshots (chain of 3): all entries present in order
  - Deduplication on activityId: multi-feature operations appear once
  - Empty previous entries: returns current entries unchanged
  - Existing assembleTimeline tests still pass (no regression)

### Implementation for User Story 4

- [x] T024 Add `assembleCrossSnapshotTimeline()` to snapshot service `services/session-state/src/log/snapshotService.ts`
  - Accept `currentFeatures` FeatureCollection + optional `previousEntries: LogEntry[]`
  - Merge previous entries into timeline assembly
  - Deduplicate on activityId (first occurrence wins, consistent with #071)
  - Sort by timestamp ascending
  - Pure function — no I/O
- [x] T025 Extend `assembleTimeline()` in timeline.ts to accept optional previousEntries parameter `services/session-state/src/log/timeline.ts`
  - Backward-compatible: existing callers without options still work
  - When previousEntries provided, merge into the dedup map before scanning features
- [x] T026 Verify US4 tests pass — cross-snapshot assembly green, no regression on existing timeline tests

**Checkpoint**: All user stories independently functional. Full snapshot chain navigable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, evidence collection, media, and PR

### Edge Case Hardening

- [x] T027 Handle legacy `properties.provenance` single objects during snapshot `services/session-state/src/log/snapshotHelpers.ts`
  - Normalise to arrays before stripping (consistent with #071 migration approach)
  - Add test case for legacy format
- [x] T028 [P] Verify existing #071 Log Service tests pass without modification `services/session-state/src/log/__tests__/`
  - Run full test suite — no regression from snapshot additions (SC-008)

### Evidence Collection

- [x] T029 Capture test summary in `specs/074-snapshots/evidence/test-summary.md`
  - Total tests, passed/failed/skipped, coverage percentage
  - Key scenarios verified (per acceptance criteria SC-001 through SC-008)
- [x] T030 Create usage demonstration in `specs/074-snapshots/evidence/usage-example.md`
  - Code example: create snapshot service with mock deps, call createSnapshot, inspect result
  - Code example: detect boundary, load entries, assemble cross-snapshot timeline
- [x] T031 [P] Capture snapshot chain sample in `specs/074-snapshots/evidence/snapshot-chain-demo.json`
  - Real or mock STAC Item with working file + 2 snapshot assets
  - Show item.json with snapshot asset entries (roles: ["snapshot"])
- [x] T032 [P] Capture system record state in `specs/074-snapshots/evidence/system-record-before-after.json`
  - Before: working file with 3 provenance entries, no snapshots
  - After: working file with empty provenance, prev link to new snapshot

### Media Content

- [x] T033 Create shipped blog post in `specs/074-snapshots/media/shipped-post.md`
- [x] T034 [P] Create LinkedIn shipped summary in `specs/074-snapshots/media/linkedin-shipped.md`

### PR Creation

- [x] T035 Create PR and publish blog: run /speckit.pr

**Task T035 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 completion — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — MVP target
- **Phase 4 (US2)**: Depends on Phase 2 (can run in parallel with US1 if desired, but US1 provides the snapshot data US2 reads)
- **Phase 5 (US3)**: Depends on Phase 3 (extends createSnapshot with fromEntryId)
- **Phase 6 (US4)**: Depends on Phase 2 (can run in parallel with US1-US3, pure function)
- **Phase 7 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundation → Create snapshot → MVP checkpoint
- **US2 (P2)**: Foundation → Boundary detection + entry loading (reads from snapshots created by US1)
- **US3 (P3)**: US1 → Extends createSnapshot with partial capture
- **US4 (P4)**: Foundation → Cross-snapshot timeline (pure function, can develop in parallel)

### Within Each User Story

- Tests written FIRST and verified to FAIL
- Pure functions before service methods
- Service methods before integration
- All story tests pass before moving to next

### Parallel Opportunities

- T002 + T003 (fixtures) can run in parallel
- T006 + T007 + T008 (stacService methods) — T007 and T008 can run in parallel
- T015 + T016 (US2 tests) can run in parallel
- US4 (Phase 6) can be developed in parallel with US2/US3 since it's a pure function
- T031 + T032 (evidence) can run in parallel
- T033 + T034 (media) can run in parallel

---

## Parallel Example: Foundation Phase

```
# All stacService methods can be implemented in parallel (different method additions):
Task T006: writeSnapshotAsset() in stacService
Task T007: [P] loadSnapshotGeoJson() in stacService
Task T008: [P] writeGeoJson() in stacService
```

## Parallel Example: Evidence Collection

```
# All evidence artifacts can be captured in parallel (different files):
Task T031: [P] snapshot-chain-demo.json
Task T032: [P] system-record-before-after.json
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, fixtures)
2. Complete Phase 2: Foundation (helpers, stacService)
3. Complete Phase 3: User Story 1 (createSnapshot)
4. **STOP and VALIDATE**: Create a snapshot, verify clean file and chain links
5. This alone delivers the core capability: clean checkpoints with doubly-linked chain

### Incremental Delivery

1. Setup + Foundation → Types and helpers ready
2. Add US1 → Snapshot creation works → **MVP!**
3. Add US2 → History navigation works (boundary + loading)
4. Add US3 → "Capture from here" works (extends US1)
5. Add US4 → Cross-snapshot timeline assembly
6. Polish → Evidence, media, PR
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- Constitution Article VI: Services require unit tests — all service functions tested
- Constitution Article III: Provenance always — snapshot creation records file-level provenance entry
