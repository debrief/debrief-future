# Tasks: Filter Bar with Lozenge UI and AND/OR Logic

**Input**: Design documents from `/specs/127-filter-bar-lozenge-ui/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included — constitution Article VI mandates tests for all service/component code.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Review Decisions Applied**: Decisions from `/speckit.review` are incorporated:
1. Reuse `CascadingMenu` for vessel class hierarchy (no new `HierarchicalDropdown.tsx`)
2. Add `plot-contents` to #126 `FilterType` union
3. Use `crypto.randomUUID()` instead of `nanoid`
4. Skip empty OR containers in `toFilterExpression`
5. `isAddMenuOpen` is local state in `FilterTypeMenu`, not in reducer
6. Both `Lozenge` and `OrContainer` use `Record<FilterType, readonly string[]>` for `availableValues`
7. Add tests for `useDistinctValues` and CascadingMenu taxonomy adapter
8. 150ms debounce for free-text inputs

---

## Evidence Requirements

**Evidence Directory**: `specs/127-filter-bar-lozenge-ui/evidence/`
**Media Directory**: `specs/127-filter-bar-lozenge-ui/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | vitest + Playwright results | After all tests pass |
| usage-example.md | FilterBar usage in a discovery panel | After component complete |
| screenshots/component-light.png | Light theme screenshot | After E2E pass |
| screenshots/component-dark.png | Dark theme screenshot | After E2E pass |
| screenshots/component-vscode.png | VS Code theme screenshot | After E2E pass |
| screenshots/interaction.gif | Add filter → drag to OR → remove flow | After E2E pass |

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

**Purpose**: Project scaffolding, dependencies, module skeleton

- [x] T001 Create FilterBar module directory and index.ts `shared/components/src/FilterBar/index.ts`
- [x] T002 [P] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` to `@debrief/components` dependencies `shared/components/package.json`
- [x] T003 [P] Add `plot-contents` to #126 `FilterType` union and update `Predicate` handling `specs/126-cql2-filter-engine/contracts/filter-engine.ts`
- [x] T004 [P] Add subpath export `./FilterBar` to package.json exports map `shared/components/package.json`

**Checkpoint**: Module skeleton exists, dependencies installed, #126 contract updated

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Types, constants, state management hook, and distinct values hook — shared code that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Create `types.ts` with `FilterBarState`, `FilterBarItem` (discriminated union), `FilterTypeOption`, `InputMethod` types `shared/components/src/FilterBar/types.ts`
- [x] T006 [P] Create `constants.ts` with `FILTER_TYPE_OPTIONS` array (all 10 types + labels + input methods), duration bucket values, and all user-facing string constants `shared/components/src/FilterBar/constants.ts`
- [x] T007 Create `useFilterBar.ts` reducer hook: actions for add/remove/edit/move lozenge, add/remove OR container, `toFilterExpression()` conversion (skip empty OR containers per review decision #4). Use `crypto.randomUUID()` for IDs `shared/components/src/FilterBar/useFilterBar.ts`
- [x] T008 [test] Write `useFilterBar.test.ts`: reducer state transitions (add, remove, edit, move to OR, move from OR), `toFilterExpression` output including empty OR skip, CQL2 round-trip via #126 engine `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`
- [x] T009 Create `useDistinctValues.ts` useMemo hook: extract distinct sorted values from `StacBrowserItem[]` for all dropdown filter types `shared/components/src/FilterBar/useDistinctValues.ts`
- [x] T010 [test] Write `useDistinctValues.test.ts`: deduplication, alphabetical sorting, handling null/empty fields, flat array extraction from nested arrays `shared/components/src/FilterBar/__tests__/useDistinctValues.test.ts`
- [x] T011 Create CascadingMenu taxonomy adapter: pure function mapping `VesselTaxonomyNode[]` → `CascadingMenuItem[]` for vessel class hierarchical dropdown `shared/components/src/FilterBar/taxonomyAdapter.ts`
- [x] T012 [test] Write taxonomy adapter test: correct mapping, nested children, empty tree, leaf nodes `shared/components/src/FilterBar/__tests__/taxonomyAdapter.test.ts`

**Checkpoint**: Foundation ready — state management, type system, and data utilities complete. User story implementation can begin.

---

## Phase 3: User Story 1 — Add and Remove Metadata Filters (Priority: P1)

**Goal**: Analyst can click (+), select a filter type and value, see a lozenge appear, and remove it. Results update dynamically.

**Independent Test**: Add a vessel class filter lozenge, verify results narrow, remove it, verify results restore.

### Tests for User Story 1

- [x] T013 [test] Write `Lozenge.test.tsx`: renders type label + value, click body fires onEdit, click remove fires onRemove, draggable attributes present `shared/components/src/FilterBar/__tests__/Lozenge.test.tsx`
- [x] T014 [P][test] Write `ValueEditor.test.tsx`: dispatches to correct input control per filter type, fires onSelect with value, closes on Escape/click-outside `shared/components/src/FilterBar/__tests__/ValueEditor.test.tsx`

### Implementation for User Story 1

- [x] T015 Create `Lozenge.tsx`: pill-shaped component with type label, value label, remove button (vscrui Icon), click-to-edit handler, `useDraggable` from @dnd-kit. Uses `Record<FilterType, readonly string[]>` for availableValues (review decision #6) `shared/components/src/FilterBar/Lozenge.tsx`
- [x] T016 [P] Create `Lozenge.css`: pill shape, hover/active states, drag-active opacity, theme tokens `shared/components/src/FilterBar/Lozenge.css`
- [x] T017 Create `FilterTypeMenu.tsx`: dropdown opened by (+) button listing all 10 filter types + "OR group" option. `isAddMenuOpen` is local state (review decision #5). Uses `FILTER_TYPE_OPTIONS` from constants `shared/components/src/FilterBar/FilterTypeMenu.tsx`
- [x] T018 Create `ValueEditor.tsx`: polymorphic popover dispatching to flat dropdown (vscrui Dropdown), free-text (vscrui TextField with 150ms debounce per review decision #8), bucket dropdown (fixed options), or CascadingMenu (via taxonomy adapter). Closes on Escape/click-outside `shared/components/src/FilterBar/ValueEditor.tsx`
- [x] T019 Create `FilterBar.tsx`: main container wrapping `DndContext`, renders filter bar with lozenges, (+) button, empty state hint text "Add filters to narrow results", error banner for failed filter evaluation. Wires `useFilterBar` + `useDistinctValues` + `FilterEngine.filter()`. Passes filtered items via `onFilteredItems` callback `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T020 [P] Create `FilterBar.css`: bar layout (horizontal flex, wrap), empty state styling, error banner, loading indicator, theme tokens `shared/components/src/FilterBar/FilterBar.css`
- [x] T021 [test] Write `FilterBar.test.tsx` integration test for P1: add filter flow (click +, select type, select value, verify lozenge renders), remove filter flow (click x, verify lozenge removed), verify `onFilteredItems` called with correct subset `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

**Checkpoint**: P1 complete — analyst can add and remove single metadata filters with results updating

---

## Phase 4: User Story 2 — Edit an Active Filter (Priority: P2)

**Goal**: Analyst clicks a lozenge body to open an edit popover, changes the value, and sees results update.

**Independent Test**: Add a nationality filter, click the lozenge, change value from French to British, verify results update.

### Implementation for User Story 2

- [x] T022 [US2] Add edit interaction to `FilterBar.tsx`: click lozenge body sets `editingId`, renders `ValueEditor` popover positioned relative to lozenge, Escape/click-outside clears `editingId` `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T023 [US2][test] Extend `FilterBar.test.tsx` with P2 scenarios: click lozenge opens editor, change value updates lozenge label, Escape closes editor without change `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

**Checkpoint**: P1 + P2 complete — add, remove, and edit filters all working

---

## Phase 5: User Story 3 — Combine Filters with AND Logic (Priority: P3)

**Goal**: Multiple top-level lozenges combine with AND logic — results narrow with each additional filter.

**Independent Test**: Add nationality + duration filters, verify only exercises matching both appear.

### Implementation for User Story 3

- [x] T024 [US3][test] Extend `FilterBar.test.tsx` with P3 scenarios: two filters produce intersection, three filters narrow further, removing one expands results, incompatible filters show "No matches" `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`
- [x] T025 [US3] Verify AND conjunction: ensure `toFilterExpression` produces correct `predicates` array and `FilterEngine.filter()` returns intersection. If "No matches", render empty-state message in parent callback `shared/components/src/FilterBar/FilterBar.tsx`

**Checkpoint**: P1–P3 complete — add, remove, edit, and AND combination all working

---

## Phase 6: User Story 4 — Create OR Groups with Drag Support (Priority: P4)

**Goal**: Analyst creates OR containers, drags lozenges into them, and OR logic applies within the group. AND logic between groups and top-level lozenges.

**Independent Test**: Create OR container, add two vessel class lozenges inside, verify union (not intersection) returned.

### Tests for User Story 4

- [x] T026 [test] Write `OrContainer.test.tsx`: renders child lozenges, mini (+) button fires onAddChild, remove button fires onRemove, `useDroppable` accepts lozenge drops, rejects OR container drops (no nesting) `shared/components/src/FilterBar/__tests__/OrContainer.test.tsx`

### Implementation for User Story 4

- [x] T027 [US4] Create `OrContainer.tsx`: wrapper with OR label, child lozenge rendering, mini (+) button for adding filters inside, remove container button. `useDroppable` from @dnd-kit accepts lozenges only (rejects OR containers). Uses `Record<FilterType, readonly string[]>` for availableValues `shared/components/src/FilterBar/OrContainer.tsx`
- [x] T028 [P][US4] Create `OrContainer.css`: visual container styling (border/background grouping), child lozenge layout, mini (+) button, drag-over highlight `shared/components/src/FilterBar/OrContainer.css`
- [x] T029 [US4] Add DnD integration to `FilterBar.tsx`: `DragOverlay` for drag preview, `onDragEnd` handler dispatching move-to-container and move-to-top-level actions, collision detection with `closestCenter`, `KeyboardSensor` + `PointerSensor` `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T030 [US4][test] Extend `FilterBar.test.tsx` with P4 scenarios: create OR group, drag lozenge into container, add via mini (+), drag out of container, verify (A OR B) AND C produces correct results `shared/components/src/FilterBar/__tests__/FilterBar.test.tsx`

**Checkpoint**: P1–P4 complete — full filter bar with AND/OR logic and drag-to-group

---

## Phase 7: User Story 5 — All SRD Filter Types (Priority: P5)

**Goal**: All 10 filter types functional with correct input methods.

**Independent Test**: For each of the 10 filter types, add a filter via (+), select value using type-specific input, verify lozenge and results correct.

### Implementation for User Story 5

- [x] T031 [US5] Verify all 10 filter types in `constants.ts`: vessel-class (hierarchical), plot-tag/feature-tag/author/track-name/nationality/collection (flat-dropdown), duration (bucket), title/plot-contents (free-text). Ensure `ValueEditor` dispatches correctly for each `shared/components/src/FilterBar/constants.ts`
- [x] T032 [US5][test] Extend `ValueEditor.test.tsx` with all 10 filter types: hierarchical shows CascadingMenu with taxonomy, flat-dropdown shows vscrui Dropdown with distinct values, bucket shows fixed duration options, free-text shows TextField `shared/components/src/FilterBar/__tests__/ValueEditor.test.tsx`

**Checkpoint**: P1–P5 complete — all filter types working with appropriate input methods

---

## Phase 8: User Story 6 — CQL2 Serialisation (Priority: P6)

**Goal**: Filter bar state serialises to valid CQL2 JSON at all times.

**Independent Test**: Compose AND + OR filters, retrieve CQL2 JSON, validate structure.

### Implementation for User Story 6

- [x] T033 [US6] Wire `onExpressionChange` callback in `FilterBar.tsx`: on every filter state change, call `toFilterExpression()` then pass to parent via callback. Parent can call `engine.toCql2Json()` for serialisation `shared/components/src/FilterBar/FilterBar.tsx`
- [x] T034 [US6][test] Extend `useFilterBar.test.ts` with CQL2 scenarios: two AND predicates → `{"and": [...]}`, AND + OR → nested `{"and": [..., {"or": [...]}]}`, empty → match-all expression `shared/components/src/FilterBar/__tests__/useFilterBar.test.ts`

**Checkpoint**: P1–P6 complete — full feature implemented

---

## Phase 9: Storybook Stories

**Purpose**: Visual demonstrations for all filter bar states (SC-008)

- [x] T035 Create `FilterBar.stories.tsx` with stories: Empty, SingleFilter, MultipleAND, OrGroup, Interactive (full workflow), AllFilterTypes, ZeroResults. Use mock STAC items from #125 fixtures. ThemeProvider decorator for light/dark/vscode `shared/components/src/FilterBar/FilterBar.stories.tsx`

**Checkpoint**: All stories render correctly in Storybook

---

## Phase 10: E2E Tests

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tests. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [x] T036 Create Playwright E2E test `shared/components/e2e/FilterBar.spec.ts`: empty state renders, add filter flow, edit filter, remove filter, drag to OR container, theme variants (light/dark/vscode) `shared/components/e2e/FilterBar.spec.ts`
- [x] T037 Run E2E tests: `pnpm --filter @debrief/components test:e2e FilterBar`

**Checkpoint**: E2E tests pass with visual verification across themes

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, CI verification, PR

### CI Verification

- [x] T038 Run full CI check: `task verify` (lint + typecheck + test). Fix any failures.

### Evidence Collection

- [x] T039 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) `specs/127-filter-bar-lozenge-ui/evidence/test-summary.md`
- [x] T040 Create usage demonstration `specs/127-filter-bar-lozenge-ui/evidence/usage-example.md`
- [x] T041 [P] Capture theme screenshots (light/dark/vscode) `specs/127-filter-bar-lozenge-ui/evidence/screenshots/`
- [x] T042 Capture interaction GIF showing add filter → drag to OR → remove flow `specs/127-filter-bar-lozenge-ui/evidence/screenshots/interaction.gif`

### Media Content

- [x] T043 Create shipped blog post `specs/127-filter-bar-lozenge-ui/media/shipped-post.md`
- [x] T044 [P] Create LinkedIn shipped summary `specs/127-filter-bar-lozenge-ui/media/linkedin-shipped.md`

### PR Creation

- [x] T045 Create PR and publish blog: run /speckit.pr

**Task T045 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phases 3–8 (User Stories)**: All depend on Phase 2. Must be done sequentially (P1 → P2 → P3 → P4 → P5 → P6) because later stories extend earlier components
- **Phase 9 (Stories)**: Depends on Phase 8 (all features implemented)
- **Phase 10 (E2E)**: Depends on Phase 9 (stories exist for E2E to target)
- **Phase 11 (Polish)**: Depends on Phase 10

### User Story Dependencies

- **P1 (Add/Remove)**: First — creates FilterBar, Lozenge, FilterTypeMenu, ValueEditor
- **P2 (Edit)**: Extends P1 — adds edit popover interaction to existing Lozenge
- **P3 (AND Logic)**: Extends P1+P2 — validates multi-filter conjunction (no new components)
- **P4 (OR Groups)**: Extends P1–P3 — adds OrContainer, DnD integration
- **P5 (All Types)**: Extends P1–P4 — validates all 10 input methods (no new components)
- **P6 (CQL2)**: Extends P1–P5 — wires CQL2 serialisation callback

### Within Each User Story

- Tests written FIRST, ensure they FAIL before implementation
- Types/constants before components
- Components before integration tests
- Integration tests verify full story flow

### Parallel Opportunities

```
Phase 2 (parallel tasks):
  T005 types.ts  ║  T006 constants.ts     (different files, no deps)
  T009 useDistinctValues  ║  T011 taxonomyAdapter  (after T005)
  T008 useFilterBar.test  ║  T010 useDistinctValues.test  ║  T012 adapter.test

Phase 3 (parallel tasks):
  T013 Lozenge.test  ║  T014 ValueEditor.test  (different test files)
  T015 Lozenge.tsx   ║  T016 Lozenge.css       (component + styles)

Phase 6 (parallel tasks):
  T027 OrContainer.tsx  ║  T028 OrContainer.css  (component + styles)
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 1–2**: Foundation → types, state management, data utilities
2. **Phase 3 (P1)**: Add/remove → basic filter bar is usable
3. **Phase 4 (P2)**: Edit → full CRUD on filters
4. **Phase 5 (P3)**: AND logic → multi-filter queries validated
5. **Phase 6 (P4)**: OR groups → complex queries with drag-to-group
6. **Phase 7 (P5)**: All filter types → completeness
7. **Phase 8 (P6)**: CQL2 → serialisation for persistence
8. **Phases 9–11**: Stories → E2E → Polish → PR

Each phase adds value without breaking previous work. The filter bar is independently testable after Phase 3.

### Key Integration Points

```
                     ┌─────────────────────┐
                     │  #125 Mock Data     │
                     │  (100 STAC items)   │
                     └─────────┬───────────┘
                               │
                     ┌─────────▼───────────┐
                     │  #126 Filter Engine  │
                     │  (FilterExpression,  │
                     │   FilterEngine API)  │
                     └─────────┬───────────┘
                               │
  ┌────────────────────────────▼────────────────────────────┐
  │              #127 Filter Bar (this feature)             │
  │                                                         │
  │  types.ts ─► useFilterBar.ts ─► FilterBar.tsx           │
  │  constants.ts    │                    │                  │
  │  taxonomyAdapter ─► ValueEditor ─► CascadingMenu (reuse)│
  │                  │                                      │
  │  useDistinctValues.ts ─► dropdown populations           │
  └─────────────────────────────────────────────────────────┘
```
