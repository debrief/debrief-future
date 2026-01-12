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

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Project initialization and Electron/React structure

- [x] T001 Create `apps/loader/` directory structure per plan.md
- [x] T002 Initialize pnpm project with Electron 28+, React 18+, Vite dependencies
- [x] T003 [P] Configure Vitest for unit testing
- [x] T004 [P] Configure Playwright for E2E testing
- [x] T005 [P] Configure ESLint and Prettier for TypeScript/React
- [x] T006 [P] Configure TypeScript with strict mode for main/renderer/preload
- [x] T007 Setup Electron main process entry point in `src/main/index.ts`
- [x] T008 Setup React renderer with Vite in `src/renderer/`
- [x] T009 Configure preload script with context bridge in `src/preload/index.ts`
- [x] T010 Create `.env.example` with development environment variables

**Checkpoint**: ✅ Electron app structure complete

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Core infrastructure required by ALL user stories

### I18N Infrastructure (Constitution Article XI)

- [x] T011 Install and configure react-i18next in `src/renderer/i18n/`
- [x] T012 Create English locale file `src/renderer/i18n/locales/en.json`
- [x] T013 Create i18n initialization with TypeScript key extraction
- [x] T014 Add useTranslation hook wrapper with typed keys

### Type Definitions

- [x] T015 [P] Create `src/renderer/types/state.ts` with LoaderState, SourceFile
- [x] T016 [P] Create `src/renderer/types/store.ts` with StacStoreInfo, PlotInfo
- [x] T017 [P] Create `src/renderer/types/forms.ts` with NewPlotForm
- [x] T018 [P] Create `src/renderer/types/results.ts` with LoadResult, LoaderError
- [x] T019 [P] Create `src/main/types/ipc.ts` with JSON-RPC types

### IPC Bridge

- [x] T020 Implement secure IPC channel definitions in `src/preload/index.ts`
- [x] T021 Create IPC type declarations for renderer (contextBridge API)
- [x] T022 Implement JSON-RPC 2.0 client utility in `src/main/ipc/jsonrpc.ts`

### Python Service Integration

- [x] T023 Implement debrief-io service spawner in `src/main/ipc/io.ts`
- [x] T024 Implement debrief-stac service manager in `src/main/ipc/stac.ts`
- [x] T025 Implement debrief-config TypeScript integration in `src/main/ipc/config.ts`
- [x] T026 Add configure() call to debrief-stac on startup with store paths

### File Association

- [x] T027 Implement file path extraction from `process.argv` in `src/main/file-association.ts`
- [x] T028 Handle macOS `app.on('open-file')` event
- [x] T029 Configure electron-builder file associations in build config

### Startup & Cleanup

- [x] T030 Implement pending operation marker in `src/main/cleanup.ts`
- [x] T031 Add cleanup check on `app.on('ready')` for interrupted operations

**Checkpoint**: ✅ Foundation ready - services spawn, IPC works, file path received

---

## Phase 3: User Story 1 - Load File into New Plot (Priority: P1) 🎯 MVP ✅

**Goal**: User can load a REP file into a new plot with full provenance

**Independent Test**: Load single REP file, verify plot created in STAC catalog with features and provenance

### Components for User Story 1

- [x] T032 [P] [US1] Create `StoreSelector` component in `src/renderer/components/StoreSelector/`
- [x] T033 [P] [US1] Create `StoreCard` component for individual store display
- [x] T034 [US1] Implement store list fetching hook `useStores()` in `src/renderer/hooks/`
- [x] T035 [US1] Create `WizardHeader` component showing file being loaded
- [x] T036 [US1] Create `WizardNavigation` component (Back/Cancel/Next/Load buttons)

### Plot Configuration (Create New Tab)

- [x] T037 [US1] Create `PlotConfig` component with tabbed interface in `src/renderer/components/PlotConfig/`
- [x] T038 [US1] Create `CreateNewTab` component with name/description form
- [x] T039 [US1] Implement form validation for new plot name (required, unique)

### Processing Flow

- [x] T040 [US1] Create `ProgressView` component in `src/renderer/components/ProgressView/`
- [x] T041 [US1] Implement progress state management with status messages
- [x] T042 [US1] Implement parse → create plot → add features → copy asset sequence
- [x] T043 [US1] Write pending operation marker before processing starts
- [x] T044 [US1] Clear marker on successful completion

### Result Display

- [x] T045 [US1] Create `SuccessView` component showing load result
- [x] T046 [US1] Create `ErrorView` component with actionable error messages
- [x] T047 [US1] Implement retry capability for retryable errors

### Main Application

- [x] T048 [US1] Create `App.tsx` with wizard state management
- [x] T049 [US1] Implement step transitions (store-selection → plot-configuration → processing → complete/error)
- [x] T050 [US1] Handle "no stores configured" edge case with guidance message

### Integration

- [x] T051 [US1] Wire up main process IPC handlers for renderer requests
- [x] T052 [US1] Implement full load workflow: parse_file → create_plot → add_features → copy_asset
- [x] T053 [US1] Record provenance metadata (source path, hash, parser, version, timestamp)

**Checkpoint**: ✅ User can load a REP file into a new plot end-to-end

---

## Phase 4: User Story 2 - Add Data to Existing Plot (Priority: P2) ✅

**Goal**: User can add supplementary data to an existing plot

**Independent Test**: Create plot with one file, load second file into same plot, verify both datasets present

### Plot List Component

- [x] T054 [P] [US2] Create `AddExistingTab` component for plot selection
- [x] T055 [P] [US2] Create `PlotCard` component showing plot name, date, feature count
- [x] T056 [US2] Implement plot list fetching hook `usePlots(storeId)` in `src/renderer/hooks/`

### Processing Flow

- [x] T057 [US2] Update processing flow to handle existing plot target
- [x] T058 [US2] Implement add_features call without create_plot for existing plots
- [x] T059 [US2] Record provenance as separate ingestion event linked to existing plot

### Tab Integration

- [x] T060 [US2] Wire up tab switching between "Add to Existing" and "Create New"
- [x] T061 [US2] Validate plot selection before enabling "Load" button

**Checkpoint**: ✅ User can add data to existing plots

---

## Phase 5: User Story 3 - Beta Preview UI Components (Priority: P3) ✅

**Goal**: Stakeholders can preview and provide feedback on UI via Storybook

**Independent Test**: Access Storybook URL, interact with components in isolation

### Storybook Setup

- [x] T062 [P] [US3] Configure Storybook 8+ in `apps/loader/.storybook/`
- [x] T063 [P] [US3] Configure Storybook addons (controls, actions, a11y)
- [x] T064 [US3] Create mock data providers for stories (stores, plots)

### Component Stories

- [x] T065 [P] [US3] Create `StoreSelector.stories.tsx` with variants (empty, single, multiple stores)
- [x] T066 [P] [US3] Create `StoreCard.stories.tsx` with accessible/inaccessible states
- [x] T067 [P] [US3] Create `PlotConfig.stories.tsx` with both tabs
- [x] T068 [P] [US3] Create `PlotCard.stories.tsx` with various feature counts
- [x] T069 [P] [US3] Create `ProgressView.stories.tsx` with different progress states
- [x] T070 [P] [US3] Create `SuccessView.stories.tsx` with sample result
- [x] T071 [P] [US3] Create `ErrorView.stories.tsx` with different error types

### Deployment

- [x] T072 [US3] Create GitHub Actions workflow for Storybook build on push
- [x] T073 [US3] Configure deployment to GitHub Pages (`/loader-storybook/`)
- [ ] T074 [US3] Add link to GitHub Discussion for feedback collection

**Checkpoint**: ✅ Storybook configured and deployment workflow ready

---

## Phase 6: First-Run Experience ✅

**Purpose**: Handle case when no STAC stores configured

- [x] T075 Create `NoStoresView` component with store setup options
- [x] T076 Implement "Create local store" sub-flow with folder picker
- [x] T077 Add default path suggestion using `app.getPath('documents')`
- [x] T078 Wire up debrief-stac init call for new local catalog
- [x] T079 Register new store via debrief-config
- [x] T080 Disable "Connect to remote" option with "(coming soon)" label

**Checkpoint**: ✅ First-time users can create a local store and proceed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all user stories

### Accessibility & UX

- [x] T081 [P] Add keyboard navigation for wizard steps
- [x] T082 [P] Add ARIA labels and roles to all interactive elements
- [x] T083 [P] Ensure focus management between wizard steps

### Error Handling

- [x] T084 [P] Add service timeout handling with retry logic
- [x] T085 [P] Add graceful degradation if service unavailable
- [x] T086 Validate all error messages are actionable per FR-011

### Build & Distribution

- [x] T087 Configure electron-builder for Linux, macOS, Windows
- [ ] T088 [P] Add platform-specific icons and metadata
- [ ] T089 Configure auto-updater infrastructure (future use)

### Documentation

- [ ] T090 Validate quickstart.md against actual implementation
- [x] T091 Add inline JSDoc comments to exported functions

### Evidence Collection (REQUIRED)

- [x] T092 Create evidence directory: `specs/004-loader-mini-app/evidence/`
- [x] T093 Capture test summary with pass/fail counts in `evidence/test-summary.md`
- [x] T094 Record usage example demonstrating file load in `evidence/usage-example.md`
- [ ] T095 Capture wizard screenshots for all steps in `evidence/screenshots/`
- [ ] T096 Record Playwright trace of complete workflow in `evidence/e2e-trace.zip`
- [ ] T097 Screenshot error states with actionable messages in `evidence/screenshots/`

**Checkpoint**: Evidence collected - ready for PR creation via `/speckit.pr`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: ✅ Complete
- **Phase 2 (Foundational)**: ✅ Complete
- **Phase 3 (US1)**: ✅ Complete - MVP delivered
- **Phase 4 (US2)**: ✅ Complete
- **Phase 5 (US3)**: ✅ Complete
- **Phase 6 (First-Run)**: ✅ Complete
- **Phase 7 (Polish)**: In progress - evidence collection

### Task Completion Summary

| Phase | Completed | Total | % Complete |
|-------|-----------|-------|------------|
| Phase 1: Setup | 10 | 10 | 100% |
| Phase 2: Foundational | 21 | 21 | 100% |
| Phase 3: US1 | 22 | 22 | 100% |
| Phase 4: US2 | 8 | 8 | 100% |
| Phase 5: US3 | 12 | 13 | 92% |
| Phase 6: First-Run | 6 | 6 | 100% |
| Phase 7: Polish | 10 | 16 | 63% |
| **Total** | **89** | **96** | **93%** |

---

## Notes

- [P] tasks = different files, no dependencies
- [US*] label maps task to specific user story for traceability
- All i18n strings externalized from day one (Constitution Article XI)
- Evidence is required before PR - capture artifacts per Phase 7
- Run `/speckit.pr` after all tasks complete to create PR with evidence
