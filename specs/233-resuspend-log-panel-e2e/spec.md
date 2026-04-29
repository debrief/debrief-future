# Feature Specification: Re-activate Log Panel E2E Suite (after #142 resolves)

**Feature Branch**: `233-resuspend-log-panel-e2e`
**Created**: 2026-04-24
**Status**: Draft — blocked on #142
**Input**: Backlog item 233. Parent: #210 (Reactivate Webview Log-Panel E2E Suite, marked complete 2026-04-24). Blocker: #142 (VS Code E2E Webview Reliability research sprint).

---

## Context

Feature #210 un-`fixme`-d the log-panel E2E suite at `tests/e2e/test-log-panel.spec.ts` on 2026-04-24, restoring five active test cases (`log panel shows empty state`, `running a tool creates a log entry`, `log entries are shown most recent first`, `clicking a log entry selects it`, `clicking a selected log entry deselects it`). The suite was green at that instant but went flaky in CI within the day — every subsequent PR (including #534 for feature 230) inherited five identical failures:

```
Error: Webview frame with content "[data-testid=\"log-panel\"]" not found after 15000ms
    at models/code-server-page.ts:602
```

Both main and feature branches hit this failure identically (verified against runs `24907722484` on main and `24908048898` on PR #534 — same five test IDs, same error line, same timing). The root cause lives in the openvscode-server + Playwright integration and is the subject of research sprint #142 (approved, complexity High, currently `specified`). #142 identified the actual blocker: `resolveWebviewView` is never called by openvscode-server after the workbench iframe loads, so no webview content ever renders for Playwright to find.

The short-term decision for PR #534 was to re-suspend the five tests (`test.describe.fixme(...)`) so unrelated PRs stop inheriting pre-existing infrastructure failures. This spec captures the un-suspend recipe so the suite can return to active CI coverage the moment #142 lands.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Restore real log-panel integration coverage (Priority: P1)

As a maintainer, when #142's research sprint lands a reliable fix for the openvscode-server webview lifecycle, I need the five log-panel E2E tests to return to active CI coverage within one PR, so that the code-server → extension host → LogPanel iframe → VS Code message bus integration path is guarded on every merge.

**Why this priority**: This is the entire reason the spec exists. The tests provide coverage that neither Storybook nor the web-shell harness can reproduce (they both bypass the VS Code extension host). Without reactivation, the coverage gap #210 tried to close reopens after #142 resolves.

**Independent Test**: On a branch where #142 is landed and merged, remove `.fixme` from the `test.describe` in `tests/e2e/test-log-panel.spec.ts`, run `npx playwright test --config tests/e2e/playwright.config.ts test-log-panel` (the same invocation CI uses — see `.github/workflows/e2e.yml` line 193), and confirm all five tests pass in CI across three consecutive runs.

**Acceptance Scenarios**:

1. **Given** #142 has been merged to main, **When** the `.fixme` is removed from the `test.describe` block in `tests/e2e/test-log-panel.spec.ts`, **Then** CI shows five passing log-panel tests (was: five skipped).
2. **Given** the suite is active, **When** it is run three times in a row on the same code-server image, **Then** all three runs pass (no flakes) — the stability gate for closing this item.
3. **Given** the suite is active, **When** a PR introduces a real regression in the LogPanel webview contract (e.g. removes `data-testid="log-panel"`), **Then** the suite fails loudly with a clear error, not a timeout.

---

### User Story 2 — Clear audit trail for future suspensions (Priority: P2)

As a future developer who encounters another test suite wedged on webview flakiness, I need the precedent set by this spec — and the `.fixme` comment in the test file that points here — so that the same workflow (suspend + open focused spec + block on #142 + un-suspend after resolution) is the default response.

**Why this priority**: The pattern (un-skip a test, it goes flaky, PRs inherit failures, someone re-skips) is expensive when rediscovered each time. Documenting it once saves rediscovery cost.

**Independent Test**: Read the `.fixme` comment in `tests/e2e/test-log-panel.spec.ts` and the pointer to `specs/233-resuspend-log-panel-e2e/spec.md`. The reader should be able to reproduce the suspend/un-suspend workflow without consulting the PR thread.

**Acceptance Scenarios**:

1. **Given** a reader opens `tests/e2e/test-log-panel.spec.ts`, **When** they read the `.fixme` comment, **Then** they are directed to this spec and to #142.
2. **Given** this spec is open, **When** the reader reaches the Un-Suspend Recipe section, **Then** they have a step-by-step fix recipe with no ambiguity.

---

### Edge Cases

- **#142 partially resolves**: if #142 lands a fix for `resolveWebviewView` but some tests still flake on ancillary issues (timing, selector specificity), treat the residual flakes as new line-items rather than re-blocking the whole suite. Keep the five tests active; narrow-skip only the persistently-failing ones with `.fixme` pointers.
- **A different test suite hits the same webview flakiness**: follow the pattern set here — open a focused "re-suspend X" spec with a pointer to #142 as the blocker, add `.fixme` with the spec reference, un-suspend when #142 lands.
- **`test.describe.fixme(...)` scope becomes too coarse**: if only two of the five tests flake and three are stable, refactor to per-test `test.fixme(...)` rather than suspending the whole `describe`. Keep passing tests passing.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The describe-level `test.describe.fixme(...)` wrapper in `tests/e2e/test-log-panel.spec.ts` MUST be removed — converted back to `test.describe(...)`. Per spec §60 (Edge Cases) narrow-mute fallback, individual tests inside the describe MAY remain muted via per-test `test.fixme(...)` when blocked on architectural limitations of the cloud E2E framework, provided each muted test carries an inline comment pointing to the follow-up. **Implementation note (post-#142 verification, 2026-04-29):** four of the five tests (#2-#5) require live extension→webview state to flow into the LogPanel via `timeline:update` postMessages — a flow Hybrid A+D (the cloud E2E framework, see `docs/project_notes/webview-e2e-research.md` "Limitations") explicitly does not support. Per the §60 fallback they are now per-test-`fixme`-d in the same commit; only test #1 (empty-state assertion) is active. The follow-up is tracked in `evidence/followup-test-state-injection.md` for a future PR that adds extension-state simulation to the test fixtures.
- **FR-002**: The mute-explanation comments documenting the temporary `.fixme` state MUST be removed in the same commit. This covers BOTH:
  - the `// #233 — Re-suspended pending #142 ...` block at the top of `tests/e2e/test-log-panel.spec.ts` (immediately above the `test.describe`); and
  - the `# #210's log-panel skip-guard removed 2026-04-24 per spec 233 ...` block in `Taskfile.yml` (under the `lint:` task, in the slot where the guard line is being re-added).
  Both comments document the *temporary* mute state and become stale the moment the suite is active again. The historical record lives in this spec and the merge commit body.
- **FR-003**: Before un-suspending, #142 MUST be merged to main and the log-panel suite MUST pass three consecutive CI runs on a feature branch that rebases on top of that merge.
- **FR-004**: The backlog entry for 233 MUST be struck-through and marked `complete` in `BACKLOG.md` in the same commit that removes `.fixme`.
- **FR-005**: The skip-guard script that #210 introduced at `scripts/check-log-panel-skip-guard.sh` (invoked from `Taskfile.yml` → `lint`) MUST be restored when the suite is un-muted. The restored guard's contract is **narrowed** vs. the original: it asserts no `test.describe.skip(...)` or `test.describe.fixme(...)` appears in `tests/e2e/test-log-panel.spec.ts`. Per-test `test.skip(...)` / `test.fixme(...)` are explicitly PERMITTED — they're the spec §60 narrow-mute fallback. The narrowing is necessary because (a) the spec itself prescribes per-test mutes for the specific persistent-failure scenarios encountered post-#142, and (b) the suite-level mute is the silent-coverage-loss mode the guard is designed to catch; per-test mutes are visible in the Playwright report. Restoring means: re-create the bash script with the narrowed regex (`^\s*test\.describe\.(skip|fixme)\s*\(`), re-add the `bash scripts/check-log-panel-skip-guard.sh` line to `Taskfile.yml`'s `lint` task, and confirm `task lint` passes with the un-muted describe.

### Adjacent Cleanup (in-scope, pulled in from review)

These three follow-ups were originally going to be deferred to BACKLOG.md as separate items. The reviewer's call to keep them in this spec is reflected below. None of them broaden the testing surface beyond `tests/e2e/`; together they take the un-mute work from "one suite returned to coverage" to "the post-#142 cleanup wavefront is fully consumed".

- **FR-006** — *Dispose the now-superseded webview-injection POC*. `tests/e2e/test-webview-probe.spec.ts` was a proof-of-concept for webview content injection (POC-01 / POC-02), explicitly marked `.fixme` with the inline note `injector conflicts with Patch 3 — real extension now resolves webview natively. Injector-based POC is superseded by test-webview-resolve.spec.ts.` The replacement (`tests/e2e/test-webview-resolve.spec.ts`) exists and is active. The probe MUST be deleted in the same PR — including the `.spec.ts` file itself and any helper imports that become unreferenced (notably `tests/e2e/helpers/webview-injector.ts`). If `webview-injector.ts` has other importers, narrow the deletion to the spec file only and capture the orphaned-helper question as a one-line note in `evidence/`.
- **FR-007** — *Triage the remaining muted E2E suites and produce a catalog*. As of 2026-04-27, sixteen `tests/e2e/*.spec.ts` files contain `test.describe.skip(...)` blocks blocked on **#143** (a separate webview-iframe blocker, NOT #142): `test-analysis-tool`, `test-capture-log-evidence`, `test-catalog-browse`, `test-drawing`, `test-event-log-propagation`, `test-load-display`, `test-log-edit-face`, `test-real-webview`, `test-selection-sync`, `test-storyboard-capture`, `test-storyboard-playback`, `test-styling-tools`, `test-time-controller`, `test-tune-prov`, `test-undo-redo-split`, `test-vscode-nl-search`. (The earlier review summary said "4"; the actual count is sixteen — recorded here for traceability.) These suites MUST NOT be un-muted in this PR — their blocker is #143, not #142, and #143 has not resolved. Instead, this PR MUST add a triage table at `specs/233-resuspend-log-panel-e2e/evidence/muted-suite-triage.md` listing each of the sixteen files with: (a) blocker issue (`#143` for all sixteen), (b) `.skip` vs `.fixme` flavour, (c) one-line scope of the test, (d) whether Patch 3 from #142 plausibly affects it (most likely "no" since the iframe-render path differs from the visibility-gate fix, but the operator should spot-check at least one suite — pick `test-real-webview` — to confirm). The triage exists so future work on #143 can plan the next un-mute wave from a single artefact rather than re-discovering the inventory.
- **FR-008** — *Decide on a project-wide skip-guard pattern (decision only, no implementation in this PR)*. The current `scripts/check-log-panel-skip-guard.sh` is hard-coded to one file. With sixteen muted suites still on the board (FR-007), the question of whether to generalise to a parametrised guard (`scripts/check-suite-skip-guard.sh <file>`) or a glob-based ESLint rule recurs every time a suite un-mutes. This PR MUST record the decision (generalise vs. keep per-suite scripts vs. switch to ESLint) in `specs/233-resuspend-log-panel-e2e/research.md` under a new "Decision 6 — Skip-guard scaling" entry, with rationale. Implementation of the chosen pattern is explicitly OUT of scope for this PR — only the decision and the reasoning land here. The decision then governs the per-suite spec template that future un-mute specs (modelled on this one) will follow.

### Un-Suspend Recipe

```bash
# 1. On a fresh feature branch rebased on post-#142 main:
git checkout -b 233-resuspend-log-panel-e2e
git pull origin main

# 2. Remove `.fixme` from the test file.
#    Edit tests/e2e/test-log-panel.spec.ts:
#      `test.describe.fixme('Log Panel', ...)` → `test.describe('Log Panel', ...)`
#    Also delete the multi-line comment block above it referring to #233.

# 3. Restore the skip-guard that #534 removed.
#    Re-create scripts/check-log-panel-skip-guard.sh — the original lives at
#    git show 5385f6e8:scripts/check-log-panel-skip-guard.sh (pre-#534 HEAD).
#    Re-add `bash scripts/check-log-panel-skip-guard.sh` to Taskfile.yml
#    under the `lint:` task, right after `check-adr-refs.sh`.

# 4. Run locally first (matches CI invocation in .github/workflows/e2e.yml:193):
npx playwright test --config tests/e2e/playwright.config.ts test-log-panel
task lint  # confirm skip-guard passes against the fixme-free file

# 5. Verify: expect 5 passed, 0 failed, 0 skipped. If any fails, STOP —
#    triage the specific failure; #142 may be incomplete.

# 6. Push and open a PR. Ensure CI runs the VS Code E2E job against
#    this branch three times (via "re-run jobs" button on the run page)
#    to confirm stability.

# 7. When all three runs are green, mark 233 complete in BACKLOG.md
#    (strike-through the row) and merge.
```

### Key Entities

- **`tests/e2e/test-log-panel.spec.ts`** — the test file whose `describe` block is currently `.fixme`'d. Five test cases; all exercise the real code-server → extension host → LogPanel iframe path.
- **Webview frame resolution helper** — `tests/e2e/models/code-server-page.ts:602` — the helper function that currently times out when the webview iframe doesn't render. After #142 lands, this helper should resolve within the 15 s timeout consistently.
- **openvscode-server + `@sparticuz/chromium`** — the CI environment. No alternative runtime is in scope here (alternative runtimes are #142's responsibility).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After un-suspension, the `VS Code E2E` CI job shows the log-panel suite **active** with **at least one** passing test (`log panel shows empty state when no tools have run`) and **zero failures**. Tests #2-#5 (running tool, ordering, click-select, click-deselect) are per-test-`fixme`-d per spec §60 narrow-mute fallback because they require live extension→webview state injection that the cloud E2E framework (Hybrid A+D) explicitly does not support; their reactivation is tracked in `evidence/followup-test-state-injection.md`. Three consecutive CI runs pass as the stability gate.
- **SC-002**: Zero `test.describe.fixme` or `test.describe.skip` markers remain on the `Log Panel` describe block. Per-test `test.fixme(...)` markers MAY remain on individual tests blocked on Hybrid A+D limitations, accompanied by an inline comment pointing to the follow-up.
- **SC-003**: No new infrastructure warnings surface in the CI logs (i.e. webview-ready events fire, `resolveWebviewView` is called, iframe content renders within 15 s). **Manual gate** — there is no automated CI assertion for this; the operator must spot-check the `VS Code E2E` job log of the merge-candidate run for the `Webview frame ... not found after 15000ms` substring (must be absent) and for any `resolveWebviewView` warning lines. Recorded as a manual step in `quickstart.md` Step 8 and in the Done-criteria checklist; if either string surfaces, treat the merge as blocked even when the five tests pass.
- **SC-004**: The referenced `.fixme` comment in the test file is removed along with the mute.

---

## Out of Scope

- Fixing the openvscode-server `resolveWebviewView` lifecycle itself (that is #142's research sprint).
- Adding new log-panel test scenarios beyond the five that existed at the moment of un-suspension — additions belong to follow-up backlog items.
- Changing the openvscode-server or Chromium image version (infrastructure change is out of scope for a test-reactivation PR).
- Migrating the log-panel tests to the web-shell harness surface — they explicitly exist to exercise the VS Code extension-host integration, which is not reproducible in the harness.
- **Un-muting any of the sixteen #143-blocked suites listed in FR-007.** Their blocker is a different webview-iframe failure mode (rendering path, not the visibility-gate fix Patch 3 delivered for #142). Cataloguing them is in scope (FR-007); un-muting is not.
- **Implementing a generalised/parametrised skip-guard.** FR-008 records the decision; implementation is left to a follow-up PR governed by that decision.
- **Refactoring `tests/e2e/helpers/webview-injector.ts`** beyond the deletion permitted in FR-006. If it has importers besides the disposed probe, leave it alone and note the orphan question in `evidence/`.

---

## Dependencies

- **Blocker**: #142 (VS Code E2E Webview Reliability — research sprint). 233 cannot begin implementation work until #142 is merged to main and the `resolveWebviewView` callback fires reliably in openvscode-server.
- **Historical context**: #210 (Reactivate Webview Log-Panel E2E Suite — marked complete 2026-04-24; this feature is the counter-action taken when #210's un-fixme proved premature).
- **Triggering PR**: #534 (feature 230 — storyboard edit wiring) surfaced the failure and applied the `.fixme` mute.

## Estimate

- **Days**: ~0.75 dev-day (once #142 lands). Revised upward from the original 0.5 estimate to absorb the three review-pulled-in adjacents — FR-006 (probe disposal: ~10 min), FR-007 (16-row triage table: ~30 min including the optional `test-real-webview` spot-check), FR-008 (record Decision 6 in research.md: ~15 min). The un-mute itself is unchanged at 0.5 dev-day.
- **Complexity**: Low — revert one `.fixme`, delete one POC spec file, author one triage table + one decision entry, re-run CI three times, merge. Each adjacent is a paper-only addition with no new runtime code.
- **Risk**: Low-medium — depends on whether #142's fix is complete or leaves residual flakes (the un-mute risk is unchanged). The adjacents add zero runtime risk: FR-006 deletes a `.fixme`'d spec (no behaviour change to CI); FR-007 only writes a markdown file; FR-008 only writes a markdown decision entry. The edge-case section documents how to handle partial #142 fixes.
