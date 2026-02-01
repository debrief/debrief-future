# Tasks: Load REP Files into New Plot

**Input**: Design documents from `/specs/043-load-rep-new-plot/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Evidence Requirements

**Evidence Directory**: `specs/043-load-rep-new-plot/evidence/`
**Media Directory**: `specs/043-load-rep-new-plot/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Test pass/fail counts for createItem, picker, atomicity, merge | After all tests pass |
| usage-example.md | Step-by-step walkthrough of creating a new plot from REP files | After US1 complete |
| picker-options.md | Example QuickPick output showing "new plot" entries | After picker extended |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already created during /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | Already created during /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: No new project scaffolding needed — feature extends existing files. Setup is limited to creating test fixtures.

- [x] T001 Create test fixture for empty STAC store `apps/vscode/src/test/fixtures/empty-store/catalog.json`
- [x] T002 [P] Create test fixture REP file for import testing `apps/vscode/src/test/fixtures/sample.rep`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: The `stacService.createItem()` method MUST exist before any user story can be implemented.

- [x] T003 [test] Write unit tests for stacService.createItem() `apps/vscode/src/test/stacService.test.ts`
- [x] T004 Implement stacService.createItem() method `apps/vscode/src/services/stacService.ts`
- [x] T005 [test] Write unit tests for createItem() atomicity — verify folder cleanup on failure `apps/vscode/src/test/stacService.test.ts`

**Checkpoint**: createItem() works — can create STAC Items with correct folder structure, item.json, catalog.json link, and cleanup on failure.

---

## Phase 3: User Story 1 — Create New Plot from REP File via Context Menu (Priority: P1) 🎯 MVP

**Goal**: Right-click a .rep file, select "Load into Debrief...", choose "Add to new plot in [store]", enter title, get a new plot with parsed data.

**Independent Test**: Right-click a `.rep` file, select "Load into Debrief...", choose "Add to new plot in [store]", enter a title, verify a new STAC Item is created with correct GeoJSON and assets.

### Tests for User Story 1

- [x] T006 [test] Write tests for QuickPick "new plot" option generation `apps/vscode/src/test/importRep.test.ts`
- [x] T007 [P][test] Write tests for new-plot creation flow (parse → create → store → open) `apps/vscode/src/test/importRep.test.ts`

### Implementation for User Story 1

- [x] T008 [US1] Add "Add to new plot in [store-name]" entries to showItemPicker() `apps/vscode/src/commands/importRep.ts`
- [x] T009 [US1] Add title prompt after user selects a "new plot" option `apps/vscode/src/commands/importRep.ts`
- [x] T010 [US1] Implement createNewPlotFromRep() — parse, create item, addFeatures, addAsset, open MapPanel `apps/vscode/src/commands/importRep.ts`
- [x] T011 [US1] Add atomicity cleanup — delete item folder on failure after creation `apps/vscode/src/commands/importRep.ts`
- [x] T012 [US1] Compute and set bbox and temporal metadata on new item from parsed data `apps/vscode/src/commands/importRep.ts`
- [x] T013 [US1] Refresh STAC tree view after successful creation `apps/vscode/src/commands/importRep.ts`

**Checkpoint**: Single REP file can be loaded into a new plot via context menu. The plot opens in MapPanel with correct data, assets, and metadata.

---

## Phase 4: User Story 2 — Multiple REP Files into Single New Plot (Priority: P2)

**Goal**: Multi-select multiple .rep files, create one new plot with all data merged.

**Independent Test**: Select 2+ .rep files, load into new plot, verify all tracks appear in GeoJSON and all files stored as assets.

### Tests for User Story 2

- [x] T014 [test] Write tests for multi-file GeoJSON merge `apps/vscode/src/test/importRep.test.ts`

### Implementation for User Story 2

- [x] T015 [US2] Extend createNewPlotFromRep() to accept multiple file URIs `apps/vscode/src/commands/importRep.ts`
- [x] T016 [US2] Implement fail-fast parsing — parse all files before creating item `apps/vscode/src/commands/importRep.ts`
- [x] T017 [US2] Merge features from multiple ParseResults into single FeatureCollection `apps/vscode/src/commands/importRep.ts`
- [x] T018 [US2] Register each .rep file as a separate asset on the new item `apps/vscode/src/commands/importRep.ts`

**Checkpoint**: Multiple REP files can be loaded into a single new plot. All tracks appear, all files stored as assets.

---

## Phase 5: User Story 3 — Drag-and-Drop onto Empty Editor (Priority: P3)

**Goal**: Drag .rep file to editor area with no map open, offer to create new plot.

**Independent Test**: Drag a .rep file to editor with no MapPanel, verify picker appears with "new plot" options.

### Implementation for User Story 3

- [x] T019 [US3] Add drop handler for .rep files when no map panel is open `apps/vscode/src/commands/importRep.ts`
- [x] T020 [US3] Reuse showItemPicker() and createNewPlotFromRep() from US1 `apps/vscode/src/commands/importRep.ts`

**Checkpoint**: Drag-and-drop onto empty editor triggers the same new-plot flow as context menu.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, error handling, evidence collection, and media content.

### Edge Cases & Error Handling

- [x] T021 Handle "no STAC stores configured" — show info message `apps/vscode/src/commands/importRep.ts`
- [x] T022 [P] Handle empty/whitespace title validation in InputBox `apps/vscode/src/commands/importRep.ts`
- [x] T023 [P] Handle store folder not writable — show error message `apps/vscode/src/commands/importRep.ts`

### Evidence Collection (REQUIRED)

- [x] T024 Capture test results in `specs/043-load-rep-new-plot/evidence/test-summary.md`
- [x] T025 Create usage demonstration in `specs/043-load-rep-new-plot/evidence/usage-example.md`
- [x] T026 [P] Document QuickPick layout with "new plot" entries in `specs/043-load-rep-new-plot/evidence/picker-options.md`

### Media Content

- [x] T027 Create shipped blog post in `specs/043-load-rep-new-plot/media/shipped-post.md`
- [x] T028 [P] Create LinkedIn shipped summary in `specs/043-load-rep-new-plot/media/linkedin-shipped.md`

### PR Creation

- [x] T029 Create PR and publish blog: run /speckit.pr

**Task T029 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation
- **User Story 2 (Phase 4)**: Depends on Foundation; builds on US1's createNewPlotFromRep()
- **User Story 3 (Phase 5)**: Depends on Foundation; reuses US1's picker and flow
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Independent after Foundation — MVP deliverable
- **User Story 2 (P2)**: Extends US1's createNewPlotFromRep() for multi-file — can start after US1
- **User Story 3 (P3)**: Reuses US1's flow — can start after US1

### Parallel Opportunities

- T001 and T002 can run in parallel (different fixture files)
- T006 and T007 can run in parallel (different test scopes)
- T021, T022, T023 can run in parallel (independent edge cases)
- T025, T026 can run in parallel (independent evidence artifacts)
- T027 and T028 can run in parallel (blog post and LinkedIn)

---

## Parallel Example: User Story 1

```bash
# Launch tests in parallel:
Task: "Write tests for QuickPick option generation" (T006)
Task: "Write tests for new-plot creation flow" (T007)

# Then implement sequentially:
Task: "Add new-plot entries to picker" (T008)
Task: "Add title prompt" (T009)
Task: "Implement createNewPlotFromRep()" (T010)
Task: "Add atomicity cleanup" (T011)
Task: "Compute metadata" (T012)
Task: "Refresh tree view" (T013)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (fixtures)
2. Complete Phase 2: Foundation (createItem)
3. Complete Phase 3: User Story 1 (single file → new plot)
4. **STOP and VALIDATE**: Right-click .rep → new plot → MapPanel opens with data
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundation → createItem() works
2. Add User Story 1 → Single-file new plot → Test → MVP!
3. Add User Story 2 → Multi-file merge → Test
4. Add User Story 3 → Drag-and-drop → Test
5. Polish → Evidence → PR

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story
- Tests are included per spec testing strategy
- Commit after each task or logical group
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
