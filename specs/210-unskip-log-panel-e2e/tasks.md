---
description: "Task list — Feature 210: Un-skip Webview Log-Panel E2E Suite"
---

# Tasks: Un-skip Webview Log-Panel E2E Suite

**Input**: Design documents from `/specs/210-unskip-log-panel-e2e/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), quickstart.md (✅). No data-model.md / contracts/ (test-infrastructure feature — intentionally omitted).

**Tests**: The tests are the **subject** of this feature — they already exist in `tests/e2e/test-log-panel.spec.ts`. No new test authorship. The work is reactivation + verification + evidence.

**Organization**: Tasks are grouped by user story, matching the three priorities from spec.md:

- **US1 (P1)** — Log-panel webview integration continuously verified in CI
- **US2 (P2)** — Dead-marker hygiene (no references to resolved blockers)
- **US3 (P3)** — Suite stays green across cloud + local preview environments

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the three reactivated tests run and pass. This feature is tagged **Infrastructure** in the Quality Rubric — evidence centres on configuration snippets and validation output rather than screenshots/GIFs.

**Evidence Directory**: `specs/210-unskip-log-panel-e2e/evidence/`
**Media Directory**: `specs/210-unskip-log-panel-e2e/media/` (already contains `planning-post.md` + `linkedin-planning.md` from `/speckit.plan`)

### Planned Artifacts

| Artifact | Description | Feature-Rubric Type | Captured When |
|----------|-------------|---------------------|---------------|
| `evidence/test-summary.md` | YAML front matter + counts + key-scenarios block per `.specify/templates/evidence/test-summary-template.md` | **Required (all features)** | After US1 + US3 complete |
| `evidence/usage-example.md` | The reviewer-facing "how to run the reactivated suite" demo | **Required (all features)** | After US1 complete |
| `evidence/playwright-run.txt` | Raw terminal transcript of one passing Playwright invocation (3 tests / 0 skipped / 0 failed) | **Infrastructure** — validation output | After US1 complete |
| `evidence/stability-run.txt` | Terminal transcript of the three-consecutive-run loop showing 9/9 green | **Infrastructure** — validation output | After US3 complete |
| `evidence/diff.patch` | The one-file `git diff main...HEAD -- tests/e2e/test-log-panel.spec.ts` — audit trail of the reactivation edit | **Infrastructure** — configuration sample | After US1 complete |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning blog post | ✅ Already created (planning phase) |
| `media/linkedin-planning.md` | Planning LinkedIn summary | ✅ Already created (planning phase) |
| `media/shipped-post.md` | Shipped blog post (Content Specialist) | During Polish phase |
| `media/linkedin-shipped.md` | Shipped LinkedIn summary (Content Specialist) | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + backlog update | Final task in Polish phase |
| Blog PR | PR in `debrief.github.io` publishing `shipped-post.md` | Triggered by `/speckit.pr` |

### Feature Type Justification

Per the Quality Rubric, this is an **Infrastructure** feature: "Configuration sample + validation output". The `diff.patch` is the configuration sample (the single-file change); the two `.txt` transcripts are validation output. **No** UI screenshots or interaction GIFs apply — per `plan.md`, this feature has zero visual components.

---

## Phase 1: Setup — Prerequisites Verification

**Purpose**: Confirm the runtime environment has what Playwright needs before touching the test file. Per research.md R6, the cloud runner already discovers the file — but the Chromium binary and code-server preview must be provisioned in the current sandbox.

- [x] T001 Provision bundled Chromium for the sandbox: run `bash tests/e2e/scripts/ensure-chromium.sh` and verify `tests/e2e/.chromium-path` is written `tests/e2e/.chromium-path`
- [x] T002 [P] Confirm the sibling suite `test-analysis-tool.spec.ts` still passes on `main` — establishes the "helpers work" baseline (research.md R2). Run `CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-analysis-tool.spec.ts` and record pass status `tests/e2e/test-analysis-tool.spec.ts`
- [x] T003 [P] Confirm Playwright currently reports `test-log-panel.spec.ts` as **3 pending (fixme)** in a discovery-only run — proves R6 discovery path and gives a before-picture for evidence `tests/e2e/test-log-panel.spec.ts`

**Checkpoint**: Chromium resolved, sibling baseline green, current `fixme` state captured. Ready to reactivate.

---

## Phase 2: Foundation — N/A (intentionally empty)

**Rationale**: No shared code, no data model, no service boundary, no schema change. Production LogPanel components (`shared/components/src/LogPanel/**`), webview wiring (`apps/vscode/src/views/logPanelView.ts`), and the `codeServerPage` helpers (`tests/e2e/models/code-server-page.ts`) all exist on `main` and are read-only for this feature per NFR-001. The template's Foundation phase is kept as a titled placeholder so the phase numbering in research.md / quickstart.md / planning-post.md stays aligned with the tasks file.

**Checkpoint**: No tasks. Proceed directly to Phase 3.

---

## Phase 3: User Story 1 — Reactivate the suite (Priority: P1)

**Goal**: The three tests in `tests/e2e/test-log-panel.spec.ts` execute as active tests and pass against the code-server preview.

**Independent Test**: Run `CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts` — must report `3 passed, 0 skipped, 0 failed, 0 pending` within the per-test timeouts already set in the file (5s / 15s / 15s, per NFR-002).

### Reactivation Edit

- [x] T010 [US1] Delete the three-line stale-blocker comment (lines 11–13) and remove `.fixme` + trailing `// blocked:` comment from the `test.describe` call (line 14) — transforms `test.describe.fixme('Log Panel', () => { // blocked: webview iframe (#143)` into `test.describe('Log Panel', () => {`. No other edit `tests/e2e/test-log-panel.spec.ts`

### First Live Run

- [x] T011 [US1] Run the reactivated file once against the current preview: `CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts`. Capture raw stdout for evidence. If it fails, STOP — do not fall back to `fixme`; invoke the FR-005 / research R7 escape hatch (open new issue) `tests/e2e/test-log-panel.spec.ts`
- [x] T012 [P] [US1] Save the passing terminal transcript to the evidence directory `specs/210-unskip-log-panel-e2e/evidence/playwright-run.txt`
- [x] T013 [P] [US1] Save the one-file reactivation diff for the audit trail: `git diff main...HEAD -- tests/e2e/test-log-panel.spec.ts > specs/210-unskip-log-panel-e2e/evidence/diff.patch` `specs/210-unskip-log-panel-e2e/evidence/diff.patch`

**Checkpoint**: US1 complete — suite is active, a single green run is recorded, SC-002 satisfied.

---

## Phase 4: User Story 2 — Dead-marker hygiene (Priority: P2)

**Goal**: The file contains zero references to `fixme`, `.skip`, or `#143`. Satisfies SC-001 and spec §US2.

**Independent Test**: `grep -E "\.fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts` returns zero matches.

### Hygiene Check

- [x] T020 [US2] Run the SC-001 grep and confirm zero matches: `grep -nE "\.fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts` — exit code must be 1 (no match). If any match remains (e.g. a stray comment survived T010), return to Phase 3 and strip it `tests/e2e/test-log-panel.spec.ts`
- [x] T021 [P] [US2] Confirm `grep -nE "\.fixme|\.skip\b|#143" tests/e2e/test-log-panel.spec.ts` command + its zero-match output is captured in `evidence/playwright-run.txt` (append at the top or bottom) so the hygiene proof lives alongside the run transcript `specs/210-unskip-log-panel-e2e/evidence/playwright-run.txt`

**Checkpoint**: US2 complete — no stale markers survive. SC-001 satisfied.

---

## Phase 5: User Story 3 — Stability across environments (Priority: P3)

**Goal**: The suite passes three consecutive back-to-back runs — no flake. Satisfies SC-003 and spec §US3.

**Independent Test**: A shell loop `for i in 1 2 3; do ... test-log-panel.spec.ts || exit 1; done` completes without failure. Every run reports 3 passed / 0 skipped / 0 failed.

### Three-Run Stability Loop

- [x] T030 [US3] Run the suite three consecutive times against the same preview, aborting on the first failure. Capture a concatenated transcript (all three run outputs labelled `=== Run N ===`). Command: `for i in 1 2 3; do echo "=== Run $i ==="; CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts || exit 1; done 2>&1 | tee specs/210-unskip-log-panel-e2e/evidence/stability-run.txt` `specs/210-unskip-log-panel-e2e/evidence/stability-run.txt`
- [x] T031 [US3] Verify the captured transcript shows exactly 9 passed / 0 skipped / 0 failed across the three runs. If any run fails or flakes (one pass + one fail + one pass), stop — invoke FR-005 (new blocker issue); do not mark SC-003 met `specs/210-unskip-log-panel-e2e/evidence/stability-run.txt`

**Checkpoint**: US3 complete — stability proven. SC-002 + SC-003 both satisfied.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Evidence capture, media content, backlog closure, and PR creation. All tasks gate on Phases 3–5 being complete (three reactivated tests green × 3 runs).

### Evidence Collection (REQUIRED)

- [x] T040 Create the evidence test-summary using the project template: copy `.specify/templates/evidence/test-summary-template.md` to `specs/210-unskip-log-panel-e2e/evidence/test-summary.md`, fill YAML front matter (`feature: "210-unskip-log-panel-e2e"`, `captured_at`, `git_sha`, `tests_passed: 3`, `tests_failed: 0`, `tests_skipped: 0`, `coverage_pct: null`), and write the body: counts, key scenarios verified (one bullet per test in the file), environment note (cloud sandbox / Heroku / local), and a cross-link to `playwright-run.txt` + `stability-run.txt` `specs/210-unskip-log-panel-e2e/evidence/test-summary.md`
- [x] T041 [P] Write the usage-example evidence — reviewer-facing "how to run the reactivated suite" demo based on `quickstart.md` §"How to run the suite" (just the cloud path + expected-output block) `specs/210-unskip-log-panel-e2e/evidence/usage-example.md`
- [x] T042 [P] Verify `evidence/playwright-run.txt` exists (from T012) and contains the "3 passed / 0 failed" line plus the SC-001 grep output appended by T021 `specs/210-unskip-log-panel-e2e/evidence/playwright-run.txt`
- [x] T043 [P] Verify `evidence/stability-run.txt` exists (from T030) and shows 9/9 green across three runs `specs/210-unskip-log-panel-e2e/evidence/stability-run.txt`
- [x] T044 [P] Verify `evidence/diff.patch` exists (from T013) and contains only the `test.describe.fixme` → `test.describe` edit plus the deleted blocker comment — no other hunks `specs/210-unskip-log-panel-e2e/evidence/diff.patch`

### Acceptance Self-Check

- [x] T045 Run the pre-PR self-check block from `quickstart.md` §"Acceptance self-check before opening PR": SC-001 grep, NFR-001 file-path filter, FR-006 file-exists, FR-007 backlog-strikethrough grep, plus `task verify`. All five must print ✅. Any FAIL means return to the relevant phase before creating the PR `specs/210-unskip-log-panel-e2e/`

### Backlog Closure

- [x] T046 Update `BACKLOG.md` row `#210`: wrap every cell in strikethrough `~~…~~`, replace the feature-description cell with a strikethrough link to `specs/210-unskip-log-panel-e2e/spec.md`, change the status cell from `proposed` to `complete`. Mirror the formatting pattern of rows `~~215~~`, `~~216~~`, `~~206~~` `BACKLOG.md`

### Media Content

- [x] T047 Create the shipped blog post via the Content Specialist agent (`.claude/agents/media/content.md`). Provide the agent with: feature name, goal, evidence artefacts captured (test-summary + both transcripts + diff), lessons learned (especially R5 log-panel focus-command nit noted in research.md and the "loud failures over silent skips" narrative carried over from `planning-post.md`), and the three What's-Next candidates from the planning post. Required sections per the template: What We Built, Screenshots (N/A — mark "see transcripts"), Lessons Learned, What's Next `specs/210-unskip-log-panel-e2e/media/shipped-post.md`
- [x] T048 [P] Create the shipped LinkedIn summary via the same Content Specialist spawn — 150-200 words, hook opening, link-placeholder for the published blog URL `specs/210-unskip-log-panel-e2e/media/linkedin-shipped.md`

### PR Creation

- [ ] T049 Create PR and publish blog: run `/speckit.pr` from this branch. This creates the feature PR in `debrief-future` with evidence attached AND publishes `shipped-post.md` to `debrief.github.io` via cross-repo PR. Returns both PR URLs `specs/210-unskip-log-panel-e2e/`

**Task T049 must run last. It depends on every other task (T001–T048) being complete.**

**Checkpoint**: Feature merged — three tests active in CI, stale annotations gone, evidence captured, backlog closed, PR + blog live.

---

## Dependencies

### Phase-Level Dependencies

- **Phase 1 (Setup)**: no dependencies.
- **Phase 2 (Foundation)**: N/A — empty by design.
- **Phase 3 (US1)**: depends on Phase 1 (T001 chromium, T002 baseline confirmation).
- **Phase 4 (US2)**: depends on Phase 3 (the edit must exist before hygiene can be checked).
- **Phase 5 (US3)**: depends on Phase 3 (T011 must pass once before attempting the three-run loop).
- **Phase 6 (Polish)**: depends on Phases 3, 4, 5 — evidence tasks read artefacts those phases produce.

### Within-Phase Dependencies

- T010 → T011 → {T012, T013} — the edit must land, a run must succeed, then artefacts are saved in parallel.
- T011 → T020 — hygiene grep is trivially parallelisable with the run, but recording it in T021 requires the transcript file T012 already exists.
- T030 → T031 — transcript produced before it can be verified.
- T040–T044 run in parallel (different files / different verifications). T041–T044 are marked `[P]`; T040 is first because it writes the primary evidence manifest other tasks reference.
- T045 (self-check) depends on T040–T044 all complete + T046 (backlog update) — it greps for the strikethrough row.
- T047 → T048 marked `[P]` because they invoke the Content Specialist on different files; a single agent spawn can write both in one call (see Parallel Example below) or they can be split.
- **T049 depends on all prior tasks (T001–T048).** It is the final, sequential task.

### User-Story Independence

- **US1** is the only story that produces code changes. US2 and US3 are verifications of US1's output — they cannot run first, but they add no new code.
- Consequently the three stories are **not staffable in parallel** — a direct consequence of the feature's single-file scope, not a flaw in the breakdown.

---

## Parallel Example

Within Phase 6, after T040 writes the test-summary manifest, these four tasks run in parallel:

```bash
# All four operate on different files, no shared state.
Task: "Write usage-example demo at specs/210-unskip-log-panel-e2e/evidence/usage-example.md"
Task: "Verify evidence/playwright-run.txt has 3-passed line + SC-001 grep output"
Task: "Verify evidence/stability-run.txt has 9/9 green"
Task: "Verify evidence/diff.patch contains only the one-file reactivation edit"
```

And the Content Specialist can produce both media pieces in one agent spawn:

```bash
# Single Content Specialist invocation, writes two files.
Task: "Draft shipped-post.md AND linkedin-shipped.md for feature 210"
```

---

## Implementation Strategy

### Incremental Delivery

This feature has a single indivisible deliverable — three tests, reactivated, proven stable. There is no multi-sprint increment to pull forward; the strategy is therefore **sequential single-pass**:

1. **Phase 1 (Setup)** — 5 min. Environment-ready baseline.
2. **Phase 3 (US1)** — 15–30 min. One-line edit + one green run + save two evidence files. If the run fails, stop and escalate per FR-005 / research R7.
3. **Phase 4 (US2)** — 1 min. `grep` check + append output to transcript. Almost always passes automatically after Phase 3 because T010 deletes everything the grep looks for.
4. **Phase 5 (US3)** — 15–45 min (depends on preview warmup). Three-run loop + verification.
5. **Phase 6 (Polish)** — 30–60 min. Evidence manifest, backlog row flip, Content Specialist spawn, `/speckit.pr`.

Total expected wall time: ~1.5–2.5 hours end-to-end.

### If Things Go Wrong

- **Phase 3 T011 fails on reactivation**: follow research R7 → open a new blocker issue documenting the failure mode; either leave the tests failing (loud CI failure, valid signal) or apply `test.fixme` to individual failing tests only — referencing the *new* issue, **never** `#143`. Update the evidence partially and flag the feature as blocked.
- **Phase 5 T030 flakes (2 green + 1 fail)**: per FR-005, a new blocker is mandatory. Do not drop SC-003 to "2 out of 3 is fine". A single flaky run means the stability bar is not met.
- **Backlog row format drifts from the `~~215~~`/`~~216~~` pattern**: fix T046 in-place rather than open a follow-up — the pattern match is both human-grep and future-script-grep friendly, and the evidence self-check in T045 will catch drift.

### Parallel Team Strategy

Not applicable — this feature fits in a single developer-session. The only parallelism the task list exposes is **within-phase artefact-capture parallelism** (Phase 6 [P] markers), which a single agent-driven run handles natively via multiple tool calls per message.

---

## Notes

- `[P]` tasks = different files, no dependencies.
- `[US1]` / `[US2]` / `[US3]` label maps task to user story for traceability.
- Commit granularity: one commit for the reactivation edit (Phase 3), one commit for evidence + media + backlog (Phase 6); T049 runs after the Phase 6 commit.
- `/speckit.pr` (T049) is the only task that requires user confirmation — it creates the feature PR and a cross-repo blog PR in `debrief.github.io`.
- **FR-005 is the strictest rule in this feature** — no silent re-skip onto a closed blocker. If anything forces `fixme` back onto any of the three tests during implementation, a fresh GitHub issue must exist first, and its number (not `#143`) must be the reference.

