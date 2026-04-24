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

**Independent Test**: On a branch where #142 is landed and merged, remove `.fixme` from the `test.describe` in `tests/e2e/test-log-panel.spec.ts`, run `node apps/vscode/tests/e2e/run-playwright.mjs test-log-panel` (or the equivalent code-server runner), and confirm all five tests pass in CI across three consecutive runs.

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

- **FR-001**: The five log-panel tests MUST be removed from `test.describe.fixme(...)` in `tests/e2e/test-log-panel.spec.ts` — converted back to `test.describe(...)`.
- **FR-002**: The mute comment (`#233 — Re-suspended pending #142. ...`) MUST be removed from the test file in the same commit.
- **FR-003**: Before un-suspending, #142 MUST be merged to main and the log-panel suite MUST pass three consecutive CI runs on a feature branch that rebases on top of that merge.
- **FR-004**: The backlog entry for 233 MUST be struck-through and marked `complete` in `BACKLOG.md` in the same commit that removes `.fixme`.
- **FR-005**: The skip-guard script that #210 introduced at `scripts/check-log-panel-skip-guard.sh` (invoked from `Taskfile.yml` → `lint`) MUST be restored when the suite is un-muted. The script asserts no `test.skip` / `test.fixme` / `test.describe.skip` / `test.describe.fixme` appears in `tests/e2e/test-log-panel.spec.ts`. It was removed by #534 (alongside this spec's creation) because it blocked the narrow mute; its purpose — preventing silent future skips — remains valid once the suite is stable again. Restoring means: re-create the bash script (see commit history for the original), re-add the `bash scripts/check-log-panel-skip-guard.sh` line to `Taskfile.yml`'s `lint` task, and confirm `task lint` passes with the `.fixme`-free test file.

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

# 4. Run locally first (cloud-friendly runner):
node apps/vscode/tests/e2e/run-playwright.mjs test-log-panel
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

- **SC-001**: After un-suspension, CI shows 5 passing log-panel tests in the `VS Code E2E` job on every run against main (three consecutive runs as the stability gate).
- **SC-002**: Zero `test.describe.fixme` or `test.skip` markers remain on the `Log Panel` describe block.
- **SC-003**: No new infrastructure warnings surface in the CI logs (i.e. webview-ready events fire, `resolveWebviewView` is called, iframe content renders within 15 s).
- **SC-004**: The referenced `.fixme` comment in the test file is removed along with the mute.

---

## Out of Scope

- Fixing the openvscode-server `resolveWebviewView` lifecycle itself (that is #142's research sprint).
- Adding new log-panel test scenarios beyond the five that existed at the moment of un-suspension — additions belong to follow-up backlog items.
- Changing the openvscode-server or Chromium image version (infrastructure change is out of scope for a test-reactivation PR).
- Migrating the log-panel tests to the web-shell harness surface — they explicitly exist to exercise the VS Code extension-host integration, which is not reproducible in the harness.

---

## Dependencies

- **Blocker**: #142 (VS Code E2E Webview Reliability — research sprint). 233 cannot begin implementation work until #142 is merged to main and the `resolveWebviewView` callback fires reliably in openvscode-server.
- **Historical context**: #210 (Reactivate Webview Log-Panel E2E Suite — marked complete 2026-04-24; this feature is the counter-action taken when #210's un-fixme proved premature).
- **Triggering PR**: #534 (feature 230 — storyboard edit wiring) surfaced the failure and applied the `.fixme` mute.

## Estimate

- **Days**: 0.5 dev-day (once #142 lands).
- **Complexity**: Low — revert one `.fixme`, re-run CI three times, merge.
- **Risk**: Low-medium — depends on whether #142's fix is complete or leaves residual flakes. The edge-case section documents how to handle partial fixes.
