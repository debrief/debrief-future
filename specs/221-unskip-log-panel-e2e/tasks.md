---
description: "Task list — Feature 221: Un-skip Webview Log-Panel E2E Suite"
---

# Tasks: Un-skip Webview Log-Panel E2E Suite

**Input**: Design documents from `/specs/221-unskip-log-panel-e2e/`
**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), quickstart.md (✅). No data-model.md / contracts/ (test-infrastructure feature — intentionally omitted).

**Tests**: The tests are the **subject** of this feature — they already exist in `tests/e2e/test-log-panel.spec.ts`. No new test authorship. The work is reactivation + verification + evidence.

**Organization**: Tasks are grouped by user story, matching the three priorities from spec.md:

- **US1 (P1)** — Log-panel webview integration continuously verified in CI
- **US2 (P2)** — Dead-marker hygiene (no references to resolved blockers)
- **US3 (P3)** — Suite stays green across cloud + local preview environments

---

## Evidence Requirements

> **Purpose**: Capture artifacts that demonstrate the three reactivated tests run and pass. This feature is tagged **Infrastructure** in the Quality Rubric — evidence centres on configuration snippets and validation output rather than screenshots/GIFs.

**Evidence Directory**: `specs/221-unskip-log-panel-e2e/evidence/`
**Media Directory**: `specs/221-unskip-log-panel-e2e/media/` (already contains `planning-post.md` + `linkedin-planning.md` from `/speckit.plan`)

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

- [ ] T001 Provision bundled Chromium for the sandbox: run `bash tests/e2e/scripts/ensure-chromium.sh` and verify `tests/e2e/.chromium-path` is written `tests/e2e/.chromium-path`
- [ ] T002 [P] Confirm the sibling suite `test-analysis-tool.spec.ts` still passes on `main` — establishes the "helpers work" baseline (research.md R2). Run `CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-analysis-tool.spec.ts` and record pass status `tests/e2e/test-analysis-tool.spec.ts`
- [ ] T003 [P] Confirm Playwright currently reports `test-log-panel.spec.ts` as **3 pending (fixme)** in a discovery-only run — proves R6 discovery path and gives a before-picture for evidence `tests/e2e/test-log-panel.spec.ts`

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

- [ ] T010 [US1] Delete the three-line stale-blocker comment (lines 11–13) and remove `.fixme` + trailing `// blocked:` comment from the `test.describe` call (line 14) — transforms `test.describe.fixme('Log Panel', () => { // blocked: webview iframe (#143)` into `test.describe('Log Panel', () => {`. No other edit `tests/e2e/test-log-panel.spec.ts`

### First Live Run

- [ ] T011 [US1] Run the reactivated file once against the current preview: `CLAUDE_CODE=1 pnpm --filter '@debrief/e2e' test test-log-panel.spec.ts`. Capture raw stdout for evidence. If it fails, STOP — do not fall back to `fixme`; invoke the FR-005 / research R7 escape hatch (open new issue) `tests/e2e/test-log-panel.spec.ts`
- [ ] T012 [P] [US1] Save the passing terminal transcript to the evidence directory `specs/221-unskip-log-panel-e2e/evidence/playwright-run.txt`
- [ ] T013 [P] [US1] Save the one-file reactivation diff for the audit trail: `git diff main...HEAD -- tests/e2e/test-log-panel.spec.ts > specs/221-unskip-log-panel-e2e/evidence/diff.patch` `specs/221-unskip-log-panel-e2e/evidence/diff.patch`

**Checkpoint**: US1 complete — suite is active, a single green run is recorded, SC-002 satisfied.

---

## Phase 4: User Story 2 — Dead-marker hygiene (Priority: P2)

## Phase 5: User Story 3 — Stability across environments (Priority: P3)

## Phase 6: Polish & Cross-Cutting Concerns

## Dependencies

## Implementation Strategy
