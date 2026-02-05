# Tasks: Wire Up File Actions

**Input**: Design documents from `/specs/001-wire-file-actions/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Unit and integration tests included as specified in plan.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/001-wire-file-actions/evidence/`
**Media Directory**: `specs/001-wire-file-actions/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Test results with pass/fail counts | After all tests pass |
| usage-example.md | File action demonstration | After all actions work |
| screenshots/ | Dropdown menu states | After UI integration complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | ✓ During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | ✓ During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup (Message Types)

**Purpose**: Add the message type infrastructure needed for file action communication

- [ ] T001 Add FileActionMessage type to ActivityPanelMessage union `apps/vscode/src/webview/types.ts`
- [ ] T002 [P] Import AssociatedFile and FileAction types in types.ts `apps/vscode/src/webview/types.ts`

---

## Phase 2: Foundation (Callback Chain)

**Purpose**: Wire the callback chain from UI components through to the webview entry point

**⚠️ CRITICAL**: No action handlers can work until this chain is complete

- [ ] T003 Add onFileAction prop to ActivityPanelProps interface `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T004 Pass onFileAction prop to LayersToolbar in ActivityPanel render `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T005 Add handleFileAction callback in activityPanel webview entry `apps/vscode/src/webview/web/activityPanel.tsx`
- [ ] T006 Pass handleFileAction to ActivityPanel component `apps/vscode/src/webview/web/activityPanel.tsx`

**Checkpoint**: Message chain complete - webview can now send file:action messages to extension host

---

## Phase 3: User Story 1 - Open Associated File (Priority: P1) 🎯 MVP

**Goal**: Users can open associated files directly in the editor by clicking "Open" in the dropdown menu

**Independent Test**: Select "Open" on any associated file and verify the file opens in the editor

### Tests for User Story 1

- [ ] T007 [test] [US1] Unit test for file:action message handler `apps/vscode/src/views/__tests__/activityPanelView.test.ts`
- [ ] T008 [P][test] [US1] Unit test for openFile function `apps/vscode/src/views/__tests__/activityPanelView.test.ts`

### Implementation for User Story 1

- [ ] T009 [US1] Add file:action case to message handler switch `apps/vscode/src/views/activityPanelView.ts`
- [ ] T010 [US1] Implement handleFileAction method skeleton `apps/vscode/src/views/activityPanelView.ts`
- [ ] T011 [US1] Implement resolveFileUri helper to convert relative paths `apps/vscode/src/views/activityPanelView.ts`
- [ ] T012 [US1] Implement openFile method using vscode.workspace.openTextDocument `apps/vscode/src/views/activityPanelView.ts`
- [ ] T013 [US1] Add error handling for file not found in openFile `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 1 complete - "Open" action works independently

---

## Phase 4: User Story 2 - Reveal File in System Explorer (Priority: P2)

**Goal**: Users can reveal files in the system file explorer to access them externally

**Independent Test**: Select "Reveal in Explorer" and verify the system file browser opens with the file selected

### Tests for User Story 2

- [ ] T014 [test] [US2] Unit test for revealFile function `apps/vscode/src/views/__tests__/activityPanelView.test.ts`
- [ ] T015 [P][test] [US2] Unit test for web client detection and modal `apps/vscode/src/views/__tests__/activityPanelView.test.ts`

### Implementation for User Story 2

- [ ] T016 [US2] Implement revealFile method using revealFileInOS command `apps/vscode/src/views/activityPanelView.ts`
- [ ] T017 [US2] Add web client detection (vscode.env.uiKind) `apps/vscode/src/views/activityPanelView.ts`
- [ ] T018 [US2] Show informational modal for web client on reveal action `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 2 complete - "Reveal" action works independently

---

## Phase 5: User Story 3 - Delete Associated File (Priority: P3)

**Goal**: Users can delete files with confirmation to protect against accidental deletion

**Independent Test**: Select "Delete", confirm in dialog, verify file is removed from filesystem and UI

### Tests for User Story 3

- [ ] T019 [test] [US3] Unit test for deleteFile with confirmation `apps/vscode/src/views/__tests__/activityPanelView.test.ts`
- [ ] T020 [P][test] [US3] Unit test for delete cancellation `apps/vscode/src/views/__tests__/activityPanelView.test.ts`
- [ ] T021 [P][test] [US3] Unit test for delete permission error `apps/vscode/src/views/__tests__/activityPanelView.test.ts`

### Implementation for User Story 3

- [ ] T022 [US3] Implement deleteFile method with showWarningMessage confirmation `apps/vscode/src/views/activityPanelView.ts`
- [ ] T023 [US3] Add vscode.workspace.fs.delete call after confirmation `apps/vscode/src/views/activityPanelView.ts`
- [ ] T024 [US3] Add web client detection and modal for delete action `apps/vscode/src/views/activityPanelView.ts`
- [ ] T025 [US3] Add permission denied error handling `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 3 complete - "Delete" action works with confirmation

---

## Phase 6: User Story 4 - Open File With Application Picker (Priority: P4)

**Goal**: Users can choose which application opens a file for specialized workflows

**Independent Test**: Select "Open With" and verify the system application picker dialog appears

### Tests for User Story 4

- [ ] T026 [test] [US4] Unit test for openFileWith function `apps/vscode/src/views/__tests__/activityPanelView.test.ts`

### Implementation for User Story 4

- [ ] T027 [US4] Implement openFileWith method using vscode.openWith command `apps/vscode/src/views/activityPanelView.ts`

**Checkpoint**: User Story 4 complete - "Open With" action works independently

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, documentation, and evidence collection

### Error Handling

- [ ] T028 Implement showFileError helper for user-friendly error messages `apps/vscode/src/views/activityPanelView.ts`
- [ ] T029 [P] Add file not found error message `apps/vscode/src/views/activityPanelView.ts`
- [ ] T030 [P] Add permission denied error message `apps/vscode/src/views/activityPanelView.ts`

### E2E Tests

- [ ] T031 Create Playwright test for AssociatedFilesDropdown `shared/components/e2e/AssociatedFilesDropdown.spec.ts`
- [ ] T032 [P] Add theme variant tests (light, dark, vscode) `shared/components/e2e/AssociatedFilesDropdown.spec.ts`
- [ ] T033 [P] Add interaction tests for dropdown menu actions `shared/components/e2e/AssociatedFilesDropdown.spec.ts`
- [ ] T034 Run e2e tests: `pnpm --filter @debrief/components test:e2e AssociatedFilesDropdown`

### Evidence Collection (REQUIRED)

- [ ] T035 Create evidence directory `specs/001-wire-file-actions/evidence/`
- [ ] T036 Capture test summary in `specs/001-wire-file-actions/evidence/test-summary.md`
- [ ] T037 Create usage demonstration in `specs/001-wire-file-actions/evidence/usage-example.md`
- [ ] T038 [P] Capture dropdown screenshots to `specs/001-wire-file-actions/evidence/screenshots/`

### E2E Evidence Collection

- [ ] T039 Run full e2e suite and capture results
- [ ] T040 [P] Document e2e results in `specs/001-wire-file-actions/evidence/e2e-summary.md`

### Media Content

- [ ] T041 Create shipped blog post in `specs/001-wire-file-actions/media/shipped-post.md`
- [ ] T042 [P] Create LinkedIn shipped summary in `specs/001-wire-file-actions/media/linkedin-shipped.md`

### PR Creation

- [ ] T043 Create PR and publish blog: run /speckit.pr

**Task T043 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundation phase completion
  - User stories can proceed sequentially in priority order (P1 → P2 → P3 → P4)
  - Or in parallel if multiple developers available
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundation (Phase 2) - No dependencies on US1
- **User Story 3 (P3)**: Can start after Foundation (Phase 2) - No dependencies on US1/US2
- **User Story 4 (P4)**: Can start after Foundation (Phase 2) - No dependencies on US1/US2/US3

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Implementation follows research.md patterns
- Each story completes independently before moving to next priority

### Parallel Opportunities

- T001-T002 (Setup) can run in parallel
- T007-T008 (US1 tests) can run in parallel
- T014-T015 (US2 tests) can run in parallel
- T019-T021 (US3 tests) can run in parallel
- T028-T030 (Error handling) can run in parallel
- T031-T033 (E2E setup) can run in parallel
- T038, T040, T042 (Evidence collection) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch tests for User Story 1 together:
Task: "Unit test for file:action message handler"
Task: "Unit test for openFile function"

# After tests fail, implement sequentially:
Task: "Add file:action case to message handler"
Task: "Implement handleFileAction method"
Task: "Implement openFile method"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (message types)
2. Complete Phase 2: Foundation (callback chain)
3. Complete Phase 3: User Story 1 (Open action)
4. **STOP and VALIDATE**: Test "Open" action independently
5. Demo if ready - users can open files!

### Incremental Delivery

1. Complete Setup + Foundation → Message chain ready
2. Add User Story 1 → Test "Open" → Demo (MVP!)
3. Add User Story 2 → Test "Reveal" → Demo
4. Add User Story 3 → Test "Delete" → Demo
5. Add User Story 4 → Test "Open With" → Demo
6. Each action adds value without breaking previous actions

---

## Notes

- [P] tasks = different files or independent functions, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** - capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
