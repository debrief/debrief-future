# Tasks: Reorganize STAC Store to Per-Item Folders

**Input**: Design documents from `/specs/040-stac-store-organization/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/040-stac-store-organization/evidence/`
**Media Directory**: `specs/040-stac-store-organization/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for migration tests | After all tests pass |
| usage-example.md | Python code migrating a flat store | After migration works |
| before-after.md | Directory listing before/after migration | After test data migrated |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (done) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (done) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create the new module file and test file

- [x] T001 Create migration module `services/stac/src/debrief_stac/migrate.py`
- [x] T002 [P] Create migration test file `services/stac/tests/test_migrate.py`

---

## Phase 2: Foundation — Migration Function (P1)

**Goal**: Implement `migrate_flat_store()` that converts a flat STAC store to per-item folders

**Independent Test**: Run `pytest services/stac/tests/test_migrate.py` — all tests pass on a temp directory fixture

### Tests

- [x] T003 [test] Write test: migrate store with items in `items/` subdirectory `services/stac/tests/test_migrate.py`
- [x] T004 [P][test] Write test: migration is idempotent (running twice is no-op) `services/stac/tests/test_migrate.py`
- [x] T005 [P][test] Write test: catalog.json item links updated correctly `services/stac/tests/test_migrate.py`
- [x] T006 [P][test] Write test: item.json self/parent/root links updated `services/stac/tests/test_migrate.py`
- [x] T007 [P][test] Write test: asset hrefs remain correct `services/stac/tests/test_migrate.py`
- [x] T008 [P][test] Write test: empty items/ directory removed after migration `services/stac/tests/test_migrate.py`
- [x] T009 [P][test] Write test: assets/ subdirectory created in each item folder `services/stac/tests/test_migrate.py`

### Implementation

- [x] T010 Implement `migrate_flat_store()` function `services/stac/src/debrief_stac/migrate.py`
- [x] T011 Run tests and fix until all pass `services/stac/tests/test_migrate.py`

**Checkpoint**: Migration function works on synthetic test fixtures

---

## Phase 3: CLI Integration (P2)

**Goal**: Expose migration via JSON-RPC CLI

**Independent Test**: Send JSON-RPC `migrate_store` request via stdin and verify response

- [x] T012 [test] Write test for `handle_migrate_store` JSON-RPC handler `services/stac/tests/test_cli.py`
- [x] T013 Add `handle_migrate_store` to CLI handlers `services/stac/src/debrief_stac/cli.py`
- [x] T014 Add `migrate_store` to method dispatch map `services/stac/src/debrief_stac/cli.py`
- [x] T015 Run CLI tests and fix until passing `services/stac/tests/test_cli.py`

**Checkpoint**: Migration callable via JSON-RPC

---

## Phase 4: Migrate Test Data (P3)

**Goal**: Convert VS Code test data from flat to per-item folder structure

**Independent Test**: VS Code extension tests pass with migrated test data

- [x] T016 Capture before-state directory listing of `apps/vscode/test-data/local-store/`
- [x] T017 Run migration against `apps/vscode/test-data/local-store/`
- [x] T018 Verify migrated structure: `exercise-alpha/item.json`, `training-run-1/item.json`
- [x] T019 Verify `assets/` subdirectories created
- [x] T020 Verify `items/` directory removed
- [x] T021 Run existing VS Code extension tests to confirm no breakage
- [x] T022 Update any VS Code test fixtures that reference old paths `apps/vscode/tests/`

**Checkpoint**: Test data migrated, all existing tests pass

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Evidence, media, and PR

### Evidence Collection (REQUIRED)

- [x] T023 Create evidence directory `specs/040-stac-store-organization/evidence/`
- [x] T024 Capture test summary with pass/fail counts `specs/040-stac-store-organization/evidence/test-summary.md`
- [x] T025 Record usage example demonstrating migration `specs/040-stac-store-organization/evidence/usage-example.md`
- [x] T026 [P] Capture before/after directory listing `specs/040-stac-store-organization/evidence/before-after.md`

### Media Content

- [x] T027 Create shipped blog post `specs/040-stac-store-organization/media/shipped-post.md`
- [x] T028 [P] Create LinkedIn shipped summary `specs/040-stac-store-organization/media/linkedin-shipped.md`

### PR Creation

- [x] T029 Create PR and publish blog: run /speckit.pr

**Task T029 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Migration Function)**: Depends on Phase 1
- **Phase 3 (CLI)**: Depends on Phase 2 (imports migrate function)
- **Phase 4 (Migrate Data)**: Depends on Phase 2 (uses migrate function)
- **Phase 5 (Polish)**: Depends on Phases 2-4 complete

### Parallel Opportunities

- Phase 3 and Phase 4 can run in parallel (both depend only on Phase 2)
- Within Phase 2: all test tasks (T003-T009) can run in parallel
- Within Phase 5: evidence tasks T024-T026 can run in parallel

---

## Implementation Strategy

### MVP First (Phase 2 Only)

1. Complete Phase 1: Setup files
2. Complete Phase 2: Migration function with tests
3. **STOP and VALIDATE**: Tests pass on synthetic fixtures
4. Proceed to Phase 3 + 4

### Incremental Delivery

1. Setup → Migration function → Tests pass (MVP)
2. Add CLI handler → JSON-RPC tests pass
3. Migrate test data → VS Code tests pass
4. Evidence + Media → PR

---

## Notes

- [P] tasks = different files, no dependencies
- The Python `debrief-stac` service already uses per-item folders for `create_plot()` — this migration handles legacy flat stores only
- Constitution compliance: source files moved intact (Article III), offline-only (Article I)
- Run `/speckit.pr` after all tasks complete to create PR with evidence
