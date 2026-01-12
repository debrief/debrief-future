# Tasks: Loader Mini-App

**Input**: Design documents from `/specs/004-loader-mini-app/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ipc-messages.md ✓

---

## Evidence Requirements

**Evidence Directory**: `specs/004-loader-mini-app/evidence/`

### Minimum Evidence Per Feature

1. **Test Summary** (`evidence/test-summary.md`): Pass/fail counts, coverage
2. **Usage Example** (`evidence/usage-example.md`): Demo of loading a REP file
3. **Screenshots**: Wizard steps, success/error states
4. **E2E Recording**: Playwright trace of full workflow

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Electron/React structure

- [ ] T001 Create `apps/loader/` directory structure per plan.md
- [ ] T002 Initialize pnpm project with Electron 28+, React 18+, Vite dependencies
- [ ] T003 [P] Configure Vitest for unit testing
- [ ] T004 [P] Configure Playwright for E2E testing
- [ ] T005 [P] Configure ESLint and Prettier for TypeScript/React
- [ ] T006 [P] Configure TypeScript with strict mode for main/renderer/preload
- [ ] T007 Setup Electron main process entry point in `src/main/index.ts`
- [ ] T008 Setup React renderer with Vite in `src/renderer/`
- [ ] T009 Configure preload script with context bridge in `src/preload/index.ts`
- [ ] T010 Create `.env.example` with development environment variables

**Checkpoint**: Electron app launches with blank React renderer

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required by ALL user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### I18N Infrastructure (Constitution Article XI)

- [ ] T011 Install and configure react-i18next in `src/renderer/i18n/`
- [ ] T012 Create English locale file `src/renderer/i18n/locales/en.json`
- [ ] T013 Create i18n initialization with TypeScript key extraction
- [ ] T014 Add useTranslation hook wrapper with typed keys

### Type Definitions

- [ ] T015 [P] Create `src/renderer/types/state.ts` with LoaderState, SourceFile
- [ ] T016 [P] Create `src/renderer/types/store.ts` with StacStoreInfo, PlotInfo
- [ ] T017 [P] Create `src/renderer/types/forms.ts` with NewPlotForm
- [ ] T018 [P] Create `src/renderer/types/results.ts` with LoadResult, LoaderError
- [ ] T019 [P] Create `src/main/types/ipc.ts` with JSON-RPC types

### IPC Bridge

- [ ] T020 Implement secure IPC channel definitions in `src/preload/index.ts`
- [ ] T021 Create IPC type declarations for renderer (contextBridge API)
- [ ] T022 Implement JSON-RPC 2.0 client utility in `src/main/ipc/jsonrpc.ts`

### Python Service Integration

- [ ] T023 Implement debrief-io service spawner in `src/main/ipc/io.ts`
- [ ] T024 Implement debrief-stac service manager in `src/main/ipc/stac.ts`
- [ ] T025 Implement debrief-config TypeScript integration in `src/main/ipc/config.ts`
- [ ] T026 Add configure() call to debrief-stac on startup with store paths

### File Association

- [ ] T027 Implement file path extraction from `process.argv` in `src/main/file-association.ts`
- [ ] T028 Handle macOS `app.on('open-file')` event
- [ ] T029 Configure electron-builder file associations in build config

### Startup & Cleanup

- [ ] T030 Implement pending operation marker in `src/main/cleanup.ts`
- [ ] T031 Add cleanup check on `app.on('ready')` for interrupted operations

**Checkpoint**: Foundation ready - services spawn, IPC works, file path received

---

## Phase 3: User Story 1 - Load File into New Plot (Priority: P1) 🎯 MVP

**Goal**: User can load a REP file into a new plot with full provenance

**Independent Test**: Load single REP file, verify plot created in STAC catalog with features and provenance

### Components for User Story 1

- [ ] T032 [P] [US1] Create `StoreSelector` component in `src/renderer/components/StoreSelector/`
- [ ] T033 [P] [US1] Create `StoreCard` component for individual store display
- [ ] T034 [US1] Implement store list fetching hook `useStores()` in `src/renderer/hooks/`
- [ ] T035 [US1] Create `WizardHeader` component showing file being loaded
- [ ] T036 [US1] Create `WizardNavigation` component (Back/Cancel/Next/Load buttons)

### Plot Configuration (Create New Tab)

- [ ] T037 [US1] Create `PlotConfig` component with tabbed interface in `src/renderer/components/PlotConfig/`
- [ ] T038 [US1] Create `CreateNewTab` component with name/description form
- [ ] T039 [US1] Implement form validation for new plot name (required, unique)

### Processing Flow

- [ ] T040 [US1] Create `ProgressView` component in `src/renderer/components/ProgressView/`
- [ ] T041 [US1] Implement progress state management with status messages
- [ ] T042 [US1] Implement parse → create plot → add features → copy asset sequence
- [ ] T043 [US1] Write pending operation marker before processing starts
- [ ] T044 [US1] Clear marker on successful completion

### Result Display

- [ ] T045 [US1] Create `SuccessView` component showing load result
- [ ] T046 [US1] Create `ErrorView` component with actionable error messages
- [ ] T047 [US1] Implement retry capability for retryable errors

### Main Application

- [ ] T048 [US1] Create `App.tsx` with wizard state management
- [ ] T049 [US1] Implement step transitions (store-selection → plot-configuration → processing → complete/error)
- [ ] T050 [US1] Handle "no stores configured" edge case with guidance message

### Integration

- [ ] T051 [US1] Wire up main process IPC handlers for renderer requests
- [ ] T052 [US1] Implement full load workflow: parse_file → create_plot → add_features → copy_asset
- [ ] T053 [US1] Record provenance metadata (source path, hash, parser, version, timestamp)

**Checkpoint**: User can load a REP file into a new plot end-to-end

---

## Phase 4: User Story 2 - Add Data to Existing Plot (Priority: P2)

**Goal**: User can add supplementary data to an existing plot

**Independent Test**: Create plot with one file, load second file into same plot, verify both datasets present

### Plot List Component

- [ ] T054 [P] [US2] Create `AddExistingTab` component for plot selection
- [ ] T055 [P] [US2] Create `PlotCard` component showing plot name, date, feature count
- [ ] T056 [US2] Implement plot list fetching hook `usePlots(storeId)` in `src/renderer/hooks/`

### Processing Flow

- [ ] T057 [US2] Update processing flow to handle existing plot target
- [ ] T058 [US2] Implement add_features call without create_plot for existing plots
- [ ] T059 [US2] Record provenance as separate ingestion event linked to existing plot

### Tab Integration

- [ ] T060 [US2] Wire up tab switching between "Add to Existing" and "Create New"
- [ ] T061 [US2] Validate plot selection before enabling "Load" button

**Checkpoint**: User can add data to existing plots

---

## Phase 5: User Story 3 - Beta Preview UI Components (Priority: P3)

**Goal**: Stakeholders can preview and provide feedback on UI via Storybook

**Independent Test**: Access Storybook URL, interact with components in isolation

### Storybook Setup

- [ ] T062 [P] [US3] Configure Storybook 8+ in `apps/loader/.storybook/`
- [ ] T063 [P] [US3] Configure Storybook addons (controls, actions, a11y)
- [ ] T064 [US3] Create mock data providers for stories (stores, plots)

### Component Stories

- [ ] T065 [P] [US3] Create `StoreSelector.stories.tsx` with variants (empty, single, multiple stores)
- [ ] T066 [P] [US3] Create `StoreCard.stories.tsx` with accessible/inaccessible states
- [ ] T067 [P] [US3] Create `PlotConfig.stories.tsx` with both tabs
- [ ] T068 [P] [US3] Create `PlotCard.stories.tsx` with various feature counts
- [ ] T069 [P] [US3] Create `ProgressView.stories.tsx` with different progress states
- [ ] T070 [P] [US3] Create `SuccessView.stories.tsx` with sample result
- [ ] T071 [P] [US3] Create `ErrorView.stories.tsx` with different error types

### Deployment

- [ ] T072 [US3] Create GitHub Actions workflow for Storybook build on push
- [ ] T073 [US3] Configure deployment to GitHub Pages (`/loader-storybook/`)
- [ ] T074 [US3] Add link to GitHub Discussion for feedback collection

**Checkpoint**: Storybook deployed and accessible for stakeholder review

---

## Phase 6: First-Run Experience

**Purpose**: Handle case when no STAC stores configured

- [ ] T075 Create `NoStoresView` component with store setup options
- [ ] T076 Implement "Create local store" sub-flow with folder picker
- [ ] T077 Add default path suggestion using `app.getPath('documents')`
- [ ] T078 Wire up debrief-stac init call for new local catalog
- [ ] T079 Register new store via debrief-config
- [ ] T080 Disable "Connect to remote" option with "(coming soon)" label

**Checkpoint**: First-time users can create a local store and proceed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all user stories

### Accessibility & UX

- [ ] T081 [P] Add keyboard navigation for wizard steps
- [ ] T082 [P] Add ARIA labels and roles to all interactive elements
- [ ] T083 [P] Ensure focus management between wizard steps

### Error Handling

- [ ] T084 [P] Add service timeout handling with retry logic
- [ ] T085 [P] Add graceful degradation if service unavailable
- [ ] T086 Validate all error messages are actionable per FR-011

### Build & Distribution

- [ ] T087 Configure electron-builder for Linux, macOS, Windows
- [ ] T088 [P] Add platform-specific icons and metadata
- [ ] T089 Configure auto-updater infrastructure (future use)

### Documentation

- [ ] T090 Validate quickstart.md against actual implementation
- [ ] T091 Add inline JSDoc comments to exported functions

### Evidence Collection (REQUIRED)

- [ ] T092 Create evidence directory: `specs/004-loader-mini-app/evidence/`
- [ ] T093 Capture test summary with pass/fail counts in `evidence/test-summary.md`
- [ ] T094 Record usage example demonstrating file load in `evidence/usage-example.md`
- [ ] T095 Capture wizard screenshots for all steps in `evidence/screenshots/`
- [ ] T096 Record Playwright trace of complete workflow in `evidence/e2e-trace.zip`
- [ ] T097 Screenshot error states with actionable messages in `evidence/screenshots/`

**Checkpoint**: Evidence collected - ready for PR creation via `/speckit.pr`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 - MVP delivery
- **Phase 4 (US2)**: Depends on Phase 2 - can parallel with US1 after T049
- **Phase 5 (US3)**: Depends on Phase 2 - can parallel with US1/US2
- **Phase 6 (First-Run)**: Depends on US1 completion
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

| Story | Can Start After | Dependencies on Other Stories |
|-------|-----------------|-------------------------------|
| US1 (P1) | Phase 2 complete | None |
| US2 (P2) | Phase 2 complete | Reuses T032-T036 from US1 |
| US3 (P3) | Phase 2 complete | Stories use components from US1/US2 |

### Within Each User Story

1. Components before hooks
2. Hooks before integration
3. Core flow before edge cases
4. Integration before polish

### Parallel Opportunities

**Phase 1**: T003, T004, T005, T006 can run in parallel (tooling setup)

**Phase 2**:
- T015, T016, T017, T018, T019 can run in parallel (type definitions)
- T023, T024, T025 can run in parallel after T022 (service spawners)

**Phase 3 (US1)**:
- T032, T033 can run in parallel (store components)

**Phase 4 (US2)**:
- T054, T055 can run in parallel (plot components)

**Phase 5 (US3)**:
- T062, T063 can run in parallel (Storybook setup)
- T065-T071 can ALL run in parallel (component stories)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup ✓
2. Complete Phase 2: Foundational ✓
3. Complete Phase 3: User Story 1 (Load into new plot)
4. **STOP and VALIDATE**: Test end-to-end load workflow
5. Demo/deploy basic capability

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test → Demo (MVP: new plot loading)
3. Add US2 → Test → Demo (existing plot support)
4. Add US3 → Deploy → Gather feedback (Storybook preview)
5. Add Phase 6 → Test (first-run experience)
6. Polish + Evidence → PR ready

### Task Count Summary

| Phase | Task Count | Parallel Tasks |
|-------|------------|----------------|
| Phase 1: Setup | 10 | 4 |
| Phase 2: Foundational | 21 | 9 |
| Phase 3: US1 | 22 | 2 |
| Phase 4: US2 | 8 | 2 |
| Phase 5: US3 | 13 | 9 |
| Phase 6: First-Run | 6 | 0 |
| Phase 7: Polish | 16 | 6 |
| **Total** | **96** | **32** |

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- All i18n strings externalized from day one (Constitution Article XI)
- Evidence is required before PR - capture artifacts per Phase 7
- Run `/speckit.pr` after all tasks complete to create PR with evidence
