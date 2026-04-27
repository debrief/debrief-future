# Research: Re-activate Log Panel E2E Suite (after #142 resolves)

**Feature**: 233-resuspend-log-panel-e2e
**Date**: 2026-04-27
**Status**: Resolved — #142 merged (Patch 3 — visibility gate removal); blocker is cleared.

This document resolves the unknowns surfaced during planning. The spec arrived with no `NEEDS CLARIFICATION` markers (the recipe was explicit), so the unknowns here are the *gating questions* the planner needs to answer before tasks can be generated.

---

## Decisions

### Decision 1 — Blocker (#142) really has resolved

- **Decision**: Treat #142 as merged and the `resolveWebviewView` lifecycle as fixed. Plan generation proceeds with implementation tasks (not "block until #142 lands").
- **Rationale**: `BACKLOG.md` shows `~~142~~ ... ~~complete~~` (struck-through). Recent commit history includes `chore(backlog): mark item 142 as complete`, `chore(142): mark T032 complete (close-out PR #548 created)`, `Merge pull request #548 from debrief/claude/implement-speckit-142-N0sl3`, and `docs(#142): update evidence index + CHANGELOG for close-out PR`. `specs/142-vscode-e2e-webview-reliability/research.md` is marked **Status: Resolved (2026-04-25) — Patch 3 (visibility gate) validated**. The fix shipped via a targeted `workbench.js` patch that removes the `isBodyVisible()` guard around `pc()` (the webview-creation routine) inside `oc()` (the view-resolution method), so `resolveWebviewView()` now fires reliably in headless openvscode-server.
- **Alternatives considered**:
  - *Wait until #142 close-out PR #548 is verified green on main one more time*: Rejected — #548 is already merged (per the merge-commit message) and its evidence index is updated, so additional waiting buys nothing.
  - *Defer 233 implementation pending a 7-day soak window on main*: Rejected — the spec's `FR-003` already requires *three consecutive CI runs on a feature branch rebased on top of #142*, which is a stricter local stability gate than a passive soak. The three-run gate is the soak window.

### Decision 2 — Atomicity of the un-suspend commit

- **Decision**: Ship FR-001 (remove `.fixme`), FR-002 (delete the mute comment), FR-004 (BACKLOG strike-through), and FR-005 (restore skip-guard script + `Taskfile.yml` line) in **one atomic commit**.
- **Rationale**: Constitution Article XIII.1 requires atomic commits — *one logical change per commit*. The "logical change" here is "log-panel suite returns to active CI coverage", which spans those four file edits. Splitting them risks an intermediate state where the guard exists but the suite is still `.fixme`'d (guard fails) or the suite is active but the guard is missing (silent re-skips become possible). The only safe orderings collapse to a single commit. FR-003 (three consecutive CI runs) is *verification* of that commit, not a separate step.
- **Alternatives considered**:
  - *Two-commit split: (a) restore guard, (b) un-mute*: Rejected — commit (a) would fail its own guard (the file still contains `.fixme`), making the commit un-mergeable.
  - *Three-commit split: (a) un-mute, (b) restore guard, (c) BACKLOG*: Rejected — between (a) and (b) the lint gate has no skip-guard, contradicting FR-005's "Restoring means: re-create the bash script *and* re-add the `bash scripts/check-log-panel-skip-guard.sh` line *and* confirm `task lint` passes with the `.fixme`-free test file" — those three sub-steps are bound together by the requirement.
  - *Squash on merge from a multi-commit feature branch*: Acceptable as an implementation tactic; the **landed** commit on main is what must be atomic. The spec's `Un-Suspend Recipe` step 7 ("merge") aligns with squash-merge.

### Decision 3 — Source of the restored skip-guard script

- **Decision**: Restore `scripts/check-log-panel-skip-guard.sh` from `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh` (the pre-#534 HEAD that the spec explicitly cites at line 90).
- **Rationale**: The spec already names the SHA. The script is 41 lines of pure bash — no dependencies, no external state — so a verbatim restoration is correct. The version at that SHA is the version that #210 landed and CI validated against; reproducing it preserves the contract that #210 ratified. Confirmed by reading `git show 5385f6e8:scripts/check-log-panel-skip-guard.sh` and verifying it matches the contract in `contracts/skip-guard.contract.md` (target file, regex, exit codes, error format).
- **Alternatives considered**:
  - *Rewrite from scratch using the same regex*: Rejected — introduces a free variable (the rewriter's choices) where none is needed. The spec specifies the exact recovery path.
  - *Generalise to a re-usable "skip-guard CLI" that takes a target path argument*: Out of scope. The future-proofing pattern (Story 2 of the spec) is to *open a focused per-suite spec*, not to abstract the guard. Doing both would conflate two unrelated improvements.
  - *Replace with an ESLint rule*: Rejected — bash + grep is sufficient and matches the existing `scripts/check-*.sh` pattern in `Taskfile.yml`'s `lint:` task.

### Decision 4 — Stability gate definition (three-run rule)

- **Decision**: "Three consecutive CI runs green on the feature branch (post-rebase on main containing #142)" is the operator-side gate before merging. SC-001 says "every run against main"; SC-001 is monitored *after* merge as the long-tail health signal.
- **Rationale**: The spec's `FR-003` and `Un-Suspend Recipe` step 6 ("Ensure CI runs the VS Code E2E job against this branch three times — via 're-run jobs' button on the run page — to confirm stability") nail this down. Three is the chosen N because it's the smallest number that distinguishes a one-off pass from a stable pass while staying within the spec's 0.5-day estimate. Edge case: the spec's `Edge Cases` section also covers what to do if 1–2 of 5 tests flake post-#142 — narrow to per-test `test.fixme(...)` rather than re-suspending the whole `describe`.
- **Alternatives considered**:
  - *One-run gate*: Rejected — spec is explicit on three.
  - *Five-run gate*: Rejected — diminishing returns; if a flake survives three back-to-back runs the cause warrants a new ticket regardless.
  - *Run the suite *three* times within a single CI invocation* (Playwright's `--repeat-each=3`): Rejected — that exercises the same image instance, not three separate workflow invocations. The flakiness #142 fixed was image/lifecycle-level, so the desired invariant is "three image bring-ups all succeed", which only re-running the workflow proves.

### Decision 5 — Comment block removal (FR-002 surface area)

- **Decision**: The comment block to remove spans `tests/e2e/test-log-panel.spec.ts` lines 11–18 (the eight-line `// #233 — Re-suspended pending #142 ...` block immediately above `test.describe.fixme(...)`). Additionally, remove the corresponding mute-explanation comment in `Taskfile.yml` lines 115–120 (six lines, beginning `# #210's log-panel skip-guard removed 2026-04-24 per spec 233.`).
- **Rationale**: Both comments document the *temporary* state. Once the suite is active and the guard is back, leaving the comments creates a confusing "is this muted or not?" signal. FR-002 is explicit ("MUST be removed from the test file in the same commit"); the Taskfile comment was added in the same #534 PR and serves the same temporary-explanation purpose, so it's removed under the same rationale. The historical record lives in spec 233 + the merge commit body — that's the right place for it.
- **Alternatives considered**:
  - *Keep an abbreviated "see spec 233 for history" pointer comment*: Rejected — Story 2's audit trail lives in the spec itself; the test file is not the right place for historical pointers once the issue is resolved.
  - *Replace with a one-line "#233 reactivated 2026-MM-DD" comment*: Marginally tempting, but git blame on the same line gives the same information without code-comment noise. Rejected.

---

## Best Practices

### Atomic test-flag reverts in CI-gated test surfaces

The pattern recurs across the project (see `tests/e2e/` history): a test goes flaky → narrow `.fixme` mute lands so unrelated PRs can ship → root-cause work happens elsewhere → un-mute lands as a single revert. The healthy pattern is:

1. **One spec per suspension.** Don't bundle multiple suspended suites into one un-mute spec — each suite has its own blocker and its own re-stability evidence.
2. **The skip-guard rides with the suite.** If a suite has a skip-guard, the un-mute commit must include the guard's restoration — not a follow-up PR.
3. **Three-run stability proof.** Three back-to-back CI runs on the feature branch is the cheapest evidence that the un-mute is durable. Use the GitHub "Re-run jobs" button rather than `--repeat-each` for image-level flake classes.
4. **Evidence: log the test counts.** Before/after — "5 skipped → 5 passed" is the verifiable measurement that maps to SC-001/SC-002.

### Skip-guard scripts as bash + grep

The existing `scripts/check-*.sh` family in `Taskfile.yml`'s `lint:` task is intentionally small, fast, and dependency-free. Each script:
- Uses `set -euo pipefail`.
- Targets one specific file or pattern.
- Greps for a forbidden regex.
- Exits 0 (clean) / 1 (violation) with a human-readable error pointing at the relevant spec/FR.

The restored `scripts/check-log-panel-skip-guard.sh` follows this template exactly — there is nothing to redesign.

---

## Resolved Unknowns

All unknowns flagged during Technical Context filling are now closed:

| Unknown | Resolution |
|---------|------------|
| Has #142 actually merged? | Yes — backlog struck-through, PR #548 merged 2026-04-25, research.md status "Resolved". |
| What is the exact root cause #142 fixed? | `isBodyVisible()` gate in openvscode-server's `oc()` resolution method; Patch 3 removes the gate, `resolveWebviewView` now fires. |
| Source SHA for the skip-guard restoration? | `5385f6e8` (per spec line 90); script is 41 lines of bash, restored verbatim. |
| Atomicity boundary for the commit? | All five FRs ship in one commit (Decision 2). |
| How many CI runs before merging? | Three consecutive on the feature branch (Decision 4). |
| Comment surface to remove? | Test file lines 11–18 + Taskfile.yml lines 115–120 (Decision 5). |

No `NEEDS CLARIFICATION` markers remain.
