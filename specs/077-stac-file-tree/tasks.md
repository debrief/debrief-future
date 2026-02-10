# Tasks: STAC File Tree Component

**Input**: Design documents from `/specs/077-stac-file-tree/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Unit tests (Vitest) and E2E tests (Playwright) are included as the spec requires Storybook stories and the constitution mandates testing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and blog posts.

**Evidence Directory**: `specs/077-stac-file-tree/evidence/`
**Media Directory**: `specs/077-stac-file-tree/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest results with pass/fail counts and coverage | After all unit tests pass |
| usage-example.md | Storybook story demonstrating tree with populated catalog | After component complete |
| screenshots/default-light.png | Tree in light theme with expanded catalog | After E2E tests |
| screenshots/default-dark.png | Tree in dark theme with expanded catalog | After E2E tests |
| screenshots/highlights.png | Tree showing highlighted snapshot files | After E2E tests |
| screenshots/empty-state.png | Empty state message | After E2E tests |
| e2e-summary.md | Playwright E2E results across theme variants | After E2E suite passes |

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

**Purpose**: Create the component directory structure and add the memfs devDependency

- [ ] T001 Create StacFileTree component directory `shared/components/src/StacFileTree/`
- [ ] T002 [P] Add memfs devDependency to shared/components `shared/components/package.json`
- [ ] T003 [P] Add memfs dependency to web-shell for runtime demo `apps/web-shell/package.json`
- [ ] T004 Run pnpm install to resolve new dependencies

**Checkpoint**: Directory structure exists, memfs available for import

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: TypeScript interfaces and utilities that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T005 Define TypeScript interfaces (FilesystemAdapter, TreeNode, NodeType, DirectoryEntry, FileStat, HighlightSet) `shared/components/src/StacFileTree/types.ts`
- [ ] T006 Implement highlight propagation utility (computeAncestorPaths) `shared/components/src/StacFileTree/highlightUtils.ts`
- [ ] T007 [test] Write unit tests for highlightUtils `shared/components/src/StacFileTree/highlightUtils.test.ts`
- [ ] T008 Create memfs fixture data (populated store, empty store, single-item store, store with snapshots) `shared/components/src/StacFileTree/fixtures.ts`
- [ ] T009 Create barrel export `shared/components/src/StacFileTree/index.ts`

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 — Browse STAC Catalog Structure (Priority: P1) MVP

**Goal**: Render a collapsible tree view of the STAC catalog directory structure with expand/collapse and lazy loading

**Independent Test**: Load a STAC catalog fixture and verify the tree renders all expected nodes in the correct hierarchy

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [test] Write unit tests for useTreeState hook (expand, collapse, lazy load, cache, refresh) `shared/components/src/StacFileTree/useTreeState.test.ts`
- [ ] T011 [P][test] Write component render tests (renders root, expands nodes, shows correct icons, empty state, error state, loading state) `shared/components/src/StacFileTree/StacFileTree.test.tsx`

### Implementation for User Story 1

- [ ] T012 Implement useTreeState custom hook (expand/collapse state, lazy child loading, cache, refreshKey support) `shared/components/src/StacFileTree/useTreeState.ts`
- [ ] T013 Implement StacFileTree component (recursive tree rendering, node type detection, expand/collapse controls, icons via vscrui, empty state, error state, loading spinner) `shared/components/src/StacFileTree/StacFileTree.tsx`
- [ ] T014 Create component styles (BEM classes, CSS custom properties, dark theme support, indentation, truncation) `shared/components/src/StacFileTree/StacFileTree.css`
- [ ] T015 Create Storybook stories: Default (populated catalog) and Empty `shared/components/src/StacFileTree/StacFileTree.stories.tsx`
- [ ] T016 Add StacFileTree export to component library barrel `shared/components/src/index.ts`
- [ ] T017 Verify: run unit tests `pnpm --filter @debrief/components test -- StacFileTree`

**Checkpoint**: Tree renders a STAC catalog structure with expand/collapse. Independently testable and demonstrable in Storybook.

---

## Phase 4: User Story 2 — Open a Plot from the Tree (Priority: P2)

**Goal**: Double-click a STAC Item node to emit a selection event with the item path; visually distinguish the currently-open item

**Independent Test**: Double-click a STAC Item node and verify the onItemSelect callback fires with the correct path

### Tests for User Story 2

- [ ] T018 [test] Write interaction tests (double-click item emits event, double-click non-item does not emit, current item visual distinction) `shared/components/src/StacFileTree/StacFileTree.test.tsx`

### Implementation for User Story 2

- [ ] T019 Add double-click handler to item nodes, emit onItemSelect with item path `shared/components/src/StacFileTree/StacFileTree.tsx`
- [ ] T020 Add currentItemPath prop and visual distinction styles (.debrief-file-tree__node--current) `shared/components/src/StacFileTree/StacFileTree.css`
- [ ] T021 Add Storybook story: CurrentItemSelected `shared/components/src/StacFileTree/StacFileTree.stories.tsx`
- [ ] T022 Verify: run unit tests `pnpm --filter @debrief/components test -- StacFileTree`

**Checkpoint**: Users can open plots from the tree. Current item is visually distinct. Independently testable.

---

## Phase 5: User Story 3 — See What Changed After a Snapshot (Priority: P2)

**Goal**: Visually highlight new/changed files after a snapshot operation, with highlight propagation to collapsed ancestors

**Independent Test**: Provide a set of changed paths and verify the tree marks exactly those nodes with a visual highlight, including ancestor propagation

### Tests for User Story 3

- [ ] T023 [test] Write highlight tests (direct highlight on leaf, ancestor propagation when collapsed, clear highlights) `shared/components/src/StacFileTree/StacFileTree.test.tsx`

### Implementation for User Story 3

- [ ] T024 Add highlightedPaths prop, integrate computeAncestorPaths from highlightUtils `shared/components/src/StacFileTree/StacFileTree.tsx`
- [ ] T025 Add highlight styles (.debrief-file-tree__node--highlighted, .debrief-file-tree__node--contains-highlight) `shared/components/src/StacFileTree/StacFileTree.css`
- [ ] T026 Add Storybook story: WithHighlights (catalog with highlighted snapshot files) `shared/components/src/StacFileTree/StacFileTree.stories.tsx`
- [ ] T027 Verify: run unit tests `pnpm --filter @debrief/components test -- StacFileTree`

**Checkpoint**: New files are highlighted after snapshots. Ancestor nodes show "contains changes" indicator. Independently testable.

---

## Phase 6: User Story 4 — Use the Tree in Storybook and Web-Shell (Priority: P3)

**Goal**: Full Storybook story coverage and web-shell sidebar integration using memfs

**Independent Test**: Mount the component in Storybook with a memfs volume and verify all interactions work identically to real filesystem

### Implementation for User Story 4

- [ ] T028 Add Storybook stories: SingleItem and DarkTheme variants `shared/components/src/StacFileTree/StacFileTree.stories.tsx`
- [ ] T029 Create memfs adapter factory function (createMemfsAdapter) `shared/components/src/StacFileTree/fixtures.ts`
- [ ] T030 Integrate StacFileTree in web-shell sidebar above ActivityPanel `apps/web-shell/src/App.tsx`
- [ ] T031 Build component library to verify exports `pnpm --filter @debrief/components build`
- [ ] T032 Verify web-shell renders tree correctly `pnpm --filter @debrief/web-shell dev`

**Checkpoint**: All 6 Storybook stories render. Web-shell shows tree in sidebar. Component library builds cleanly.

---

## Phase 7: E2E Tests

**Purpose**: Playwright tests for Storybook stories across theme variants

### E2E Tests

- [ ] T033 Create Playwright E2E test file `shared/components/e2e/StacFileTree.spec.ts`
- [ ] T034 [P] Add rendering tests: tree renders with correct hierarchy in light, dark, vscode themes
- [ ] T035 [P] Add interaction tests: expand, collapse, double-click item
- [ ] T036 [P] Add highlight tests: highlighted nodes visible, ancestor propagation
- [ ] T037 [P] Add state tests: empty state, loading state, error state
- [ ] T038 Run E2E tests: `pnpm --filter @debrief/components test:e2e StacFileTree`

**Checkpoint**: All E2E tests pass across theme variants. Screenshots captured.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T039 Create evidence directory `specs/077-stac-file-tree/evidence/`
- [ ] T040 Capture test summary with pass/fail counts and coverage `specs/077-stac-file-tree/evidence/test-summary.md`
- [ ] T041 Record usage example demonstrating the component in Storybook `specs/077-stac-file-tree/evidence/usage-example.md`

### E2E Evidence Collection (REQUIRED)

- [ ] T042 Run full E2E suite: `pnpm --filter @debrief/components test:e2e StacFileTree`
- [ ] T043 [P] Capture theme variant screenshots to `specs/077-stac-file-tree/evidence/screenshots/`
- [ ] T044 Document E2E results `specs/077-stac-file-tree/evidence/e2e-summary.md`

### Media Content

- [ ] T045 Create shipped blog post `specs/077-stac-file-tree/media/shipped-post.md`
- [ ] T046 [P] Create LinkedIn shipped summary `specs/077-stac-file-tree/media/linkedin-shipped.md`

### PR Creation

- [ ] T047 Create PR and publish blog: run /speckit.pr

**Task T047 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Foundation phase completion
  - US1 (Phase 3) must complete before US2 (Phase 4) — US2 adds to US1's component
  - US3 (Phase 5) must complete after US1 — adds highlight props to existing component
  - US4 (Phase 6) can start after US1 is complete — integrates into web-shell
- **E2E Tests (Phase 7)**: Depends on all user stories being complete
- **Polish (Phase 8)**: Depends on E2E tests and all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — no dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 component existing — adds double-click behavior to same component
- **User Story 3 (P2)**: Depends on US1 component existing — adds highlight props to same component
- **User Story 4 (P3)**: Depends on US1 — integrates existing component into web-shell

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Types/utilities before component logic
- Component logic before styles
- Styles before Storybook stories
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different package.json files)
- T010 and T011 can run in parallel (different test files)
- T034, T035, T036, T037 can run in parallel (different E2E test sections)
- T043 and T044 can run in parallel (evidence capture)
- T045 and T046 can run in parallel (media content)

---

## Parallel Example: Foundation Phase

```bash
# Launch all foundation tasks together (after types are defined):
Task: "Implement highlight propagation utility" → highlightUtils.ts
Task: "Create memfs fixture data" → fixtures.ts
Task: "Create barrel export" → index.ts
```

## Parallel Example: E2E Tests

```bash
# Launch all E2E test categories together:
Task: "Add rendering tests" → theme variants
Task: "Add interaction tests" → expand, collapse, click
Task: "Add highlight tests" → highlight nodes
Task: "Add state tests" → empty, loading, error
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundation (types, utilities, fixtures)
3. Complete Phase 3: User Story 1 (tree rendering with expand/collapse)
4. **STOP and VALIDATE**: Test tree rendering independently in Storybook
5. Demo the populated catalog story to stakeholders

### Incremental Delivery

1. Complete Setup + Foundation → Types and fixtures ready
2. Add User Story 1 → Tree renders and expands → Demo (MVP!)
3. Add User Story 2 → Double-click opens plots → Demo
4. Add User Story 3 → Snapshot highlights visible → Demo
5. Add User Story 4 → Web-shell integration → Demo
6. Add E2E Tests → Visual regression coverage
7. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [test] tasks = test files, write before implementation
- All component code lives in `shared/components/src/StacFileTree/`
- The component has zero runtime dependencies beyond React and vscrui (both existing)
- memfs is devDependency only — used in fixtures.ts and Storybook stories
- CSS follows BEM + `--debrief-*` custom property conventions
- Evidence is required — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
