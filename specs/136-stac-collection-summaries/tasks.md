# Tasks: STAC Collection Summaries for Browser Backend

**Input**: Design documents from `/specs/136-stac-collection-summaries/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Tests are included — the constitution (Article VI) mandates service unit tests and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Review Decisions Applied**: This task list incorporates decisions from `/speckit.review`:
- 2A: Summary update receives in-memory catalog dict (no disk re-read)
- 3B: Cross-platform file locking on catalog writes
- 4B: Atomic writes (temp file + rename) for `_save_catalog`
- 5B: Split models into `CollectionExtent` + `CollectionSummaries`
- 6B: Strict failure on malformed items during rebuild
- 9A: Dedicated link traversal for rebuild (reads only item.json)
- 11A: Cross-platform lock helper (`fcntl` on Unix, `msvcrt` on Windows)

---

## Evidence Requirements

**Evidence Directory**: `specs/136-stac-collection-summaries/evidence/`
**Media Directory**: `specs/136-stac-collection-summaries/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results with all collection summary tests | After all tests pass |
| usage-example.md | Python code demonstrating promotion and summary reads | After US3 complete |
| sample-request.json | MCP tool call for read_collection_summaries | After MCP tool works |
| sample-response.json | MCP tool response with extent + summaries | After MCP tool works |
| validation-output.txt | Collection JSON validated against collection-schema.json | After US1 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify existing structure and add scaffolding for new files

- [ ] T001 Create collection module skeleton `services/stac/src/debrief_stac/collection.py`
- [ ] T002 Create collection test file skeleton `services/stac/tests/test_collection.py`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Core infrastructure changes that ALL user stories depend on. File locking, atomic writes, and shared models.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Infrastructure: Atomic Writes + File Locking (Review Issues 3B, 4B, 11A)

- [ ] T003 Add cross-platform file locking helper (`_lock_file`/`_unlock_file` using `fcntl` on Unix, `msvcrt` on Windows) `services/stac/src/debrief_stac/catalog.py`
- [ ] T004 Modify `_save_catalog` to use atomic writes (write to temp file, then `os.rename`) and file locking `services/stac/src/debrief_stac/catalog.py`
- [ ] T005 [test] Write atomic write resilience test (verify partial write doesn't corrupt catalog.json) `services/stac/tests/test_catalog.py`
- [ ] T006 [test] Write file locking concurrency test (two threads writing — second blocks until first completes) `services/stac/tests/test_catalog.py`

### Models + Types

- [ ] T007 Add `STACCollection` type alias to types.py `services/stac/src/debrief_stac/types.py`
- [ ] T008 [P] Add `CollectionExtent` Pydantic model (bbox, temporal_start, temporal_end) to models.py `services/stac/src/debrief_stac/models.py`
- [ ] T009 [P] Add `CollectionSummaries` Pydantic model (vessel_classes, tags, feature_tags, track_names, nationalities — enumerations only) to models.py `services/stac/src/debrief_stac/models.py`

### Core Collection Logic

- [ ] T010 Implement `_extract_item_extent(item_data: STACItem) -> tuple[BoundingBox | None, str | None, str | None]` — extracts bbox and temporal range from an item `services/stac/src/debrief_stac/collection.py`
- [ ] T011 [P] Implement `_extract_item_summaries(item_data: STACItem) -> dict[str, list[str]]` — extracts debrief:* extension properties from item `services/stac/src/debrief_stac/collection.py`
- [ ] T012 Implement `_merge_extent(current_extent: dict | None, item_bbox: BoundingBox | None, item_start: str | None, item_end: str | None) -> dict` — incremental extent expansion `services/stac/src/debrief_stac/collection.py`
- [ ] T013 [P] Implement `_merge_summaries(current_summaries: dict | None, item_summaries: dict[str, list[str]]) -> dict` — incremental enumeration union `services/stac/src/debrief_stac/collection.py`
- [ ] T014 Add module-level ASCII data flow diagram comment documenting incremental vs rebuild paths `services/stac/src/debrief_stac/collection.py`

**Checkpoint**: Foundation ready — models, types, infrastructure, and helper functions in place. User story implementation can now begin.

---

## Phase 3: User Story 1 — Automatic Collection Summaries on Item Mutation (Priority: P1)

**Goal**: When an analyst saves a plot or adds features, the parent catalog automatically updates summaries (temporal range, spatial extent, extension property enumerations).

**Independent Test**: Create a catalog, add multiple items with varying properties, then read the catalog and verify its summaries accurately reflect the aggregate of all contained items.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T015 [test] Test: empty catalog → create_plot → catalog becomes Collection with summaries matching single item `services/stac/tests/test_collection.py`
- [ ] T016 [P][test] Test: Collection with 3 items → add 4th with later date and new vessel class → summaries expand without re-reading existing items `services/stac/tests/test_collection.py`
- [ ] T017 [P][test] Test: add_features expands item bbox beyond current Collection extent → Collection spatial extent updated `services/stac/tests/test_collection.py`
- [ ] T018 [P][test] Test: item with null bbox excluded from spatial extent calculation `services/stac/tests/test_collection.py`
- [ ] T019 [P][test] Test: item with datetime but no start_datetime/end_datetime → datetime used as both start and end `services/stac/tests/test_collection.py`
- [ ] T020 [P][test] Test: item missing debrief:* extension properties → contributes nothing to summaries, no error `services/stac/tests/test_collection.py`
- [ ] T021 [P][test] Test: summaries arrays are sorted alphabetically for deterministic output `services/stac/tests/test_collection.py`
- [ ] T022 [P][test] Test: Collection output validates against contracts/collection-schema.json `services/stac/tests/test_collection.py`

### Implementation for User Story 1

- [ ] T023 Implement `update_collection_summaries(catalog_data: STACCatalog, item_data: STACItem, operation: Literal["add", "update"]) -> None` — mutates catalog_data in place, promoting Catalog→Collection if needed (Review 2A: in-memory dict) `services/stac/src/debrief_stac/collection.py`
- [ ] T024 Implement `rebuild_collection_summaries(catalog_data: STACCatalog, catalog_path: CatalogPath) -> None` — full scan of all items via dedicated link traversal (Review 9A: reads only item.json, not features.geojson). Strict failure on malformed items (Review 6B). Handle dangling links (FileNotFoundError → PlotNotFoundError). `services/stac/src/debrief_stac/collection.py`
- [ ] T025 Hook `update_collection_summaries` into `create_plot()` — call after `_add_item_link`, before `_save_catalog` `services/stac/src/debrief_stac/plot.py`
- [ ] T026 [P] Hook `update_collection_summaries` into `add_features()` — call after bbox/property update, before save `services/stac/src/debrief_stac/features.py`
- [ ] T027 [P] Hook `update_collection_summaries` into `update_features()` — call after feature update, before save `services/stac/src/debrief_stac/features.py`
- [ ] T028 [test] Integration test: create_plot → add_features → verify Collection summaries match expected aggregate `services/stac/tests/test_integration.py`
- [ ] T029 [test] Integration test: update_features expanding bbox → verify Collection extent updated `services/stac/tests/test_integration.py`

**Checkpoint**: Catalogs auto-promote to Collections on writes. Summaries update incrementally for adds/updates. Core P1 story complete.

---

## Phase 4: User Story 2 — Backwards-Compatible Catalog Loading (Priority: P2)

**Goal**: Pre-existing catalogs without summaries load correctly. On next write, they're promoted to Collections with summaries computed from all existing items.

**Independent Test**: Load a catalog.json with `type: "Catalog"` (no summaries), verify it loads without errors, then write and verify promotion.

### Tests for User Story 2

- [ ] T030 [test] Test: open_catalog with `type: "Catalog"` (no summaries) loads without errors `services/stac/tests/test_catalog.py`
- [ ] T031 [P][test] Test: create_plot on pre-existing Catalog → promotes to Collection with summaries from all existing items (full scan) `services/stac/tests/test_collection.py`
- [ ] T032 [P][test] Test: promoted Collection retains all existing link relations (root, self, child, item) `services/stac/tests/test_collection.py`

### Implementation for User Story 2

- [ ] T033 Ensure `open_catalog()` handles both `type: "Catalog"` and `type: "Collection"` transparently (verify existing code, add guard if needed) `services/stac/src/debrief_stac/catalog.py`
- [ ] T034 Ensure promotion path in `update_collection_summaries` triggers `rebuild_collection_summaries` when catalog has no existing summaries `services/stac/src/debrief_stac/collection.py`
- [ ] T035 Add comment documenting hook ordering requirement: extension property population must happen before summary update (Review 7A) `services/stac/src/debrief_stac/collection.py`

**Checkpoint**: Old catalogs load cleanly. Promotion is transparent on next write. US2 complete.

---

## Phase 5: User Story 3 — Summary Data Available for CQL2 Filter Validation (Priority: P3)

**Goal**: CQL2 filter engine reads Collection summaries to validate filter ranges and populate filter UI — all without loading individual items.

**Independent Test**: Read a Collection's summaries and verify they contain temporal range, spatial extent, and extension property enumerations.

### Tests for User Story 3

- [ ] T036 [test] Test: read_collection_summaries returns CollectionExtent + CollectionSummaries for a promoted Collection `services/stac/tests/test_collection.py`
- [ ] T037 [P][test] Test: read_collection_summaries returns None for a Catalog that hasn't been promoted `services/stac/tests/test_collection.py`
- [ ] T038 [P][test] Test: MCP tool `read_collection_summaries` returns expected response format `services/stac/tests/test_mcp.py`

### Implementation for User Story 3

- [ ] T039 Implement `read_collection_summaries(path: CatalogPath) -> tuple[CollectionExtent, CollectionSummaries] | None` `services/stac/src/debrief_stac/collection.py`
- [ ] T040 Add MCP tool `read_collection_summaries_tool` in mcp_server.py following existing tool registration pattern `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T041 [P] Add TypeScript `StacCollection` interface (extends StacCatalog with extent, summaries, license) `apps/vscode/src/types/stac.ts`
- [ ] T042 [P] Add TypeScript `StacExtent` and `StacSummaries` interfaces `apps/vscode/src/types/stac.ts`
- [ ] T043 [P] Add `StacCatalogOrCollection` union type `apps/vscode/src/types/stac.ts`

**Checkpoint**: Summaries are readable via Python API and MCP. TypeScript consumers have typed interfaces. US3 complete.

---

## Phase 6: User Story 4 — Summary Accuracy After Item Deletion (Priority: P4)

**Goal**: When an item is removed, summaries are recalculated from remaining items (full rebuild since deletions can contract ranges).

**Independent Test**: Create a Collection with 3 items where one defines the maximum extent, delete it, verify summaries contract.

### Tests for User Story 4

- [ ] T044 [test] Test: delete item with latest end date → temporal range contracts to remaining items `services/stac/tests/test_collection.py`
- [ ] T045 [P][test] Test: delete item with unique vessel class → class removed from summaries `services/stac/tests/test_collection.py`
- [ ] T046 [P][test] Test: delete all items → temporal range and spatial extent absent, enumerations empty `services/stac/tests/test_collection.py`
- [ ] T047 [P][test] Test: dangling item link during rebuild → PlotNotFoundError raised (not raw FileNotFoundError) `services/stac/tests/test_collection.py`

### Implementation for User Story 4

- [ ] T048 Hook `rebuild_collection_summaries` into `delete_features()` — call after feature deletion when item's bbox or extension properties may have changed `services/stac/src/debrief_stac/features.py`
- [ ] T049 Handle zero-items edge case in rebuild: clear extent/summaries but keep Collection type `services/stac/src/debrief_stac/collection.py`
- [ ] T050 [test] Integration test: create 3 items → delete one defining max extent → verify summaries contract correctly `services/stac/tests/test_integration.py`

**Checkpoint**: Deletions trigger full rebuild. Summaries always reflect current state. US4 complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validation, evidence collection, documentation, and PR creation.

### Validation

- [ ] T051 Run `task verify` (lint + typecheck + test) and fix any failures
- [ ] T052 Validate quickstart.md examples still work with implemented API `specs/136-stac-collection-summaries/quickstart.md`
- [ ] T053 Add note in plan.md about extension property population dependency (Review 1B) `specs/136-stac-collection-summaries/plan.md`
- [ ] T054 Add backlog entry for "Item extension property population" (deferred work from review) `BACKLOG.md`

### Evidence Collection

- [ ] T055 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/136-stac-collection-summaries/evidence/test-summary.md`
- [ ] T056 Create usage demonstration showing promotion flow and summary reads `specs/136-stac-collection-summaries/evidence/usage-example.md`
- [ ] T057 [P] Capture sample MCP request JSON `specs/136-stac-collection-summaries/evidence/sample-request.json`
- [ ] T058 [P] Capture sample MCP response JSON with extent + summaries `specs/136-stac-collection-summaries/evidence/sample-response.json`
- [ ] T059 [P] Capture Collection JSON validation output against collection-schema.json `specs/136-stac-collection-summaries/evidence/validation-output.txt`

### Media Content

- [ ] T060 Create shipped blog post `specs/136-stac-collection-summaries/media/shipped-post.md`
- [ ] T061 [P] Create LinkedIn shipped summary `specs/136-stac-collection-summaries/media/linkedin-shipped.md`

### PR Creation

- [ ] T062 Create PR and publish blog: run /speckit.pr

**Task T062 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundation — core promotion and incremental updates
- **US2 (Phase 4)**: Depends on Foundation + US1 (uses promotion logic from US1)
- **US3 (Phase 5)**: Depends on Foundation + US1 (reads summaries created by US1)
- **US4 (Phase 6)**: Depends on Foundation + US1 (uses rebuild logic from US1)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundation — no dependencies on other stories
- **US2 (P2)**: Depends on US1 (promotion logic must exist before testing backwards compat)
- **US3 (P3)**: Depends on US1 (summaries must exist before reading them)
- **US4 (P4)**: Depends on US1 (rebuild logic must exist before deletion hook)
- **US3 and US4**: Can run in parallel after US1 completes

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Helper functions before public functions
- Hooks into existing modules after new logic is implemented
- Integration tests after unit tests pass

### Parallel Opportunities

- T008 + T009: CollectionExtent and CollectionSummaries models (different classes, no dependency)
- T010 + T011: extract_item_extent and extract_item_summaries (different data, no dependency)
- T012 + T013: merge_extent and merge_summaries (independent merge logic)
- T015–T022: All US1 unit tests (different test functions)
- T026 + T027: add_features and update_features hooks (different files)
- T041 + T042 + T043: All TypeScript type additions (same file but independent interfaces)
- T057 + T058 + T059: Evidence artifacts (independent captures)

---

## Parallel Example: Foundation Phase

```
# Launch model tasks in parallel:
T008: CollectionExtent model → models.py
T009: CollectionSummaries model → models.py

# Launch extraction helpers in parallel:
T010: _extract_item_extent → collection.py
T011: _extract_item_summaries → collection.py

# Launch merge helpers in parallel:
T012: _merge_extent → collection.py
T013: _merge_summaries → collection.py
```

## Parallel Example: After US1 Completes

```
# US3 and US4 can run in parallel:
Thread A: US3 (read summaries, MCP tool, TypeScript types)
Thread B: US4 (deletion hooks, rebuild, zero-items edge case)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Infrastructure ready (atomic writes, locking, models)
2. Add US1 → Core promotion and incremental summaries work
3. Add US2 → Backwards compatibility verified
4. Add US3 + US4 (parallel) → Read API + deletion accuracy
5. Polish → Evidence, media, PR

### Key Technical Notes

- **In-memory dict pattern (Review 2A)**: `update_collection_summaries` mutates the catalog dict in place. Callers pass their in-memory catalog data, then call `_save_catalog` once after all mutations are complete. This avoids stale reads and double disk writes.
- **Strict failure (Review 6B)**: `rebuild_collection_summaries` raises on malformed items. Dangling links raise `PlotNotFoundError`.
- **Hook ordering (Review 7A)**: If a future feature populates `debrief:*` extension properties on items during `add_features`, that population must happen BEFORE `update_collection_summaries` is called. Document this ordering in collection.py.
- **Cross-platform locking (Review 11A)**: `_lock_file`/`_unlock_file` helpers use `fcntl.flock` on Unix and `msvcrt.locking` on Windows, selected via `os.name == 'nt'`.

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- Tests MUST fail before implementation (Article VII)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
