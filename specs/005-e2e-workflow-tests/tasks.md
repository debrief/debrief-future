# Tasks: End-to-End Workflow Tests (Revised)

**Input**: Design documents from `/specs/005-e2e-workflow-tests/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests ARE the feature — this is a test infrastructure spec. Every user story produces test files.

**Organization**: Phases 1-6 (original single-platform work) are complete. The revised spec adds dual-platform coverage: restoring skipped VS Code E2E tests and expanding to match web-shell's 13 spec categories with real Python services.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the dual-platform E2E test infrastructure works as expected.

**Evidence Directory**: `specs/005-e2e-workflow-tests/evidence/`
**Media Directory**: `specs/005-e2e-workflow-tests/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Playwright test results for both suites (web-shell + VS Code E2E) | After all tests pass |
| usage-example.md | How to run both test suites locally and in Docker | After quickstart validated |
| e2e-trace.zip | Playwright trace from a successful VS Code E2E full-workflow run | After VS Code E2E tests pass |
| screenshots/vscode-map-tracks.png | Map panel showing real REP tracks in VS Code webview | After US1 VS Code E2E test |
| screenshots/vscode-analysis.png | Analysis result overlay in VS Code webview | After US2 VS Code E2E test |
| screenshots/vscode-error.png | Error notification in VS Code | After US3 VS Code E2E test |
| integration-flow.md | Dual-platform test architecture diagram + sequence flow | After both suites validated |

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

## Completed Phases (Original Plan)

> Phases 1-6 from the original plan are complete. Infrastructure, page objects, Docker, CI workflow, and the initial 8 VS Code E2E spec files all exist.

### Phase 1: Setup (COMPLETE)

- [x] T001 Create e2e test directory structure `tests/e2e/`
- [x] T002 [P] Create Playwright config for code-server `tests/e2e/playwright.config.ts`
- [x] T003 [P] Create Docker directory structure `docker/code-server/`
- [x] T004 Create Dockerfile with code-server + Python services + extension `docker/code-server/Dockerfile`
- [x] T005 [P] Create docker-compose for one-command test environment `docker/code-server/docker-compose.yml`
- [x] T006 Create test workspace with sample data `tests/e2e/test-workspace/`
- [x] T007 [P] Copy REP fixtures from io service into test workspace `tests/e2e/test-workspace/samples/`

### Phase 2: Foundation (COMPLETE)

- [x] T008 Create global setup script (openvscode-server preferred, code-server fallback) `tests/e2e/global-setup.ts`
- [x] T009 [P] Create global teardown script `tests/e2e/global-teardown.ts`
- [x] T010 Create custom Playwright fixture with codeServerPage + debriefWebview `tests/e2e/fixtures/base.ts`
- [x] T011 [P] Create CodeServerPage page object `tests/e2e/models/code-server-page.ts`
- [x] T012 [P] Create DebriefWebview page object `tests/e2e/models/debrief-webview.ts`
- [x] T013 [P] Create webview-injector helper `tests/e2e/helpers/webview-injector.ts`

### Phase 3-5: Original User Stories (COMPLETE)

- [x] T014 [US1] Load and display tests `tests/e2e/test-load-display.spec.ts`
- [x] T015 [US2] Analysis tool tests `tests/e2e/test-analysis-tool.spec.ts`
- [x] T016 [US3] Error feedback tests `tests/e2e/test-error-feedback.spec.ts`
- [x] T017 Provenance tuning tests `tests/e2e/test-tune-prov.spec.ts`
- [x] T018 Webview probe tests `tests/e2e/test-webview-probe.spec.ts`
- [x] T019 Real webview tests `tests/e2e/test-real-webview.spec.ts`
- [x] T020 Preview smoke tests `tests/e2e/test-preview-smoke.spec.ts`
- [x] T021 Heroku smoke tests `tests/e2e/test-heroku-smoke.spec.ts`

### Phase 6: CI Integration (COMPLETE)

- [x] T022 Create dedicated E2E CI workflow `.github/workflows/e2e.yml`
- [x] T023 [P] Add health check loop for code-server readiness `.github/workflows/e2e.yml`
- [x] T024 [P] Add cloud setup script `tests/e2e/scripts/cloud-e2e-setup.sh`
- [x] T025 [P] Add Chromium download fallback script `tests/e2e/scripts/ensure-chromium.sh`

---

## Phase 7: VS Code E2E Restoration — User Story 1 (Priority: P1)

**Goal**: Unskip the 4 existing spec files that have `.skip()` annotations and verify they pass against real Python services in the Docker environment

**Independent Test**: Run `npx playwright test --config tests/e2e/playwright.config.ts test-load-display test-analysis-tool test-error-feedback test-tune-prov` — all should pass or use `test.fixme()` for missing features

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

### VS Code E2E Restoration

- [x] T101 [US1] Remove `.skip()` from test-load-display.spec.ts, fix selectors to match current extension output `tests/e2e/test-load-display.spec.ts`
- [x] T102 [P][US1] Remove `.skip()` from test-analysis-tool.spec.ts, fix selectors to match current extension output `tests/e2e/test-analysis-tool.spec.ts`
- [x] T103 [P][US1] Remove `.skip()` from test-error-feedback.spec.ts, fix selectors to match current extension output `tests/e2e/test-error-feedback.spec.ts`
- [x] T104 [P][US1] Remove `.skip()` from test-tune-prov.spec.ts, fix selectors to match current extension output `tests/e2e/test-tune-prov.spec.ts`
- [ ] T105 [US1] Verify real Python services (debrief-io, debrief-stac, debrief-calc) are reachable from Docker container — test REP file parsing produces real GeoJSON `docker/code-server/Dockerfile`
- [x] T106 [US1] Convert tests that reveal missing features to `test.fixme()` with backlog cross-references (FR-011) `tests/e2e/`
- [ ] T107 [US1] Run restored tests against Docker environment and verify pass/fixme status `tests/e2e/`

**Checkpoint**: The original 4 skipped spec files are now active (passing or fixme'd). Real Python services parse real REP files end-to-end.

---

## Phase 8: VS Code E2E Expansion — User Story 2 (Priority: P2)

**Goal**: Create new VS Code E2E spec files to match the web-shell's 13 spec categories (SC-006), adapting web-shell test patterns for the VS Code webview context

**Independent Test**: Run `npx playwright test --config tests/e2e/playwright.config.ts` — all 13+ spec files should pass or use `test.fixme()`

### Page Object Updates

- [x] T201 [US2] Add selection-sync selectors and methods to DebriefWebview page object `tests/e2e/models/debrief-webview.ts`
- [x] T202 [P][US2] Add time-controller selectors and methods to DebriefWebview page object `tests/e2e/models/debrief-webview.ts`
- [x] T203 [P][US2] Add drawing-tools selectors and methods to DebriefWebview page object `tests/e2e/models/debrief-webview.ts`
- [x] T204 [P][US2] Add log-panel selectors and methods to DebriefWebview page object `tests/e2e/models/debrief-webview.ts`

### New Spec Files (matching web-shell categories)

- [x] T205 [US2] Create selection-sync spec (adapt from `apps/web-shell/playwright/tests/selection-sync.spec.ts`) `tests/e2e/test-selection-sync.spec.ts`
- [x] T206 [P][US2] Create time-controller spec (adapt from `apps/web-shell/playwright/tests/time-controller.spec.ts`) `tests/e2e/test-time-controller.spec.ts`
- [x] T207 [P][US2] Create drawing spec (adapt from `apps/web-shell/playwright/tests/drawing.spec.ts`) `tests/e2e/test-drawing.spec.ts`
- [x] T208 [P][US2] Create catalog-browse spec (adapt from `apps/web-shell/playwright/tests/catalog-browse.spec.ts`) `tests/e2e/test-catalog-browse.spec.ts`
- [x] T209 [US2] Create log-panel spec (adapt from `apps/web-shell/playwright/tests/log-panel.spec.ts`) `tests/e2e/test-log-panel.spec.ts`
- [x] T210 [P][US2] Create log-edit-face spec (adapt from `apps/web-shell/playwright/tests/log-edit-face.spec.ts`) `tests/e2e/test-log-edit-face.spec.ts`
- [x] T211 [P][US2] Create event-log-propagation spec (adapt from `apps/web-shell/playwright/tests/event-log-propagation.spec.ts`) `tests/e2e/test-event-log-propagation.spec.ts`
- [x] T212 [P][US2] Create styling-tools spec (adapt from `apps/web-shell/playwright/tests/styling-tools.spec.ts`) `tests/e2e/test-styling-tools.spec.ts`
- [x] T213 [P][US2] Create undo-redo-split spec (adapt from `apps/web-shell/playwright/tests/undo-redo-split.spec.ts`) `tests/e2e/test-undo-redo-split.spec.ts`
- [x] T214 [P][US2] Create capture-log-evidence spec (adapt from `apps/web-shell/playwright/tests/capture-log-evidence.spec.ts`) `tests/e2e/test-capture-log-evidence.spec.ts`
- [x] T215 [US2] Convert tests that reveal missing features to `test.fixme()` with backlog cross-references (FR-011) `tests/e2e/`
- [ ] T216 [US2] Run full expanded suite and verify 13+ spec files pass or fixme `tests/e2e/`

**Checkpoint**: VS Code E2E suite now covers all 13 web-shell spec categories. Tests pass or are annotated with `test.fixme()` with corresponding backlog items.

---

## Phase 9: CI & Cross-Platform Validation — User Story 3 (Priority: P3)

**Goal**: Ensure both test suites run reliably in CI as parallel jobs, and validate the dual-platform strategy works end-to-end

**Independent Test**: Both `e2e.yml` (VS Code E2E) and `ci.yml` (web-shell) workflows pass on a PR

### CI Workflow Updates

- [ ] T301 [US3] Update `e2e.yml` to run all 13+ VS Code E2E spec files (not just original 3) `.github/workflows/e2e.yml`
- [ ] T302 [P][US3] Verify web-shell Playwright tests still pass via `ci.yml` (regression check) `.github/workflows/ci.yml`
- [ ] T303 [US3] Verify total CI time for both suites stays within 10 minutes (SC-003) `.github/workflows/`
- [ ] T304 [US3] Update `docs/e2e-test-restoration-requirements.md` to reflect completed restoration `docs/e2e-test-restoration-requirements.md`

**Checkpoint**: Both CI workflows pass. Dual-platform E2E strategy is validated.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, documentation, media content, and PR creation

### Evidence Collection (REQUIRED)

- [ ] T401 Capture test results using template (.specify/templates/evidence/test-summary-template.md) — include both web-shell and VS Code E2E results `specs/005-e2e-workflow-tests/evidence/test-summary.md`
- [ ] T402 Create usage demonstration showing how to run both test suites `specs/005-e2e-workflow-tests/evidence/usage-example.md`
- [ ] T403 [P] Capture Playwright trace from VS Code E2E full-workflow run `specs/005-e2e-workflow-tests/evidence/e2e-trace.zip`
- [ ] T404 [P] Capture screenshot of map with real REP tracks in VS Code webview `specs/005-e2e-workflow-tests/evidence/screenshots/vscode-map-tracks.png`
- [ ] T405 [P] Capture screenshot of analysis result in VS Code webview `specs/005-e2e-workflow-tests/evidence/screenshots/vscode-analysis.png`
- [ ] T406 [P] Capture screenshot of error notification in VS Code `specs/005-e2e-workflow-tests/evidence/screenshots/vscode-error.png`
- [ ] T407 [P] Document dual-platform architecture and integration flow `specs/005-e2e-workflow-tests/evidence/integration-flow.md`

### VS Code Webview E2E Evidence Collection 🖥️

> Full guide: `docs/e2e-testing-guide.md`

- [ ] T408 Run full VS Code E2E suite: `xvfb-run --auto-servernum npx playwright test --config tests/e2e/playwright.config.ts`
- [ ] T409 [P] Document VS Code E2E results (pass/fixme/skip counts per spec file) `specs/005-e2e-workflow-tests/evidence/webview-e2e-summary.md`

### Media Content

- [ ] T410 Create shipped blog post `specs/005-e2e-workflow-tests/media/shipped-post.md`
- [ ] T411 [P] Create LinkedIn shipped summary `specs/005-e2e-workflow-tests/media/linkedin-shipped.md`

### PR Creation

- [ ] T412 Create PR and publish blog: run /speckit.pr

**Task T412 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phases 1-6 (Complete)**: Infrastructure, page objects, Docker, CI — all done
- **Phase 7 (Restoration)**: No new dependencies — works with existing infrastructure
- **Phase 8 (Expansion)**: Depends on Phase 7 completion (restored page objects/patterns)
- **Phase 9 (CI Validation)**: Depends on Phase 8 completion (all spec files exist)
- **Phase 10 (Polish)**: Depends on all previous phases being complete

### User Story Dependencies

- **User Story 1 (P1 — Phase 7)**: Restore skipped tests — no dependency on other stories
- **User Story 2 (P2 — Phase 8)**: Create new spec files — depends on page object updates from US1
- **User Story 3 (P3 — Phase 9)**: CI validation — depends on all spec files existing

### Within Each Phase

- Page object updates (T201-T204) can run in parallel
- New spec files (T205-T214) can run in parallel (different files)
- Evidence screenshots (T403-T407) can run in parallel
- Media content (T410-T411) can run in parallel

### Parallel Opportunities

- T101-T104 can run in parallel (restoring different spec files)
- T201-T204 can run in parallel (page object updates for different selectors)
- T205-T214 can run in parallel (new spec files for different categories)
- T301-T302 can run in parallel (CI workflow checks)
- T403-T407 can run in parallel (evidence capture)
- T410-T411 can run in parallel (media content)

---

## Parallel Example: Phase 7 Restoration

```bash
# Restore all 4 skipped spec files in parallel:
Task: "Remove .skip() from test-load-display.spec.ts" → tests/e2e/test-load-display.spec.ts
Task: "Remove .skip() from test-analysis-tool.spec.ts" → tests/e2e/test-analysis-tool.spec.ts
Task: "Remove .skip() from test-error-feedback.spec.ts" → tests/e2e/test-error-feedback.spec.ts
Task: "Remove .skip() from test-tune-prov.spec.ts" → tests/e2e/test-tune-prov.spec.ts
```

## Parallel Example: Phase 8 Expansion

```bash
# Create all new spec files in parallel (after page object updates):
Task: "Create selection-sync spec" → tests/e2e/test-selection-sync.spec.ts
Task: "Create time-controller spec" → tests/e2e/test-time-controller.spec.ts
Task: "Create drawing spec" → tests/e2e/test-drawing.spec.ts
Task: "Create catalog-browse spec" → tests/e2e/test-catalog-browse.spec.ts
Task: "Create styling-tools spec" → tests/e2e/test-styling-tools.spec.ts
```

---

## Implementation Strategy

### Incremental Delivery

1. **Phase 7**: Restore 4 skipped VS Code E2E spec files → validate real Python services work
2. **Phase 8**: Expand to 13+ spec files → full category parity with web-shell
3. **Phase 9**: CI validation → both suites green in parallel CI jobs
4. **Phase 10**: Evidence + media + PR → ship the feature

### test.fixme() Strategy (FR-011)

When restoring or creating VS Code E2E tests that reveal missing extension features:

1. Annotate the test with `test.fixme("Feature X not implemented — see backlog item #NNN")`
2. Create a backlog item describing the missing feature
3. Cross-reference between the test file/line and the backlog entry
4. The test appears in reports as "to be implemented" (not silently skipped)

This keeps the suite green while documenting known gaps for future work.

### Key Assertion Strategy for Real Services

VS Code E2E tests use real Python services parsing real REP files. Assertions must be:
- **Structural**: "at least one track exists" not "exactly 3 tracks"
- **Type-checking**: "properties.kind is 'TRACK'" not "properties.name is 'HMS DEFENDER'"
- **Existence-based**: "provenance object has sources array" not "provenance.sources[0].id is 'uuid-abc'"

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US2/US3] labels map tasks to specific user stories for traceability
- Each user story's tests run independently via Playwright file targeting
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Evidence is required** — capture screenshots and traces that prove both suites work
- Run `/speckit.pr` after all tasks complete to create PR with evidence
