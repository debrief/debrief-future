# Tasks: Vessel Taxonomy and Hierarchical Filtering

**Input**: Design documents from `/specs/133-vessel-taxonomy/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/component-api.md

**Tests**: Included — spec.md requires unit tests (TDD) and Storybook E2E tests per project convention.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/133-vessel-taxonomy/evidence/`
**Media Directory**: `specs/133-vessel-taxonomy/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results with pass/fail counts | After all tests pass |
| usage-example.md | Interactive FilterBar with taxonomy dropdown walkthrough | After US1 + US3 complete |
| screenshots/component-light.png | FilterBar with taxonomy lozenges (light theme) | After Storybook E2E |
| screenshots/component-dark.png | FilterBar with taxonomy lozenges (dark theme) | After Storybook E2E |
| screenshots/component-vscode.png | FilterBar with taxonomy lozenges (vscode theme) | After Storybook E2E |
| screenshots/interaction.gif | Taxonomy tree navigation + search + selection | After Storybook E2E |

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

**Purpose**: Ensure project structure and test infrastructure are ready

- [ ] T001 Create `CascadingMenu/__tests__/` directory `shared/components/src/CascadingMenu/__tests__/`
- [ ] T002 [P] Create evidence directory structure `specs/133-vessel-taxonomy/evidence/screenshots/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Shared utilities that ALL user stories depend on — label map, badge prop, tree filter

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundation ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [test] Write unit tests for `buildTaxonomyLabelMap()` — full-path keys, tanker ambiguity, unknown path fallback `shared/components/src/filter-engine/__tests__/taxonomy.test.ts`
- [ ] T004 [P][test] Write unit tests for `filterCascadingItems()` — substring match, ancestor chain, empty query, no matches, special characters `shared/components/src/CascadingMenu/__tests__/filterCascadingItems.test.ts`

### Implementation for Foundation

- [ ] T005 Add `buildTaxonomyLabelMap()` and `resolveTaxonomyLabel()` to existing taxonomy module (full-path keys, O(n) tree walk) `shared/components/src/filter-engine/taxonomy.ts`
- [ ] T006 [P] Add `badge` prop to `CascadingMenuItem` interface and render badge element in CascadingMenu `shared/components/src/CascadingMenu/CascadingMenu.tsx`
- [ ] T007 [P] Add badge + search input CSS styling `shared/components/src/CascadingMenu/CascadingMenu.css`
- [ ] T008 [P] Create `filterCascadingItems()` utility — recursive tree filter using `String.toLowerCase().includes()` `shared/components/src/CascadingMenu/filterCascadingItems.ts`
- [ ] T009 Export `buildTaxonomyLabelMap`, `resolveTaxonomyLabel` from filter-engine index `shared/components/src/filter-engine/index.ts`

**Checkpoint**: Foundation ready — label resolution, badge rendering, and tree filtering all work. User story implementation can begin.

---

## Phase 3: User Story 1 — Browse and Select from the Vessel Taxonomy Tree (Priority: P1)

**Goal**: Vessel class lozenges display human-readable labels; re-opening the dropdown marks the current selection

**Independent Test**: Open the vessel class dropdown, select "Type 23 Frigate", verify lozenge displays "Type 23 Frigate" (not `surface/warship/frigate/type23`). Click lozenge to re-edit, verify "Type 23 Frigate" is marked as current.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [test] [US1] Write unit test for Lozenge vessel-class label resolution via `labelMap` prop `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`
- [ ] T011 [P][test] [US1] Write unit test for OrContainer forwarding `labelMap` to child Lozenges `shared/components/src/FilterBar/__tests__/OrContainer.test.tsx`
- [ ] T012 [P][test] [US1] Write unit test for `taxonomyToCascadingItems()` with `currentValue` option — verify `current: true` on matching node `shared/components/src/FilterBar/__tests__/taxonomyAdapter.test.ts`

### Implementation for User Story 1

- [ ] T013 Modify `taxonomyToCascadingItems()` to accept `currentValue` option and set `current: true` on matching item `shared/components/src/FilterBar/taxonomyAdapter.ts`
- [ ] T014 Modify Lozenge to accept `labelMap` prop and resolve vessel-class values via `resolveTaxonomyLabel()` `shared/components/src/FilterBar/Lozenge.tsx`
- [ ] T015 Modify OrContainer to forward `labelMap` prop to child Lozenges `shared/components/src/FilterBar/OrContainer.tsx`
- [ ] T016 Modify FilterBar to build label map (memoized), pass to Lozenges, and resolve DragOverlay labels for vessel-class items `shared/components/src/FilterBar/FilterBar.tsx`
- [ ] T017 Modify ValueEditor to pass `currentValue` to `taxonomyToCascadingItems()` when rendering vessel-class editor `shared/components/src/FilterBar/ValueEditor.tsx`

**Checkpoint**: Vessel class lozenges show human-readable labels. Re-opening the dropdown highlights the current selection. DragOverlay shows correct labels.

---

## Phase 4: User Story 2 — Search Within the Taxonomy Dropdown (Priority: P2)

**Goal**: Type-ahead search input in the vessel class CascadingMenu filters the tree by label substring match

**Independent Test**: Open the vessel class dropdown, type "ast" in search, verify only "Astute-class SSN" and its ancestor path appear. Select it, verify lozenge created correctly.

### Tests for User Story 2 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T018 [test] [US2] Write unit tests for SearchableCascadingMenu — search input rendering, filtering, clear on dismiss, no-matches message `shared/components/src/CascadingMenu/__tests__/SearchableCascadingMenu.test.tsx`

### Implementation for User Story 2

- [ ] T019 [US2] Create SearchableCascadingMenu wrapper — owns container layout, search input + CascadingMenu positioned relatively within it `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx`
- [ ] T020 [US2] Export SearchableCascadingMenu from CascadingMenu index `shared/components/src/CascadingMenu/index.ts`
- [ ] T021 [US2] Modify ValueEditor to use SearchableCascadingMenu (with `searchable={true}`) for vessel-class filter type `shared/components/src/FilterBar/ValueEditor.tsx`

**Checkpoint**: Typing in the search box filters the taxonomy tree. Selecting from filtered results works. Search clears on dismiss.

---

## Phase 5: User Story 3 — Display Match Counts per Taxonomy Node (Priority: P3)

**Goal**: Each taxonomy node shows a badge with the count of matching items in the current filtered set. Zero-count nodes are dimmed and disabled.

**Independent Test**: Load 100 mock fixtures, open vessel class dropdown, verify branch nodes show aggregate counts (e.g., "Warship (45)") and zero-count nodes are dimmed/disabled.

### Tests for User Story 3 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [test] [US3] Write unit tests for `useTaxonomyMatchCounts` hook — count computation, descendantMap memoization on taxonomy ref, updates on filtered items change `shared/components/src/FilterBar/__tests__/useTaxonomyMatchCounts.test.ts`
- [ ] T023 [P][test] [US3] Write unit test for `taxonomyToCascadingItems()` with `counts` option — verify badge strings and `disabled: true` on zero-count nodes `shared/components/src/FilterBar/__tests__/taxonomyAdapter.test.ts`

### Implementation for User Story 3

- [ ] T024 [US3] Create `useTaxonomyMatchCounts` hook — computes per-node counts from filtered items using memoized `buildDescendantMap()` `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts`
- [ ] T025 [US3] Modify `taxonomyToCascadingItems()` to accept `counts` option — set `badge` string and `disabled: true` on zero-count nodes `shared/components/src/FilterBar/taxonomyAdapter.ts`
- [ ] T026 [US3] Integrate counts in FilterBar — call `useTaxonomyMatchCounts`, pass counts through to `taxonomyToCascadingItems()` and ValueEditor `shared/components/src/FilterBar/FilterBar.tsx`

**Checkpoint**: Taxonomy dropdown shows count badges. Zero-count nodes are dimmed and not selectable. Counts update when other filters change.

---

## Phase 6: User Story 4 — Extend the Taxonomy with New Vessel Types (Priority: P4)

**Goal**: Adding a new vessel type to `vessel-taxonomy.json` requires no code changes — it appears in the dropdown automatically.

**Independent Test**: Add a "Type 31 Frigate" node to the taxonomy JSON fixture, verify it appears in the CascadingMenu and is filterable.

### Tests for User Story 4 ⚠️

- [ ] T027 [test] [US4] Write extensibility test — load modified taxonomy with new node, verify label map includes it, tree renders it, search finds it `shared/components/src/filter-engine/__tests__/taxonomy.test.ts`

### Implementation for User Story 4

No code changes needed — extensibility is inherent in the data-driven approach. The test in T027 verifies this claim.

**Checkpoint**: Taxonomy extensibility proven by test.

---

## Phase 7: User Story 5 — Storybook Stories for Taxonomy Navigation (Priority: P5)

**Goal**: Storybook stories demonstrating full tree navigation, search, branch selection, and count display

**Independent Test**: Run Storybook, navigate to the vessel taxonomy stories, interact with each variant.

### Implementation for User Story 5

- [ ] T028 [US5] Add "Vessel Taxonomy Navigation" story — full tree with labels and current-selection marking `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [ ] T029 [P] [US5] Add "Vessel Taxonomy Search" story — search input with pre-filled query showing filtered tree `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [ ] T030 [P] [US5] Add "Vessel Taxonomy Counts" story — match counts with mock data, including zero-count dimmed nodes `shared/components/src/FilterBar/FilterBar.stories.tsx`
- [ ] T031 [P] [US5] Add "Vessel Taxonomy Branch Selection" story — branch node selected, showing subtree filtering behavior `shared/components/src/FilterBar/FilterBar.stories.tsx`

### Storybook E2E Tests for User Story 5 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T032 [US5] Add Playwright E2E tests for taxonomy navigation — open dropdown, navigate tree, select leaf, verify lozenge label `shared/components/e2e/FilterBar.spec.ts`
- [ ] T033 [P] [US5] Add Playwright E2E tests for taxonomy search — type search text, verify filtered tree, clear search, verify full tree restored `shared/components/e2e/FilterBar.spec.ts`
- [ ] T034 [P] [US5] Add Playwright E2E tests for taxonomy counts — verify count badges, verify disabled zero-count nodes `shared/components/e2e/FilterBar.spec.ts`
- [ ] T035 [P] [US5] Add theme variant tests (light, dark, vscode) for taxonomy stories `shared/components/e2e/FilterBar.spec.ts`
- [ ] T036 [US5] Run full E2E suite: `pnpm --filter @debrief/components test:e2e`

**Checkpoint**: All Storybook stories render correctly across themes. E2E tests pass for navigation, search, counts, and theme variants.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Verification

- [ ] T037 Run `task verify` (lint + typecheck + test) and fix any failures
- [ ] T038 Run quickstart.md validation — follow steps in `specs/133-vessel-taxonomy/quickstart.md`

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and documentation

- [ ] T039 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/133-vessel-taxonomy/evidence/test-summary.md`
- [ ] T040 Create usage demonstration in `specs/133-vessel-taxonomy/evidence/usage-example.md`
- [ ] T041 [P] Capture theme screenshots (light/dark/vscode) to `specs/133-vessel-taxonomy/evidence/screenshots/`
- [ ] T042 Capture interaction GIF showing taxonomy tree navigation + search + selection to `specs/133-vessel-taxonomy/evidence/screenshots/interaction.gif`

### E2E Evidence Collection 🎭

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T043 Run full E2E suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T044 [P] Document E2E results in `specs/133-vessel-taxonomy/evidence/e2e-summary.md`

### Media Content

- [ ] T045 Create shipped blog post in `specs/133-vessel-taxonomy/media/shipped-post.md`
- [ ] T046 [P] Create LinkedIn shipped summary in `specs/133-vessel-taxonomy/media/linkedin-shipped.md`

### PR Creation

- [ ] T047 Create PR and publish blog: run /speckit.pr

**Task T047 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundation (Phase 2) — needs label map, badge prop
- **US2 (Phase 4)**: Depends on Foundation (Phase 2) — needs `filterCascadingItems`. Also needs US1 (ValueEditor changes)
- **US3 (Phase 5)**: Depends on Foundation (Phase 2) — needs badge prop. Also needs US1 (taxonomyAdapter `currentValue` pattern)
- **US4 (Phase 6)**: Depends on Foundation (Phase 2) — test-only, can run after US1
- **US5 (Phase 7)**: Depends on US1 + US2 + US3 — stories demonstrate all features
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

```
Phase 2 (Foundation) ──┬──→ Phase 3 (US1: Labels + Current) ──┬──→ Phase 4 (US2: Search)
                       │                                       │
                       │                                       ├──→ Phase 5 (US3: Counts)
                       │                                       │
                       │                                       └──→ Phase 6 (US4: Extensibility)
                       │
                       └──→ (US2, US3, US4 also need Foundation but US1 first for shared changes)

Phase 3 + 4 + 5 + 6 ──→ Phase 7 (US5: Stories + E2E) ──→ Phase 8 (Polish)
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Adapter/utility changes before component changes
- Inner components (Lozenge, OrContainer) before outer components (FilterBar)
- Core implementation before integration

### Parallel Opportunities

- **Phase 2**: T004 can run in parallel with T003 (different test files)
- **Phase 2**: T006, T007, T008 can run in parallel with each other (different files)
- **Phase 3**: T010, T011, T012 can run in parallel (different test files)
- **Phase 5**: T022, T023 can run in parallel (different test files)
- **Phase 7**: T029, T030, T031 can run in parallel with each other (same file, different stories)
- **Phase 7**: T033, T034, T035 can run in parallel (E2E tests)
- **Phase 8**: T041, T042 can run in parallel; T045, T046 can run in parallel

---

## Parallel Example: Foundation Phase

```bash
# Write tests in parallel:
Task T003: "Write buildTaxonomyLabelMap unit tests" (taxonomy.test.ts)
Task T004: "Write filterCascadingItems unit tests" (filterCascadingItems.test.ts)

# Implement utilities in parallel (after tests):
Task T006: "Add badge prop to CascadingMenuItem" (CascadingMenu.tsx)
Task T007: "Add badge + search CSS" (CascadingMenu.css)
Task T008: "Create filterCascadingItems utility" (filterCascadingItems.ts)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Label map, badge prop, tree filter all work
2. Add US1 (Labels + Current) → Lozenges show readable labels, dropdown marks current selection
3. Add US2 (Search) → Type-ahead search filters the taxonomy tree
4. Add US3 (Counts) → Per-node count badges, disabled zero-count nodes
5. Add US4 (Extensibility) → Test proves no code changes needed for new types
6. Add US5 (Stories + E2E) → All features demonstrated in Storybook with Playwright coverage
7. Polish → Evidence, media, PR

### Key Implementation Notes (from /speckit.review)

1. `buildTaxonomyLabelMap()` lives in `taxonomy.ts` — not a separate file (DRY)
2. Label map uses **full taxonomy paths** as keys — `"auxiliary/tanker"` ≠ `"merchant/tanker"`
3. `filterCascadingItems` uses `String.includes()` — not regex (no special-character exceptions)
4. `useTaxonomyMatchCounts` memoizes `buildDescendantMap()` on taxonomy reference
5. `SearchableCascadingMenu` owns container layout — inner CascadingMenu positioned relatively
6. DragOverlay in FilterBar.tsx must resolve vessel-class labels
7. OrContainer must forward `labelMap` to child Lozenges

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story is independently testable after its checkpoint
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
