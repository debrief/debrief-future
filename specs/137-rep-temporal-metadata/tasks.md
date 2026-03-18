# Tasks: REP Loader Temporal Metadata

**Input**: Design documents from `/specs/137-rep-temporal-metadata/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/update-temporal-metadata.md

**Tests**: Tests are included — the spec requires test coverage for multi-track, single-track, no-track, single-position, and overlapping-tracks scenarios (SC-006).

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/137-rep-temporal-metadata/evidence/`
**Media Directory**: `specs/137-rep-temporal-metadata/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with all temporal scenarios | After all tests pass |
| usage-example.md | Python code calling update_temporal_metadata() | After service complete |
| sample-request.json | MCP tool call with catalog_path and plot_id | After MCP tool works |
| sample-response.json | TemporalExtent response JSON | After MCP tool works |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Create evidence directory and verify existing infrastructure

- [ ] T001 Create evidence directory `specs/137-rep-temporal-metadata/evidence/`
- [ ] T002 Verify existing plot.py, models.py, mcp_server.py, and stacService.ts exist at expected paths

**Checkpoint**: Paths confirmed, ready for implementation

---

## Phase 2: Foundation — PlotMetadata Model Extension

**Purpose**: Extend the PlotMetadata model with temporal fields — blocks all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Extend PlotMetadata with start_datetime and end_datetime optional fields `services/stac/src/debrief_stac/models.py`

**Checkpoint**: PlotMetadata model accepts temporal extent fields

---

## Phase 3: User Story 1 — Accurate temporal extent on loaded plots (Priority: P1)

**Goal**: When a REP file is loaded, the resulting STAC Item has accurate `start_datetime` and `end_datetime` computed from track features.

**Independent Test**: Load a REP file with known timestamps, inspect the STAC Item properties, verify `start_datetime` and `end_datetime` match expected values.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [test] Write test for multi-track temporal extent computation `services/stac/tests/test_plot.py`
- [ ] T005 [P][test] Write test for single-track temporal extent `services/stac/tests/test_plot.py`
- [ ] T006 [P][test] Write test for overlapping track time ranges `services/stac/tests/test_plot.py`

### Implementation for User Story 1

- [ ] T007 Implement update_temporal_metadata() function in plot.py `services/stac/src/debrief_stac/plot.py`
- [ ] T008 Wire update_temporal_metadata into create_plot or post-add workflow `services/stac/src/debrief_stac/plot.py`
- [ ] T009 Verify US1 tests pass

**Checkpoint**: Multi-track and single-track REP files produce correct start_datetime/end_datetime on their STAC Items

---

## Phase 4: User Story 2 — Representative datetime for single-value consumers (Priority: P1)

**Goal**: The `datetime` field is set to the exercise start time (earliest track timestamp) rather than load time.

**Independent Test**: Load a REP file, verify `datetime` equals the earliest track timestamp.

### Tests for User Story 2

- [ ] T010 [test] Write test verifying datetime equals earliest track start_time `services/stac/tests/test_plot.py`

### Implementation for User Story 2

- [ ] T011 [US2] Ensure update_temporal_metadata sets datetime to min(start_time) `services/stac/src/debrief_stac/plot.py`
- [ ] T012 [US2] Verify US2 tests pass

**Checkpoint**: `datetime` reflects exercise start time, not file load time

---

## Phase 5: User Story 3 — Graceful handling of temporal edge cases (Priority: P2)

**Goal**: REP files with no tracks, or tracks lacking timestamps, fall back to current behaviour without errors.

**Independent Test**: Load a REP file with no tracks and verify `datetime` = creation time, no `start_datetime`/`end_datetime`.

### Tests for User Story 3

- [ ] T013 [test] Write test for no-track REP file (returns None, item unchanged) `services/stac/tests/test_plot.py`
- [ ] T014 [P][test] Write test for single-position track (start == end) `services/stac/tests/test_plot.py`
- [ ] T015 [P][test] Write test for tracks without temporal properties (skipped) `services/stac/tests/test_plot.py`

### Implementation for User Story 3

- [ ] T016 [US3] Add edge case handling in update_temporal_metadata `services/stac/src/debrief_stac/plot.py`
- [ ] T017 [US3] Verify US3 tests pass

**Checkpoint**: All edge cases handled gracefully, no regressions

---

## Phase 6: MCP Tool & TypeScript Delegation

**Purpose**: Expose the Python function via MCP and delegate the existing TypeScript implementation to it

- [ ] T018 Add update_temporal_metadata MCP tool wrapper `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T019 [test] Write integration test for full workflow (create → add features → update temporal) `services/stac/tests/test_integration.py`
- [ ] T020 Replace stacService.ts updateTemporalMetadata body with MCP call `apps/vscode/src/services/stacService.ts`
- [ ] T021 Verify integration test passes

**Checkpoint**: Full pipeline works end-to-end: Python computes temporal metadata, TypeScript delegates via MCP

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [ ] T022 Capture test results using template (.specify/templates/evidence/test-summary-template.md) `specs/137-rep-temporal-metadata/evidence/test-summary.md`
- [ ] T023 Create usage demonstration `specs/137-rep-temporal-metadata/evidence/usage-example.md`
- [ ] T024 [P] Capture sample MCP request JSON `specs/137-rep-temporal-metadata/evidence/sample-request.json`
- [ ] T025 [P] Capture sample MCP response JSON `specs/137-rep-temporal-metadata/evidence/sample-response.json`

### Media Content

- [ ] T026 Create shipped blog post `specs/137-rep-temporal-metadata/media/shipped-post.md`
- [ ] T027 [P] Create LinkedIn shipped summary `specs/137-rep-temporal-metadata/media/linkedin-shipped.md`

### PR Creation

- [ ] T028 Create PR and publish blog: run /speckit.pr

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — core temporal extent
- **Phase 4 (US2)**: Depends on Phase 3 — datetime is set inside same function
- **Phase 5 (US3)**: Depends on Phase 2 — edge cases can parallel with US1/US2 but safer sequential
- **Phase 6 (MCP + TS)**: Depends on Phases 3-5 — needs complete Python function
- **Phase 7 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (P1)**: Core function — must be first
- **US2 (P1)**: Built into same function as US1, verified separately
- **US3 (P2)**: Edge case handling — extends US1/US2 function with guards

### Within Each Phase

- Tests MUST be written and FAIL before implementation
- Model changes before function changes
- Python service before MCP tool
- MCP tool before TypeScript delegation

### Parallel Opportunities

- T005, T006 can run in parallel with T004 (all test writing, same file but distinct test functions)
- T014, T015 can run in parallel with T013
- T024, T025 can run in parallel (evidence capture)
- T027 can run in parallel with T026

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests in parallel:
Task T004: "Multi-track temporal extent test"
Task T005: "Single-track temporal extent test"
Task T006: "Overlapping tracks temporal extent test"

# Then implement sequentially:
Task T007: "Implement update_temporal_metadata()"
Task T008: "Wire into workflow"
Task T009: "Verify tests pass"
```

---

## Implementation Strategy

### Incremental Delivery

1. Phase 1-2 → Foundation ready (model extended)
2. Phase 3 → Core temporal extraction works (US1 testable)
3. Phase 4 → datetime correctness verified (US2 testable)
4. Phase 5 → Edge cases handled (US3 testable)
5. Phase 6 → Full MCP pipeline and TS delegation
6. Phase 7 → Evidence, media, PR

### Key Files Modified

| File | Changes |
|------|---------|
| `services/stac/src/debrief_stac/models.py` | Add `start_datetime`, `end_datetime` to PlotMetadata |
| `services/stac/src/debrief_stac/plot.py` | Add `update_temporal_metadata()` function |
| `services/stac/src/debrief_stac/mcp_server.py` | Add MCP tool wrapper |
| `services/stac/tests/test_plot.py` | Add 6+ temporal metadata tests |
| `services/stac/tests/test_integration.py` | Add workflow integration test |
| `apps/vscode/src/services/stacService.ts` | Delegate to MCP instead of direct I/O |

---

## Notes

- [P] tasks = different files or independent test functions, no dependencies
- All temporal values are UTC ISO 8601 strings
- No new packages or dependencies required
- No schema changes — uses existing STAC properties
- No UI changes — backend service feature
- Run `/speckit.pr` after all tasks complete to create PR with evidence
