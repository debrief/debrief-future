# Tasks: Layers Panel Vertical Space Fix

**Input**: Design documents from `/specs/101-layers-panel-vertical-space/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: E2E Playwright tests included — the plan identifies Storybook E2E tests for collapse-state verification.

**Organization**: All three user stories are resolved by the same 2 CSS rule changes (atomic fix). Phases are organized to apply the fix then verify each story independently.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/101-layers-panel-vertical-space/evidence/`
**Media Directory**: `specs/101-layers-panel-vertical-space/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Vitest + Playwright results summary | After all tests pass |
| usage-example.md | Before/after description of collapse behaviour | After CSS fix verified |
| screenshots/ | Storybook screenshots of key collapse states | After E2E tests pass |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan (complete) |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan (complete) |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Setup

**Purpose**: Verify baseline and prepare for CSS fix

- [x] T001 Create evidence directory `specs/101-layers-panel-vertical-space/evidence/`
- [x] T002 Run `task verify` to confirm clean baseline before changes

**Checkpoint**: Baseline confirmed clean — ready to apply CSS fix

---

## Phase 2: User Story 1 — Layers fills vertical space when siblings collapsed (Priority: P1)

**Goal**: Fix the Layers section to expand and fill all remaining vertical space when both Time Controller and Tools are collapsed.

**Independent Test**: Collapse Time Controller and Tools sections; verify the Layers section fills all remaining vertical height with no visible gap.

### Implementation for User Story 1

- [x] T003 [US1] Modify `.debrief-activity-panel__section--flexible .debrief-activity-panel__section-content` to become a flex column container `shared/components/src/ActivityPanel/ActivityPanel.css`
- [x] T004 [US1] Add rule for `.debrief-activity-panel__section--flexible .debrief-feature-list` to grow via `flex: 1 1 0%` `shared/components/src/ActivityPanel/ActivityPanel.css`
- [x] T005 [US1] Run `task verify` to confirm build passes and no regressions

**Checkpoint**: Core CSS fix applied — Layers fills vertical space when both siblings collapsed

---

## Phase 3: User Story 2 — Layers fills space when only one sibling collapsed (Priority: P2)

**Goal**: Verify the CSS fix correctly handles partial-collapse states (only Time Controller or only Tools collapsed).

**Independent Test**: Collapse only Time Controller → verify Tools/Layers share space with resize handle. Collapse only Tools → verify Layers fills remaining space below Time Controller.

### Verification for User Story 2

- [x] T006 [US2] Verify Storybook `TimeControllerCollapsed` story renders correctly (Tools/Layers share space with resize handle)
- [x] T007 [US2] Verify Storybook `ToolsCollapsed` story renders correctly (Layers fills remaining space)

**Checkpoint**: Partial-collapse states verified

---

## Phase 4: User Story 3 — Expand/collapse transitions remain smooth (Priority: P3)

**Goal**: Verify expand/collapse cycling produces correct layouts in all 8 collapse-state combinations with no layout jumps.

**Independent Test**: Cycle through collapse/expand combinations for all three sections; verify layout adjusts correctly each time.

### Verification for User Story 3

- [x] T008 [US3] Verify Storybook `Default` story renders correctly (50/50 split with resize handle)
- [x] T009 [US3] Verify Storybook `AllCollapsed` story renders correctly (headers only, remaining space empty)
- [x] T010 [US3] Verify Storybook `OnlyTimeExpanded` story renders correctly (two collapsed flex sections)

**Checkpoint**: All 8 collapse-state combinations produce correct layouts

---

## Phase 5: E2E Testing

**Purpose**: Automated Playwright tests to verify collapse-state layouts across theme variants

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### Storybook E2E Tests

- [x] T011 [P] Create Playwright test for ActivityPanel collapse states `shared/components/e2e/ActivityPanel.spec.ts`
- [x] T012 [P] Add theme variant tests (dark, vscode) for ToolsCollapsed story `shared/components/e2e/ActivityPanel.spec.ts`
- [x] T013 Run Storybook E2E suite: `pnpm --filter @debrief/components test:e2e ActivityPanel`

**Checkpoint**: E2E tests pass — automated evidence of correct collapse-state layouts

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

### Evidence Collection

- [x] T014 Capture test results in `specs/101-layers-panel-vertical-space/evidence/test-summary.md`
- [x] T015 Create usage demonstration in `specs/101-layers-panel-vertical-space/evidence/usage-example.md`
- [x] T016 [P] Capture Storybook screenshots of key collapse states in `specs/101-layers-panel-vertical-space/evidence/screenshots/`
- [x] T017 [P] Document E2E results in `specs/101-layers-panel-vertical-space/evidence/e2e-summary.md`

### Media Content

- [x] T018 Create shipped blog post in `specs/101-layers-panel-vertical-space/media/shipped-post.md`
- [x] T019 [P] Create LinkedIn shipped summary in `specs/101-layers-panel-vertical-space/media/linkedin-shipped.md`

### PR Creation

- [ ] T020 Create PR and publish blog: run /speckit.pr

**Task T020 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 — the core CSS fix
- **US2 (Phase 3)**: Depends on Phase 2 — verification of partial-collapse states
- **US3 (Phase 4)**: Depends on Phase 2 — verification of all 8 state combinations
- **E2E (Phase 5)**: Depends on Phase 2 — automated regression tests
- **Polish (Phase 6)**: Depends on Phases 2-5 — evidence and PR

### User Story Dependencies

- **User Story 1 (P1)**: Core implementation — all other stories depend on this
- **User Story 2 (P2)**: Can run in parallel with US3 after US1 complete
- **User Story 3 (P3)**: Can run in parallel with US2 after US1 complete

### Parallel Opportunities

- T006/T007 (US2 verification) can run in parallel with T008/T009/T010 (US3 verification)
- T011/T012 (E2E test creation) can run in parallel
- T016/T017 (evidence screenshots/E2E summary) can run in parallel
- T018/T019 (shipped post/LinkedIn) can run in parallel after T018 draft

---

## Parallel Example: After Phase 2 Completes

```bash
# US2 and US3 verification can run in parallel:
Task: "Verify Storybook TimeControllerCollapsed story" (T006)
Task: "Verify Storybook Default story" (T008)
Task: "Verify Storybook AllCollapsed story" (T009)

# E2E test creation can run in parallel:
Task: "Create Playwright test for collapse states" (T011)
Task: "Add theme variant tests" (T012)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Phase 1 (Setup) → Clean baseline confirmed
2. Apply CSS fix in Phase 2 (US1) → Core bug resolved
3. Verify US2 + US3 (Phases 3-4) → All collapse states correct
4. Run E2E tests (Phase 5) → Automated evidence
5. Collect evidence + create PR (Phase 6) → Feature complete

### Key Constraint

The implementation is **atomic**: 2 CSS rule changes in 1 file resolve all 3 user stories. Phases 3-4 are verification-only — they confirm the fix works across all collapse states without additional code changes.

---

## Notes

- [P] tasks = different files or independent work, no dependencies
- [US*] label maps task to specific user story for traceability
- FR-005 constraint: CSS-only — no changes to `.tsx` files
- The FeatureList's inline `height: 300px` is overridden by flex layout, not `!important`
- Run `task verify` after changes to catch TypeScript and build issues
- Run `/speckit.pr` after all tasks complete to create PR with evidence
