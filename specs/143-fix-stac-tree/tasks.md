# Tasks: Fix STAC Tree E2E Test Reliability

**Input**: Design documents from `/specs/143-fix-stac-tree/`
**Prerequisites**: plan.md, spec.md, research.md
**Review Decisions**: 1A, 2A, 3A, 4A, 5A, 6C, 7A, 8B, 9A, 10B, 11A, 12A

---

## Evidence Requirements

**Evidence Directory**: `specs/143-fix-stac-tree/evidence/`
**Media Directory**: `specs/143-fix-stac-tree/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| test-summary.md | E2E test results across all batches | After all batches pass |
| usage-example.md | Before/after comparison of openPlotViaStacTree flow | After rewrite complete |
| config-sample.json | CI config pre-seed format | After foundation complete |
| validation-output.txt | CI E2E run output showing 0 skipped suites | After all batches pass |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| media/planning-post.md | Blog post announcing the feature | During /speckit.plan |
| media/linkedin-planning.md | LinkedIn summary for planning | During /speckit.plan |
| media/shipped-post.md | Blog post celebrating completion | During Polish phase |
| media/linkedin-shipped.md | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with post | Triggered by /speckit.pr |

---

## Phase 1: Foundation — Rewrite Core Page Object Methods

**Purpose**: Rewrite the STAC tree helpers in `CodeServerPage` to use command-based focus, positive signal waits, and inline diagnostics. Remove the fragile `seedConfigAndReload()` fallback.

**Review decisions applied**: 1A (positive signal), 2A (command-based focus), 3A (inline diagnostics), 5A (merge focus+expand), 6C (remove seedConfigAndReload), 7A (error messages), 12A (signal-based waits)

### Implementation

- [ ] T001 [US1] Merge `focusStacView()` + `ensureStacPaneExpanded()` into `focusAndExpandStacPane()` using command palette (e.g. "Focus on STAC Stores View") mirroring the `revealSidebar()` pattern `tests/e2e/models/code-server-page.ts`
- [ ] T002 [US1] Rewrite `waitForExtensionReady()` to wait for positive signal (first `.monaco-list-row` inside STAC pane) instead of polling for "Loading stores" text absence `tests/e2e/models/code-server-page.ts`
- [ ] T003 [US1] Remove `seedConfigAndReload()` method entirely — fail fast if config is missing `tests/e2e/models/code-server-page.ts`
- [ ] T004 [US1] Rewrite `openPlotViaStacTree()` to use new `focusAndExpandStacPane()`, remove `seedConfigAndReload` fallback branch, use signal-based waits instead of `waitForTimeout()`, add diagnostic screenshots on each failure path with meaningful error messages `tests/e2e/models/code-server-page.ts`
- [ ] T005 [US1] Add private `captureTreeDiagnostics(stage: string)` method that screenshots and dumps all `.monaco-list-row` text contents for debugging `tests/e2e/models/code-server-page.ts`
- [ ] T006 [US1] Run typecheck on changed file: `pnpm -r typecheck` `tests/e2e/models/code-server-page.ts`

**Checkpoint**: Core page object rewritten. Tree navigation uses command-based focus and positive signals. No fragile terminal automation.

---

## Phase 2: User Story 3 — Command-Based Fallback

**Goal**: Add `openPlotViaCommand()` method that uses the existing `debrief.openPlot` command as an alternative to tree navigation.

**Independent Test**: Call `openPlotViaCommand('Exercise Alpha')` and verify webview loads.

**Review decision applied**: 4A (reuse existing command), 9A (one test exercises fallback)

### Implementation

- [ ] T007 [US3] Add `openPlotViaCommand(plotName: string)` method to `CodeServerPage` that invokes "Debrief: Open Plot" via command palette and selects the named plot `tests/e2e/models/code-server-page.ts`
- [ ] T008 [US3] Run typecheck: `pnpm -r typecheck` `tests/e2e/models/code-server-page.ts`

**Checkpoint**: Both tree-based and command-based plot opening available. All 15 tests will use tree path (9A); command fallback exists for resilience.

---

## Phase 3: User Story 1 — Re-enable Batch 1 (Directly Blocked by #143)

**Goal**: Remove `.skip` from the 8 test files explicitly tagged as blocked by `#143`.

**Independent Test**: Run these 8 test files in CI and verify they pass.

**Review decision applied**: 10B (re-enable in batches), 9A (all use tree path)

### Implementation

- [ ] T009 [P] [US1] Remove `.skip` from `test-load-display.spec.ts` `tests/e2e/test-load-display.spec.ts`
- [ ] T010 [P] [US1] Remove `.skip` from `test-catalog-browse.spec.ts` `tests/e2e/test-catalog-browse.spec.ts`
- [ ] T011 [P] [US1] Remove `.skip` from `test-drawing.spec.ts` `tests/e2e/test-drawing.spec.ts`
- [ ] T012 [P] [US1] Remove `.skip` from `test-selection-sync.spec.ts` `tests/e2e/test-selection-sync.spec.ts`
- [ ] T013 [P] [US1] Remove `.skip` from `test-analysis-tool.spec.ts` `tests/e2e/test-analysis-tool.spec.ts`
- [ ] T014 [P] [US1] Remove `.skip` from `test-real-webview.spec.ts` `tests/e2e/test-real-webview.spec.ts`
- [ ] T015 [P] [US1] Remove `.skip` from `test-time-controller.spec.ts` `tests/e2e/test-time-controller.spec.ts`
- [ ] T016 [P] [US1] Remove `.skip` from `test-error-feedback.spec.ts` (single `test.skip`, not `describe.skip`) `tests/e2e/test-error-feedback.spec.ts`
- [ ] T017 [US1] Run full CI verification: `task verify`
- [ ] T018 [US1] Fix any secondary failures in batch 1 test files (stale selectors, changed APIs, etc.)

**Checkpoint**: 8 directly-blocked test suites re-enabled and passing.

---

## Phase 4: User Story 1 — Re-enable Batch 2 (Indirectly Blocked)

**Goal**: Remove `.skip` from the remaining 7 test files that were skipped without explicit `#143` tag.

**Independent Test**: Run these 7 test files in CI and verify they pass.

### Implementation

- [ ] T019 [P] [US1] Remove `.skip` from `test-tune-prov.spec.ts` `tests/e2e/test-tune-prov.spec.ts`
- [ ] T020 [P] [US1] Remove `.skip` from `test-log-panel.spec.ts` `tests/e2e/test-log-panel.spec.ts`
- [ ] T021 [P] [US1] Remove `.skip` from `test-capture-log-evidence.spec.ts` `tests/e2e/test-capture-log-evidence.spec.ts`
- [ ] T022 [P] [US1] Remove `.skip` from `test-undo-redo-split.spec.ts` `tests/e2e/test-undo-redo-split.spec.ts`
- [ ] T023 [P] [US1] Remove `.skip` from `test-styling-tools.spec.ts` `tests/e2e/test-styling-tools.spec.ts`
- [ ] T024 [P] [US1] Remove `.skip` from `test-event-log-propagation.spec.ts` `tests/e2e/test-event-log-propagation.spec.ts`
- [ ] T025 [P] [US1] Remove `.skip` from `test-log-edit-face.spec.ts` `tests/e2e/test-log-edit-face.spec.ts`
- [ ] T026 [US1] Run full CI verification: `task verify`
- [ ] T027 [US1] Fix any secondary failures in batch 2 test files

**Checkpoint**: All 15 previously-skipped test suites re-enabled and passing. Zero `.skip` annotations related to STAC tree.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Evidence collection, media content, and PR creation.

### Verification

- [ ] T028 Run full CI verification with all tests enabled: `task verify`
- [ ] T029 Update spec.md to correct "18 test suites" to "15 test files" and update FR-001 timeout target per review decision 11A (50s worst case, split tree-nav vs webview-load)

### Evidence Collection

- [ ] T030 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/143-fix-stac-tree/evidence/test-summary.md`
- [ ] T031 Create usage demonstration showing before/after of `openPlotViaStacTree()` flow in `specs/143-fix-stac-tree/evidence/usage-example.md`
- [ ] T032 [P] Capture CI config sample in `specs/143-fix-stac-tree/evidence/config-sample.json`
- [ ] T033 [P] Capture CI E2E validation output in `specs/143-fix-stac-tree/evidence/validation-output.txt`

### Media Content

- [ ] T034 Create shipped blog post in `specs/143-fix-stac-tree/media/shipped-post.md`
- [ ] T035 [P] Create LinkedIn shipped summary in `specs/143-fix-stac-tree/media/linkedin-shipped.md`

### PR Creation

- [ ] T036 Create PR and publish blog: run `/speckit.pr`

**Task T036 must run last. It depends on all evidence and media tasks being complete.**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundation)**: No dependencies — rewrite core methods first
- **Phase 2 (Fallback)**: Depends on Phase 1 (needs updated page object)
- **Phase 3 (Batch 1)**: Depends on Phase 1 (needs working `openPlotViaStacTree()`)
- **Phase 4 (Batch 2)**: Depends on Phase 3 passing (confirms fix works before expanding scope)
- **Phase 5 (Polish)**: Depends on Phases 3 + 4 (all tests passing)

### Critical Path

```
Phase 1 (rewrite) → Phase 3 (batch 1) → Phase 4 (batch 2) → Phase 5 (polish)
                  ↘ Phase 2 (fallback) ↗
```

Phase 2 can run in parallel with Phase 3 since it adds a new method (no conflicts).

### Parallel Opportunities

- T009–T016: All `.skip` removals in batch 1 are independent
- T019–T025: All `.skip` removals in batch 2 are independent
- T032–T033: Evidence artifacts can be captured in parallel
- T034–T035: Media content can be created in parallel

---

## Implementation Strategy

### Incremental Delivery

1. Rewrite page object methods (Phase 1) → Core fix in place
2. Add command fallback (Phase 2) → Safety net available
3. Re-enable batch 1 (#143-tagged tests) → Validate fix with most critical tests
4. Fix any secondary failures in batch 1 → Ensure clean baseline
5. Re-enable batch 2 (remaining tests) → Full coverage restored
6. Fix any secondary failures in batch 2 → All green
7. Evidence + media + PR (Phase 5) → Ship it

### Key Design Decisions (from review)

| Decision | What | Why |
|----------|------|-----|
| 1A | Positive signal wait | "Loading stores" text absence is a false positive when pane isn't visible |
| 2A | Command-based focus | Mirrors proven `revealSidebar()` pattern; reliable in openvscode-server |
| 3A | Inline diagnostics | DRY with existing screenshot captures; no new file |
| 4A | Reuse `debrief.openPlot` | No production code changes needed for test infrastructure |
| 5A | Merge focus+expand | Two methods doing overlapping work; command focus already expands |
| 6C | Remove seedConfigAndReload | Fail fast if environment isn't set up properly |
| 7A | Updated error messages | Error messages should reflect actual recovery steps attempted |
| 9A | All tests use tree path | Maximizes CI coverage of the actual fix |
| 10B | Re-enable in batches | Isolates secondary failures from the core fix |
| 11A | 50s worst case | Split target: tree-nav (<20s) + webview-load (<25s) |
| 12A | Signal-based waits | Remove gratuitous `waitForTimeout()` calls |

---

## Notes

- [P] tasks = different files, no dependencies
- [US1/US3] label maps task to specific user story
- Batch 1 = 8 files explicitly tagged `#143`; Batch 2 = 7 files without explicit tag
- T018/T027 are buffer tasks for fixing secondary failures discovered during re-enablement
- The `test-error-feedback.spec.ts` file has a single `test.skip` (not `describe.skip`) — handle differently
- **Playwright note**: Use `node apps/web-shell/run-playwright.mjs` to extract Chromium in cloud/CI
- Run `/speckit.pr` after all tasks complete to create PR with evidence
