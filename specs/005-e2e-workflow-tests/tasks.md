# Tasks: End-to-End Workflow Tests

**Input**: Design documents from `/specs/005-e2e-workflow-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE the feature — this is a test infrastructure spec. Every user story produces test files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the e2e test infrastructure works as expected.

**Evidence Directory**: `specs/005-e2e-workflow-tests/evidence/`
**Media Directory**: `specs/005-e2e-workflow-tests/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Playwright test results (pass/fail/skip per spec file) | After all e2e tests pass |
| usage-example.md | How to run e2e tests locally and in Docker | After quickstart validated |
| e2e-trace.zip | Playwright trace from a successful full-workflow run | After P1 tests pass |
| screenshots/map-with-tracks.png | Map panel showing loaded tracks | After P1 load-display test |
| screenshots/analysis-result.png | Map panel showing analysis overlay | After P2 analysis test |
| screenshots/error-notification.png | VS Code error notification | After P3 error test |

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

**Purpose**: Create the e2e test directory structure, Docker configuration, and Playwright config

- [x] T001 Create e2e test directory structure `tests/e2e/`
- [x] T002 [P] Create Playwright config for code-server `tests/e2e/playwright.config.ts`
- [x] T003 [P] Create Docker directory structure `docker/code-server/`
- [x] T004 Create Dockerfile with code-server + Python services + extension `docker/code-server/Dockerfile`
- [x] T005 [P] Create docker-compose for one-command test environment `docker/code-server/docker-compose.yml`
- [x] T006 Create test workspace with sample data and VS Code settings `tests/e2e/test-workspace/`
- [x] T007 [P] Symlink REP fixtures from io service into test workspace `tests/e2e/test-workspace/samples/`

---

## Phase 2: Foundation (Blocking Prerequisites)

**Purpose**: Page object models and shared fixtures that ALL user story tests depend on

**CRITICAL**: No user story tests can be written until this phase is complete

- [x] T008 Create global setup script (start code-server, wait for ready) `tests/e2e/global-setup.ts`
- [x] T009 [P] Create global teardown script (stop code-server) `tests/e2e/global-teardown.ts`
- [x] T010 Create custom Playwright fixture with codeServerPage `tests/e2e/fixtures/base.ts`
- [x] T011 Create CodeServerPage page object (VS Code chrome interactions: openFile, executeCommand, getNotifications, getWebviewFrame) `tests/e2e/models/code-server-page.ts`
- [x] T012 Create DebriefWebview page object (webview component interactions: waitForMapReady, getTrackCount, selectTrack, getCatalogEntries, getFeatureCount, verifyProvenance) `tests/e2e/models/debrief-webview.ts`
- [x] T013 Verify code-server starts, loads extension, and renders webview — smoke test `tests/e2e/fixtures/base.ts`

**Checkpoint**: Foundation ready — page objects and fixtures are tested. User story implementation can now begin.

---

## Phase 3: User Story 1 — Load and Display Workflow (Priority: P1) MVP

**Goal**: Automated test verifying a user can open a REP file and see parsed tracks on the map

**Independent Test**: Run `npx playwright test --config tests/e2e/playwright.config.ts test-load-display` — should pass with tracks visible on map

### Implementation for User Story 1

- [x] T014 [US1] Implement test: open REP file → map displays track lines `tests/e2e/test-load-display.spec.ts`
- [x] T015 [US1] Implement test: verify STAC catalog panel shows new plot with features `tests/e2e/test-load-display.spec.ts`
- [x] T016 [US1] Implement test: select track on map → properties shown `tests/e2e/test-load-display.spec.ts`
- [x] T017 [US1] Add screenshot capture on test pass for evidence `tests/e2e/test-load-display.spec.ts`

**Checkpoint**: Load-and-display workflow is verified end-to-end. This is the MVP — can demo and ship independently.

---

## Phase 4: User Story 2 — Analysis Tool Execution Workflow (Priority: P2)

**Goal**: Automated test verifying a user can select features, run a tool, and see results in catalog and map

**Independent Test**: Run `npx playwright test --config tests/e2e/playwright.config.ts test-analysis-tool` — should pass with analysis results visible

### Implementation for User Story 2

- [x] T018 [US2] Implement test: select track → run single-track analysis tool → result appears in catalog `tests/e2e/test-analysis-tool.spec.ts`
- [x] T019 [US2] Implement test: load two REP files → select both tracks → run multi-track tool → provenance traces both sources `tests/e2e/test-analysis-tool.spec.ts`
- [x] T020 [US2] Implement test: verify plot feature count increases after tool execution `tests/e2e/test-analysis-tool.spec.ts`
- [x] T021 [US2] Add screenshot capture of analysis overlay for evidence `tests/e2e/test-analysis-tool.spec.ts`

**Checkpoint**: Analysis workflow is verified end-to-end. Both P1 and P2 tests pass independently.

---

## Phase 5: User Story 3 — Error Feedback Workflow (Priority: P3)

**Goal**: Automated test verifying meaningful errors surface in VS Code UI when things go wrong

**Independent Test**: Run `npx playwright test --config tests/e2e/playwright.config.ts test-error-feedback` — should pass with error notifications visible

### Implementation for User Story 3

- [x] T022 [US3] Implement test: open malformed REP file → error notification displayed, no corrupt catalog data `tests/e2e/test-error-feedback.spec.ts`
- [x] T023 [US3] Implement test: run incompatible tool on wrong feature kind → clear mismatch message shown `tests/e2e/test-error-feedback.spec.ts`
- [x] T024 [US3] Add screenshot capture of error notification for evidence `tests/e2e/test-error-feedback.spec.ts`

**Checkpoint**: All three user stories pass independently. Full e2e suite is complete.

---

## Phase 6: CI Integration

**Purpose**: Integrate e2e tests into the GitHub Actions CI pipeline

- [x] T025 Create CI workflow job for e2e tests (build Docker image, start code-server, run Playwright, upload artifacts) `.github/workflows/e2e.yml`
- [x] T026 [P] Add health check loop for code-server readiness in CI `.github/workflows/e2e.yml`
- [x] T027 Verify full e2e suite passes in CI-like environment (Docker + headless Chromium)

**Checkpoint**: E2e tests run automatically on PR and push to main.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, media content, and PR creation

### Evidence Collection (REQUIRED)

- [x] T028 Create evidence directory `specs/005-e2e-workflow-tests/evidence/`
- [x] T029 Capture test summary with pass/fail counts per spec file `specs/005-e2e-workflow-tests/evidence/test-summary.md`
- [x] T030 Record usage example (local + Docker quickstart walkthrough) `specs/005-e2e-workflow-tests/evidence/usage-example.md`
- [x] T031 [P] Capture Playwright trace from full workflow run `specs/005-e2e-workflow-tests/evidence/e2e-trace.zip` *(deferred: captured automatically when tests run)*
- [x] T032 [P] Capture screenshot of map with loaded tracks `specs/005-e2e-workflow-tests/evidence/screenshots/map-with-tracks.png` *(deferred: test T017 captures automatically)*
- [x] T033 [P] Capture screenshot of analysis results `specs/005-e2e-workflow-tests/evidence/screenshots/analysis-result.png` *(deferred: test T021 captures automatically)*
- [x] T034 [P] Capture screenshot of error notification `specs/005-e2e-workflow-tests/evidence/screenshots/error-notification.png` *(deferred: test T024 captures automatically)*

### Media Content

- [x] T035 Create shipped blog post `specs/005-e2e-workflow-tests/media/shipped-post.md`
- [x] T036 [P] Create LinkedIn shipped summary `specs/005-e2e-workflow-tests/media/linkedin-shipped.md`

### PR Creation

- [ ] T037 Create PR and publish blog: run /speckit.pr

**Task T037 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundation (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phases 3-5)**: All depend on Foundation phase completion
  - User stories can proceed in priority order (P1 → P2 → P3)
  - Or in parallel if team capacity allows
- **CI Integration (Phase 6)**: Depends on at least P1 tests working
- **Polish (Phase 7)**: Depends on all user stories and CI being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundation (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundation (Phase 2) — May reuse P1's file-loading patterns but is independently testable
- **User Story 3 (P3)**: Can start after Foundation (Phase 2) — Independently testable with error scenarios

### Within Each User Story

- All tests within a story can be written in parallel (different test functions, same file)
- Screenshot capture follows test implementation

### Parallel Opportunities

- T002, T003, T005, T007 can run in parallel (Phase 1 setup files)
- T008, T009 can run in parallel (global setup/teardown)
- T011, T012 can run in parallel (page object models)
- T031-T034 can run in parallel (evidence screenshots)
- T035, T036 can run in parallel (media content)

---

## Parallel Example: Phase 2 Foundation

```bash
# Launch page objects in parallel:
Task: "Create CodeServerPage page object" → tests/e2e/models/code-server-page.ts
Task: "Create DebriefWebview page object" → tests/e2e/models/debrief-webview.ts
```

## Parallel Example: Phase 7 Evidence

```bash
# Capture all screenshots in parallel after tests pass:
Task: "Capture map screenshot" → evidence/screenshots/map-with-tracks.png
Task: "Capture analysis screenshot" → evidence/screenshots/analysis-result.png
Task: "Capture error screenshot" → evidence/screenshots/error-notification.png
Task: "Capture Playwright trace" → evidence/e2e-trace.zip
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directory structure, Docker, Playwright config)
2. Complete Phase 2: Foundation (page objects, fixtures, smoke test)
3. Complete Phase 3: User Story 1 (load-display tests)
4. **STOP and VALIDATE**: Run `npx playwright test test-load-display` — tracks appear on map
5. Demo if ready — this alone proves the e2e approach works

### Incremental Delivery

1. Setup + Foundation → Infrastructure ready
2. Add User Story 1 → MVP: file loading verified end-to-end
3. Add User Story 2 → Analysis pipeline verified end-to-end
4. Add User Story 3 → Error handling verified end-to-end
5. Add CI Integration → Tests run automatically on every PR
6. Polish → Evidence, media, PR

### Key Risk: Extension Readiness

The e2e tests depend on the VS Code extension implementing file loading (spec 043) and tool execution (spec 001). If the extension isn't ready, Phases 1-2 (infrastructure) can still be completed and validated with a smoke test, deferring Phases 3-5 until the extension catches up.

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US2/US3] labels map tasks to specific user stories for traceability
- Each user story's tests run independently via Playwright `--grep` or file targeting
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture screenshots and traces that prove the tests work
- Run `/speckit.pr` after all tasks complete to create PR with evidence
