# Tasks: Import Handler Warnings for Unregistered Platforms

**Input**: Design documents from `/specs/182-import-platform-warnings/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are included — constitution requires unit and integration tests for all service code (Article VI).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing. US1 and US2 are combined into one phase because they are inseparable — the same code that emits warnings (US1) also ensures the import never blocks (US2).

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/182-import-platform-warnings/evidence/`
**Media Directory**: `specs/182-import-platform-warnings/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest results for unit + integration tests | After all tests pass |
| usage-example.md | Python code showing import with warnings | After pipeline integration complete |
| sample-warnings.json | Example ImportResult.warnings output | After pipeline integration complete |

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

**Purpose**: Add the `debrief-data` dependency so the import pipeline can access the platform registry.

- [x] T001 Add `debrief-data` to dependencies in `services/io/pyproject.toml`
- [x] T002 Run `uv sync` to install the new dependency

---

## Phase 2: Foundation — Validation Function (Blocking)

**Purpose**: Implement the core `_validate_platform_ids()` function and its unit tests. This function is shared by all user stories.

**CRITICAL**: No user story integration can begin until this phase is complete.

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [test] Create unit test file `services/io/tests/test_platform_validation.py`
- [x] T004 [P][test] Test: all registered platforms produce no warnings `services/io/tests/test_platform_validation.py`
- [x] T005 [P][test] Test: unregistered platform produces warning with correct code and message `services/io/tests/test_platform_validation.py`
- [x] T006 [P][test] Test: empty and whitespace-only platform IDs are skipped `services/io/tests/test_platform_validation.py`
- [x] T007 [P][test] Test: duplicate platform IDs across features produce only one warning `services/io/tests/test_platform_validation.py`
- [x] T008 [P][test] Test: case-sensitive lookup ("nelson" vs "NELSON") `services/io/tests/test_platform_validation.py`
- [x] T009 [P][test] Test: features with no platform_id property are skipped `services/io/tests/test_platform_validation.py`

### Implementation

- [x] T010 Implement `_validate_platform_ids()` function in `services/io/src/debrief_io/import_catalog.py`
- [x] T011 Verify all unit tests pass

**Checkpoint**: Validation function works in isolation. All unit tests green.

---

## Phase 3: User Stories 1 & 2 — Core Warnings + Non-Blocking Import (Priority: P1)

**Goal**: After importing a file, unregistered platform IDs produce `UNREGISTERED_PLATFORM` warnings. The import always succeeds regardless of registry coverage.

**Independent Test**: Import a file with a mix of registered and unregistered platforms. Verify warnings are emitted for unregistered ones and all tracks are present in the output.

### Tests

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [test] Add integration test: import REP file with registered platforms — no UNREGISTERED_PLATFORM warnings `services/io/tests/test_import_catalog.py`
- [x] T013 [P][test] Add integration test: import REP file with unregistered platforms — correct warnings emitted and import succeeds `services/io/tests/test_import_catalog.py`
- [x] T014 [P][test] Add integration test: import DPF file with unregistered platforms — correct warnings emitted and import succeeds `services/io/tests/test_import_catalog.py`
- [x] T015 [P][test] Add integration test: registry unavailable — REGISTRY_UNAVAILABLE warning emitted, import still succeeds `services/io/tests/test_import_catalog.py`

### Implementation

- [x] T016 Add registry loading with graceful fallback at the start of `import_legacy_data()` in `services/io/src/debrief_io/import_catalog.py`
- [x] T017 Call `_validate_platform_ids()` after each file parse in `import_legacy_data()` `services/io/src/debrief_io/import_catalog.py`
- [x] T018 Verify all integration tests pass
- [x] T019 Verify all existing import tests still pass (regression check)

**Checkpoint**: Core feature works end-to-end. Import with mixed platforms produces correct warnings. Import never fails due to registry gaps.

---

## Phase 4: User Story 3 — Consolidated Warning Summary (Priority: P2)

**Goal**: Each unregistered platform ID produces at most one warning per source file, regardless of how many track positions reference it.

**Independent Test**: Import a file with many position records for one unregistered platform. Verify exactly one warning is produced.

### Tests

- [x] T020 [test] Add integration test: file with many positions for one unregistered platform — exactly one warning `services/io/tests/test_import_catalog.py`
- [x] T021 [P][test] Add integration test: file with multiple unregistered platforms — exactly one warning per unique ID `services/io/tests/test_import_catalog.py`

### Implementation

> Deduplication is already built into `_validate_platform_ids()` (Phase 2, T010 — uses a `set()` of unique IDs). These tests verify the behaviour at the integration level.

- [x] T022 Verify deduplication integration tests pass

**Checkpoint**: Warning deduplication verified at both unit and integration levels.

---

## Phase 5: User Story 4 — Warning Includes Source File Context (Priority: P3)

**Goal**: Each unregistered-platform warning identifies the source file, enabling triage in batch imports.

**Independent Test**: Import multiple files in a batch where different files contain different unregistered platforms. Verify each warning references the correct source file.

### Tests

- [x] T023 [test] Add integration test: batch import with different unregistered platforms in different files — each warning references correct source file `services/io/tests/test_import_catalog.py`

### Implementation

> File attribution is already built into `_validate_platform_ids()` (Phase 2, T010 — `file_rel` parameter populates `ImportWarning.file`). This test verifies the behaviour at the integration level.

- [x] T024 Verify source file attribution integration test passes

**Checkpoint**: All user stories complete and independently verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full verification, evidence collection, media content, and PR creation.

### Verification

- [x] T025 Run `task verify` (lint + typecheck + full test suite) and fix any failures
- [x] T026 Verify quickstart.md steps match actual implementation `specs/182-import-platform-warnings/quickstart.md`

### Evidence Collection

- [x] T027 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/182-import-platform-warnings/evidence/test-summary.md`
- [x] T028 Create usage demonstration in `specs/182-import-platform-warnings/evidence/usage-example.md`
- [x] T029 [P] Capture sample warning output in `specs/182-import-platform-warnings/evidence/sample-warnings.json`

### Media Content

- [x] T030 Create shipped blog post in `specs/182-import-platform-warnings/media/shipped-post.md`
- [x] T031 [P] Create LinkedIn shipped summary in `specs/182-import-platform-warnings/media/linkedin-shipped.md`

### PR Creation

- [ ] T032 Create PR and publish blog: run /speckit.pr

**Task T032 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Phase 2 — core feature implementation
- **US3 (Phase 4)**: Depends on Phase 2 — can run in parallel with Phase 3
- **US4 (Phase 5)**: Depends on Phase 2 — can run in parallel with Phase 3 and 4
- **Polish (Phase 6)**: Depends on Phases 3, 4, and 5 all complete

### User Story Dependencies

- **US1+US2 (P1)**: Depend on Foundation (Phase 2). No dependencies on other stories.
- **US3 (P2)**: Depends on Foundation (Phase 2). Can run in parallel with US1+US2 since it tests the same validation function from a different angle.
- **US4 (P3)**: Depends on Foundation (Phase 2). Can run in parallel with US1+US2 and US3.

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Implementation validates against those tests
- Phase complete when all tests pass

### Parallel Opportunities

- T004–T009 (unit tests) can all run in parallel
- T012–T015 (integration tests for US1+US2) can run in parallel
- T020–T021 (deduplication tests for US3) can run in parallel
- Phases 3, 4, and 5 can run in parallel after Phase 2 completes
- T029, T031 can run in parallel with other evidence/media tasks

---

## Parallel Example: Foundation Phase

```bash
# Launch all unit tests in parallel:
Task: T004 "Test: all registered platforms produce no warnings"
Task: T005 "Test: unregistered platform produces warning"
Task: T006 "Test: empty/whitespace IDs skipped"
Task: T007 "Test: duplicate IDs produce one warning"
Task: T008 "Test: case-sensitive lookup"
Task: T009 "Test: features without platform_id skipped"

# Then implement (sequential):
Task: T010 "Implement _validate_platform_ids()"
Task: T011 "Verify all unit tests pass"
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1**: Add dependency → ready to import registry
2. **Phase 2**: Write unit tests (they fail) → implement validation function → tests pass
3. **Phase 3**: Write integration tests (they fail) → wire into import pipeline → tests pass
4. **Phase 4**: Write deduplication integration tests → verify they pass (no new code expected)
5. **Phase 5**: Write file attribution integration test → verify it passes (no new code expected)
6. **Phase 6**: Full verification, evidence, media, PR

### Key Insight

The core implementation is compact: one function (~20 lines) + one integration point (~10 lines). The bulk of the work is in testing — 7 unit tests + 6 integration tests verify all user stories, edge cases, and acceptance criteria. Phases 4 and 5 are verification-only phases: the deduplication and file attribution behaviours are already built into the validation function (Phase 2), and these phases confirm they work correctly through the full pipeline.

---

## Notes

- [P] tasks = different files or independent concerns, no dependencies
- Each user story is independently testable via its integration tests
- The validation function handles all edge cases (empty IDs, deduplication, case sensitivity) — unit tests verify each in isolation
- Registry loading with graceful fallback is the only code that modifies `import_legacy_data()` beyond calling the validation function
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
