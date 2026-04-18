---
description: "Task list for 199-code-quality-cleanup — small-bucket consolidation of PR #465 follow-ups"
---

# Tasks: Code-Quality Cleanup — Small-Bucket Consolidation

**Input**: Design documents from `/specs/199-code-quality-cleanup/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: This feature includes automated tests where constitutional articles require them (Article VI — services require unit tests; Article I.3 — no silent failures gates the `plotName` regression). One new vitest file is added (T040). The LogPanel prop merge, `diff/` deletion, and TODO promotion are gated by existing test + `grep` coverage; no new test files are required for those sub-changes.

**Organization**: Tasks are grouped by user story to enable independent verification. Each user story is a single-session slice of work.

---

## Evidence Requirements

> **Purpose**: Capture artifacts demonstrating the five bundled sub-changes landed cleanly. Used by the PR description and the shipped blog post.

**Evidence Directory**: `specs/199-code-quality-cleanup/evidence/`
**Media Directory**: `specs/199-code-quality-cleanup/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | YAML-fronted summary of lint/typecheck/unit/Playwright runs with the new `useLoadWorkflow` vitest highlighted | After T043 + all green `task verify` |
| `evidence/usage-example.md` | One-page narrative walking through the five sub-changes with before/after snippets | After all impl phases done |
| `evidence/knip-report-diff.md` | Baseline (main, pinned knip) vs. branch knip output — proves `specs/**` silenced + no other findings hidden (SC-001, SC-009) | After T012 + T013 |
| `evidence/logpanel-consolidation.md` | Grep transcript showing zero `LogTimelineProps`/`LogByFeatureProps` remain + diff stat (SC-002) | After T026 |
| `evidence/adr-019.md` | Rendered extract of the new `decisions.md` entry + grep proof for "cycle" and "type-only" (SC-005) | After T031 |
| `evidence/todo-promotion.md` | Issue URLs, before/after source lines, and final `grep "TODO(#NNN)"` + `grep "TODO:"` results (SC-004, SC-010) | After T053 |
| `evidence/loader-plotname.md` | vitest output + revert-and-red sanity-check transcript proving the test is a real gate (SC-011, Contract 6 failure mode) | After T044 |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Planning announcement | **Already created during /speckit.plan** |
| `media/linkedin-planning.md` | LinkedIn planning summary | **Already created during /speckit.plan** |
| `media/shipped-post.md` | Shipped blog post | During Polish phase (T076) |
| `media/linkedin-shipped.md` | LinkedIn shipped summary | During Polish phase (T077) |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with the full evidence bundle attached in the description | Final task (T078) |
| Blog PR | PR in `debrief/debrief.github.io` publishing the shipped post | Triggered by `/speckit.pr` (T078) |

---

## Phase 1: Setup

**Purpose**: Confirm preconditions and capture the knip baseline needed for the non-specs-findings-unchanged assertion (SC-001). No code changes in this phase.

- [ ] T001 Verify working tree is on branch `199-code-quality-cleanup`, clean, and up-to-date with `main` (no file changes)
- [ ] T002 [P] Capture pre-change knip baseline from `main` using the **same** pinned knip version that will be adopted in T010 (install the pin on a throwaway worktree or scratch branch, run `pnpm exec knip > /tmp/knip-main.txt`). Keep `/tmp/knip-main.txt` available for T013's comparison. (Outputs captured to `/tmp/`, not committed.)

## Phase 2: User Story 1 — knip false-positive silencing (P1)

**Story goal**: Reviewers running knip see no `specs/**` clutter and get reproducible results across fresh clones (FR-009, FR-010, FR-019; SC-001, SC-009).

**Independent test**: `pnpm exec knip | grep -c '^specs/'` returns `0`; `grep -E '"knip": *"[0-9]+\.[0-9]+\.[0-9]+"' package.json` returns exactly one match; `diff` between baseline and post-change non-specs findings shows no change.

- [ ] T010 Add `knip` as an exact-pinned entry in root `package.json` `devDependencies` (e.g. `"knip": "5.34.0"` — pick the latest stable at implementation time; no `^`/`~`) `package.json`
- [ ] T011 [P] Create minimal `knip.json` at repo root containing at least `{"$schema": "https://unpkg.com/knip@latest/schema.json", "ignore": ["specs/**"]}`. Add only the extra `workspaces`/`entry` fields required to make knip actually run on this monorepo — nothing more (FR-010) `knip.json`
- [ ] T012 Run `pnpm install` and confirm `node_modules/knip` exists and its `package.json` version matches the pin from T010 (no file)
- [ ] T013 [test] Run `pnpm exec knip > /tmp/knip-branch.txt`, confirm `grep -c '^specs/' /tmp/knip-branch.txt` == 0, then `diff <(grep -v '^specs/' /tmp/knip-main.txt) <(grep -v '^specs/' /tmp/knip-branch.txt)` — MUST show no differences. If the diff is non-empty, the `knip.json` `ignore` rule is too broad (or knip config too aggressive) — narrow before proceeding (no file)

**Parallel**: T011 is independent of T010 but both must land before T012. T013 depends on T012.

## Phase 3: User Story 2 — LogPanel prop consolidation (P1)

**Story goal**: `LogPanelProps` is the single prop interface used by both `LogTimeline` and `LogByFeature`; the two drifted child interfaces no longer exist (FR-004, FR-005, FR-006; SC-002).

**Independent test**: `pnpm --filter @debrief/components typecheck` and `pnpm --filter @debrief/components test` both pass; `grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/` returns zero matches.

- [ ] T020 Extend `LogPanelProps` to absorb the child-only optional fields from `LogTimelineProps`/`LogByFeatureProps` (`onEntryClick`, `onTuneClick`, `onRestoreClick`, `editingActivityId`, `editingSchema`, `schemaLoading`, `schemaError`, `rationaleRef`, `onEditClick`, `onDoneClick`, `onParameterChange`, `onDeleteClick`, `onRationaleChange`, `onRetrySchema`). Keep all added fields optional. Do NOT delete the old interfaces yet — this is an add-only change that leaves the tree compiling `shared/components/src/LogPanel/types.ts`
- [ ] T021 [P] Update `LogTimeline.tsx` to `import type { LogPanelProps } from './types'` and annotate the component's props parameter as `LogPanelProps` `shared/components/src/LogPanel/LogTimeline.tsx`
- [ ] T022 [P] Update `LogByFeature.tsx` to `import type { LogPanelProps } from './types'` and annotate the component's props parameter as `LogPanelProps` `shared/components/src/LogPanel/LogByFeature.tsx`
- [ ] T023 Remove `LogTimelineProps` and `LogByFeatureProps` interface declarations from `types.ts` (now unreferenced) `shared/components/src/LogPanel/types.ts`
- [ ] T024 [P] Remove `LogTimelineProps` and `LogByFeatureProps` from `shared/components/src/LogPanel/index.ts` re-exports `shared/components/src/LogPanel/index.ts`
- [ ] T025 [P] Remove `LogTimelineProps` and `LogByFeatureProps` from `shared/components/src/index.ts` re-exports `shared/components/src/index.ts`
- [ ] T026 [test] Run `pnpm --filter @debrief/components typecheck && pnpm --filter @debrief/components test` — both MUST pass. Then run `grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/` — MUST return zero matches (no file)

**Parallel**: T021/T022 can run in parallel after T020 (both only add a type import — safe). T024/T025 can run in parallel after T023. T026 is the terminal gate.

## Phase 4: User Story 3 — VS Code cycle ADR (P2)

**Story goal**: `docs/project_notes/decisions.md` gains one new ADR entry naming the accepted VS Code `import type`-only cycles and the eventual interface-extraction fix (FR-001, FR-002, FR-003; SC-005).

**Independent test**: `grep -c "^### ADR-" docs/project_notes/decisions.md` has increased by 1; `grep -i "cycle" docs/project_notes/decisions.md` and `grep -i "type-only" docs/project_notes/decisions.md` each match at least once inside the new entry; both cycles' full module paths appear in the entry body.

- [ ] T030 Re-verify the two cycles still exist at implementation time via grep (`import type.*activityPanelView`, `import type.*calcService`, `import type.*mapPanel`, `import type.*resultsPanelService` inside `apps/vscode/src/`). Note which cycles remain — FR-001 scope-down rule says the ADR covers only those still present (no file)
- [ ] T031 Append a new ADR entry (number = next free after the current highest ADR on `main`; expected `ADR-019`) to `docs/project_notes/decisions.md` following the file's established format (Context / Decision / Alternatives Considered / Consequences sections). MUST name both cycles by full module path, MUST contain the words "cycle" and "type-only", MUST state `import type` edges are erased at runtime, MUST name interface extraction as the eventual fix `docs/project_notes/decisions.md`

**Parallel**: T031 depends on T030's scope-down check — run sequentially.

## Phase 5: User Story 4 — Loader plotName fix + regression test (P2)

**Story goal**: loading an existing plot surfaces the plot's display name (not its ID) in the loader's `LoadResult`, and a vitest gates that behaviour against future regression (FR-011, FR-012, FR-021; SC-006, SC-011).

**Independent test**: `pnpm --filter @debrief/loader test` passes with the new `useLoadWorkflow` test included; temporarily reverting the fix line causes the new test to go red (Contract 6 failure-mode sanity check).

**Test-first**: write the failing test before the fix (Constitution Article VII — Test-Driven AI Collaboration).

- [ ] T040 [test] Write `apps/loader/tests/unit/useLoadWorkflow.test.ts` per the schematic in `data-model.md` Entity 5: mock a plot list with `[{id: 'plot-abc-123', name: 'Alpha Exercise Run'}, ...]`, mock the IPC surface (`parseFile`, `addFeatures`, `copyAsset`, `markOperationPending`, `clearOperationPending`) so the test is deterministic and offline, invoke `executeLoad` with `mode: 'existing'` + `existingPlotId: 'plot-abc-123'`, and assert `output.plotName === 'Alpha Exercise Run'` AND `output.plotName !== 'plot-abc-123'`. Run the test at this point — it MUST go RED against the current code (this proves it is a real gate) `apps/loader/tests/unit/useLoadWorkflow.test.ts`
- [ ] T041 Thread the already-fetched plot list through `useLoadWorkflow.executeLoad`. Pick the simplest interface that makes the test pass: either add a `plots` argument to the call signature, or accept the whole plot object. Replace line 73's `plotName = existingPlotId; // TODO: Get actual name from plot list` with the real display-name lookup. Delete the `TODO:` comment outright (this TODO is being resolved, not promoted) `apps/loader/src/renderer/hooks/useLoadWorkflow.ts`
- [ ] T042 Update the single in-repo caller of `executeLoad` to pass the plot list (or plot object) it already has from `usePlots`. Locate via `grep -rn "executeLoad" apps/loader/src/renderer/` — there is expected to be one caller (the load-workflow UI component). Update its invocation so T040's test goes GREEN `apps/loader/src/renderer/...` (exact path discovered during T042)
- [ ] T043 [test] Run `pnpm --filter @debrief/loader test` — the new test from T040 MUST pass. Run `grep -n "TODO" apps/loader/src/renderer/hooks/useLoadWorkflow.ts` — MUST return zero matches (FR-012) (no file)
- [ ] T044 Sanity check (Contract 6 failure mode): temporarily re-apply `plotName = existingPlotId;` in `useLoadWorkflow.ts`, re-run the loader tests, confirm the new test goes RED, then revert. Record the revert-and-red transcript in the Phase 8 evidence artefact `evidence/loader-plotname.md` (no file edit at this step — just the sanity check)

**Parallel**: none in this phase; T040 → T041 → T042 → T043 → T044 is strictly sequential.

## Phase 6: User Story 5 — TODO promotion with pre-push guard (P2)

**Story goal**: two new GitHub issues filed in `debrief/debrief-future` for the untracked TODOs; in-source comments swapped to `TODO(#NNN):` with **real** issue numbers; no literal `TODO(#NNN)` anti-pattern ships; the already-tracked `TODO(#137)` in `stacService.ts` is audited (FR-013, FR-014, FR-015, FR-020; SC-004, SC-010).

**Independent test**: `grep -rn "TODO:" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` returns zero matches; `grep -rn "TODO(#" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` returns at least one match each pointing at a real open issue; `grep -rn "TODO(#NNN)" apps/ services/ shared/` returns zero matches.

**Atomic per-TODO task** (Contract 5b ordering discipline): each promotion is **one** task that does `file issue → capture number → replace in-source comment`. There must be no intermediate commit where the source reads `TODO(#TBD)` or `TODO(#NNN)`.

- [ ] T050 Audit `apps/vscode/src/services/stacService.ts` for the already-tracked `TODO(#137)` marker (expected at line ~1119). Confirm it still exists, the referenced issue is open, and its description still matches the in-source comment. Record the audit result (issue URL + status) for the PR description — no source edit required (no file)
- [ ] T051 [P] Atomic promotion of `apps/loader/src/main/ipc/config.ts:158` "Manage Stores" TODO: (a) file a new issue in `debrief/debrief-future` via `mcp__github__issue_write` titled `[#199] Add "Manage Stores" tab in loader config` with remediation hint in the body and a link back to `apps/loader/src/main/ipc/config.ts:158`; (b) capture the returned issue number `NNN`; (c) replace the in-source comment with `// TODO(#NNN): Add "Manage Stores" tab for:`. All three steps in the same working-tree change — no intermediate commit `apps/loader/src/main/ipc/config.ts`
- [ ] T052 [P] Atomic promotion of `apps/loader/src/renderer/components/StoreSelector/index.tsx:4` "Create new store button" TODO: (a) file a new issue titled `[#199] Add "Create new store" button/link in StoreSelector` with remediation hint and source-line pointer; (b) capture the returned issue number `NNN`; (c) replace the in-source comment with `* TODO(#NNN): Add "Create new store" button/link that opens the NoStoresView panel,`. All three steps in the same working-tree change `apps/loader/src/renderer/components/StoreSelector/index.tsx`
- [ ] T053 [test] Pre-push guard (FR-020): run `grep -rn "TODO(#NNN)" apps/ services/ shared/` — MUST return zero matches. Run `grep -rn "TODO:" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` — MUST return zero matches. Run `grep -rn "TODO(#" apps/loader/src/main/ipc/config.ts apps/loader/src/renderer/components/StoreSelector/index.tsx` — MUST return at least one match per file. If any check fails, fix before pushing (no file)

**Parallel**: T051 and T052 are file-disjoint and can run in parallel. T050 is doc-audit only. T053 is the terminal gate — depends on T051 AND T052.

## Phase 7: User Story 6 — `shared/components/diff/` removal (P3)

**Story goal**: orphaned `shared/components/diff/` sub-package removed; no stale references anywhere in the repo (FR-007, FR-008; SC-003).

**Independent test**: `test ! -d shared/components/diff && echo OK` prints `OK`; `grep -rn "shared/components/diff" --exclude-dir=node_modules --exclude-dir=specs` returns zero matches; `pnpm install && task verify` both succeed.

- [ ] T060 Delete the entire `shared/components/diff/` tree via `git rm -r shared/components/diff` (preserves the deletion in git history per SC-003's "restorability via `git log`" criterion) `shared/components/diff/`
- [ ] T061 Sweep for stale references: `grep -rn "shared/components/diff" --exclude-dir=node_modules --exclude-dir=specs`. For any hit found in `tsconfig*.json`, `pnpm-workspace.yaml`, build scripts, or the new `knip.json`, remove or update the reference. If the sweep returns no hits, mark task complete with a one-line note (no file — sweep + edit-in-place only)
- [ ] T062 Run `pnpm install && task verify` — both MUST succeed. If either fails, fix the remaining stale reference before continuing (no file)

**Parallel**: T061 depends on T060; T062 depends on T061. Sequential.

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Capture evidence, write the shipped content, and open the PR. Order matters only at the boundaries — most evidence tasks are parallel.

### Evidence Collection

- [ ] T070 Run the full CI verify sequence (`task verify`) on a clean tree, then populate `specs/199-code-quality-cleanup/evidence/test-summary.md` using the template at `.specify/templates/evidence/test-summary-template.md`. YAML front matter MUST include `feature: 199-code-quality-cleanup`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body MUST call out the new `useLoadWorkflow` vitest explicitly as a key scenario verified (FR-021 evidence) `specs/199-code-quality-cleanup/evidence/test-summary.md`
- [ ] T071 Create usage demonstration at `specs/199-code-quality-cleanup/evidence/usage-example.md` — a one-page narrative walking through all five sub-changes with before/after code snippets for the LogPanel merge and the `plotName` fix, plus the new `ADR-019` rendered in full `specs/199-code-quality-cleanup/evidence/usage-example.md`
- [ ] T072 [P] Capture knip before/after report at `specs/199-code-quality-cleanup/evidence/knip-report-diff.md` — include `/tmp/knip-main.txt` (baseline) and `/tmp/knip-branch.txt` (post-change) outputs side-by-side, highlight the dropped `specs/**` entries, and show the non-`specs/**` diff is empty (SC-001, SC-009 proof) `specs/199-code-quality-cleanup/evidence/knip-report-diff.md`
- [ ] T073 [P] Capture LogPanel prop-merge diff at `specs/199-code-quality-cleanup/evidence/logpanel-consolidation.md` — grep-transcript showing zero `LogTimelineProps`/`LogByFeatureProps` remain across `shared/`, `apps/`, `services/`, plus the `git diff --stat` for the five modified files (SC-002 proof) `specs/199-code-quality-cleanup/evidence/logpanel-consolidation.md`
- [ ] T074 [P] Capture ADR-019 extract at `specs/199-code-quality-cleanup/evidence/adr-019.md` — the new entry rendered in full, plus `grep -i cycle docs/project_notes/decisions.md` and `grep -i type-only docs/project_notes/decisions.md` transcripts proving SC-005 `specs/199-code-quality-cleanup/evidence/adr-019.md`
- [ ] T075 [P] Capture TODO promotion audit at `specs/199-code-quality-cleanup/evidence/todo-promotion.md` — the two new issue URLs, before/after lines for both promoted TODOs, the audit note for `TODO(#137)`, and final `grep "TODO:"` / `grep "TODO(#"` / `grep "TODO(#NNN)"` transcripts proving SC-004 + SC-010 `specs/199-code-quality-cleanup/evidence/todo-promotion.md`
- [ ] T076 [P] Capture loader plotName evidence at `specs/199-code-quality-cleanup/evidence/loader-plotname.md` — vitest output showing the new test green, plus the revert-and-red sanity-check transcript from T044 proving the test is a real gate, plus a short note or screenshot from the manual UI check confirming the display name (not ID) appears in the loader (SC-006 + SC-011 + Contract 6 failure-mode check) `specs/199-code-quality-cleanup/evidence/loader-plotname.md`

### Media Content

- [ ] T080 Spawn the Content Specialist agent (`.claude/agents/media/content.md`) to write the shipped blog post at `specs/199-code-quality-cleanup/media/shipped-post.md`. Must follow the Shipped Post template; include What We Built, Key Lessons (knip drift trap → pinning + baseline methodology; silent-failure pattern → pre-push grep guard; test-first for the one runtime change), and What's Next (interface extraction for the VS Code cycles — already captured in ADR-019 as the eventual fix) `specs/199-code-quality-cleanup/media/shipped-post.md`
- [ ] T081 [P] Spawn the Content Specialist to write LinkedIn shipped summary at `specs/199-code-quality-cleanup/media/linkedin-shipped.md` — 150–200 words, strong hook on the "debt-repayment cadence" angle that matches the planning post, link placeholder to the shipped blog post `specs/199-code-quality-cleanup/media/linkedin-shipped.md`

### PR Creation

- [ ] T090 Create PR and publish blog: run `/speckit.pr`. This task MUST be the final task and depends on all evidence + media tasks being complete. It creates the feature PR in `debrief/debrief-future` with the evidence bundle in the description, and a companion PR in `debrief/debrief.github.io` publishing `shipped-post.md`.

**Task T090 must run last.** All evidence tasks (T070–T076) and media tasks (T080–T081) must be complete before T090 runs.

**Parallel**: T072/T073/T074/T075/T076 are all file-disjoint evidence tasks and can run in parallel after their respective phases complete. T081 can run in parallel with T080 (different files, different agent calls).

## Dependencies

### Story completion order (MVP → full)

All six user stories are architecturally independent (no story's output is an input to another), but for review-quality reasons ship in this order:

1. **Phase 1 (Setup)** — T001 → T002 (baseline must be captured before any file changes)
2. **Phase 2 (P1 — knip)** — depends on Phase 1 T002; independent of Phases 3–7
3. **Phase 3 (P1 — LogPanel)** — independent; can run in parallel with Phase 2 if pushing through multiple sessions
4. **Phase 4 (P2 — ADR)** — independent; doc-only change, pure addition to `decisions.md`
5. **Phase 5 (P2 — plotName)** — independent; only phase with a production behaviour change
6. **Phase 6 (P2 — TODO promotion)** — requires GitHub MCP access; independent of Phases 2–5 and 7
7. **Phase 7 (P3 — diff/ removal)** — independent; must run before Phase 2's knip verify if diff/ turns out to be referenced by knip config (unlikely but theoretically possible — verified in T061 sweep)
8. **Phase 8 (Polish)** — MUST run last; evidence tasks depend on their respective story phases being complete

### Critical task dependencies (within and across phases)

| Task | Depends on | Why |
|---|---|---|
| T012 | T010, T011 | `pnpm install` needs both the pin and the config to land first |
| T013 | T012, T002 | Diff compares pinned-version output on branch vs pinned-version baseline from T002 |
| T023 | T020 | Old interfaces can only be deleted after `LogPanelProps` has their fields |
| T024, T025 | T023 | Re-export lists cannot reference removed interfaces |
| T026 | T020–T025 | Final gate for Phase 3 |
| T041 | T040 | Test-first: fix only after the red test is written |
| T042 | T041 | Caller update follows the hook-signature change |
| T043 | T042 | Post-fix gate |
| T044 | T043 | Revert-and-red sanity check runs after the green state is reached |
| T053 | T051, T052 | Pre-push guard is the terminal check for Phase 6 |
| T062 | T060, T061 | `task verify` runs after deletion + sweep |
| T070 | Phases 2–7 done | Test summary captures the whole run, not a partial |
| T072 | T013 | knip diff evidence comes from the T013 run |
| T073 | T026 | LogPanel evidence comes from the Phase 3 gate |
| T074 | T031 | ADR extract comes from the landed entry |
| T075 | T053 | TODO evidence comes after the pre-push guard check |
| T076 | T044 | Loader evidence includes the revert-and-red transcript |
| T080, T081 | All evidence tasks T070–T076 | Shipped content references the evidence artefacts |
| T090 | Every other task | PR task is terminal |

### Parallel opportunities summary

- **Within Phase 3**: T021 ∥ T022; then T024 ∥ T025
- **Within Phase 6**: T051 ∥ T052 (file-disjoint promotions)
- **Within Phase 8**: T072 ∥ T073 ∥ T074 ∥ T075 ∥ T076 (evidence); T080 ∥ T081 (media)
- **Across phases**: Phases 2, 3, 4, 5, 6, 7 can each proceed independently after Phase 1 completes — the hard gate is Phase 8, which waits for all of them.

## Implementation Strategy

### Incremental delivery

This feature is a **single bundled PR** (FR-016) — no partial releases to users. However, implementation can still be incremental within the branch to keep each commit atomic and reviewable:

1. **Setup baseline** (Phase 1) — one commit: no code changes, just captures `/tmp/knip-main.txt` (not committed, used locally).
2. **knip infra** (Phase 2) — one commit landing `package.json` pin + `knip.json` + the verify transcript note.
3. **LogPanel consolidation** (Phase 3) — one commit for the whole phase (add-then-remove strictly within one commit so no intermediate "dead interface" state gets committed).
4. **ADR-019** (Phase 4) — one commit: doc-only.
5. **plotName fix + test** (Phase 5) — two commits allowed here: the RED test (T040) first to make the constitutional "tests before implementation" step visible in history, then fix + caller update + green gate in a second commit. Alternatively one commit — per Article VII either is acceptable, but the two-commit form reads better in code review.
6. **TODO promotion** (Phase 6) — two commits allowed: one per file-disjoint promotion (T051, T052). Each commit MUST include the final `TODO(#<real-number>):` text — never an intermediate `TODO(#TBD)` or `TODO(#NNN)` (Contract 5b).
7. **diff/ removal** (Phase 7) — one commit.
8. **Evidence + media** (Phase 8) — one or more commits; evidence files are additive.
9. **PR** (T090) — triggers `/speckit.pr`.

### Review-readiness checklist (from quickstart.md §4)

Before invoking T090, every box in `quickstart.md` §4 "Before-pushing checklist" MUST be ticked:

- [ ] `task verify` passes
- [ ] `knip` pinned exactly in `package.json`; `pnpm install` succeeds
- [ ] `pnpm exec knip` shows zero `specs/**` entries and non-specs findings unchanged vs baseline
- [ ] `grep -rn "LogTimelineProps\|LogByFeatureProps" shared/ apps/ services/` returns zero
- [ ] `shared/components/diff/` deleted with no surviving references
- [ ] `decisions.md` gains exactly one new ADR, discoverable by "cycle" and "type-only"
- [ ] `pnpm --filter @debrief/loader test` green and includes the new `useLoadWorkflow` regression test
- [ ] `grep -rn "TODO(#NNN)" apps/ services/ shared/` returns zero matches
- [ ] All `TODO(#...)` references in the diff resolve to **open** issues in `debrief/debrief-future`
- [ ] PR description lists the two new issue numbers and notes the `TODO(#137)` audit result

### Risk management

- **Knip `workspaces` config drift**: if T011's minimal `knip.json` won't run on this monorepo without additional fields, **do not** add broad ignore rules — instead add the narrowest workspace/entry stanzas that make knip understand the pnpm topology. Record what was added and why in `evidence/knip-report-diff.md`.
- **Caller of `executeLoad` not single**: if T042 finds multiple callers of `executeLoad`, update all of them in the same task — do not widen scope into a refactor.
- **Cycle set changes before merge**: if a concurrent PR resolves one of the VS Code cycles before this one merges, the FR-001 scope-down rule (in spec.md) and T030's re-verification ensure the ADR records only the cycles that actually still exist.
- **GitHub issue creation blocked**: if T051/T052 cannot create issues via MCP, the promotions must be deferred — the PR MUST NOT ship with literal `TODO(#TBD)` or `TODO(#NNN)` placeholders (T053 pre-push guard).
