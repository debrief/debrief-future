# Tasks: Browser-Based VS Code Extension Preview

**Input**: Design documents from `/specs/099-browser-extension-preview/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Playwright smoke test verifies code-server loads with the Debrief and Log activity panels. Uses existing `tests/e2e/` infrastructure (`CodeServerPage` fixture, `global-setup.ts`).

> **Playwright in cloud sessions**: The project uses `@sparticuz/chromium` for bundled Chromium in environments where browser CDN downloads are blocked. See `docs/project_notes/playwright-installation-research.md` for full details. Do NOT skip Playwright tests — they work in cloud sessions.

**Organization**: Tasks follow the two-phase delivery model from the spec. Phases 1-3 are "Before Heroku Config" (US1). Phases 4-5 are "After Heroku Config" (US2, US3). A MANUAL STOP separates them.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the feature works as expected. These are used in PR descriptions, documentation, and future blog posts.

**Evidence Directory**: `specs/099-browser-extension-preview/evidence/`
**Media Directory**: `specs/099-browser-extension-preview/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Docker build log + container startup verification | After local container runs |
| usage-example.md | Step-by-step walkthrough of opening preview in browser | After container serves code-server |
| docker-build.txt | Docker build output showing successful image creation | After Dockerfile works |
| container-startup.txt | Container logs showing code-server + extension loading | After entrypoint runs |
| e2e-summary.md | Playwright smoke test results (workbench, Debrief panel, Log panel) | After smoke test passes |
| screenshots/ | Screenshots of code-server with Debrief extension active | Captured by Playwright |

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

**Purpose**: Create the `preview/` directory structure and workspace files

- [ ] T001 Create preview directory structure `preview/`
- [ ] T002 [P] Create VS Code workspace file `preview/workspace/debrief-preview.code-workspace`
- [ ] T003 [P] Copy sample STAC data into workspace `preview/workspace/samples/`
- [ ] T004 [P] Copy sample REP files into workspace `preview/workspace/samples/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Container definition and entrypoint that MUST work before anything else

**Critical**: The Dockerfile and entrypoint are prerequisites for all subsequent testing.

- [ ] T005 Create Dockerfile for code-server with extension install `preview/Dockerfile`
- [ ] T006 Create entrypoint script that installs .vsix and starts code-server `preview/entrypoint.sh`
- [ ] T007 Verify Dockerfile builds locally without errors

**Checkpoint**: Docker image builds successfully. code-server starts and serves on the configured port.

---

## Phase 3: User Story 1 — Prepare Preview Environment Artifacts (Priority: P1)

**Goal**: All files needed to run the VS Code extension inside code-server on Heroku are committed and validated locally.

**Independent Test**: Build the container locally, run it, navigate to the code-server URL in a browser, and confirm the Debrief extension is loaded with sample data.

### Playwright Smoke Test

> **Purpose**: Automated verification that code-server loads with the Debrief extension active. This test validates this feature AND serves as ongoing regression for future preview deployments.
>
> **Existing infrastructure**: `tests/e2e/` already provides `CodeServerPage` fixture, `global-setup.ts` (starts/connects to code-server), and `playwright.config.ts` (reads `CODE_SERVER_URL`). The smoke test slots into this structure.
>
> **Playwright in cloud sessions**: Use `@sparticuz/chromium` — see `docs/project_notes/playwright-installation-research.md`.

- [ ] T008 [test] [US1] Create preview smoke test `tests/e2e/test-preview-smoke.spec.ts`
- [ ] T009 [test] [US1] Run smoke test against local container: `CODE_SERVER_URL=http://localhost:8080 pnpm exec playwright test --config=tests/e2e/playwright.config.ts test-preview-smoke`

**Smoke test checks**:
1. VS Code workbench renders (`.monaco-workbench` visible)
2. Debrief activity bar icon present (extension activated)
3. Log activity panel accessible
4. File explorer shows sample workspace files
5. Capture screenshot to `specs/099-browser-extension-preview/evidence/screenshots/`

### Implementation for User Story 1

- [ ] T010 [US1] Create WELCOME.md onboarding document for the preview workspace `preview/workspace/WELCOME.md`
- [ ] T011 [P] [US1] Create Heroku app.json descriptor at repo root `app.json`
- [ ] T012 [P] [US1] Create heroku.yml container stack definition at repo root `heroku.yml`
- [ ] T013 [US1] Verify container runs locally and code-server is accessible in browser
- [ ] T014 [US1] Verify sample data loads in the preview workspace (REP files openable, STAC catalog browsable)
- [ ] T015 [US1] Add Taskfile entry for local preview build and run `Taskfile.yml`

**Checkpoint**: Phase 1 of the spec is complete. Container builds locally, extension loads, sample data works, Heroku descriptors are committed. Ready for manual Heroku configuration.

---

### ⛔ MANUAL STOP — Heroku Configuration Required

> The repository owner must now configure Heroku Review Apps via the Heroku Dashboard:
>
> 1. Create a Heroku pipeline (e.g., `debrief-preview`)
> 2. Connect the `debrief/debrief-future` GitHub repository
> 3. Enable "Create new review apps for new pull requests automatically"
> 4. Set the stack to `container`
>
> **Do not proceed to Phase 4 until Heroku Review Apps are active.**

---

## Phase 4: User Story 2 — Review Extension in Browser via PR Preview (Priority: P2)

**Goal**: After Heroku Review Apps are enabled, validate the end-to-end PR preview workflow.

**Independent Test**: Open a PR, wait for the Heroku Review App to deploy, navigate to the preview URL, and exercise the extension features.

### Implementation for User Story 2

- [ ] T016 [US2] Open a test PR with a trivial extension change and confirm Heroku builds the review app
- [ ] T017 [US2] Verify preview URL is accessible and code-server loads with the Debrief extension
- [ ] T018 [US2] Verify the extension is built from the PR branch, not from main
- [ ] T019 [US2] Verify map view, STAC explorer, and sample data work in the browser preview
- [ ] T020 [test] [US2] Run Playwright smoke test against Heroku preview: `CODE_SERVER_URL=https://<heroku-app>.herokuapp.com pnpm exec playwright test --config=tests/e2e/playwright.config.ts test-preview-smoke`
- [ ] T021 [US2] Close the test PR and verify the review app is automatically destroyed

**Checkpoint**: End-to-end PR preview workflow validated. Reviewers can click a link and interact with the extension in the browser.

---

## Phase 5: User Story 3 — Reviewer Guidance and Onboarding (Priority: P3)

**Goal**: Reviewers see clear instructions in the PR description and the preview environment on what to test.

**Independent Test**: Verify the PR template includes review instructions and the preview environment displays the welcome document.

### Implementation for User Story 3

- [ ] T022 [US3] Update or create PR template with preview section `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] T023 [US3] Verify WELCOME.md opens by default when code-server loads in the preview environment
- [ ] T024 [US3] Open a test PR and confirm the PR description includes the preview URL placeholder and review instructions

**Checkpoint**: All three user stories are complete. The preview workflow is fully operational with reviewer guidance.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation

- [ ] T025 Run quickstart.md validation (follow steps and confirm they work) `specs/099-browser-extension-preview/quickstart.md`
- [ ] T026 [P] Review all edge cases from spec.md (build failure, missing data, early access)

### Evidence Collection (REQUIRED)

- [ ] T027 Create evidence directory `specs/099-browser-extension-preview/evidence/`
- [ ] T028 Capture Docker build output in `specs/099-browser-extension-preview/evidence/docker-build.txt`
- [ ] T029 [P] Capture container startup logs in `specs/099-browser-extension-preview/evidence/container-startup.txt`
- [ ] T030 Capture Playwright smoke test results in `specs/099-browser-extension-preview/evidence/e2e-summary.md`
- [ ] T031 [P] Capture screenshots from Playwright in `specs/099-browser-extension-preview/evidence/screenshots/`
- [ ] T032 Capture test summary in `specs/099-browser-extension-preview/evidence/test-summary.md`
- [ ] T033 Create usage demonstration in `specs/099-browser-extension-preview/evidence/usage-example.md`

### Media Content

- [ ] T034 Create shipped blog post in `specs/099-browser-extension-preview/media/shipped-post.md`
- [ ] T035 [P] Create LinkedIn shipped summary in `specs/099-browser-extension-preview/media/linkedin-shipped.md`

### PR Creation

- [ ] T036 Create PR and publish blog: run /speckit.pr

**Task T036 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (directory structure must exist)
- **User Story 1 (Phase 3)**: Depends on Phase 2 (Dockerfile must build)
- **⛔ MANUAL STOP**: Repository owner configures Heroku Review Apps
- **User Story 2 (Phase 4)**: Depends on Phase 3 + Heroku configuration
- **User Story 3 (Phase 5)**: Depends on Phase 4 (review app must be working)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P2)**: Depends on US1 complete AND Heroku manual configuration — Cannot start until MANUAL STOP is resolved
- **User Story 3 (P3)**: Depends on US2 (needs working preview environment to validate guidance)

### Within Each User Story

- Container definition before Heroku descriptors
- Heroku descriptors before deployment validation
- Deployment validation before reviewer guidance

### Parallel Opportunities

- Phase 1: T002, T003, T004 can all run in parallel (independent workspace files)
- Phase 3: T008, T009, T010 can run in parallel after T007 (independent files)
- Phase 6: T026/T027 can run in parallel (different evidence artifacts); T030/T031 can run in parallel (blog + LinkedIn)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all workspace setup tasks together:
Task: "Create VS Code workspace file"        # preview/workspace/debrief-preview.code-workspace
Task: "Copy sample STAC data into workspace"  # preview/workspace/samples/ (STAC catalogs)
Task: "Copy sample REP files into workspace"  # preview/workspace/samples/ (REP files)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Setup + Foundational → Docker image builds
2. Complete User Story 1 → Local preview works, Heroku descriptors committed
3. **⛔ MANUAL STOP** → Owner configures Heroku Review Apps
4. Complete User Story 2 → End-to-end PR preview validated
5. Complete User Story 3 → Reviewer guidance in place
6. Polish → Evidence captured, media created, PR submitted

### Phase Boundary

The spec explicitly requires splitting work around a manual Heroku configuration step:

- **Phases 1-3** can be completed in a single implementation session
- **MANUAL STOP** requires human intervention (Heroku Dashboard)
- **Phases 4-6** are completed after Heroku is configured

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Each user story is independently testable (per spec)
- Playwright smoke test provides automated verification (Debrief + Log panels present, workbench loads)
- Test runs against local container in Phase 3 AND against Heroku deployment in Phase 4
- **Evidence is required** — capture artifacts that prove the feature works
- Run `/speckit.pr` after all tasks complete to create PR with evidence
- The ⛔ MANUAL STOP is a first-class workflow element, not a blocker to work around
