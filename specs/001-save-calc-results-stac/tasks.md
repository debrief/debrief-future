# Tasks: Save Analysis Results to STAC

**Input**: Design documents from `/specs/001-save-calc-results-stac/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/001-save-calc-results-stac/evidence/`
**Media Directory**: `specs/001-save-calc-results-stac/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + VS Code test results | After all tests pass |
| usage-example.md | Save result workflow demonstration | After US1 complete |
| sample-result-item.json | Example saved STAC Item with provenance | After US1 complete |
| sample-features.geojson | Example result GeoJSON FeatureCollection | After US1 complete |

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

**Purpose**: Scaffolding for new modules

- [ ] T001 Create results module `services/stac/src/debrief_stac/results.py`
- [ ] T002 [P] Create results test file `services/stac/tests/test_results.py`
- [ ] T003 [P] Create save result command file `apps/vscode/src/commands/saveResult.ts`

---

## Phase 2: Foundation (Python debrief-stac service)

**Purpose**: Core `create_result()` and `result_exists()` functions that block all user stories

**⚠️ CRITICAL**: No VS Code extension work can begin until this phase is complete

### Tests for Foundation

- [ ] T004 [test] Write test: create_result produces valid STAC Item with debrief:kind=calc-result `services/stac/tests/test_results.py`
- [ ] T005 [P][test] Write test: create_result adds derived_from links for each source item ID `services/stac/tests/test_results.py`
- [ ] T006 [P][test] Write test: create_result stores tool metadata in properties `services/stac/tests/test_results.py`
- [ ] T007 [P][test] Write test: create_result writes GeoJSON FeatureCollection as asset `services/stac/tests/test_results.py`
- [ ] T008 [P][test] Write test: result_exists returns True for existing, False for missing `services/stac/tests/test_results.py`
- [ ] T009 [P][test] Write test: create_result raises FileExistsError for duplicate result_id `services/stac/tests/test_results.py`
- [ ] T010 [P][test] Write test: create_result updates catalog.json with item link `services/stac/tests/test_results.py`
- [ ] T011 [P][test] Write test: create_result with empty features list succeeds `services/stac/tests/test_results.py`

### Implementation for Foundation

- [ ] T012 Implement create_result() per contracts/python-api.md `services/stac/src/debrief_stac/results.py`
- [ ] T013 Implement result_exists() `services/stac/src/debrief_stac/results.py`
- [ ] T014 Export create_result and result_exists from package `services/stac/src/debrief_stac/__init__.py`
- [ ] T015 Add save_result MCP tool wrapping create_result `services/stac/src/debrief_stac/mcp/server.py`
- [ ] T016 [test] Write test for save_result MCP tool `services/stac/tests/test_results.py`

**Checkpoint**: Python service can create result STAC Items with provenance. All tests pass.

---

## Phase 3: User Story 1 — Save a Calc Tool Result (Priority: P1) 🎯 MVP

**Goal**: Right-click a result layer in Layers panel → "Save Result" → persisted STAC Item with provenance

**Independent Test**: Run a calc tool, save the result, verify item.json exists with correct debrief:kind, derived_from links, and tool metadata properties.

### Implementation for User Story 1

- [ ] T017 [US1] Extend ToolProvenance interface with sourceItemIds field `apps/vscode/src/types/tool.ts`
- [ ] T018 [US1] Extend ResultLayer interface with optional savedItemId field `apps/vscode/src/types/tool.ts`
- [ ] T019 [US1] Populate sourceItemIds during tool execution in executeTool command `apps/vscode/src/commands/executeTool.ts`
- [ ] T020 [US1] Add saveResult() method to StacService per contracts/typescript-api.md `apps/vscode/src/services/stacService.ts`
- [ ] T021 [US1] Implement saveResult command handler `apps/vscode/src/commands/saveResult.ts`
- [ ] T022 [US1] Register debrief.saveResult command in extension activation `apps/vscode/src/extension.ts`
- [ ] T023 [US1] Add command and context menu contribution to package.json `apps/vscode/package.json`
- [ ] T024 [US1] Update LayersTreeProvider to show saved indicator on result items `apps/vscode/src/providers/layersTreeProvider.ts`

**Checkpoint**: User can save a result to STAC via context menu. Item has correct provenance.

---

## Phase 4: User Story 2 — Reopen a Saved Result (Priority: P2)

**Goal**: Saved results appear in catalog listing and can be opened/rendered on the map

**Independent Test**: Save a result, close and reopen, verify it appears in list and renders correctly.

### Implementation for User Story 2

- [ ] T025 [US2] Ensure list_plots includes result items (verify no filtering by kind) `services/stac/src/debrief_stac/catalog.py`
- [ ] T026 [US2] Handle debrief:kind=calc-result in loadPlotData to apply result styling `apps/vscode/src/services/stacService.ts`
- [ ] T027 [US2] Apply result-specific styling (dashed lines, distinct colours) when rendering saved results `apps/vscode/src/webview/web/map.ts`

**Checkpoint**: Saved results round-trip through the catalog and display correctly.

---

## Phase 5: User Story 3 — Idempotent Save (Priority: P3)

**Goal**: Duplicate save attempts are detected and produce no additional catalog items

**Independent Test**: Save the same result twice, verify only one STAC Item exists.

### Implementation for User Story 3

- [ ] T028 [US3] Check savedItemId before calling MCP in saveResult command `apps/vscode/src/commands/saveResult.ts`
- [ ] T029 [US3] Handle already_exists response from MCP tool with user notification `apps/vscode/src/commands/saveResult.ts`

**Checkpoint**: Double-saving shows "already saved" notification instead of creating duplicates.

---

## Phase 6: Polish & Cross-Cutting Concerns

### Evidence Collection

- [ ] T030 Create evidence directory `specs/001-save-calc-results-stac/evidence/`
- [ ] T031 Capture test results in `specs/001-save-calc-results-stac/evidence/test-summary.md`
- [ ] T032 Create usage demonstration in `specs/001-save-calc-results-stac/evidence/usage-example.md`
- [ ] T033 [P] Capture sample result STAC Item in `specs/001-save-calc-results-stac/evidence/sample-result-item.json`
- [ ] T034 [P] Capture sample result GeoJSON in `specs/001-save-calc-results-stac/evidence/sample-features.geojson`

### Media Content

- [ ] T035 Create shipped blog post in `specs/001-save-calc-results-stac/media/shipped-post.md`
- [ ] T036 [P] Create LinkedIn shipped summary in `specs/001-save-calc-results-stac/media/linkedin-shipped.md`

### PR Creation

- [ ] T037 Create PR and publish blog: run /speckit.pr

**Task T037 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all VS Code work
- **Phase 3 (US1)**: Depends on Phase 2 — core save capability
- **Phase 4 (US2)**: Depends on Phase 2 — can run parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 3 — extends save command with idempotency check
- **Phase 6 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Save Result)**: Depends on Foundation (Phase 2) only
- **US2 (Reopen Result)**: Depends on Foundation (Phase 2) only — independent of US1
- **US3 (Idempotent Save)**: Depends on US1 — extends the save command

### Parallel Opportunities

- T002, T003 can run parallel with T001 (different files)
- T004–T011 can all run in parallel (same file but independent test cases)
- T017, T018 can run in parallel (same file but different interfaces)
- Phase 3 (US1) and Phase 4 (US2) can run in parallel after Foundation
- T033, T034 can run in parallel with T031, T032
- T036 can run in parallel with T035

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (Python create_result + MCP tool)
3. Complete Phase 3: User Story 1 (save command + context menu)
4. **STOP and VALIDATE**: Save a result, inspect the STAC Item on disk
5. Demo: "Run analysis → Save Result → provenance preserved"

### Incremental Delivery

1. Setup + Foundation → Python service ready
2. Add US1 (Save) → Core capability works → Demo
3. Add US2 (Reopen) → Round-trip complete → Demo
4. Add US3 (Idempotent) → Guard rail added → Final
5. Polish → Evidence + media + PR

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- Tests written FIRST in Phase 2 (test-driven for Python service)
- VS Code extension tasks (Phase 3+) are harder to unit test — focus on Python tests
- Commit after each phase completes
- Run `/speckit.pr` after all tasks complete to create PR with evidence
