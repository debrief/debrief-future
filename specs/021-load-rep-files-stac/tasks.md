# Tasks: REP File Loading in VS Code Extension

**Input**: Design documents from `/specs/021-load-rep-files-stac/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests included per spec requirements (vitest for unit, VS Code Extension Test for integration).

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

---

## Evidence Requirements

**Evidence Directory**: `specs/021-load-rep-files-stac/evidence/`
**Media Directory**: `specs/021-load-rep-files-stac/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest results with unit test counts | After all tests pass |
| usage-example.md | Step-by-step drag-drop demo | After P1 complete |
| import-flow.gif | Screen recording of drag-drop import | After UI works |
| context-menu-demo.png | Screenshot of right-click menu | After P2 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan ✅ |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan ✅ |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and message type definitions

- [ ] T001 Add import message types to webview messages `apps/vscode/src/webview/messages.ts`
- [ ] T002 [P] Add import error types `apps/vscode/src/types/import.ts`
- [ ] T003 [P] Add debrief.importRep command contribution to package.json `apps/vscode/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Architecture Note**: IoService is storage-agnostic (parse only, returns GeoJSON). Extension orchestrates IoService → StacService. No dedicated ImportService.

- [ ] T004 Create IoService for debrief-io MCP communication `apps/vscode/src/services/ioService.ts`
- [ ] T005 [P] Add parseRep method to IoService (returns GeoJSON features, storage-agnostic) `apps/vscode/src/services/ioService.ts`
- [ ] T006 Extend StacService with addAsset method `apps/vscode/src/services/stacService.ts`
- [ ] T007 [P] Extend StacService with addFeatures method `apps/vscode/src/services/stacService.ts`
- [ ] T008 [P] Add hasAsset method for duplicate detection `apps/vscode/src/services/stacService.ts`
- [ ] T009 Add bounds calculation utility for auto-zoom `apps/vscode/src/utils/bounds.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Drag-and-Drop REP Import (Priority: P1) 🎯 MVP

**Goal**: Analyst drags .rep file onto map panel, tracks appear and map zooms to fit

**Independent Test**: Open STAC item in map, drag REP file onto map, verify tracks appear and bounds include them

### Tests for User Story 1

- [ ] T010 [test] Unit tests for IoService parseRep method `apps/vscode/tests/unit/ioService.test.ts`
- [ ] T011 [P][test] Unit tests for bounds calculation `apps/vscode/tests/unit/bounds.test.ts`

### Implementation for User Story 1

- [ ] T012 Add drop zone event listeners in webview `apps/vscode/src/webview/web/map.ts`
- [ ] T013 Handle repFileDrop message in MapPanel `apps/vscode/src/webview/mapPanel.ts`
- [ ] T014 Add orchestration in MapPanel: IoService.parseRep() → StacService.addAsset/addFeatures() `apps/vscode/src/webview/mapPanel.ts`
- [ ] T015 Add progress notification during import `apps/vscode/src/webview/mapPanel.ts`
- [ ] T016 Implement fitBounds call after successful import `apps/vscode/src/webview/mapPanel.ts`
- [ ] T017 Add duplicate detection with warning dialog `apps/vscode/src/webview/mapPanel.ts`
- [ ] T018 Handle parse errors with user-friendly messages `apps/vscode/src/webview/mapPanel.ts`

**Checkpoint**: Drag-and-drop import fully functional and testable independently

---

## Phase 4: User Story 2 - Context Menu Import with Target Selection (Priority: P2)

**Goal**: Right-click .rep file → "Load into Debrief..." → picker → import

**Independent Test**: Right-click REP file, select menu option, choose catalog/item, verify import completes

### Tests for User Story 2

- [ ] T019 [test] Unit tests for CatalogItemPicker `apps/vscode/tests/unit/catalogItemPicker.test.ts`
- [ ] T020 [P][test] Integration test for context menu flow `apps/vscode/tests/integration/import.test.ts`

### Implementation for User Story 2

- [ ] T021 Add explorer/context menu contribution for .rep files `apps/vscode/package.json`
- [ ] T022 Create CatalogItemPicker using QuickPick API `apps/vscode/src/views/catalogItemPicker.ts`
- [ ] T023 Implement two-step selection: catalog → item `apps/vscode/src/views/catalogItemPicker.ts`
- [ ] T024 Create importRep command handler with orchestration (IoService → StacService) `apps/vscode/src/commands/importRep.ts`
- [ ] T025 Register importRep command in extension activation `apps/vscode/src/commands/index.ts`
- [ ] T026 Add refresh trigger to StacTreeProvider after import `apps/vscode/src/providers/stacTreeProvider.ts`

**Checkpoint**: Context menu import fully functional, both flows work independently

---

## Phase 5: User Story 3 - Error Recovery and Feedback (Priority: P3)

**Goal**: Clear, actionable error messages for all failure modes

**Independent Test**: Attempt imports with malformed files, verify error messages are helpful

### Tests for User Story 3

- [ ] T027 [test] Unit tests for error message formatting `apps/vscode/tests/unit/errorMessages.test.ts`

### Implementation for User Story 3

- [ ] T028 Create error message templates for all failure codes `apps/vscode/src/utils/errorMessages.ts`
- [ ] T029 Add INVALID_FORMAT error handling with line number context `apps/vscode/src/webview/mapPanel.ts`
- [ ] T030 Add STORAGE_ERROR handling with recovery suggestion `apps/vscode/src/webview/mapPanel.ts`
- [ ] T031 Add FILE_NOT_FOUND error with path context `apps/vscode/src/commands/importRep.ts`
- [ ] T032 Add non-REP file rejection with clear feedback `apps/vscode/src/webview/mapPanel.ts`
- [ ] T033 Add multi-file drop handling (reject with message) `apps/vscode/src/webview/web/map.ts`

**Checkpoint**: All error scenarios handled with user-friendly messages

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, evidence collection, and PR creation

### Documentation

- [ ] T034 Update extension README with import feature `apps/vscode/README.md`
- [ ] T035 [P] Add keyboard shortcuts section if applicable `apps/vscode/README.md`

### Evidence Collection (REQUIRED)

- [ ] T036 Create evidence directory `specs/021-load-rep-files-stac/evidence/`
- [ ] T037 Capture test summary with pass/fail counts `specs/021-load-rep-files-stac/evidence/test-summary.md`
- [ ] T038 Record usage example demonstrating drag-drop flow `specs/021-load-rep-files-stac/evidence/usage-example.md`
- [ ] T039 [P] Capture screen recording of import flow `specs/021-load-rep-files-stac/evidence/import-flow.gif`
- [ ] T040 [P] Capture context menu screenshot `specs/021-load-rep-files-stac/evidence/context-menu-demo.png`

### Runtime Verification

- [ ] T041 Run VS Code extension in dev mode and verify import works
- [ ] T042 [P] Test import with sample REP file from demo/samples/

### Media Content

- [ ] T043 Create shipped blog post `specs/021-load-rep-files-stac/media/shipped-post.md`
- [ ] T044 [P] Create LinkedIn shipped summary `specs/021-load-rep-files-stac/media/linkedin-shipped.md`

### PR Creation

- [ ] T045 Create PR and publish blog: run /speckit.pr

**Task T045 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP delivery
- **User Story 2 (Phase 4)**: Depends on Foundational - can parallel with US1 if staffed
- **User Story 3 (Phase 5)**: Depends on Foundational - can parallel with US1/US2
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Shares IoService/StacService with US1
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Enhances error handling in orchestration code

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Services before UI wiring
- Core flow before edge cases
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T002 [P] Add import error types
T003 [P] Add command contribution
```

**Phase 2 (Foundational)**:
```
T005 [P] Add parseRep method
T007 [P] Add addFeatures method
T008 [P] Add hasAsset method
```

**Phase 3 (US1 Tests)**:
```
T010 [test] IoService tests
T011 [P][test] Bounds tests
```

**Phase 4 (US2 Tests)**:
```
T020 [P] Integration test
```

**Phase 6 (Evidence)**:
```
T039 [P] Screen recording
T040 [P] Context menu screenshot
T042 [P] Sample file test
T044 [P] LinkedIn summary
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009)
3. Complete Phase 3: User Story 1 (T010-T018)
4. **STOP and VALIDATE**: Test drag-drop independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP!)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Polish → Evidence → PR

### Task Count Summary

| Phase | Task Count |
|-------|------------|
| Phase 1: Setup | 3 |
| Phase 2: Foundational | 6 |
| Phase 3: US1 (P1) | 9 |
| Phase 4: US2 (P2) | 8 |
| Phase 5: US3 (P3) | 7 |
| Phase 6: Polish | 12 |
| **Total** | **45** |

---

## Notes

- [P] tasks = different files, no dependencies
- Tests use vitest for unit, VS Code Extension Test framework for integration
- Evidence is required before PR creation
- Run `/speckit.pr` after T044 complete to create PR with evidence
- **Architecture**: IoService is storage-agnostic (parse only). Extension orchestrates IoService → StacService. No ImportService.
