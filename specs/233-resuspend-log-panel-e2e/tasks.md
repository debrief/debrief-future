---

description: "Implementation task list for re-activating the log-panel E2E suite (post-#142)"
---

# Tasks: Re-activate Log Panel E2E Suite (after #142 resolves)

**Input**: Design documents at `/home/user/debrief-future/specs/233-resuspend-log-panel-e2e/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/skip-guard.contract.md, quickstart.md

**Tests**: Tests are NOT separately authored in this feature — the deliverable IS the existing Playwright E2E suite under un-mute. There is no TDD-first phase; the five test bodies in `tests/e2e/test-log-panel.spec.ts` already exist (lines 21–109) and are out of scope per spec §131. Verification is the un-muted suite passing 5/5 locally + three consecutive CI runs (FR-003).

**Organization**: Tasks are grouped by user story to enable independent verification of each story's done-state. Atomic-commit constraint (research.md Decision 2): the implementation changes land in one commit per FR-001..FR-006; FR-007 and FR-008 planning artefacts are already committed on this branch (commit `ef13590`).

---

## Evidence Requirements

> **Purpose**: Capture artefacts that demonstrate the log-panel suite has returned to active CI coverage with no regression in the supporting infrastructure (skip-guard, lint wiring, BACKLOG state). Used in PR description and the feature blog post.

**Evidence Directory**: `specs/233-resuspend-log-panel-e2e/evidence/`
**Media Directory**: `specs/233-resuspend-log-panel-e2e/media/`

### Feature Type Detection

This is a **test-infrastructure restoration** feature (closest match: **Infrastructure** in the Quality Rubric). It restores a previously-active gate (Playwright E2E suite + bash skip-guard + Taskfile lint wiring) rather than introducing a new one. There is no UI surface, no web-shell workflow, no Electron app, no API, no schema. Required evidence per the rubric: "Configuration sample + validation output" — instantiated below as the restored skip-guard script + the 5/5 local Playwright run output + three CI run links.

### Planned Artefacts

| Artefact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | YAML-fronted test summary: 5/5 passed, 0 failed, 0 skipped on the un-muted suite. Authored from the test-summary template. | After T020 (local 5/5 run completes) |
| `evidence/usage-example.md` | Concrete usage demonstration — the skip-guard's pre-state failure + post-state pass + the 5/5 Playwright run, with copy-pasteable commands. | After T020 |
| `evidence/before-after.md` | Side-by-side state diff: pre-PR (5 muted, guard absent, BACKLOG blocked) vs post-PR (5 active, guard wired, BACKLOG complete). | After T024 (BACKLOG strike-through) |
| `evidence/skip-guard-validation.txt` | Raw stdout/stderr capture of `bash scripts/check-log-panel-skip-guard.sh` against (a) the still-muted file (exit 1) and (b) the un-muted file (exit 0). | During T011 + T015 |
| `evidence/playwright-output.txt` | Raw stdout from `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel` showing 5/5 pass. | After T020 |
| `evidence/ci-runs.md` | Three GitHub Actions run URLs for the `VS Code E2E` job, all green, plus the SC-003 manual-grep result for each. | After T031 |
| `evidence/muted-suite-triage.md` | Already authored (FR-007). 16-row catalogue of #143-blocked suites. | Already on branch (commit `ef13590`) |

### Media Content

| Artefact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (What We're Building, How It Fits, Key Decisions) | Already authored at plan time |
| `media/shipped-post.md` | Feature blog post combining cached opener + ship-time evidence (test counts, before/after, the audit-trail pattern from US2) | T034 |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief-future` with evidence + planning artefacts | T035 |
| Blog PR | PR in `debrief.github.io` with `shipped-post.md` | Triggered by `/speckit.pr` from T035 |

---

## Phase 1: Setup — Branch & Prerequisites

**Purpose**: Confirm the operator is on a branch where #142 is already in main, the working tree is clean, and the planning artefacts authored at plan time (FR-007 triage table, FR-008 Decision 6) are present on the branch. No file edits in this phase.

- [ ] T001 Verify `#142` is merged to main: `git fetch origin main && git log origin/main --oneline -20 | grep -E "(#548|142)"` MUST list the close-out merge commit. If absent, STOP — implementation cannot begin until #142 lands (spec FR-003).
- [ ] T002 Verify the active branch matches the spec: `git rev-parse --abbrev-ref HEAD` reports `233-resuspend-log-panel-e2e` (local) or `claude/speckit-plan-233-IdEPX` (cloud). The `.specify/.active-feature` file MUST contain `233-resuspend-log-panel-e2e`.
- [ ] T003 Rebase onto post-#142 main: `git rebase origin/main`. Resolve any conflicts in favour of upstream for files outside `tests/e2e/`, `scripts/check-log-panel-skip-guard.sh`, `Taskfile.yml`, `BACKLOG.md`, and `specs/233-resuspend-log-panel-e2e/`. If conflicts surface in those five paths, STOP and re-read research.md Decision 2 — they should not exist on a clean branch.
- [ ] T004 Verify the working tree is clean: `git status` reports `nothing to commit, working tree clean`. If not, stash and resume only after the tree is clean.
- [ ] T005 [P] Verify FR-007 evidence already exists on branch: `test -f specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md && echo OK` AND the file's row count matches reality: `grep -cE "^\| [0-9]+ \|" specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md` reports `16`. If mismatched, re-author the table per FR-007 before proceeding.
- [ ] T006 [P] Verify FR-008 Decision 6 already exists in research.md: `grep -A1 "Decision 6 — Skip-guard scaling" specs/233-resuspend-log-panel-e2e/research.md` MUST return the decision line. If absent, re-author per FR-008 before proceeding.

**Checkpoint**: Branch is on top of post-#142 main, tree is clean, both review-pulled-in artefacts (FR-007, FR-008) are confirmed present. Foundation phase can begin.

---

## Phase 2: Foundation — Restore the Skip-Guard Script

**Purpose**: Re-create `scripts/check-log-panel-skip-guard.sh` (deleted by #534) verbatim from the pre-#534 SHA cited in spec.md line 90 (`5385f6e8`). Verify the contract (`contracts/skip-guard.contract.md`) holds against both the still-muted file (script exits 1) and conceptually against the post-un-mute state (deferred to Phase 3 verification). This script is a prerequisite for Phase 3 (FR-005) and for Phase 6's atomic-commit requirement, so it lands first.

**⚠️ CRITICAL**: This phase MUST complete before any work in Phase 3. The skip-guard's restoration is part of FR-005 and is what makes the lint gate's restoration unambiguous post-un-mute.

- [ ] T007 Restore the skip-guard script from `5385f6e8`: `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh > scripts/check-log-panel-skip-guard.sh` — file: `scripts/check-log-panel-skip-guard.sh`
- [ ] T008 Set the script's mode to match sibling `check-*.sh` scripts (0644 — not executable; invoked via `bash` per Taskfile pattern): `chmod 0644 scripts/check-log-panel-skip-guard.sh` — file: `scripts/check-log-panel-skip-guard.sh`
- [ ] T009 Diff the restored script against the contract: `diff <(cat scripts/check-log-panel-skip-guard.sh) <(grep -A 50 "^```bash" specs/233-resuspend-log-panel-e2e/contracts/skip-guard.contract.md | sed -n '/^```bash/,/^```/p' | sed '1d;$d')` — confirm line count, regex, exit codes, and error format match. Any drift means the SHA in spec line 90 is wrong; STOP and triage.
- [ ] T010 Verify the script's invariants by inspection: open `scripts/check-log-panel-skip-guard.sh` and confirm it (a) starts with `#!/usr/bin/env bash` + `set -euo pipefail`, (b) targets exactly `tests/e2e/test-log-panel.spec.ts`, (c) greps for `^\s*test(\.describe)?\.(skip|fixme)\s*\(`, (d) exits 0 with `✅` on clean, exits 1 with `❌` and offending line numbers on violation. If any invariant fails, the SHA is the wrong source.
- [ ] T011 Run the skip-guard against the still-muted test file (proves it works) and capture the output: `bash scripts/check-log-panel-skip-guard.sh > specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt 2>&1; echo "exit=$?" >> specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt`. Expected: exit 1, stdout reports `❌ Log-panel skip-guard failed!` plus the `test.describe.fixme` line number. The captured file becomes part of evidence — file: `specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt`
- [ ] T012 Tag the captured pre-state in the evidence file: prepend a markdown header `# Skip-guard validation — pre-state (still-muted)` so the post-state capture in T015 can append cleanly. — file: `specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt`

**Checkpoint**: Skip-guard script is restored verbatim, modes match siblings, the contract is matched on inspection, and the script's failure-path is empirically demonstrated against the still-muted file. Phase 3 can now consume the script.

---

## Phase 3: User Story 1 — Restore Real Log-Panel Integration Coverage (P1)

**Goal**: The five log-panel E2E tests return to active CI coverage on every merge — no longer `.fixme`'d, no longer skipped, all five passing locally and in CI.

**Independent Test**: After this phase completes (locally), running `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel` reports `5 passed, 0 failed, 0 skipped`. Running `bash scripts/check-log-panel-skip-guard.sh` exits 0. Running `task lint` exits 0. (CI verification — three consecutive runs — is Phase 6.)

**Why this phase**: This is the entire reason the spec exists (spec.md User Story 1).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — The five tests under restoration ARE Playwright E2E. The `tests/e2e/playwright.config.ts` runner uses `@sparticuz/chromium` (bundled Linux Chromium via npm) — no separate browser install needed. Do NOT skip the local 5/5 verification (T020) thinking browsers can't be installed; they can. CI uses the identical invocation (see `.github/workflows/e2e.yml:193`).

### Implementation for User Story 1

- [ ] T013 [US1] Un-mute the log-panel suite: in `tests/e2e/test-log-panel.spec.ts`, replace `test.describe.fixme('Log Panel', () => {` with `test.describe('Log Panel', () => {`. Do not touch the five test bodies (lines 21–109 are out of scope per spec §131). — file: `tests/e2e/test-log-panel.spec.ts`
- [ ] T014 [US1] Remove the `.fixme` mute comment block at lines 11–18 of the test file (the eight-line `// #233 — Re-suspended pending #142 ...` block). After removal, the first non-import non-blank statement should be the `test.describe('Log Panel', ...)`. — file: `tests/e2e/test-log-panel.spec.ts`
- [ ] T015 [US1] Re-run the skip-guard against the un-muted file (proves the post-state passes) and append to the evidence capture: `echo -e "\n\n# Skip-guard validation — post-state (un-muted)\n" >> specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt; bash scripts/check-log-panel-skip-guard.sh >> specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt 2>&1; echo "exit=$?" >> specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt`. Expected: exit 0, stdout reports `✅ Log-panel skip-guard passed`. — file: `specs/233-resuspend-log-panel-e2e/evidence/skip-guard-validation.txt`
- [ ] T016 [US1] Re-wire the skip-guard into the `Taskfile.yml` `lint:` task: locate the line `bash scripts/check-adr-refs.sh`, add immediately after it `      - bash scripts/check-log-panel-skip-guard.sh` (matching surrounding YAML indentation). — file: `Taskfile.yml`
- [ ] T017 [US1] Remove the temporary mute-explanation comment block in `Taskfile.yml` (the six-line `# #210's log-panel skip-guard removed 2026-04-24 per spec 233 ...` block at lines 115–120 of the pre-PR file; line numbers may shift after T016). The historical record lives in spec 233 + the merge commit body — the comment is no longer needed once the guard is back. — file: `Taskfile.yml`
- [ ] T018 [US1] Verify `task lint` exits 0 with the new skip-guard line in place. If any unrelated lint check fails, that's a pre-existing failure on main — verify against `origin/main` and either fix in-place or open a separate ticket; do not bury it under this PR.

### FR-006 — Dispose the superseded webview-injection POC (in-scope per review pull-in)

- [ ] T019a [US1] Confirm the replacement spec is active (not muted): `grep -n "test\.describe\." tests/e2e/test-webview-resolve.spec.ts | head -3` MUST show a plain `test.describe(...)` with no `.skip` / `.fixme`. If the replacement is itself muted, STOP and re-evaluate FR-006 — the disposal premise has changed.
- [ ] T019b [US1] Check whether `tests/e2e/helpers/webview-injector.ts` has importers other than the probe: `grep -rln "webview-injector" tests/e2e/ --include="*.ts" | grep -v test-webview-probe.spec.ts`. If output is empty, the helper is also disposable; if output lists other files, leave the helper alone and append an "Orphan helpers" note to `evidence/muted-suite-triage.md` listing the file and remaining importers.
- [ ] T019c [US1] Delete the superseded POC: `git rm tests/e2e/test-webview-probe.spec.ts`. If T019b returned empty, also delete the helper: `git rm tests/e2e/helpers/webview-injector.ts`. — files: `tests/e2e/test-webview-probe.spec.ts`, `tests/e2e/helpers/webview-injector.ts` (conditional)
- [ ] T019d [US1] Run the full E2E test discovery once to confirm no other spec imported anything from the deleted probe: `npx playwright test --config tests/e2e/playwright.config.ts --list 2>&1 | tail -40`. Expected: no errors mentioning `test-webview-probe` or `webview-injector` (if helper was removed). If any other spec breaks, investigate the dependency before continuing.

### Local 5/5 verification

- [ ] T020 [US1] Run the un-muted suite locally and capture output: `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel 2>&1 | tee specs/233-resuspend-log-panel-e2e/evidence/playwright-output.txt`. **Expected**: `5 passed, 0 failed, 0 skipped`. If any test fails, **STOP** — triage the specific failure per spec §60 (Edge Cases). Do not commit until 5/5 is achieved. — file: `specs/233-resuspend-log-panel-e2e/evidence/playwright-output.txt`

**Parallel execution within Phase 3**: T013 and T014 touch the same file (`test-log-panel.spec.ts`) — sequential. T016 and T017 touch the same file (`Taskfile.yml`) — sequential. T019a / T019b can be inspected in parallel before T019c is performed. T015, T018, T020 each consume the prior task's outputs — sequential.

**Checkpoint**: User Story 1's done-state achieved locally. The five tests are active, both files (`test-log-panel.spec.ts`, `Taskfile.yml`) have their mute comments removed, the skip-guard is wired into `lint:` and exits 0 against the un-muted file, the superseded probe is gone, and `npx playwright test ...` reports 5/5 passed. Story 1 is independently testable at this point — the only thing missing is CI verification, which lands in Phase 6.

---

## Phase 4: User Story 2 — Clear Audit Trail for Future Suspensions (P2)

**Goal**: A future developer who hits the same webview-flakiness pattern (un-skip → flake → re-skip → un-skip) can find this spec, follow its workflow, and reproduce the suspend/un-suspend recipe without consulting any PR thread.

**Independent Test**: A reader new to the project, given only the link to `specs/233-resuspend-log-panel-e2e/spec.md`, can read the spec + research.md + quickstart.md + the FR-007 triage table + the FR-008 Decision 6, and produce a working un-mute PR for any of the sixteen #143-blocked suites without further context. The artefacts that satisfy this story are the spec directory itself plus the merge commit body that points back to it.

**Why this priority**: After this PR merges, the inline `.fixme` comment that USED to point to spec 233 (test-log-panel.spec.ts lines 11–18) will be removed (FR-002). The audit trail therefore lives in the spec dir + the merge commit body — verifying both is well-formed is what closes this story.

### Audit Trail Verification

- [ ] T021 [US2] Verify the spec dir contains the canonical pattern artefacts (spec, research, quickstart, contracts, data-model, evidence): `ls specs/233-resuspend-log-panel-e2e/` MUST list `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`, `evidence/`, `tasks.md`. If anything is absent, the audit trail is incomplete — author what's missing per the speckit template before continuing.
- [ ] T022 [US2] Verify the spec's User Story 2 acceptance criteria are reproducible from the artefacts alone: open `spec.md` §43–55, then `quickstart.md` (whole file), then `research.md` Decision 2 (atomicity) and Decision 4 (three-run gate), then `evidence/muted-suite-triage.md` (16-row catalogue). Confirm a hypothetical reader could un-mute another suite by following these documents — if anything is unclear, edit the relevant artefact in-place. — files: `specs/233-resuspend-log-panel-e2e/spec.md`, `specs/233-resuspend-log-panel-e2e/quickstart.md`, `specs/233-resuspend-log-panel-e2e/research.md`, `specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md`
- [ ] T023 [P] [US2] Pre-author the audit-trail commit message body (kept to one place to avoid drift across the commit message and the spec). Draft it now in `specs/233-resuspend-log-panel-e2e/evidence/commit-body.md` so T028 can `cat` it into the `git commit -m` heredoc — file: `specs/233-resuspend-log-panel-e2e/evidence/commit-body.md`. Body MUST: (a) state the FR list (FR-001..FR-008), (b) reference #142's resolution and #210's precedent, (c) list the file changes, (d) state the local 5/5 verification result, (e) contain `Closes #233.`.

**Checkpoint**: Audit trail is complete and self-contained — the spec dir alone is enough for a future developer to reproduce the workflow. User Story 2's done-state is achieved at this point (independent of CI runs).

---

## Phase 5: BACKLOG Strike-Through

**Purpose**: Mark backlog row 233 as `complete` per FR-004. This is one row, one cell-by-cell strike-through edit, modelled on the existing convention used for #142 / #143 / #228 / #230.

- [ ] T024 Open `BACKLOG.md`, locate the row beginning `| 233 |`, and wrap each cell in `~~...~~` (markdown strike-through). Change the final-column status from `blocked` (or whatever the current pre-state is) to `complete`. Match the formatting of the rows for #142 and #143 immediately above row 233 — do NOT introduce a new convention. Do NOT move the row's position; preserve insertion order. — file: `BACKLOG.md`
- [ ] T025 Verify the row matches the post-state pattern: `grep -E "^\| ~~233~~ \|.*\| ~~complete~~ \|" BACKLOG.md` MUST return exactly one match. If the regex fails, the markdown is malformed — re-edit until the grep matches. Compare column count against #142's row (`grep -c "|" <(grep "| ~~142~~" BACKLOG.md)`) — must match exactly.

**Checkpoint**: BACKLOG row 233 is struck-through and marked `complete`, formatting matches the existing convention.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: One atomic commit landing FR-001..FR-006 (FR-007/FR-008 are already on branch). Push. Trigger three CI runs. Manually verify SC-003. Capture remaining evidence. Author feature blog post. Create PR via `/speckit.pr`.

### Pre-commit verification

- [ ] T026 Run the full pre-push gate locally per `CLAUDE.md` "Before Pushing" — preferred form: `task verify`. Fallback if `task` is unavailable: `uv run ruff check . && pnpm lint && uv run pyright && pnpm -r typecheck && uv run pytest && pnpm --filter '!@debrief/web-shell' test`. Then the Playwright leg: `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel`. ALL must pass before commit. If anything beyond the log-panel suite fails, that's a pre-existing issue on main — verify against `origin/main`; do not bury under this PR.
- [ ] T027 Spot-check the commit's file set: `git status --short` MUST list (a) `M tests/e2e/test-log-panel.spec.ts`, (b) `?? scripts/check-log-panel-skip-guard.sh` or `A scripts/check-log-panel-skip-guard.sh`, (c) `M Taskfile.yml`, (d) `M BACKLOG.md`, (e) `D tests/e2e/test-webview-probe.spec.ts` (and conditionally `D tests/e2e/helpers/webview-injector.ts`), (f) several modified or new files under `specs/233-resuspend-log-panel-e2e/evidence/`. Anything outside this list MUST be reverted before committing — the atomic-commit constraint forbids unrelated changes (research.md Decision 2).

### Atomic commit & push

- [ ] T028 Stage and commit atomically per FR-001..FR-006 (planning-time FR-007/FR-008 are already committed in `ef13590`): stage the runtime files (`tests/e2e/test-log-panel.spec.ts`, `scripts/check-log-panel-skip-guard.sh`, `Taskfile.yml`, `BACKLOG.md`, the deleted probe + conditional helper) plus the new evidence files; commit with the body authored in T023 (`evidence/commit-body.md`); the commit's first line MUST be `test(233): re-activate log-panel E2E suite, restore skip-guard, dispose probe POC`. End the body with `Closes #233.` so the merge auto-closes the issue.
- [ ] T029 Push the branch: `git push -u origin <branch-name>` (use the actual branch name from T002). On network failure, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) per CLAUDE.md "Git Operations".

### CI verification — three consecutive runs (FR-003)

- [ ] T030 Open the PR on GitHub (or wait for auto-PR if the branch is configured for it). After the first `VS Code E2E` job completes green, click **Re-run jobs → Re-run all jobs** twice more on the same head SHA to obtain THREE consecutive green runs. Do NOT use `--repeat-each=3` inside one job — the flakiness #142 fixed was image/lifecycle-level, so the desired invariant is "three image bring-ups all succeed", which only re-running the workflow proves (research.md Decision 4).
- [ ] T031 Capture the three CI run URLs and the SC-003 manual-grep result for each. For each run: copy the URL of the `VS Code E2E` job, then download the job log (or use `gh run view --log` if available — but per environment instructions, GitHub MCP tools must be used in this session; in implementation the operator can use whatever they prefer) and grep for the two strings called out in spec.md SC-003: `Webview frame with content "[data-testid=\"log-panel\"]" not found after 15000ms` (must be ABSENT) and `resolveWebviewView` (informational lines OK; warning/error lines NOT OK). Record the three URLs + grep results in `specs/233-resuspend-log-panel-e2e/evidence/ci-runs.md`. — file: `specs/233-resuspend-log-panel-e2e/evidence/ci-runs.md`

### Evidence Collection

- [ ] T032 [P] Capture test summary using template `.specify/templates/evidence/test-summary-template.md` in `specs/233-resuspend-log-panel-e2e/evidence/test-summary.md`. YAML front matter MUST include `feature: 233-resuspend-log-panel-e2e`, `captured_at` (ISO date), `git_sha` (head of feature branch), `tests_passed: 5`, `tests_failed: 0`, `tests_skipped: 0`, `coverage_pct: n/a` (this is an integration suite, not a unit-coverage gate). Body MUST list each of the five test names from the suite, the local 5/5 result, and the three CI runs (link to `evidence/ci-runs.md`). — file: `specs/233-resuspend-log-panel-e2e/evidence/test-summary.md`
- [ ] T033 [P] Author `usage-example.md` showing the un-suspend recipe end-to-end as a copy-pasteable session: skip-guard pre-state failure (from T011's evidence file), un-mute edit, skip-guard post-state pass (from T015), `task lint` pass (from T018), Playwright 5/5 (from T020), and the three CI run URLs (from T031). This is the artefact the blog post pulls from. — file: `specs/233-resuspend-log-panel-e2e/evidence/usage-example.md`
- [ ] T034 [P] Author `before-after.md` as a side-by-side state table: pre-PR (5 muted, guard absent, BACKLOG blocked, probe POC active, plus the temporary mute comments in two files) vs post-PR (5 active, guard wired, BACKLOG complete, probe disposed, comments gone). Cross-reference each row to its FR + the evidence file proving it. — file: `specs/233-resuspend-log-panel-e2e/evidence/before-after.md`

### Media Content

- [ ] T035 Create feature blog post in `specs/233-resuspend-log-panel-e2e/media/shipped-post.md`. Spawn the **Content Specialist** subagent (`general-purpose` with the prompt structure from `.claude/agents/media/content.md`) to: (a) copy the first three sections (What We're Building, How It Fits, Key Decisions) verbatim from `evidence/opening-context.md`; (b) write the remaining sections (Screenshots / By the Numbers / Lessons Learned / What's Next) from the ship-time evidence — `evidence/test-summary.md`, `evidence/before-after.md`, `evidence/ci-runs.md`, plus the audit-trail-as-pattern lesson from User Story 2. Title prefixed with `Building `. — file: `specs/233-resuspend-log-panel-e2e/media/shipped-post.md`

### PR Creation

- [ ] T036 Create PR and publish blog: run `/speckit.pr`. This task MUST be the final task in tasks.md — it depends on all evidence + media tasks being complete. It (a) creates the feature PR in `debrief-future` with the evidence appended to the description, (b) publishes `shipped-post.md` to `debrief.github.io` via cross-repo PR, (c) returns both PR URLs for review.

**Checkpoint**: Three CI runs are green, SC-003 manual gate is recorded, evidence + blog are authored, both PRs are open and linked. Feature is ready for review and merge.

---

## Dependencies

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately once `#142` is confirmed merged.
- **Phase 2 (Foundation)**: Depends on Phase 1 completion. **BLOCKS Phase 3** — the skip-guard must exist before the un-mute happens, so the pre-state failure (T011) and the post-state pass (T015) frame the un-mute as a tested transition.
- **Phase 3 (US1)**: Depends on Phase 2 completion. The five test bodies are unchanged; the work is the un-mute edit + the Taskfile re-wire + the probe disposal + the local 5/5 verification.
- **Phase 4 (US2)**: Can run in parallel with Phase 3 — it's pure verification + commit-body authoring against artefacts that already exist on the branch. In practice, run it after Phase 3 so the verification has the full set of files to look at.
- **Phase 5 (BACKLOG)**: Depends on Phases 3 + 4 — the BACKLOG strike-through marks the feature as `complete`, which is only true once US1 and US2 are both verified done locally.
- **Phase 6 (Polish)**: Depends on all prior phases. The atomic commit (T028) is the gate; everything before it is the diff being committed, everything after is verification + media + PR creation.

### Within-Phase Ordering

- **Phase 2**: T007 → T008 → T009 → T010 → T011 → T012 (strict — each step verifies the prior).
- **Phase 3**: T013 → T014 (same file, sequential) → T015 → T016 → T017 (same file as T016, sequential) → T018 → T019a → T019b → T019c → T019d → T020. The `[P]` parallel marker is NOT used inside Phase 3 — the steps form a tight verification chain.
- **Phase 4**: T021 → T022 → T023. T023 is `[P]` because authoring the commit-body draft does not depend on the verification steps.
- **Phase 5**: T024 → T025 (verification of T024).
- **Phase 6**: T026 → T027 → T028 → T029 → T030 → T031 → (T032, T033, T034 in parallel) → T035 → T036.

### User Story Independence

- **US1 (Phase 3)** is independently verifiable: 5/5 local Playwright run + skip-guard exit 0 + `task lint` exit 0. No dependency on US2 (audit trail) for the runtime-correctness invariants.
- **US2 (Phase 4)** is independently verifiable: spec dir contents review + commit-body draft. No dependency on US1's runtime state — the audit trail is the artefacts themselves, not the un-mute.

### Parallel Opportunities

- T005 + T006 (Phase 1 verifications) can run in parallel — they're read-only checks.
- T019a + T019b (Phase 3 inspections before deletion) can run in parallel.
- T032 + T033 + T034 (Phase 6 evidence authoring) all consume already-captured raw outputs and write to different files — fully parallel.
- Phase 4 (US2 verification) can technically run in parallel with Phase 3 (US1 implementation) if two operators are available; in single-operator practice, run sequentially to avoid context-switching cost.

### Critical Path

```text
T001..T006 → T007..T012 → T013..T020 → T021..T023 → T024..T025 → T026..T036
   (Setup)     (Found.)      (US1)        (US2)       (BACKLOG)    (Polish)
```

Three CI runs (T030) sit between push and evidence capture; they cannot be shortened — they're the FR-003 stability gate.

---

## Implementation Strategy

### Incremental Delivery

This is a small, surgical feature — the "increments" are mostly verification waypoints rather than separately-shippable functionality. The path:

1. **Setup + Foundation (T001..T012)** — branch is clean, on top of post-#142 main, planning artefacts present, skip-guard restored verbatim. Deliverable at this point: a branch where the guard exists and provably fails against the still-muted file. Nothing can be shipped yet — the un-mute hasn't happened.
2. **US1 (T013..T020)** — the un-mute. After this, locally, the suite passes 5/5 and the skip-guard passes. This is the first point at which the feature *could* be merged in principle, modulo the FR-003 three-run CI gate.
3. **US2 (T021..T023)** — the audit trail is verified self-contained. No runtime change.
4. **BACKLOG (T024..T025)** — mark complete. No runtime change.
5. **Polish (T026..T036)** — verify, commit atomically, push, run 3× CI, capture evidence, write blog post, open PR.

### Single-operator path

This spec assumes one operator. Run the phases sequentially top-to-bottom. The `[P]` markers within phases are opportunities to keep multiple read-only checks in flight (e.g. T005 || T006), not multi-developer coordination points.

### Parallel-team path (not expected, included for completeness)

If a second operator is available between T020 and T028, they can run Phase 4 (T021..T023) and Phase 5 (T024..T025) while the first operator triggers and watches CI. The atomic-commit constraint forces re-convergence at T028 regardless.

### Failure-mode guardrails

- **If T020 (local 5/5) fails**: STOP. Do NOT commit. Spec §60 (Edge Cases) describes the narrow-mute fallback (per-test `test.fixme` for the persistently-failing tests, keep the rest active). If applied, this PR's scope changes — re-author the commit message and update FR-001 / SC-001 in spec.md before continuing.
- **If T030 (any of the three CI runs) fails**: STOP. The FR-003 gate is failed. Treat the PR as merge-blocked. Do not re-mute as a workaround inside this PR — open a follow-up issue against #142 with the failing CI run URL (per `quickstart.md` failure-modes table).
- **If T031 (SC-003 manual grep) returns the forbidden strings**: STOP. SC-003 is failed. Same blocking treatment as T030 — investigate before merge.

### Don't-do list

- Do NOT touch the five test bodies (`test-log-panel.spec.ts` lines 21–109). They are explicitly out of scope (spec §131).
- Do NOT add new test cases — that's a follow-up backlog item per spec Out of Scope.
- Do NOT generalise the skip-guard or migrate to ESLint — research.md Decision 6 records the per-suite-bash decision; deviating requires re-opening that decision.
- Do NOT touch any of the sixteen #143-blocked suites. Their un-mute is not gated by #142; it's gated by #143's resolution (per `evidence/muted-suite-triage.md`).
- Do NOT re-mute the suite if a flake appears post-merge — open a fresh focused spec instead (the pattern this spec ratifies).

---

## Notes

- This is a **test-infrastructure restoration** feature — there is no application code, no schema, no UI. The "implementation" is a verified revert plus a script restoration plus a probe disposal.
- The atomic-commit constraint (research.md Decision 2) governs the LANDED commit on main. Squash-merge from a multi-commit feature branch satisfies it.
- The five FRs originally listed (FR-001..FR-005) plus the three review-pulled-in FRs (FR-006..FR-008) form the executable acceptance criteria. FR-007 and FR-008 already landed on this branch in commit `ef13590`; the implementation phase only needs to verify their continued presence (T005, T006).
- Total task count: **36** across six phases.
- Per the project's "Before Pushing" instructions in CLAUDE.md, T026 (`task verify` or its fallback chain) is non-negotiable before T029 (push).
