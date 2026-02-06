# Tasks: Restore Previously-Open Plots on VS Code Startup

**Input**: Design documents from `/specs/052-restore-plots-session/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included — Constitution Article VI requires unit tests for services.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/052-restore-plots-session/evidence/`
**Media Directory**: `specs/052-restore-plots-session/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with pass/fail counts and key scenarios | After all tests pass |
| usage-example.md | Step-by-step walkthrough of the restore flow | After wiring complete |

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

**Purpose**: Create project scaffolding and evidence directory

- [x] T001 Create evidence directory `specs/052-restore-plots-session/evidence/`
- [x] T002 Create OpenPlotReference and OpenPlotsState type definitions `apps/vscode/src/types/openPlots.ts`

---

## Phase 2: Foundation — OpenPlotsService

**Purpose**: Build the complete OpenPlotsService with all methods. This is the core service that ALL user stories depend on.

**⚠️ CRITICAL**: No user story wiring can begin until this phase is complete.

### Tests for Foundation

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T003 [test] Write unit tests for CRUD operations (addPlot, removePlot, getOpenPlots, isOpen, clearAll) `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T004 [test] Write unit tests for restoreOpenPlots (success path, empty state, corrupt state fallback) `apps/vscode/tests/unit/openPlotsService.test.ts`

### Implementation for Foundation

- [x] T005 Create OpenPlotsService class with constructor accepting ExtensionContext `apps/vscode/src/services/openPlotsService.ts`
- [x] T006 Implement getOpenPlots with corrupt state fallback to empty array `apps/vscode/src/services/openPlotsService.ts`
- [x] T007 [P] Implement addPlot with duplicate URI handling (move to end, update openedAt) `apps/vscode/src/services/openPlotsService.ts`
- [x] T008 [P] Implement removePlot (no-op if URI not found) `apps/vscode/src/services/openPlotsService.ts`
- [x] T009 [P] Implement isOpen and clearAll `apps/vscode/src/services/openPlotsService.ts`
- [x] T010 Implement restoreOpenPlots with sequential command execution, try/catch silent skip, and persisted list cleanup `apps/vscode/src/services/openPlotsService.ts`
- [x] T011 Verify all foundation unit tests pass

**Checkpoint**: OpenPlotsService is complete and fully tested in isolation. Ready for wiring into existing code.

---

## Phase 3: User Story 1 — Single Plot Restoration (Priority: P1) 🎯 MVP

**Goal**: A user opens one plot, closes VS Code, reopens it, and the plot is automatically restored.

**Independent Test**: Open a plot, close VS Code, reopen VS Code, confirm the plot reappears automatically.

### Tests for User Story 1

- [x] T012 [test] [US1] Write integration test: addPlot on open → restoreOpenPlots returns the single URI `apps/vscode/tests/unit/openPlotsService.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Wire OpenPlotsService instantiation into extension.ts activate function `apps/vscode/src/extension.ts`
- [x] T014 [US1] Wire restoreOpenPlots call into extension.ts after service initialization `apps/vscode/src/extension.ts`
- [x] T015 [US1] Wire addPlot call into openPlot.ts after successful plot open (after recentPlotsService.addRecentPlot) `apps/vscode/src/commands/openPlot.ts`
- [x] T016 [US1] Pass openPlotsService to createOpenPlotCommand factory `apps/vscode/src/commands/openPlot.ts`
- [x] T017 [US1] Test: verify single plot persists and restores (integration)

**Checkpoint**: Single plot restoration works end-to-end. MVP is deliverable.

---

## Phase 4: User Story 2 — Multiple Plot Restoration (Priority: P2)

**Goal**: Multiple plots are restored in the order they were originally opened.

**Independent Test**: Open three plots, close VS Code, reopen it, verify all three reappear in the same order.

### Tests for User Story 2

- [x] T018 [test] [US2] Write test: addPlot for 3 plots → getOpenPlots returns all 3 in order `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T019 [test] [US2] Write test: restoreOpenPlots restores plots sequentially in original order `apps/vscode/tests/unit/openPlotsService.test.ts`

### Implementation for User Story 2

- [x] T020 [US2] Verify restoreOpenPlots iterates plots array sequentially (already implemented in Phase 2, confirm behaviour) `apps/vscode/src/services/openPlotsService.ts`
- [x] T021 [US2] Verify ordering tests pass with 3+ plots

**Checkpoint**: Multiple plots restore in correct order. US1 + US2 both functional.

---

## Phase 5: User Story 3 — Graceful Handling of Missing Plots (Priority: P3)

**Goal**: When a previously-open plot file has been deleted or moved, restoration silently skips it with no error messages.

**Independent Test**: Open two plots, close VS Code, delete one plot's STAC files, reopen VS Code — only the surviving plot is restored with no errors.

### Tests for User Story 3

- [x] T022 [test] [US3] Write test: restoreOpenPlots skips missing STAC items silently `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T023 [test] [US3] Write test: failed restoration entries are removed from persisted list `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T024 [P][test] [US3] Write test: corrupt workspaceState falls back to empty list `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T025 [P][test] [US3] Write test: all plots missing results in default state (empty) `apps/vscode/tests/unit/openPlotsService.test.ts`

### Implementation for User Story 3

- [x] T026 [US3] Verify try/catch in restoreOpenPlots silently catches command execution failures (already implemented in T010, confirm coverage) `apps/vscode/src/services/openPlotsService.ts`
- [x] T027 [US3] Verify persisted list is cleaned after restoration (failed entries removed) `apps/vscode/src/services/openPlotsService.ts`
- [x] T028 [US3] Verify all US3 tests pass

**Checkpoint**: Missing/corrupt plots handled gracefully. US1 + US2 + US3 all functional.

---

## Phase 6: User Story 4 — Explicit Plot Closure Clears Session State (Priority: P4)

**Goal**: When a user explicitly closes a plot, it is removed from the persisted list and not restored on next startup.

**Independent Test**: Open two plots, close one manually, close VS Code, reopen — only the still-open plot is restored.

### Tests for User Story 4

- [x] T029 [test] [US4] Write test: removePlot removes correct entry from persisted list `apps/vscode/tests/unit/openPlotsService.test.ts`
- [x] T030 [test] [US4] Write test: closing all plots then restoring yields empty list `apps/vscode/tests/unit/openPlotsService.test.ts`

### Implementation for User Story 4

- [x] T031 [US4] Wire clearAll call into MapPanel dispose callback and closePlot command `apps/vscode/src/commands/openPlot.ts` `apps/vscode/src/commands/index.ts`
- [x] T032 [US4] Pass openPlotsService through command registration chain `apps/vscode/src/commands/index.ts`
- [x] T033 [US4] Verify all US4 tests pass

**Checkpoint**: All four user stories functional and tested independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [x] T034 Capture test results in `specs/052-restore-plots-session/evidence/test-summary.md`
- [x] T035 Create usage demonstration in `specs/052-restore-plots-session/evidence/usage-example.md`

### Media Content

- [x] T036 Create shipped blog post in `specs/052-restore-plots-session/media/shipped-post.md`
- [x] T037 [P] Create LinkedIn shipped summary in `specs/052-restore-plots-session/media/linkedin-shipped.md`

### PR Creation

- [ ] T038 Create PR and publish blog: run /speckit.pr

**Task T038 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Phase 1 (types defined) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2 — the MVP
- **User Story 2 (Phase 4)**: Depends on Phase 2 — can run in parallel with Phase 3 (tests only add to same test file)
- **User Story 3 (Phase 5)**: Depends on Phase 2 — can run in parallel with Phases 3-4
- **User Story 4 (Phase 6)**: Depends on Phase 2 — can run in parallel with Phases 3-5
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundation — wires into extension.ts and openPlot.ts
- **User Story 2 (P2)**: Depends on Foundation — tests only (no additional code beyond Phase 2)
- **User Story 3 (P3)**: Depends on Foundation — tests + verification (error handling built into service)
- **User Story 4 (P4)**: Depends on Foundation — wires removePlot into mapPanel.ts

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Wiring changes depend on service being complete
- Verification tests run after wiring

### Parallel Opportunities

- Phase 1 tasks T001 and T002 can run in parallel
- Phase 2 methods T007, T008, T009 marked [P] — implement in parallel (different methods, same file)
- Phase 2 tests T003 and T004 can be written in parallel
- User Stories 2, 3, 4 (Phases 4-6) can run in parallel after Foundation is complete
- Phase 5 tests T024 and T025 marked [P] — run in parallel
- Phase 7 media T036 and T037 can run in parallel

---

## Parallel Example: Foundation Phase

```bash
# Launch parallel method implementations:
Task: "Implement addPlot with duplicate URI handling" (T007)
Task: "Implement removePlot" (T008)
Task: "Implement isOpen and clearAll" (T009)
```

## Parallel Example: User Stories After Foundation

```bash
# After Phase 2 complete, launch stories in parallel:
Task: "US1 - Wire into extension.ts and openPlot.ts" (Phase 3)
Task: "US2 - Write ordering tests" (Phase 4)
Task: "US3 - Write error handling tests" (Phase 5)
Task: "US4 - Wire into mapPanel.ts dispose" (Phase 6)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types)
2. Complete Phase 2: Foundation (OpenPlotsService + unit tests)
3. Complete Phase 3: User Story 1 (wiring into extension.ts + openPlot.ts)
4. **STOP and VALIDATE**: Open a plot, close VS Code, reopen — plot should restore
5. Demo if ready

### Incremental Delivery

1. Setup + Foundation → Service ready and tested
2. Add US1 wiring → Single plot restores (MVP!)
3. Add US2 tests → Multiple plots restore in order (verification)
4. Add US3 tests → Missing plots silently skipped (resilience)
5. Add US4 wiring → Explicit closure respected (completeness)
6. Each story adds confidence without breaking previous stories

---

## Notes

- [P] tasks = different methods/files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- This feature has no visual components — no screenshots or Storybook evidence needed
