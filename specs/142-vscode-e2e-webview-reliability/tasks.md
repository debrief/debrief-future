# Tasks: VS Code E2E Webview Reliability

**Input**: Design documents from `/specs/142-vscode-e2e-webview-reliability/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/webview-lifecycle.md

**Tests**: Tests ARE the deliverable — this is a test infrastructure feature. No separate "test tasks" section needed; the implementation itself produces working tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the webview reliability fix works and that previously-skipped tests now pass.

**Evidence Directory**: `specs/142-vscode-e2e-webview-reliability/evidence/`
**Media Directory**: `specs/142-vscode-e2e-webview-reliability/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | Playwright E2E results with pass/fail/fixme counts | After all tests validated |
| usage-example.md | How to run VS Code E2E tests with the fix applied | After solution validated |
| root-cause-analysis.md | Documented root cause with evidence | After Phase 1 |
| config-sample.sh | Example patch-webview.sh invocation and output | After patches updated |
| validation-output.txt | CI-like test run output showing unskipped tests | After Phase 3 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | Already exists |
| media/linkedin-planning.md | LinkedIn summary for planning | Already exists |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Root Cause Investigation (US1 — Priority: P1)

**Goal**: Identify exactly why `resolveWebviewView` is never called in openvscode-server, with documented evidence.

**Independent Test**: Produce a root-cause-analysis.md with file/line references that another developer can verify independently.

### Implementation

- [x] T001 Add diagnostic console logging to extension activation in `tests/e2e/global-setup.ts`
- [x] T002 Test view reveal command (`workbench.view.extension.debrief-sidebar`) via Playwright in `tests/e2e/test-webview-probe.spec.ts`
- [x] T003 Inspect openvscode-server `workbench.js` for webview view resolution gate (visibility check)
- [x] T004 Document root cause findings in `specs/142-vscode-e2e-webview-reliability/evidence/root-cause-analysis.md`

**Checkpoint**: Root cause identified with evidence — solution approach selected.

---

## Phase 2: Solution Validation (US2 — Priority: P2)

**Goal**: Get one previously-skipped test (`test-load-display.spec.ts`) passing with real extension webview content.

**Independent Test**: Run `test-load-display.spec.ts` and confirm real MapView content (`.leaflet-container`) renders inside `#active-frame`.

**Strategy**: Parallel spikes for approaches E (view reveal command), A (patch workbench.js), B (upgrade openvscode-server). Commit to winner after viability check.

### Spike E — View Reveal Command

- [x] T005 Add `revealSidebar()` method to `tests/e2e/models/code-server-page.ts` that executes `workbench.view.extension.debrief-sidebar`
- [x] T006 Test sidebar reveal triggers `resolveWebviewView` in `tests/e2e/test-webview-probe.spec.ts`

### Spike A — Patch workbench.js

- [x] T007 Identify visibility gate pattern in `workbench.js` using regex/structural matching
- [x] T008 Add blocker 4 patch to `tests/e2e/scripts/patch-webview.sh`

### Spike B — Upgrade openvscode-server (if needed)

- [x] T009 Test latest stable openvscode-server with existing patches (skipped — Spike A succeeded)

### Validation

- [x] T010 Unskip `tests/e2e/test-load-display.spec.ts` — remove skip annotations, verify real webview content renders
- [x] T011 Capture screenshot of real webview content as validation evidence

**Checkpoint**: One previously-skipped test passes with real extension content.

---

## Phase 3: Test Suite Activation (US3 — Priority: P3)

**Goal**: Unskip at least 5 previously-skipped test files and update CI infrastructure.

**Independent Test**: Run the full VS Code E2E suite and confirm at least 5 previously-skipped spec files execute their assertions (pass or `test.fixme()`).

### Patch Hardening

- [x] T012 Add version guards to ALL existing patches in `tests/e2e/scripts/patch-webview.sh` — exit 1 if expected pattern not found
- [x] T013 Make all patches idempotent (running twice produces same result) in `tests/e2e/scripts/patch-webview.sh`

### Test File Activation

- [x] T014 [P] Unskip `tests/e2e/test-analysis-tool.spec.ts` — remove skip, convert missing features to `test.fixme()` with backlog refs
- [x] T015 [P] Unskip `tests/e2e/test-error-feedback.spec.ts` — remove skip, convert missing features to `test.fixme()`
- [x] T016 [P] Unskip `tests/e2e/test-catalog-browse.spec.ts` — remove skip, convert missing features to `test.fixme()`
- [x] T017 [P] Unskip `tests/e2e/test-tune-prov.spec.ts` — remove skip, convert missing features to `test.fixme()`
- [x] T018 [P] Unskip additional test files as solution proves reliable

### Infrastructure Updates

- [x] T019 Clean up obsolete functions in `tests/e2e/helpers/webview-injector.ts` after fix validated
- [x] T020 Update skip conditions in `tests/e2e/models/debrief-webview.ts` to reflect new readiness model
- [x] T021 Add sidebar toggle test for webview disposal/re-creation in `tests/e2e/test-webview-resolve.spec.ts`

### CI Workflow Updates

- [x] T022 Add CI smoke check in `.github/workflows/e2e.yml` — verify `patch-webview.sh` exits 0 and prints success markers
- [x] T023 Verify both web-shell and VS Code E2E suites run as parallel CI jobs within 25-minute timeout

**Checkpoint**: At least 5 previously-skipped test files now execute. CI workflow updated.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Document the solution, capture evidence, and create media content.

### Documentation

- [x] T024 Update `docs/project_notes/webview-e2e-research.md` with complete resolution findings, reproduction steps, and evidence
- [x] T025 Update `specs/142-vscode-e2e-webview-reliability/quickstart.md` with validated reproduction steps

### Evidence Collection (REQUIRED)

> **Purpose**: Capture artifacts for PR description and future documentation.

- [x] T026 Capture test summary using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/142-vscode-e2e-webview-reliability/evidence/test-summary.md`
- [x] T027 Create usage demonstration in `specs/142-vscode-e2e-webview-reliability/evidence/usage-example.md`
- [x] T028 [P] Capture patch configuration sample in `specs/142-vscode-e2e-webview-reliability/evidence/config-sample.sh`
- [x] T029 [P] Capture CI-like validation output in `specs/142-vscode-e2e-webview-reliability/evidence/validation-output.txt`

### Media Content

- [x] T030 Create shipped blog post in `specs/142-vscode-e2e-webview-reliability/media/shipped-post.md`
- [x] T031 [P] Create LinkedIn shipped summary in `specs/142-vscode-e2e-webview-reliability/media/linkedin-shipped.md`

### PR Creation

- [ ] T032 Create PR and publish blog: run /speckit.pr

**Task T032 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Root Cause Investigation)**: No dependencies — start immediately
- **Phase 2 (Solution Validation)**: Depends on Phase 1 findings informing which spike to prioritise
- **Phase 3 (Test Suite Activation)**: Depends on Phase 2 producing a validated solution
- **Phase 4 (Polish)**: Depends on Phases 1-3 completion

### Within-Phase Dependencies

- **Phase 1**: T001-T003 are investigation tasks (can run in parallel); T004 depends on findings from T001-T003
- **Phase 2**: Spikes E/A/B can run in parallel; T010-T011 depend on at least one spike succeeding
- **Phase 3**: T012-T013 (patch hardening) should complete before T014-T018 (test activation); T014-T018 are parallel; T019-T021 depend on test activation; T022-T023 depend on all Phase 3 tasks

### Parallel Opportunities

```
Phase 1: T001, T002, T003 can run in parallel (independent investigations)
Phase 2: Spikes E (T005-T006), A (T007-T008), B (T009) can run in parallel
Phase 3: T014, T015, T016, T017, T018 can run in parallel (independent test files)
Phase 3: T028, T029 can run in parallel (independent evidence artifacts)
Phase 4: T030, T031 can run in parallel (content creation)
```

---

## Implementation Strategy

### Incremental Delivery

1. Complete Phase 1 → Root cause documented
2. Complete Phase 2 → One test passing with real content (proof of concept)
3. Complete Phase 3 → At least 5 tests activated, CI updated
4. Complete Phase 4 → Evidence captured, PR created

### Research Sprint Adaptations

This is a research sprint — the implementation may diverge from plan based on findings:

- If Spike E works → Spikes A and B become unnecessary (T007-T009 can be skipped)
- If Spike E fails but Spike A works → Spike B unnecessary
- If all spikes fail → Fallback to real VS Code in xvfb (new tasks would be needed)
- Tests that reveal missing extension features → Convert to `test.fixme()`, not `test.skip()`

> **PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tests because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Full details: `docs/project_notes/playwright-installation-research.md`

---

## Notes

- [P] tasks = different files, no dependencies
- Tests ARE the deliverable — every phase produces verifiable test output
- Skip annotations MUST be removed (not replaced with `test.fail()` which is not a Playwright API)
- Use `test.fixme()` only for genuinely unimplemented extension features, with backlog cross-references
- All patches MUST include version guards per the Patch Contract in `contracts/webview-lifecycle.md`
- Run `/speckit.pr` after all tasks complete to create PR with evidence
