# Tasks: Session State VS Code Integration

**Input**: Design documents from `/specs/029-session-state-vscode/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: Integration tests included as specified in plan.md testing strategy.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/029-session-state-vscode/evidence/`
**Media Directory**: `specs/029-session-state-vscode/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + VS Code Test results | After all tests pass |
| usage-example.md | State sync demonstration between components | After Phase 1 complete |
| state-flow.md | Documented state change sequence | After Phase 1 complete |
| multi-doc-demo.md | Tab switching with state preservation | After Phase 2 complete |
| mcp-integration.md | Python tool reading/writing state | After Phase 3 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Add dependency and verify build

- [ ] T001 Add session-state workspace dependency `apps/vscode/package.json`
- [ ] T002 Verify esbuild bundles session-state library `apps/vscode/esbuild.config.js`
- [ ] T003 Run build to confirm no errors

**Checkpoint**: Extension builds successfully with session-state dependency

---

## Phase 2: Foundation (SessionManager Core)

**Purpose**: Create SessionManager singleton that all components will depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create SessionManager class skeleton `apps/vscode/src/services/sessionManager.ts`
- [ ] T005 Implement createSession() with store initialization `apps/vscode/src/services/sessionManager.ts`
- [ ] T006 Implement getActiveSession() and setActiveDocument() `apps/vscode/src/services/sessionManager.ts`
- [ ] T007 Add onActiveSessionChange event emitter `apps/vscode/src/services/sessionManager.ts`
- [ ] T008 Implement dispose() and session cleanup `apps/vscode/src/services/sessionManager.ts`
- [ ] T009 [test] Write SessionManager unit tests `apps/vscode/src/test/unit/sessionManager.test.ts`

**Checkpoint**: SessionManager can create, cache, and switch sessions

---

## Phase 3: User Story 1 - Single Document State Integration (Priority: P1) MVP

**Goal**: All UI components share a single session state store for one document

**Independent Test**: Open a plot, change time in TimeController, verify MapPanel updates to show tracks at the new time position

### Tests for User Story 1

- [ ] T010 [test] Integration test for session creation on plot open `apps/vscode/src/test/integration/sessionCreation.test.ts`
- [ ] T011 [P][test] Integration test for time sync between components `apps/vscode/src/test/integration/timeSync.test.ts`

### Implementation for User Story 1

- [ ] T012 Integrate SessionManager into extension activation `apps/vscode/src/extension.ts`
- [ ] T013 Wire TimeRangeViewProvider to accept SessionManager `apps/vscode/src/views/timeRangeView.ts`
- [ ] T014 Add temporal slice subscription to TimeRangeViewProvider `apps/vscode/src/views/timeRangeView.ts`
- [ ] T015 Handle timeChange messages to update session state `apps/vscode/src/views/timeRangeView.ts`
- [ ] T016 Wire LayersTreeProvider to accept SessionManager `apps/vscode/src/providers/layersTreeProvider.ts`
- [ ] T017 Add features slice subscription to LayersTreeProvider `apps/vscode/src/providers/layersTreeProvider.ts`
- [ ] T018 Replace local visibility state with session state `apps/vscode/src/providers/layersTreeProvider.ts`
- [ ] T019 Wire MapPanel to accept SessionManager `apps/vscode/src/webview/mapPanel.ts`
- [ ] T020 Add viewport/selection/time messages to message types `apps/vscode/src/webview/messages.ts`
- [ ] T021 Subscribe MapPanel to spatial, features, temporal slices `apps/vscode/src/webview/mapPanel.ts`
- [ ] T022 Add debounced viewport update handler (100ms) `apps/vscode/src/webview/mapPanel.ts`
- [ ] T023 Update openPlot command to create session `apps/vscode/src/commands/openPlot.ts`
- [ ] T024 Pass SessionManager to all component constructors `apps/vscode/src/extension.ts`

**Checkpoint**: Single document state sync works - time/selection changes reflect across all components

---

## Phase 4: User Story 2 - Multi-Document Session Switching (Priority: P2)

**Goal**: Switching tabs instantly restores cached session state

**Independent Test**: Open two plots, configure different times in each, switch tabs and verify state is preserved

### Tests for User Story 2

- [ ] T025 [test] Integration test for multi-doc session caching `apps/vscode/src/test/integration/multiDocument.test.ts`
- [ ] T026 [P][test] Integration test for tab switch state restoration `apps/vscode/src/test/integration/tabSwitch.test.ts`

### Implementation for User Story 2

- [ ] T027 Add getSession(uri) method to SessionManager `apps/vscode/src/services/sessionManager.ts`
- [ ] T028 Subscribe to workspace.onDidCloseTextDocument for cleanup `apps/vscode/src/services/sessionManager.ts`
- [ ] T029 Subscribe to window.onDidChangeActiveTextEditor `apps/vscode/src/extension.ts`
- [ ] T030 Update TimeRangeViewProvider with switchToSession() `apps/vscode/src/views/timeRangeView.ts`
- [ ] T031 Update LayersTreeProvider with switchToSession() `apps/vscode/src/providers/layersTreeProvider.ts`
- [ ] T032 Update MapPanel with switchToDocument() for plot+session `apps/vscode/src/webview/mapPanel.ts`
- [ ] T033 Handle null active session (show empty/disabled state) `apps/vscode/src/views/timeRangeView.ts`
- [ ] T034 [P] Handle null active session in LayersTreeProvider `apps/vscode/src/providers/layersTreeProvider.ts`
- [ ] T035 [P] Handle null active session in MapPanel `apps/vscode/src/webview/mapPanel.ts`

**Checkpoint**: Multi-document switching works with instant state restoration (<50ms)

---

## Phase 5: User Story 3 - Python Tool State Access (Priority: P3)

**Goal**: Python tools can read/write session state via MCP

**Independent Test**: Open a plot, run a Python tool that queries current time via MCP, verify correct value received

### Tests for User Story 3

- [ ] T036 [test] Integration test for MCP state read `apps/vscode/src/test/integration/mcpRead.test.ts`
- [ ] T037 [P][test] Integration test for MCP state write `apps/vscode/src/test/integration/mcpWrite.test.ts`

### Implementation for User Story 3

- [ ] T038 Add MCP server start/stop to SessionManager `apps/vscode/src/services/sessionManager.ts`
- [ ] T039 Start MCP server on extension activation `apps/vscode/src/extension.ts`
- [ ] T040 Update MCP server store reference on session switch `apps/vscode/src/services/sessionManager.ts`
- [ ] T041 Add MCP port configuration to extension settings `apps/vscode/package.json`
- [ ] T042 Verify UI updates reactively from MCP state changes `apps/vscode/src/test/integration/mcpReactive.test.ts`

**Checkpoint**: Python tools can read time, selection and write state via MCP

---

## Phase 6: User Story 4 - Undo/Redo View State (Priority: P4)

**Goal**: Undo/redo commands restore previous view state

**Independent Test**: Pan the map, invoke Undo command, verify viewport reverts

### Tests for User Story 4

- [ ] T043 [test] Integration test for undo viewport change `apps/vscode/src/test/integration/undoRedo.test.ts`

### Implementation for User Story 4

- [ ] T044 Create undo/redo command handlers `apps/vscode/src/commands/undoRedo.ts`
- [ ] T045 Register debrief.undo and debrief.redo commands `apps/vscode/package.json`
- [ ] T046 Add command registrations to extension `apps/vscode/src/commands/index.ts`
- [ ] T047 Add keybindings with when clause for plot focus `apps/vscode/package.json`
- [ ] T048 Verify playback changes NOT recorded in undo history

**Checkpoint**: Undo/redo works for viewport, selection, and time changes

---

## Phase 7: User Story 5 - Session Persistence (Priority: P5)

**Goal**: Session state saves/loads with .debrief-session files

**Independent Test**: Configure a session, save, close, reopen, verify state restored

### Tests for User Story 5

- [ ] T049 [test] Integration test for session save/load `apps/vscode/src/test/integration/persistence.test.ts`
- [ ] T050 [P][test] Integration test for dirty tracking prompt `apps/vscode/src/test/integration/dirtyPrompt.test.ts`

### Implementation for User Story 5

- [ ] T051 Create saveSession command handler `apps/vscode/src/commands/saveSession.ts`
- [ ] T052 Register debrief.saveSession command `apps/vscode/package.json`
- [ ] T053 Update openPlot to check for .debrief-session file `apps/vscode/src/commands/openPlot.ts`
- [ ] T054 Load session state if session file exists `apps/vscode/src/commands/openPlot.ts`
- [ ] T055 Handle incompatible session file version with warning `apps/vscode/src/commands/openPlot.ts`
- [ ] T056 Add dirty state tracking to SessionManager `apps/vscode/src/services/sessionManager.ts`
- [ ] T057 Add dirty indicator to status bar `apps/vscode/src/extension.ts`
- [ ] T058 Add close prompt when session is dirty `apps/vscode/src/services/sessionManager.ts`

**Checkpoint**: Session persistence works with save prompt on close

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, cleanup, and evidence collection

### Documentation

- [ ] T059 Add SessionManager API documentation `apps/vscode/src/services/sessionManager.ts`
- [ ] T060 [P] Document message types for webview communication `apps/vscode/src/webview/messages.ts`

### Evidence Collection

- [ ] T061 Create evidence directory `specs/029-session-state-vscode/evidence/`
- [ ] T062 Capture test summary with pass/fail counts `specs/029-session-state-vscode/evidence/test-summary.md`
- [ ] T063 Create usage demonstration showing state sync `specs/029-session-state-vscode/evidence/usage-example.md`
- [ ] T064 [P] Document state flow between components `specs/029-session-state-vscode/evidence/state-flow.md`
- [ ] T065 [P] Capture multi-document switching demo `specs/029-session-state-vscode/evidence/multi-doc-demo.md`
- [ ] T066 [P] Document MCP integration example `specs/029-session-state-vscode/evidence/mcp-integration.md`

### Media Content

- [ ] T067 Create shipped blog post `specs/029-session-state-vscode/media/shipped-post.md`
- [ ] T068 [P] Create LinkedIn shipped summary `specs/029-session-state-vscode/media/linkedin-shipped.md`

### PR Creation

- [ ] T069 Create PR and publish blog: run /speckit.pr

**Task T069 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundation (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundation
- **User Story 2 (Phase 4)**: Depends on User Story 1 (extends SessionManager)
- **User Story 3 (Phase 5)**: Can start after User Story 1 (MCP independent of multi-doc)
- **User Story 4 (Phase 6)**: Can start after User Story 1 (uses session undo/redo)
- **User Story 5 (Phase 7)**: Depends on User Story 2 (persistence across docs)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Foundation (Phase 2)
       │
       v
User Story 1 (P1) ─── MVP Checkpoint
       │
       ├────────────────────────────────┐
       │                                │
       v                                v
User Story 2 (P2)            User Story 3 (P3) ←─┐
       │                            │            │
       v                            │            │
User Story 5 (P5)                   │            │
       │                            │            │
       └────────────────────────────┼────────────┘
                                    │
                           User Story 4 (P4)
                                    │
                                    v
                           Polish (Phase 8)
```

### Parallel Opportunities

Within each phase, tasks marked `[P]` can run in parallel:
- Phase 3: T010/T011 tests can run in parallel
- Phase 4: T025/T026 tests, T033/T034/T035 null handling in parallel
- Phase 5: T036/T037 tests in parallel
- Phase 7: T049/T050 tests in parallel
- Phase 8: T064/T065/T066 evidence, T067/T068 media in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test single-document state sync
5. Demo state sync working between TimeController, LayersTree, MapPanel

### Incremental Delivery

1. Setup + Foundation → SessionManager ready
2. Add User Story 1 → Single doc sync works (MVP!)
3. Add User Story 2 → Multi-doc tab switching works
4. Add User Story 3 → Python tools can access state
5. Add User Story 4 → Undo/redo works
6. Add User Story 5 → Session persistence works
7. Polish → Evidence collected, PR created

---

## Notes

- Tasks with `[P]` can run in parallel (different files, no dependencies)
- Test tasks marked `[test]` should be written before implementation
- Each user story checkpoint validates independent functionality
- Session-state library (024) already provides Zustand store, subscriptions, persistence
- VS Code extension webviews communicate via postMessage - debounce viewport updates
- MCP server embedded in extension process per spec assumption
