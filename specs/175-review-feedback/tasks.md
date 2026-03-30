# Tasks: Review Feedback

**Input**: Design documents from `/specs/175-review-feedback/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/175-review-feedback/evidence/`
**Media Directory**: `specs/175-review-feedback/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | pytest + vitest results with pass/fail counts | After all tests pass |
| usage-example.md | MCP tool round-trip: create → resolve → edit → delete | After service works |
| sample-request.json | Example add_review_item MCP tool input | After contracts implemented |
| sample-response.json | Example add_review_item MCP tool response | After contracts implemented |
| round-trip-evidence.md | Python → JSON → TypeScript → JSON schema proof | After schema codegen |
| screenshots/component-light.png | ReviewPanel in light theme | After UI components |
| screenshots/component-dark.png | ReviewPanel in dark theme | After UI components |
| screenshots/component-vscode.png | ReviewPanel in VS Code theme | After UI components |
| screenshots/interaction.gif | Add note → resolve → reopen flow | After E2E tests |

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

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding, dependencies, and configuration

- [ ] T001 Add `ulid` dependency to debrief-stac `services/stac/pyproject.toml`
- [ ] T002 [P] Create evidence directory `specs/175-review-feedback/evidence/`
- [ ] T003 [P] Create review module file `services/stac/src/debrief_stac/review.py`
- [ ] T004 [P] Create review test file `services/stac/tests/test_review.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, models, and core review logic that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Schema & Models

- [ ] T005 Create LinkML review schema `shared/schemas/src/linkml/review.yaml`
- [ ] T006 Import review property into STAC extension `shared/schemas/src/linkml/stac-extension.yaml`
- [ ] T007 Run schema codegen to generate Pydantic and TypeScript types `shared/schemas/src/generated/`
- [ ] T008 [test] Write schema golden fixture tests for valid/invalid review items `shared/schemas/tests/fixtures/review/`
- [ ] T009 [test] Write round-trip test (Python → JSON → TypeScript → JSON) `shared/schemas/tests/test_review_roundtrip.py`

### Core Service Logic

- [ ] T010 Implement user identity resolution (DEBRIEF_USER env var + OS fallback) `services/stac/src/debrief_stac/review.py`
- [ ] T011 Implement optimistic locking helper (compare expected_updated vs current) `services/stac/src/debrief_stac/review.py`
- [ ] T012 Implement review state derivation (no-feedback / pending-review / all-reviewed) `services/stac/src/debrief_stac/review.py`
- [ ] T013 [test] Write unit tests for optimistic locking and state derivation `services/stac/tests/test_review.py`

### TypeScript Types

- [ ] T014 Add `reviewStatus` field to `CatalogOverviewItem` and `StacBrowserItem` `shared/components/src/filter-engine/types.ts`
- [ ] T015 Add `review-status` to `FilterType` union `shared/components/src/filter-engine/types.ts`

**Checkpoint**: Foundation ready — schema generated, core logic in place, types extended

---

## Phase 3: User Story 1 — Add Review Feedback to a Plot (Priority: P1)

**Goal**: Users can add review notes to any plot; notes appear in detail view with correct metadata; badge appears on plot list entry.

**Independent Test**: Open any plot, add a review note, verify it appears with author/timestamp/pending status, and badge updates in catalog list.

### Tests for User Story 1

- [ ] T016 [P] [US1] [test] Unit test: add_review_item creates item with correct fields `services/stac/tests/test_review.py`
- [ ] T017 [P] [US1] [test] Unit test: add_review_item to plot with no existing feedback `services/stac/tests/test_review.py`
- [ ] T018 [P] [US1] [test] Unit test: add_review_item validates non-empty note `services/stac/tests/test_review.py`
- [ ] T019 [P] [US1] [test] Unit test: add_review_item rejects stale expected_updated `services/stac/tests/test_review.py`

### Implementation for User Story 1

- [ ] T020 [US1] Implement `add_review_item()` in review.py (ULID generation, timestamps, author) `services/stac/src/debrief_stac/review.py`
- [ ] T021 [US1] Implement `get_review_items()` in review.py `services/stac/src/debrief_stac/review.py`
- [ ] T022 [US1] Add `add_review_item_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T023 [US1] Add `get_review_items_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T024 [P] [US1] Create ReviewPanel React component (list view, add note form) `shared/components/src/ReviewPanel/ReviewPanel.tsx`
- [ ] T025 [P] [US1] Create ReviewPanel styles `shared/components/src/ReviewPanel/ReviewPanel.css`
- [ ] T026 [US1] Add review state badge to ExerciseListView plot rows `shared/components/src/ExerciseListView/ExerciseListView.tsx`
- [ ] T027 [US1] Wire ReviewPanel into StacBrowser plot detail view `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T028 [US1] Create ReviewPanel Storybook stories `shared/components/src/ReviewPanel/ReviewPanel.stories.tsx`

### E2E Tests for User Story 1

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip these tests. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

- [ ] T029 [P] [US1] Create Playwright test for ReviewPanel rendering `shared/components/e2e/ReviewPanel.spec.ts`
- [ ] T030 [P] [US1] Add theme variant tests (light, dark, vscode) for ReviewPanel `shared/components/e2e/ReviewPanel.spec.ts`
- [ ] T031 [US1] Run e2e tests: `pnpm --filter @debrief/components test:e2e ReviewPanel`

**Checkpoint**: Users can add review notes and see them displayed. Badges appear on plot list. Story 1 fully functional.

---

## Phase 4: User Story 2 — Resolve and Reopen Feedback Items (Priority: P2)

**Goal**: Users can resolve and reopen feedback items; resolution history is tracked and displayed as collapsible audit trail.

**Independent Test**: Add a feedback item, resolve it, verify metadata, reopen it, verify resolution history recorded.

### Tests for User Story 2

- [ ] T032 [P] [US2] [test] Unit test: resolve_review_item sets status/resolver/timestamp `services/stac/tests/test_review.py`
- [ ] T033 [P] [US2] [test] Unit test: reopen_review_item moves resolution to history `services/stac/tests/test_review.py`
- [ ] T034 [P] [US2] [test] Unit test: resolve already-resolved item returns error `services/stac/tests/test_review.py`
- [ ] T035 [P] [US2] [test] Unit test: reopen already-pending item returns error `services/stac/tests/test_review.py`
- [ ] T036 [P] [US2] [test] Unit test: multiple resolve/reopen cycles accumulate history `services/stac/tests/test_review.py`

### Implementation for User Story 2

- [ ] T037 [US2] Implement `resolve_review_item()` in review.py `services/stac/src/debrief_stac/review.py`
- [ ] T038 [US2] Implement `reopen_review_item()` in review.py `services/stac/src/debrief_stac/review.py`
- [ ] T039 [P] [US2] Add `resolve_review_item_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T040 [P] [US2] Add `reopen_review_item_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T041 [US2] Add resolve/reopen buttons and resolution state display to ReviewPanel `shared/components/src/ReviewPanel/ReviewPanel.tsx`
- [ ] T042 [US2] Add collapsible resolution history to ReviewPanel `shared/components/src/ReviewPanel/ReviewPanel.tsx`
- [ ] T043 [US2] Update badge logic: all-resolved → muted "Reviewed" badge `shared/components/src/ExerciseListView/ExerciseListView.tsx`

### E2E Tests for User Story 2

- [ ] T044 [P] [US2] Add Playwright interaction tests: resolve, reopen, history display `shared/components/e2e/ReviewPanel.spec.ts`
- [ ] T045 [P] [US2] Add badge state transition tests to ExerciseListView e2e `shared/components/e2e/ExerciseListView.spec.ts`

**Checkpoint**: Full resolve/reopen lifecycle works. Badges reflect correct state. History is visible.

---

## Phase 5: User Story 3 — Filter Plots by Review Status (Priority: P3)

**Goal**: Users can filter the catalog list by review status (All, Pending review, All reviewed, No feedback).

**Independent Test**: Create plots with varying feedback states, apply each filter option, verify correct subsets shown.

### Tests for User Story 3

- [ ] T046 [P] [US3] [test] Unit test: review-status matcher for pending-review `shared/components/src/filter-engine/__tests__/matchers.test.ts`
- [ ] T047 [P] [US3] [test] Unit test: review-status matcher for all-reviewed `shared/components/src/filter-engine/__tests__/matchers.test.ts`
- [ ] T048 [P] [US3] [test] Unit test: review-status matcher for no-feedback `shared/components/src/filter-engine/__tests__/matchers.test.ts`

### Implementation for User Story 3

- [ ] T049 [US3] Implement review-status matcher in filter engine `shared/components/src/filter-engine/matchers.ts`
- [ ] T050 [US3] Add Review status dropdown to FilterBar `shared/components/src/FilterBar/FilterBar.tsx`
- [ ] T051 [US3] Populate reviewStatus field on CatalogOverviewItem from STAC item data `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T052 [US3] [test] Integration test: filter engine with review-status predicate `shared/components/src/filter-engine/__tests__/engine.test.ts`

**Checkpoint**: Filter bar has Review status dropdown. All four filter values work correctly.

---

## Phase 6: User Story 4 — Edit a Feedback Note (Priority: P4)

**Goal**: Users can edit the note text of any feedback item; edited items show an "edited" indicator; edits are logged as provenance events.

**Independent Test**: Add a feedback item, edit its note, verify updated text/indicator/timestamps, check provenance log.

### Tests for User Story 4

- [ ] T053 [P] [US4] [test] Unit test: edit_review_item updates note and timestamps `services/stac/tests/test_review.py`
- [ ] T054 [P] [US4] [test] Unit test: edit_review_item preserves author and created_at `services/stac/tests/test_review.py`
- [ ] T055 [P] [US4] [test] Unit test: edit_review_item logs provenance event `services/stac/tests/test_review.py`
- [ ] T056 [P] [US4] [test] Unit test: edit_review_item rejects empty note `services/stac/tests/test_review.py`

### Implementation for User Story 4

- [ ] T057 [US4] Implement `edit_review_item()` in review.py (update note, timestamps, provenance) `services/stac/src/debrief_stac/review.py`
- [ ] T058 [US4] Add `edit_review_item_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T059 [US4] Add edit action and "edited" indicator to ReviewPanel `shared/components/src/ReviewPanel/ReviewPanel.tsx`
- [ ] T060 [US4] [test] Vitest: ReviewPanel shows "edited" indicator when note_updated_at is non-null `shared/components/src/ReviewPanel/ReviewPanel.test.tsx`

**Checkpoint**: Note editing works. Provenance logged. "Edited" indicator displayed.

---

## Phase 7: User Story 5 — Delete a Feedback Item (Priority: P5)

**Goal**: Users can delete any feedback item; last item deletion removes the review property entirely; deletions are logged as provenance events.

**Independent Test**: Add a feedback item, delete it, verify removal from review section, badge update, and provenance log entry.

### Tests for User Story 5

- [ ] T061 [P] [US5] [test] Unit test: delete_review_item removes item from array `services/stac/tests/test_review.py`
- [ ] T062 [P] [US5] [test] Unit test: deleting last item removes debrief:review property `services/stac/tests/test_review.py`
- [ ] T063 [P] [US5] [test] Unit test: delete_review_item logs provenance event `services/stac/tests/test_review.py`
- [ ] T064 [P] [US5] [test] Unit test: delete_review_item with non-existent ID returns error `services/stac/tests/test_review.py`

### Implementation for User Story 5

- [ ] T065 [US5] Implement `delete_review_item()` in review.py (remove from array, cleanup, provenance) `services/stac/src/debrief_stac/review.py`
- [ ] T066 [US5] Add `delete_review_item_tool` MCP tool `services/stac/src/debrief_stac/mcp_server.py`
- [ ] T067 [US5] Add delete action with confirmation to ReviewPanel `shared/components/src/ReviewPanel/ReviewPanel.tsx`
- [ ] T068 [US5] [test] Vitest: ReviewPanel delete flow removes item from display `shared/components/src/ReviewPanel/ReviewPanel.test.tsx`

**Checkpoint**: Deletion works. Last-item cleanup works. Provenance logged. All 5 user stories complete.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing, evidence capture, media content, and PR creation

### Integration Tests

- [ ] T069 [test] Full MCP round-trip test: create → resolve → edit → reopen → delete `services/stac/tests/test_review_mcp.py`
- [ ] T070 [test] Concurrency test: two simultaneous writes trigger conflict `services/stac/tests/test_review.py`
- [ ] T071 Run quickstart.md validation against implemented code `specs/175-review-feedback/quickstart.md`

### VS Code Webview E2E Tests

> Full architecture guide: `docs/e2e-testing-guide.md`

- [ ] T072 [P] Update page objects with review selectors `tests/e2e/models/`
- [ ] T073 Create Playwright test for review workflow in code-server `tests/e2e/test-review-feedback.spec.ts`
- [ ] T074 Run webview e2e tests: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts test-review-feedback`

### Evidence Collection (REQUIRED)

- [ ] T075 Create evidence directory `specs/175-review-feedback/evidence/`
- [ ] T076 Capture test summary using template (.specify/templates/evidence/test-summary-template.md) `specs/175-review-feedback/evidence/test-summary.md`
- [ ] T077 Create usage demonstration (MCP tool round-trip walkthrough) `specs/175-review-feedback/evidence/usage-example.md`
- [ ] T078 [P] Capture sample MCP request JSON `specs/175-review-feedback/evidence/sample-request.json`
- [ ] T079 [P] Capture sample MCP response JSON `specs/175-review-feedback/evidence/sample-response.json`
- [ ] T080 Capture round-trip schema evidence (Python → JSON → TypeScript → JSON) `specs/175-review-feedback/evidence/round-trip-evidence.md`

### E2E Evidence Collection (REQUIRED for UI components)

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip. Uses `@sparticuz/chromium`. Run `node apps/web-shell/run-playwright.mjs` to extract. Details: `docs/project_notes/playwright-installation-research.md`

- [ ] T081 Run full e2e suite: `pnpm --filter @debrief/components test:e2e`
- [ ] T082 [P] Capture theme screenshots (light/dark/vscode) `specs/175-review-feedback/evidence/screenshots/`
- [ ] T083 Capture interaction GIF showing add → resolve → reopen flow `specs/175-review-feedback/evidence/screenshots/interaction.gif`
- [ ] T084 Document e2e results `specs/175-review-feedback/evidence/e2e-summary.md`

### Media Content

- [ ] T085 Create shipped blog post `specs/175-review-feedback/media/shipped-post.md`
- [ ] T086 [P] Create LinkedIn shipped summary `specs/175-review-feedback/media/linkedin-shipped.md`

### PR Creation

- [ ] T087 Create PR and publish blog: run /speckit.pr

**Task T087 must run last. It depends on all evidence and media tasks being complete.**

**Checkpoint**: Evidence collected — ready for PR creation via `/speckit.pr`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundation)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1: Add feedback)**: Depends on Phase 2
- **Phase 4 (US2: Resolve/reopen)**: Depends on Phase 2; uses US1 for test setup
- **Phase 5 (US3: Filter)**: Depends on Phase 2 + T014/T015 (types); independent of US1/US2
- **Phase 6 (US4: Edit)**: Depends on Phase 2; uses US1 for test setup
- **Phase 7 (US5: Delete)**: Depends on Phase 2; uses US1 for test setup
- **Phase 8 (Polish)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (Add feedback)**: Depends only on Foundation. Creates the review data other stories operate on.
- **US2 (Resolve/reopen)**: Depends on Foundation. Needs items created by US1 logic for testing.
- **US3 (Filter)**: Depends on Foundation + type additions (T014/T015). Can proceed independently of US1.
- **US4 (Edit)**: Depends on Foundation. Needs items created by US1 logic for testing.
- **US5 (Delete)**: Depends on Foundation. Needs items created by US1 logic for testing.

### Within Each User Story

- Tests written and verified to FAIL before implementation
- Service logic before MCP tool wrappers
- MCP tools before React components
- Components before integration/wiring

### Parallel Opportunities

- T002, T003, T004 can run in parallel (Phase 1)
- T010, T011, T012 share the same file but different functions — work sequentially
- T014, T015 (TypeScript types) can run in parallel with T010-T012 (Python service)
- All [P] test tasks within a story can run in parallel
- US3 (filter) can be developed in parallel with US2 (resolve/reopen)
- T024, T025 (ReviewPanel component + styles) can run in parallel with T020-T023 (service)
- T078, T079 (sample JSON evidence) can run in parallel
- T082 (screenshots) can run in parallel with T078, T079

---

## Parallel Example: User Story 1

```bash
# Launch all tests in parallel:
Task: T016 "Unit test: add_review_item creates item with correct fields"
Task: T017 "Unit test: add_review_item to plot with no existing feedback"
Task: T018 "Unit test: add_review_item validates non-empty note"
Task: T019 "Unit test: add_review_item rejects stale expected_updated"

# Launch component work in parallel with service work:
Task: T024 "Create ReviewPanel React component" (parallel with T020-T023)
Task: T025 "Create ReviewPanel styles" (parallel with T024)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundation → Schema generated, core logic ready
2. Add User Story 1 (Add feedback) → Test independently — users can create notes
3. Add User Story 2 (Resolve/reopen) → Test independently — full review lifecycle
4. Add User Story 3 (Filter) → Test independently — efficient triage
5. Add User Story 4 (Edit) → Test independently — accurate records
6. Add User Story 5 (Delete) → Test independently — clean records
7. Polish phase → Evidence, media, PR

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundation together
2. Once Foundation is done:
   - Developer A: US1 (Add feedback) then US4 (Edit) — same service area
   - Developer B: US2 (Resolve/reopen) then US5 (Delete) — status operations
   - Developer C: US3 (Filter) — independent frontend work
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
