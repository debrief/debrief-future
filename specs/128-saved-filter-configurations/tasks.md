# Tasks: Saved Filter Configurations

**Input**: Design documents from `/specs/128-saved-filter-configurations/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/saved-filters.ts, quickstart.md

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/128-saved-filter-configurations/evidence/`
**Media Directory**: `specs/128-saved-filter-configurations/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Code example showing useSavedFilters hook integration | After hook complete |
| screenshots/component-light.png | Light theme screenshot of SaveFilterButton + dropdown | After Storybook E2E |
| screenshots/component-dark.png | Dark theme screenshot | After Storybook E2E |
| screenshots/component-vscode.png | VS Code theme screenshot | After Storybook E2E |
| screenshots/interaction.gif | Save → restore → delete flow animation | After Storybook E2E |

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

**Purpose**: Project scaffolding and type definitions

- [ ] T001 Add SavedFilterConfiguration and SavedFiltersCollection types to existing types file `shared/components/src/FilterBar/types.ts`
- [ ] T002 [P] Add user-facing strings for saved filters to constants `shared/components/src/FilterBar/constants.ts`
- [ ] T003 [P] Create storage interface and implementations `shared/components/src/FilterBar/savedFiltersStorage.ts`

**Checkpoint**: Types, constants, and storage abstraction in place

---

## Phase 2: Foundation — useSavedFilters Hook

**Purpose**: Core CRUD logic that all UI components depend on

**⚠️ CRITICAL**: No UI component work can begin until this phase is complete

- [ ] T004 Implement useSavedFilters hook with save/load/delete/overwrite operations `shared/components/src/FilterBar/useSavedFilters.ts`
- [ ] T005 [test] Write unit tests for useSavedFilters hook `shared/components/src/FilterBar/__tests__/useSavedFilters.test.ts`

**Checkpoint**: Hook fully functional and tested — UI component implementation can begin

---

## Phase 3: User Story 1 — Save Current Filters (Priority: P1)

**Goal**: Analyst can save the current filter bar state as a named configuration via a Save button with name prompt popover.

**Independent Test**: Add lozenges to filter bar, click Save, enter name, confirm configuration appears in saved list.

### Implementation for User Story 1

- [ ] T006 [US1] Create SaveFilterButton component with name prompt popover `shared/components/src/FilterBar/SaveFilterButton.tsx`
- [ ] T007 [US1] [test] Write unit tests for SaveFilterButton `shared/components/src/FilterBar/__tests__/SaveFilterButton.test.tsx`

**Checkpoint**: Save flow works — analyst can name and persist filter configurations

---

## Phase 4: User Story 2 — Restore Saved Filters (Priority: P1)

**Goal**: Analyst can open a Historic Filters dropdown, see saved configurations, and select one to replace the current filter bar state.

**Independent Test**: Select a saved configuration from dropdown and verify filter bar displays correct lozenges.

### Implementation for User Story 2

- [ ] T008 [US2] Create HistoricFiltersDropdown component with restore and delete controls `shared/components/src/FilterBar/HistoricFiltersDropdown.tsx`
- [ ] T009 [US2] [test] Write unit tests for HistoricFiltersDropdown `shared/components/src/FilterBar/__tests__/HistoricFiltersDropdown.test.tsx`

**Checkpoint**: Restore flow works — analyst can browse saved configurations and apply them

---

## Phase 5: User Story 3 — Delete Saved Filters (Priority: P2)

**Goal**: Analyst can remove saved configurations they no longer need from the Historic Filters dropdown.

**Independent Test**: Open dropdown, delete an entry, verify it no longer appears.

### Implementation for User Story 3

> Delete functionality is implemented within HistoricFiltersDropdown (Phase 4). This phase covers integration and the delete-specific edge cases.

- [ ] T010 [US3] [test] Add delete-specific test cases (confirm removal, re-render after delete) `shared/components/src/FilterBar/__tests__/HistoricFiltersDropdown.test.tsx`

**Checkpoint**: Delete flow tested — full CRUD lifecycle operational

---

## Phase 6: User Story 4 — Persistence Across Sessions (Priority: P2)

**Goal**: Saved configurations survive application close/reopen in both VS Code and web-shell environments.

**Independent Test**: Save a configuration, simulate storage round-trip, verify data fidelity.

### Implementation for User Story 4

- [ ] T011 [US4] [test] Write persistence round-trip tests (save → serialise → deserialise → load) `shared/components/src/FilterBar/__tests__/savedFiltersStorage.test.ts`

**Checkpoint**: Persistence verified — saved filters survive session boundaries

---

## Phase 7: Integration — FilterBar + Storybook

**Purpose**: Wire SaveFilterButton and HistoricFiltersDropdown into existing FilterBar; create Storybook stories

- [ ] T012 Integrate SaveFilterButton and HistoricFiltersDropdown into FilterBar component `shared/components/src/FilterBar/FilterBar.tsx`
- [ ] T013 [P] Update FilterBar index exports `shared/components/src/FilterBar/index.ts`
- [ ] T014 Create Storybook stories (Empty, WithSaved, SaveFlow) `shared/components/src/FilterBar/SavedFilters.stories.tsx`
- [ ] T015 Update existing FilterBar stories to include saved filters integration `shared/components/src/FilterBar/FilterBar.stories.tsx`

**Checkpoint**: Components integrated and visible in Storybook

---

## Phase 8: E2E Testing 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T016 Create Playwright E2E tests for SavedFilters stories `shared/components/e2e/SavedFilters.spec.ts`
- [ ] T017 [P] Add theme variant tests (light, dark, vscode) `shared/components/e2e/SavedFilters.spec.ts`
- [ ] T018 [P] Add interaction tests (save flow, restore, delete) `shared/components/e2e/SavedFilters.spec.ts`
- [ ] T019 Run E2E suite: `pnpm --filter @debrief/components test:e2e SavedFilters`

**Checkpoint**: All E2E tests pass across theme variants

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T020 Capture test results using template (.specify/templates/evidence/test-summary-template.md) in `specs/128-saved-filter-configurations/evidence/test-summary.md`
- [ ] T021 Create usage demonstration in `specs/128-saved-filter-configurations/evidence/usage-example.md`
- [ ] T022 [P] Capture theme screenshots (light/dark/vscode) to `specs/128-saved-filter-configurations/evidence/screenshots/`
- [ ] T023 Capture interaction GIF showing save → restore → delete flow to `specs/128-saved-filter-configurations/evidence/screenshots/interaction.gif`

### E2E Evidence Collection (REQUIRED) 🎭

- [ ] T024 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T025 Document E2E results in `specs/128-saved-filter-configurations/evidence/e2e-summary.md`

### Media Content

- [ ] T026 Create shipped blog post in `specs/128-saved-filter-configurations/media/shipped-post.md`
- [ ] T027 [P] Create LinkedIn shipped summary in `specs/128-saved-filter-configurations/media/linkedin-shipped.md`

### PR Creation

- [ ] T028 Create PR and publish blog: run /speckit.pr

**Task T028 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all UI components
- **Phase 3 (US1 Save)**: Depends on Phase 2
- **Phase 4 (US2 Restore)**: Depends on Phase 2 (can run in parallel with Phase 3)
- **Phase 5 (US3 Delete)**: Depends on Phase 4 (delete is within HistoricFiltersDropdown)
- **Phase 6 (US4 Persistence)**: Depends on Phase 2 (can run in parallel with Phases 3-5)
- **Phase 7 (Integration)**: Depends on Phases 3 and 4
- **Phase 8 (E2E)**: Depends on Phase 7 (needs Storybook stories)
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

- **US1 (Save)**: Depends on useSavedFilters hook only — independent of other stories
- **US2 (Restore)**: Depends on useSavedFilters hook only — independent of US1 (uses pre-populated configurations)
- **US3 (Delete)**: Implemented within HistoricFiltersDropdown — depends on US2 component
- **US4 (Persistence)**: Tests storage layer directly — independent of UI components

### Parallel Opportunities

- T002 and T003 can run in parallel (Phase 1)
- Phase 3 (Save) and Phase 4 (Restore) can run in parallel after Phase 2
- Phase 6 (Persistence) can run in parallel with Phases 3-5
- T013, T014, T015 can run in parallel within Phase 7
- T017 and T018 can run in parallel within Phase 8
- T022 can run in parallel with T021 in evidence collection

---

## Parallel Example: Phases 3 & 4

```bash
# After Phase 2 (hook) completes, launch in parallel:
Task: "Create SaveFilterButton component" (T006)
Task: "Create HistoricFiltersDropdown component" (T008)

# Their tests can also run in parallel:
Task: "Write SaveFilterButton tests" (T007)
Task: "Write HistoricFiltersDropdown tests" (T009)
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1+2** → Types, constants, storage, hook ready
2. **Phase 3** → Save flow works (testable independently)
3. **Phase 4** → Restore flow works (testable independently)
4. **Phase 5** → Delete edge cases verified
5. **Phase 6** → Persistence verified across sessions
6. **Phase 7** → Full integration in FilterBar + Storybook
7. **Phase 8** → E2E tests pass across themes
8. **Phase 9** → Evidence, media, PR

Each phase adds value without breaking previous phases.

---

## Notes

- All new code lives within existing `shared/components/src/FilterBar/` directory
- No new packages or dependencies required — uses existing React 18.x, vitest, Storybook, Playwright
- Storage interface pattern enables VS Code workspaceState and browser localStorage without component changes
- CQL2 JSON stored for portability but FilterBarState is authoritative for restoration
- Maximum 100 saved configurations per workspace (enforced in hook)
