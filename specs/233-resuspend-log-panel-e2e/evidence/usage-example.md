---
feature: 233-resuspend-log-panel-e2e
captured_at: 2026-04-29
git_sha: 4ce7b09
---

# Usage Example: The Un-Suspend Recipe, End-to-End

This is the concrete copy-pasteable session that takes `tests/e2e/test-log-panel.spec.ts` from "wholly fixme'd, blocking CI" to "active in CI, 1 passing + 4 narrow-fixme'd with follow-up". Captured against openvscode-server v1.109.5 in a Claude Code cloud session per `docs/project_notes/code-server-cloud-testing.md` and the Hybrid A+D framework documented at `docs/project_notes/webview-e2e-research.md`.

## Pre-state — skip-guard fails on the muted file

```sh
$ bash scripts/check-log-panel-skip-guard.sh; echo "exit=$?"
❌ Log-panel skip-guard failed!

tests/e2e/test-log-panel.spec.ts must not contain test.describe.skip or
test.describe.fixme — those mute the entire suite.
Per-test test.fixme(...) is allowed (see spec 233 §60).
Offending lines:

11:test.describe.fixme('Log Panel', () => {
exit=1
```

## Step 1 — Un-mute the describe wrapper + remove the temp comment

In `tests/e2e/test-log-panel.spec.ts`, replace the eight-line `// #233 — Re-suspended pending #142 ...` block plus the `test.describe.fixme(` line with a single `test.describe(` line:

```diff
 import { test, expect } from './fixtures/base';
-
-// #233 — Re-suspended pending #142. After #210 un-fixme'd this suite,
-// the underlying openvscode-server webview-frame-resolution flakiness
-// (#142 research sprint) kept causing `Webview frame with content
-// "[data-testid=\"log-panel\"]" not found after 15000ms` errors in CI.
-// Every PR touching any webview code inherited the failure. The fix is
-// owned by #142 (root-cause investigation); this `.fixme` is a temporary
-// mute so unrelated PRs can land. See `specs/233-resuspend-log-panel-e2e/`
-// for the un-mute recipe once #142 resolves.
-test.describe.fixme('Log Panel', () => {
+
+test.describe('Log Panel', () => {
```

## Step 2 — Apply spec §60 narrow-mute to the four state-dependent tests

Each of tests #2–#5 (`running a tool creates a log entry`, `log entries are shown most recent first`, `clicking a log entry selects it`, `clicking a selected log entry deselects it`) becomes `test.fixme(...)`. Add a single comment block above test #2 explaining the Hybrid A+D limitation that drives the per-test mutes; the follow-up tracker is `evidence/followup-test-state-injection.md`.

## Step 3 — Restore the skip-guard with the narrowed regex

The original `5385f6e8:scripts/check-log-panel-skip-guard.sh` blocked all four mute forms (`test.skip(`, `test.fixme(`, `test.describe.skip(`, `test.describe.fixme(`). Per the §60 fallback, the restored guard's regex narrows to the **describe-level** forms only:

```bash
VIOLATIONS=$(grep -nE '^\s*test\.describe\.(skip|fixme)\s*\(' "$TARGET" || true)
```

The narrowing rationale + updated message is documented in the script header. Per-test `test.fixme(...)` is now expected for the four post-#142 narrow mutes; the wholesale `test.describe.fixme` shape is what the guard catches.

## Step 4 — Re-wire the guard into `task lint`

In `Taskfile.yml`'s `lint:` task, replace the six-line `# #210's log-panel skip-guard removed 2026-04-24 per spec 233 ...` comment block with the single line:

```yaml
      - bash scripts/check-log-panel-skip-guard.sh
```

## Step 5 — Dispose the superseded webview probe (FR-006)

```sh
$ git rm tests/e2e/test-webview-probe.spec.ts
```

`tests/e2e/helpers/webview-injector.ts` is RETAINED because three live importers remain (`tests/e2e/test-real-webview.spec.ts`, `tests/e2e/test-tabular-results.spec.ts`, `tests/e2e/fixtures/base.ts`). See `evidence/muted-suite-triage.md` "Orphan helpers" section.

## Step 6 — Apply the cloud E2E framework fixes that make the suite actually run

Three independently-real bugs in `tests/e2e/models/code-server-page.ts` (the page-object helper) blocked the LogPanel from ever rendering in the cloud E2E framework. They land in this same atomic commit because without them the un-mute is a paper change:

1. **Missing `>` prefix on `commandInput.fill(...)`** (lines 304, 461, 518, 636 / 650). VS Code's QuickInput auto-inserts `>` when `Ctrl+Shift+P` is pressed; `fill()` overwrites it and drops the test into QuickOpen file-search mode.
2. **Stale auto-generated focus-command titles**. `Debrief: Focus on Debrief View` → actual is `Debrief: Focus on Activity View`. `Debrief Log: Focus on Debrief Log View` → actual is `Debrief Log: Focus on Log View`. `Focus on STAC Stores` → actual is `Explorer: Focus on STAC Stores View`.
3. **`extractFrameId()` regex matches `vscode-webview://` only**, but in modern openvscode-server webview iframe URLs are `https://<uuid>.vscode-cdn.net/...?id=<webview-id>&...`. Updated to read the `id` query parameter.

A fourth fix lives in `tests/e2e/fixtures/base.ts` `buildContentQueue()`: the LogPanel bundle was missing from the queue. The MessagePort interceptor injects content per webview-ready by index; without the LogPanel bundle the LogPanel iframe never received its content.

A fifth fix lives in `getLogPanelFrame()`: after the helper returns the frame, it dispatches a synthesised `session:change` MessageEvent inside the iframe so the LogPanel React app exits its initial `log-panel-empty-no-plot` state — Hybrid A+D doesn't propagate the real extension's session message.

## Step 7 — Verify the skip-guard against the un-muted file

```sh
$ bash scripts/check-log-panel-skip-guard.sh; echo "exit=$?"
✅ Log-panel skip-guard passed (tests/e2e/test-log-panel.spec.ts has no describe-level skip/fixme)
exit=0
```

## Step 8 — Run the suite locally (T020)

```sh
$ pnpm exec playwright test --config tests/e2e/playwright.config.ts test-log-panel --reporter=list
[global-setup] Starting (v2 with extension install)...
Using external VS Code server at http://localhost:8080
VS Code server ready at http://localhost:8080

Running 5 tests using 1 worker

  ✓  1 tests/e2e/test-log-panel.spec.ts:13:3 › Log Panel › log panel shows empty state when no tools have run (10.0s)
  -  2 tests/e2e/test-log-panel.spec.ts:39:8 › Log Panel › running a tool creates a log entry
  -  3 tests/e2e/test-log-panel.spec.ts:55:8 › Log Panel › log entries are shown most recent first
  -  4 tests/e2e/test-log-panel.spec.ts:75:8 › Log Panel › clicking a log entry selects it
  -  5 tests/e2e/test-log-panel.spec.ts:92:8 › Log Panel › clicking a selected log entry deselects it
External code-server — skipping teardown

  4 skipped
  1 passed (11.9s)
```

The skipped four match the per-test `test.fixme(...)` markers — Playwright reports them as `-` (skipped/pending). The total is 1 passed, 0 failed, 4 skipped. SC-001 (1+ passing, 0 failing) is satisfied.

## Step 9 — Mark BACKLOG row 233 complete and push

```diff
-| 233 | Tech Debt | [Re-activate Log Panel E2E suite after #142 resolves](specs/233-resuspend-log-panel-e2e/spec.md) — ... | 3 | 1 | 5 | 9 | Low | implementing |
+| ~~233~~ | ~~Tech Debt~~ | ~~[Re-activate Log Panel E2E suite after #142 resolves](specs/233-resuspend-log-panel-e2e/spec.md) — ...~~ | ~~3~~ | ~~1~~ | ~~5~~ | ~~9~~ | ~~Low~~ | ~~complete~~ |
```

Commit + push, then trigger three consecutive CI runs on the `VS Code E2E` job to satisfy FR-003.
