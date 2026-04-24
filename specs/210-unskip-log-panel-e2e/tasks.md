# Tasks: Reactivate Webview Log-Panel E2E Suite

**Feature**: 210 — Un-skip webview log-panel E2E suite
**Branch**: `210-unskip-log-panel-e2e`
**Input**: Design documents from `/specs/210-unskip-log-panel-e2e/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅
**Tests**: The feature *is* a test suite. Tests are not written before implementation in the usual sense — they are the implementation.

**Organization**: Tasks are grouped by user story so each increment (reactivation → lint guard → parity scenarios) can ship independently.

---

## Evidence Requirements

> **Purpose**: Capture artefacts that prove the reactivated suite exercises the real integration path, satisfies SC-001 through SC-006, and remains stable across 10 consecutive CI runs.

**Evidence Directory**: `specs/210-unskip-log-panel-e2e/evidence/`
**Media Directory**: `specs/210-unskip-log-panel-e2e/media/`

### Planned Artefacts

| Artefact | Description | Captured When | Maps To |
|----------|-------------|---------------|---------|
| `evidence/test-summary.md` | pytest+vitest+Playwright totals with YAML front matter (uses `.specify/templates/evidence/test-summary-template.md`) | After full CI verification | SC-002, FR-001 |
| `evidence/usage-example.md` | `npx playwright test test-log-panel.spec.ts` command + expected 5-scenario output transcript | After all 5 scenarios pass locally | User Story 1 Independent Test |
| `evidence/e2e-run-report.md` | Playwright HTML-report summary (pass/fail table, wall-clock per scenario, 10-run median) | After first 10 consecutive CI runs on `main` | SC-002, SC-005 |
| `evidence/trace-artefact.zip` | Playwright trace from one representative scenario (click-to-select) showing webview iframe navigation | From a successful CI run | SC-004 |
| `evidence/contrived-regression-spike.md` | Evidence that removing `[data-testid="log-panel"]` on a spike branch produces a loud failure with trace + screenshot | During Polish (local spike) | SC-003 |
| `evidence/parity-diff.md` | Side-by-side scenario list: VS Code suite vs `apps/web-shell/playwright/tests/log-panel.spec.ts` | During Polish | SC-006, FR-006 |
| `evidence/skip-guard-proof.md` | Transcript showing the FR-011 lint guard failing when `.fixme` is temporarily reintroduced and passing once removed | After lint guard lands | FR-011, User Story 2 |
| `evidence/opening-context.md` | Cached blog opener (already produced during `/speckit.plan`) — feeds the first three sections of `media/shipped-post.md` | Already captured | — |
| `media/shipped-post.md` | Feature post combining cached opener with ship-time evidence | During Polish (Content Specialist) | Blog publication |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence directory and test-summary | Final Polish task |
| Blog PR | PR in `debrief/debrief.github.io` with `shipped-post.md` | Triggered by `/speckit.pr` |

### Feature Type

**Integration / Test Infrastructure.** Per the Quality Rubric, minimum evidence = end-to-end flow documentation + sequence diagram. `parity-diff.md` provides the flow comparison; `contrived-regression-spike.md` provides the spike-verification proof. No UI component screenshots are required (plan.md "Media Components" = None).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the #143/#176 prerequisites are live and establish a baseline run of the neighbouring active suites before mutating anything.

No new dependencies, no new config files, no new scripts. Research R1 already confirmed every helper and DOM hook this feature asserts against — these tasks are a belt-and-braces sanity check so any later failure is unambiguously our fault.

- [x] T001 Run the existing active-suite baseline once locally to prove the harness is green on this branch before any mutation `tests/e2e/`
- [x] T002 [P] Confirm `getLogPanelFrame()` exists and resolves the webview iframe via `findWebviewFrameByContent` per R1 `tests/e2e/models/code-server-page.ts`
- [x] T003 [P] Confirm `LogPanel.tsx` still emits `[data-testid="log-panel"]`, `[data-testid="log-panel-empty-no-entries"]`, and `.log-panel__entry` selectors per R1 `shared/components/src/LogPanel/LogPanel.tsx`
- [x] T004 [P] Confirm `LogEntry.tsx` still applies `log-panel__entry--selected` when selected per R1 and R4 `shared/components/src/LogPanel/LogEntry.tsx`

**Checkpoint**: Prerequisites verified; any subsequent failure is attributable to this feature's edits, not to upstream drift.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: None required — this feature edits a single test file and (optionally) adds a lint rule. No shared code, no shared helpers, no schemas.

Per plan.md Structure Decision, `tests/e2e/fixtures/base.ts`, `tests/e2e/models/code-server-page.ts`, `tests/e2e/playwright.config.ts`, and the LogPanel component source all remain **UNCHANGED**.

> **No tasks in this phase.** Proceed directly to User Story 1.

**Checkpoint**: Foundation not required — user stories can begin immediately after Phase 1.

---

## Phase 3: User Story 1 — Log-Panel Integration Path Is Guarded by CI (Priority: P1)

**Goal**: Convert the `test.describe.fixme(...)` block into an active `test.describe(...)` so the three existing scenarios (empty state, entry creation, ordering) run in every default CI E2E job and fail loudly on integration-path regressions.

**Independent Test**: Run `npx playwright test test-log-panel.spec.ts` against openvscode-server locally. Three scenarios execute with no `fixme` annotation, all pass, each produces a Playwright trace artefact on retry.

### Implementation for User Story 1

- [x] T005 [US1] Flip `test.describe.fixme(...)` → `test.describe(...)` in the suite header `tests/e2e/test-log-panel.spec.ts`
- [x] T006 [US1] Strip residual blocked-state comments (e.g. "blocked by #143", "Feature 176 decision 9A", any references to the prior `fixme` rationale) per FR-008 `tests/e2e/test-log-panel.spec.ts`
- [x] T007 [US1] Verify the suite file matches the sibling-suite header convention (header comment describing the target, fixtures import, `test.describe` block) per FR-009 `tests/e2e/test-log-panel.spec.ts`
- [ ] T008 [US1] Run the suite locally and confirm the three existing scenarios pass `tests/e2e/test-log-panel.spec.ts`
- [ ] T009 [US1] Capture a Playwright trace artefact from one successful scenario (click through the trace viewer to confirm it navigates into a webview URL, satisfying SC-004) `specs/210-unskip-log-panel-e2e/evidence/trace-artefact.zip`

**Checkpoint**: User Story 1 is fully functional — the three reactivated scenarios guard the integration path. US2 and US3 can now proceed.

### Parallel Opportunities (US1)

None within US1 — T005 → T006 → T007 all mutate the same file and must run serially. T008 depends on T005–T007. T009 depends on T008.

---

## Phase 4: User Story 2 — Reviewers Get Visible Signal, Not Silent Skips (Priority: P2)

**Goal**: Lock in the reactivation by adding a CI-gated lint check that fails if `test.skip(`, `test.fixme(`, `test.describe.skip(`, or `test.describe.fixme(` ever re-appears in `tests/e2e/test-log-panel.spec.ts`. This makes US2 machine-verifiable rather than review-vigilance-dependent.

**Independent Test**: Temporarily re-introduce `test.describe.fixme(...)` on a throwaway branch, run `task lint` (or `pnpm lint` depending on implementation path), confirm it exits non-zero with a clear error pointing at the offending file and line.

### Implementation for User Story 2 (FR-011 skip-guard)

- [x] T010 [US2] Decide the implementation path: grep step in Taskfile `lint` target, OR ESLint `no-restricted-syntax` rule scoped via `overrides` to `tests/e2e/test-log-panel.spec.ts`. Record the choice in `specs/210-unskip-log-panel-e2e/evidence/skip-guard-proof.md`
- [x] T011 [US2] Implement the chosen skip-guard. For the Taskfile path, add a task step that runs `! grep -nE '^\s*test(\.describe)?\.(skip|fixme)\s*\(' tests/e2e/test-log-panel.spec.ts` (exits non-zero on match) `Taskfile.yml` **OR** for the ESLint path, add a `no-restricted-syntax` override block keyed on the spec file with selectors `CallExpression[callee.object.property.name='skip']` / `='fixme'` and their `describe` variants `eslint.config.*`
- [x] T012 [US2] Negative test: temporarily add `test.fixme('x', async () => {});` to the suite, run the lint step, confirm failure with a clear error `tests/e2e/test-log-panel.spec.ts`
- [x] T013 [US2] Revert the temporary `.fixme` and confirm the lint step passes `tests/e2e/test-log-panel.spec.ts`
- [x] T014 [US2] Capture the negative/positive transcripts in `specs/210-unskip-log-panel-e2e/evidence/skip-guard-proof.md`

**Checkpoint**: US2 locks US1 in place. Any future PR that reintroduces a skip or fixme on this suite will fail CI lint rather than silently reducing coverage.

### Parallel Opportunities (US2)

None — T010 → T011 → T012 → T013 → T014 form a strict serial dependency chain.

---

## Phase 5: User Story 3 — Coverage Parity with Web-Shell Suite (Priority: P3)

**Goal**: Add two scenarios (click-to-select, click-to-deselect) mirroring the parity baseline at `apps/web-shell/playwright/tests/log-panel.spec.ts`. Both scenarios MUST use `toHaveClass(/selected/)` regex assertions per FR-010, and MUST NOT assert against `aria-selected` (that is #209's scope per R4).

**Independent Test**: Run `npx playwright test test-log-panel.spec.ts`. Five scenarios execute; Scenario D asserts the `log-panel__entry--selected` class appears after one click; Scenario E asserts the class clears after a second click. Wall-clock median across 10 runs stays ≤ 90 s (SC-005).

### Implementation for User Story 3

- [x] T015 [US3] Add Scenario D — "clicking a log entry selects it": open plot via `openPlotViaStacTree`, run a tool to create at least one entry, focus the log frame via `getLogPanelFrame()`, click `.log-panel__entry` first match, assert `toHaveClass(/selected/)` per FR-010 `tests/e2e/test-log-panel.spec.ts`
- [x] T016 [US3] Add Scenario E — "clicking a selected log entry deselects it": extend D's setup, click the same entry a second time, assert `not.toHaveClass(/selected/)` per FR-010 `tests/e2e/test-log-panel.spec.ts`
- [ ] T017 [US3] Run the full 5-scenario suite locally and confirm all pass `tests/e2e/test-log-panel.spec.ts`
- [ ] T018 [US3] Measure wall-clock median across 3 back-to-back local runs; confirm ≤ 90 s (informs SC-005 post-merge 10-run measurement) `tests/e2e/test-log-panel.spec.ts`
- [x] T019 [US3] Confirm no page-model additions were introduced per R6 and FR-003 `tests/e2e/models/code-server-page.ts`

**Checkpoint**: All three user stories shipped. Suite has 5 active scenarios matching the web-shell parity baseline.

### Parallel Opportunities (US3)

None — T015 → T016 mutate the same file; T017 depends on both; T018 depends on T017; T019 is a diff-style verification after T015/T016 land.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence proving SC-001 through SC-006, document web-shell parity, run the contrived-regression spike (SC-003), write the feature blog post, and open the PR.

### Evidence Collection (REQUIRED)

- [x] T020 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter including `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, and a `coverage_pct` entry of `N/A — E2E integration suite, not unit-coverage-measured` `specs/210-unskip-log-panel-e2e/evidence/test-summary.md`
- [x] T021 [P] Create usage demonstration — local invocation commands, expected 5-scenario output transcript, interpretation guide for trace artefacts `specs/210-unskip-log-panel-e2e/evidence/usage-example.md`
- [x] T022 [P] Capture Playwright HTML report summary — per-scenario wall-clock, pass/fail table, initial baseline median (will be updated after 10 CI runs post-merge) `specs/210-unskip-log-panel-e2e/evidence/e2e-run-report.md`
- [x] T023 [P] Produce parity-diff document — side-by-side scenario table comparing VS Code suite to `apps/web-shell/playwright/tests/log-panel.spec.ts`, with one row per user-observable behaviour (empty state, entry creation, ordering, selection, deselection) satisfying SC-006 `specs/210-unskip-log-panel-e2e/evidence/parity-diff.md`

### Regression-Spike Verification (SC-003)

- [ ] T024 On a throwaway spike branch, remove `[data-testid="log-panel"]` from `LogPanel.tsx` and run the suite locally; confirm loud failure with screenshot + trace artefact within the inherited timeout `shared/components/src/LogPanel/LogPanel.tsx`
- [x] T025 Document the spike evidence — screenshot of failure output, trace file name, restore-to-green confirmation `specs/210-unskip-log-panel-e2e/evidence/contrived-regression-spike.md`

### Integration-Flow Diagram (Integration feature type)

- [x] T026 [P] Produce a Mermaid sequence diagram showing the runtime path: Playwright runner → openvscode-server → VS Code extension host → sidebar webview → LogPanel DOM → assertion `specs/210-unskip-log-panel-e2e/evidence/sequence.mermaid`

### Media Content

- [x] T027 Create feature blog post via the Content Specialist agent (`.claude/agents/media/content.md`). First three sections (What We're Building, How It Fits, Key Decisions) copied verbatim from `specs/210-unskip-log-panel-e2e/evidence/opening-context.md`; remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from evidence artefacts `specs/210-unskip-log-panel-e2e/media/shipped-post.md`

### Pre-Push Verification

- [ ] T028 Run full CI check locally per CLAUDE.md "Before Pushing" — `task verify` (or the four-step fallback: ruff+pnpm lint, pyright+pnpm typecheck, pytest+pnpm test, full E2E via `run-playwright.mjs`) `.`

### PR Creation

- [ ] T029 Create PR and publish blog: run `/speckit.pr`

**Task T029 must run last.** It depends on all evidence (T020–T023, T025, T026), the spike verification (T024), the media post (T027), and the local verification pass (T028).

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No upstream dependencies. T001 is serial; T002/T003/T004 are file-read sanity checks and can run in parallel with each other (all marked `[P]`).
- **Phase 2 (Foundational)**: Empty — no blocking work.
- **Phase 3 (US1)**: Depends on Phase 1. All US1 tasks mutate or read the same file and run serially.
- **Phase 4 (US2)**: Depends on US1 completion (so the lint guard's current-state positive test in T013 passes against the cleaned-up source). Tasks run serially within the phase.
- **Phase 5 (US3)**: Depends on US1 completion (new scenarios are appended to the reactivated suite). Independent of US2 — US2 and US3 *could* run in parallel if two contributors are working in parallel, but the single-file nature of the spec change makes that impractical.
- **Phase 6 (Polish)**: Depends on US1 + US2 + US3 completion.

### Task-Level Order (Strict)

```text
T001 → T002, T003, T004 (parallel)      Setup
     ↓
T005 → T006 → T007 → T008 → T009          US1 reactivation
     ↓
T010 → T011 → T012 → T013 → T014          US2 skip-guard
     ↓
T015 → T016 → T017 → T018 → T019          US3 parity scenarios
     ↓
T020, T021 [P], T022 [P], T023 [P]        Polish evidence
T024 → T025                                Spike verification
T026 [P]                                   Sequence diagram
T027                                       Feature post
T028                                       Local CI verification
T029                                       /speckit.pr (final)
```

### User-Story Independence

- **US1 alone** delivers the P1 intent (three scenarios un-skipped, integration-path guarded). Ship-worthy on its own.
- **US2 alone** is a no-op unless US1 has landed, since the guard's positive test requires a skip-free source file.
- **US3 alone** delivers the P3 parity coverage and can ship with or without US2 — they address orthogonal concerns.

---

## Implementation Strategy

### Incremental Delivery

This feature is small — ~80–120 lines of edit across one test file, one lint-config tweak, one blog post, and the evidence bundle. But each user story is separately shippable:

1. **Ship US1 first** (T001–T009). This is the core backlog item: three scenarios un-skipped, guarding the integration path. A reviewer can verify by running the suite locally and seeing three green ticks where they previously saw three "pending" markers.
2. **Ship US2 next** (T010–T014). The FR-011 skip-guard hardens US1. If the implementer finds the Taskfile `grep` path simpler than the ESLint override, choose that — research left the choice open to whichever matches existing lint wiring.
3. **Ship US3 last** (T015–T019). The two parity scenarios close the gap vs the web-shell suite. They're additive, they don't touch the three US1 scenarios, and they have a tight SC-005 budget that is measured empirically against the reactive-trigger rule defined in research.md § R2.
4. **Polish together** (T020–T029). Evidence, spike, diagram, media, lint/typecheck/test pass, then `/speckit.pr`.

All four steps can happen in a single PR; the story split is for ordered reasoning and review, not for staggered merges.

### Parallel Execution Examples

**Phase 1 — file-read sanity checks in parallel**:

```text
# After T001 completes, launch the three confirmations together:
Task: "Confirm getLogPanelFrame() in code-server-page.ts"
Task: "Confirm data-testid selectors in LogPanel.tsx"
Task: "Confirm log-panel__entry--selected in LogEntry.tsx"
```

**Phase 6 — evidence files in parallel** (after US1+US2+US3 land):

```text
# T021, T022, T023, T026 all write to different files and read from the same completed suite:
Task: "Write usage-example.md"
Task: "Write e2e-run-report.md"
Task: "Write parity-diff.md"
Task: "Write sequence.mermaid"
```

### Reactive Triggers (from research.md)

Two monitoring rules activate after merge and drive *future* work, not tasks in this PR:

- **SC-005 performance**: If 10-run median on `main` exceeds 85 s, open a tracking issue; if it exceeds 90 s, consolidate Scenarios D + E into a single `test(...)` body.
- **R5 flakiness**: If the suite shows 2 consecutive main-branch failures within 24 h, OR ≥ 3 failures in the last 10 main runs, revert to `test.describe.fixme(...)` in the fastest-available PR and file a new blocker ticket.

These rules live in research.md and are referenced by the post-merge monitoring practice — they do not generate tasks to execute during this PR.

### Notes

- **Do not add** bespoke helpers to `code-server-page.ts` (R6, FR-003).
- **Do not override** `retries`, `timeout`, `trace`, or screenshot config at suite level (R3, FR-004, FR-005).
- **Do not assert** on `aria-selected` — that is #209's scope (R4, FR-010).
- **Do not expand scope** to reactivate the four sibling `.skip` suites — they have separate blockers (debrief-calc availability, edit-face stability, event-log propagation coupling) and are explicitly out of scope per R5.
- **Do commit** after each logical group (US1 done, US2 done, US3 done, evidence done). Stop at any checkpoint to validate the story independently.
