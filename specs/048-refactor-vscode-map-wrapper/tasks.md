# Tasks: Refactor VS Code Map to Thin Wrapper

**Input**: Design documents from `/specs/048-refactor-vscode-map-wrapper/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅)

**Tests**: Tests are included for the shared component; VS Code integration verified via manual checklist.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

**Evidence Directory**: `specs/048-refactor-vscode-map-wrapper/evidence/`

### Minimum Evidence Per Feature

1. **Test Summary** (`evidence/test-summary.md`): MapView test coverage report
2. **Usage Example** (`evidence/usage-example.md`): Code snippet showing wrapper usage
3. **Screenshots** (`evidence/screenshots/`): Before/after comparisons of map rendering

---

## Phase 1: Setup

**Purpose**: Prepare the development environment and verify existing components

- [ ] T001 Verify shared MapView component builds: `cd shared/components && pnpm build`
- [ ] T002 Verify existing MapView tests pass: `cd shared/components && pnpm test`
- [ ] T003 [P] Review existing MapView props and identify any gaps for VS Code features
- [ ] T004 [P] Review existing message protocol in `apps/vscode/src/webview/messages.ts`

**Checkpoint**: Development environment ready, component gaps identified

---

## Phase 2: Foundational (Shared Component Enhancements)

**Purpose**: Ensure shared MapView has all props needed by the VS Code wrapper

**⚠️ CRITICAL**: These enhancements must be complete before the wrapper can be fully implemented

- [ ] T005 [US1] Add `onViewportChange` callback prop to MapView for viewport state changes
- [ ] T006 [P] [US1] Add `onZoomIn`/`onZoomOut` callback props to MapView if missing
- [ ] T007 [P] [US1] Add `onFitBounds` callback prop to MapView if missing
- [ ] T008 [US1] Verify MapView handles result layer features (calculation results) correctly
- [ ] T009 [US1] Add tests for any new MapView props in `shared/components/src/MapView/MapView.test.tsx`

**Checkpoint**: Shared MapView has all necessary props for VS Code integration

---

## Phase 3: User Story 1 - Test Map Features Without VS Code (Priority: P1) 🎯 MVP

**Goal**: Ensure all map functionality is testable via standard tooling without VS Code

**Independent Test**: Run `pnpm test` in shared/components and verify comprehensive coverage

### Implementation for User Story 1

- [ ] T010 [US1] Verify track rendering tests exist in `shared/components/src/MapView/__tests__/`
- [ ] T011 [P] [US1] Add test for selection behavior in `shared/components/src/MapView/__tests__/selection.test.tsx`
- [ ] T012 [P] [US1] Add test for temporal rendering in `shared/components/src/MapView/__tests__/temporal-utils.test.ts`
- [ ] T013 [US1] Add test for bounds calculation and auto-fit behavior
- [ ] T014 [US1] Run full test suite and document coverage: `pnpm test:coverage`

**Checkpoint**: User Story 1 complete - map functionality fully testable without VS Code

---

## Phase 4: User Story 2 - VS Code Extension Renders Map via Shared Component (Priority: P1)

**Goal**: Create thin wrapper that renders MapView in VS Code webview

**Independent Test**: Open VS Code map panel, load REP file, verify identical rendering

### Implementation for User Story 2

- [ ] T015 [US2] Create `apps/vscode/src/webview/web/mapView.tsx` following TimeController pattern
- [ ] T016 [US2] Create `apps/vscode/src/webview/web/mapView.html` entry point
- [ ] T017 [US2] Implement message handler for `loadPlot` → transform to MapView features prop
- [ ] T018 [P] [US2] Implement message handler for `setSelection` → selectedIds prop
- [ ] T019 [P] [US2] Implement message handler for `setCurrentTime` → currentTime prop
- [ ] T020 [P] [US2] Implement message handler for `setDisplayMode` → displayMode prop
- [ ] T021 [US2] Implement message handler for `addResultLayer` → merge into features
- [ ] T022 [US2] Implement `onSelect` callback → postMessage('selectionChanged')
- [ ] T023 [US2] Implement viewport change handler → postMessage('viewStateChanged')
- [ ] T024 [US2] Update `apps/vscode/esbuild.config.js` to bundle `mapView.tsx`
- [ ] T025 [US2] Add feature flag in `apps/vscode/src/webview/mapPanel.ts` to switch implementations

**Checkpoint**: User Story 2 complete - VS Code renders map via shared component with feature flag

---

## Phase 5: User Story 3 - VS Code Wrapper Handles Only Integration (Priority: P2)

**Goal**: Ensure wrapper contains ONLY VS Code-specific code, no rendering logic

**Independent Test**: Code review confirms <200 lines, no direct Leaflet calls

### Implementation for User Story 3

- [ ] T026 [US3] Implement VS Code state persistence via `vscode.setState/getState`
- [ ] T027 [US3] Implement drag-and-drop handler for REP files → postMessage('repFileDrop')
- [ ] T028 [US3] Implement keyboard shortcut handlers (Ctrl+Z/Y) → postMessage('requestUndo/Redo')
- [ ] T029 [US3] Implement `webviewReady` message on mount
- [ ] T030 [US3] Bridge VS Code CSS variables to shared component theme
- [ ] T031 [US3] Implement error boundary for component load failures
- [ ] T032 [US3] Verify wrapper is under 200 lines total

**Checkpoint**: User Story 3 complete - wrapper handles only VS Code integration

---

## Phase 6: User Story 4 - Storybook Shows Map Component Variants (Priority: P3)

**Goal**: Demonstrate MapView in Storybook with various states

**Independent Test**: Run Storybook, navigate to MapView stories

### Implementation for User Story 4

- [ ] T033 [US4] Verify `MapView.stories.tsx` has "Empty" state story
- [ ] T034 [P] [US4] Verify `MapView.stories.tsx` has "Loaded" state story with tracks
- [ ] T035 [P] [US4] Add "Selected" state story showing feature selection
- [ ] T036 [P] [US4] Verify `ExerciseAlpha.stories.tsx` demonstrates temporal rendering
- [ ] T037 [US4] Add story controls for temporal position (time slider)
- [ ] T038 [US4] Build Storybook and verify all stories render: `pnpm build-storybook`

**Checkpoint**: User Story 4 complete - Storybook demonstrates all map states

---

## Phase 7: Validation & Cutover

**Purpose**: Validate feature parity and switch to new implementation

- [ ] T039 Run manual verification checklist (see quickstart.md)
- [ ] T040 Compare screenshots: old implementation vs new wrapper
- [ ] T041 Verify performance: measure frame rate during pan/zoom
- [ ] T042 Remove feature flag, make React wrapper the default in mapPanel.ts
- [ ] T043 Mark old files for deprecation (add // DEPRECATED comments):
  - `apps/vscode/src/webview/web/map.ts`
  - `apps/vscode/src/webview/web/trackRenderer.ts`
  - `apps/vscode/src/webview/web/locationRenderer.ts`
  - `apps/vscode/src/webview/web/selectionManager.ts`
  - `apps/vscode/src/webview/web/resultRenderer.ts`
  - `apps/vscode/src/webview/web/timeFilter.ts`

**Checkpoint**: New wrapper is default, old code marked for removal

---

## Phase 8: Polish & Evidence Collection

**Purpose**: Final cleanup and evidence capture for PR

- [ ] T044 [P] Update `shared/components/package.json` exports if needed
- [ ] T045 [P] Run linting on all modified files
- [ ] T046 Verify build succeeds: `pnpm build` at repo root

### Evidence Collection (REQUIRED)

- [ ] T047 Create evidence directory: `mkdir -p specs/048-refactor-vscode-map-wrapper/evidence/screenshots`
- [ ] T048 Capture test summary: run `pnpm test:coverage` and save to `evidence/test-summary.md`
- [ ] T049 Record usage example: document wrapper code pattern in `evidence/usage-example.md`
- [ ] T050 Capture before/after screenshots of map panel in `evidence/screenshots/`
- [ ] T051 Document line count comparison (old ~2000 lines → new <200 lines)

**Checkpoint**: Evidence collected - ready for PR creation via `/speckit.pr`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup
    ↓
Phase 2: Foundational (enhances shared component)
    ↓
┌───────────────┬───────────────┐
│   Phase 3     │   Phase 4     │  (can run in parallel)
│   US1: Tests  │   US2: Wrapper│
└───────┬───────┴───────┬───────┘
        ↓               ↓
      Phase 5: US3 (Integration concerns)
              ↓
      Phase 6: US4 (Storybook)
              ↓
      Phase 7: Validation & Cutover
              ↓
      Phase 8: Polish & Evidence
```

### Parallel Opportunities

- T003, T004 (Setup review tasks)
- T006, T007 (MapView callback props)
- T011, T012 (Test additions)
- T018, T019, T020 (Message handlers)
- T033, T034, T035, T036 (Storybook stories)
- T044, T045 (Polish tasks)

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Tests) + Phase 4: US2 (Wrapper) in parallel
4. **STOP and VALIDATE**: Test wrapper with feature flag
5. If working, proceed to remaining phases

### Recommended Order

1. **Day 1**: T001-T009 (Setup + Foundational)
2. **Day 2**: T010-T014 (US1: Tests) + T015-T025 (US2: Wrapper)
3. **Day 3**: T026-T032 (US3: Integration) + T033-T038 (US4: Storybook)
4. **Day 4**: T039-T051 (Validation + Evidence)

---

## Notes

- [P] tasks can run in parallel (different files, no dependencies)
- [US#] label maps task to specific user story
- TimeController pattern: reference `apps/vscode/src/webview/web/timeController.tsx`
- Message protocol: see `apps/vscode/src/webview/messages.ts`
- Wrapper interface contract: see `specs/048-refactor-vscode-map-wrapper/contracts/wrapper-interface.ts`
- **Evidence is required** before creating PR
