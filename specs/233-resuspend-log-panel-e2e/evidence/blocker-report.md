---
feature: 233-resuspend-log-panel-e2e
captured_at: 2026-04-29
git_sha: af21109
status: blocked
blocker: T020 local 5/5 fails — webview service-worker registration fails for the LogPanel container
---

# Blocker report — T020 local Playwright run failed 5/5

This branch attempted the un-mute described in spec.md FR-001..FR-006 but hit
the explicit STOP-condition at task T020 (local 5/5 verification). Per the
spec's failure-mode runbook (`tasks.md:254-257`, `quickstart.md` failure-modes
table) the runtime un-mute changes have NOT been committed.

The investigation went deeper than the original report. Two distinct layers of
bugs were uncovered:

1. **Stale page-object helper bugs** (now identified) — `tests/e2e/models/code-server-page.ts` had three independent bugs that meant the LogPanel test could never reach the webview-content stage even on a healthy server. These were fixed locally to unblock the diagnostic, then reverted (kept clean — they belong in a small precursor PR; see §"Precursor PR" below).
2. **A real upstream blocker** — once the helper bugs are out of the way, the LogPanel container's webview fails to mount with `Error loading webview: Error: Could not register service worker`. Captured screenshot proof at `evidence/log-container-sw-error.png`. This is the genuine #142-class blocker.

## Environment

- **branch**: `claude/implement-speckit-233-eIUQu`
- **base**: `origin/main` at `623137a` (post-#142 — `7ef54ca Merge pull request #548` is in history)
- **server**: openvscode-server **v1.109.5** (matches CI), installed at `/opt/openvscode-server` and patched with `tests/e2e/scripts/patch-webview.sh` — all four patches reported "✓ ... applied successfully"
- **chromium**: bundled via `@sparticuz/chromium 143.0.4` (extracted to `/tmp/chromium`)
- **extension**: `apps/vscode/debrief-vscode-0.1.0.vsix` built from this branch and installed
- **invocation**: `pnpm exec playwright test --config tests/e2e/playwright.config.ts test-log-panel`

## Result

**5 failed / 0 passed / 0 skipped** (10 attempts including retries). Raw stdout is at `evidence/playwright-output.txt`.

| # | Test | Failure |
|---|------|---------|
| 1 | `log panel shows empty state when no tools have run` | `Webview frame with content "[data-testid="log-panel"]" not found after 15000ms` |
| 2 | `running a tool creates a log entry` | `locator.waitFor: Timeout 15000ms exceeded` waiting for `iframe.webview.ready ... .leaflet-interactive` |
| 3 | `log entries are shown most recent first` | same `.leaflet-interactive` timeout |
| 4 | `clicking a log entry selects it` | same `.leaflet-interactive` timeout |
| 5 | `clicking a selected log entry deselects it` | same `.leaflet-interactive` timeout |

## Layer 1 — Helper bugs (precursor-PR-shaped)

The page-object helper at `tests/e2e/models/code-server-page.ts` has three bugs that prevent the LogPanel test from ever reaching the webview-content stage. These were verified one at a time with throwaway diagnostic specs:

### Bug 1.1 — Missing `>` prefix on `commandInput.fill(...)`

`commandInput.fill('Some Command')` overwrites the `>` prefix that VS Code auto-inserts when the command palette is opened with `Ctrl+Shift+P`, dropping the user into QuickOpen file-search mode. `executeCommand()` (line 343) correctly prefixes; the four other call-sites do not:

| Line | Helper | Original fill |
|---|---|---|
| 304 | `openPlotViaCommand` | `'Debrief: Open Plot'` |
| 461 | `revealSidebar` | `'Debrief: Focus on Debrief View'` |
| 518 | `getLogPanelFrame` | `'Debrief Log: Focus on Debrief Log View'` |
| 636 / 650 | `focusAndExpandStacPane` | `'Focus on STAC Stores'` |

A throwaway `>Focus on Log` quickpick run confirmed: without the `>` prefix the input box's placeholder is `Search files by name (append : to go to line or @ to go to symbol)` and "Focus on Log" returns `No matching results`. With the `>` prefix, it returns `Debrief Log: Focus on Log View`.

### Bug 1.2 — Wrong command label for the LogPanel focus

VS Code auto-generates the focus command title as `<container.title>: Focus on <view.name> View`. For the `debrief-log` container (title "Debrief Log") + `debrief.logPanel` view (name "Log"), the actual title is `Debrief Log: Focus on Log View`. The helper typed `Debrief Log: Focus on Debrief Log View` — one redundant "Debrief Log".

The same bug exists at line 461 (`Debrief: Focus on Debrief View` should be `Debrief: Focus on Activity View`) and line 636 (`Focus on STAC Stores` → `Explorer: Focus on STAC Stores View`).

### Bug 1.3 — `getLogPanelFrame()` calls `openDebriefSidebar()` instead of clicking the Debrief Log activity-bar tab

`debrief-log` is a **separate** activity-bar container from `debrief`. `openDebriefSidebar()` clicks the Debrief icon (the wrong container). Even with the `>`-prefix and the correct command label, the LogPanel container's primary-sidebar slot is never activated because the focus command alone doesn't switch the active container in openvscode-server. The fix is to click the Debrief Log activity-bar tab first, then run the focus command.

### Verification of the fix path

After applying all three fixes locally, the LogPanel container DID become visible — the screenshot at `evidence/log-container-after-tab-click.png` shows the sidebar header "DEBRIEF LOG: LOG" and the Debrief Log tab in `[expanded] [selected]` state. Patch 3 from #142 demonstrably fires (other webview tests like `test-webview-resolve` and `test-tabular-results` pass).

But the test still fails — moving us to Layer 2.

## Layer 2 — Real blocker: `Could not register service worker`

The screenshot at `evidence/log-container-sw-error.png` (captured after `getLogPanelFrame()` ran with all three helper fixes applied) shows **two stacked error toasts**:

> ❌ Error loading webview: Error: Could not register service worker
> ❌ Error loading webview: Error: Could not register service worker

The Debrief Log container is open in the primary side bar with the heading "DEBRIEF LOG: LOG", but the body is empty — no iframe, no content. The webview tried to register its service worker (the SW interceptor that serves `vscode-cdn.net` content from local files — see `tests/e2e/scripts/patch-webview.sh:9-21`) and failed.

This happens AFTER `activityPanel` and `resultsPanel` already mounted (the `iframes` enumeration at the time of failure shows two `webview ready` iframes). It looks like a service-worker uniqueness or registration-race issue when a third+ webview iframe needs its SW registered.

This is a real residual #142-class issue. Patch 3 enables `resolveWebviewView` to fire, but the webview content path then runs into a new failure (the SW registration) that didn't surface for the activity / results panels because they registered first. The `test-webview-resolve` and `test-tabular-results` tests pass because they only exercise one or two webviews; the LogPanel test exercises a third.

## What was NOT changed in this branch's HEAD

The runtime un-mute (T013..T017, T019) and the helper fixes were rolled back so the next operator picks up a clean working tree. What's kept on this branch:

- Evidence files under `specs/233-resuspend-log-panel-e2e/evidence/`
- The BACKLOG row at status `implementing` (commit `ec81f2d`)

What's NOT kept:

- `tests/e2e/test-log-panel.spec.ts` un-mute (still fixme'd as on main)
- `Taskfile.yml` skip-guard re-wire (still has the `#210/#233` comment block)
- `tests/e2e/test-webview-probe.spec.ts` deletion (still present)
- `scripts/check-log-panel-skip-guard.sh` (committed it would block lint indefinitely without the un-mute)
- `tests/e2e/models/code-server-page.ts` helper fixes (Layer-1 bugs above — these belong in a precursor PR, not this one)

## Recommended next steps

Three independent units of work, in order:

1. **Precursor PR — fix the page-object helper bugs (Layer 1).**
   - Add `>` prefix to all four `commandInput.fill(...)` call-sites that target the command palette
   - Update three command labels to match what VS Code actually auto-generates
   - Make `getLogPanelFrame()` click the Debrief Log activity-bar tab before running the focus command
   - Tests under `tests/e2e/` that don't depend on the LogPanel webview rendering should pass after this PR. The five log-panel tests will still fail at Layer 2 — but the rest of the suite gets a useful correctness lift.

2. **Reopen #142 (or open a focused follow-up) — fix the service-worker registration for ≥3 sidebar webview containers (Layer 2).**
   Attach this branch's `evidence/log-container-sw-error.png` and `evidence/playwright-output.txt`. The bug is reproducible: openvscode-server v1.109.5 + `tests/e2e/scripts/patch-webview.sh` patches applied + a workspace with three or more webview-bearing containers (debrief, debrief-log, debrief-results). The SW failure surfaces specifically on the third webview's mount.

3. **Resume #233 — once 1 + 2 are merged.** This branch's spec, research.md, contracts, and triage table all still apply. The atomic-commit set (FR-001..FR-006) is unchanged.

The spec's failure-mode runbook anticipates exactly this contingency (spec.md §60 "#142 partially resolves" + tasks.md T020 STOP gate); the PR is merge-blocked until 1 + 2 land.

## Artefacts captured

- `evidence/blocker-report.md` — this file
- `evidence/playwright-output.txt` — raw 5/5 fail output
- `evidence/skip-guard-validation.txt` — pre/post-state proof that the restored skip-guard script (Phase 2) honours its contract
- `evidence/muted-suite-triage.md` — amended with the FR-006 orphan-helper finding
- `evidence/log-container-sw-error.png` — screenshot of the two stacked SW-registration toasts after `getLogPanelFrame` (with helper fixes applied)
- `evidence/log-container-after-tab-click.png` — screenshot showing the Debrief Log container DOES open correctly after the activity-bar click — it's the webview content path that fails


## Environment

- **branch**: `claude/implement-speckit-233-eIUQu`
- **base**: `origin/main` at `623137a` (post-#142 — `7ef54ca Merge pull request #548` is in history)
- **server**: openvscode-server **v1.109.5** (matches CI), installed at `/opt/openvscode-server` and patched with `tests/e2e/scripts/patch-webview.sh` — all four patches reported "✓ ... applied successfully"
- **chromium**: bundled via `@sparticuz/chromium 143.0.4` (extracted to `/tmp/chromium`)
- **extension**: `apps/vscode/debrief-vscode-0.1.0.vsix` built from this branch and installed into the openvscode user-data dir
- **invocation**: `pnpm exec playwright test --config tests/e2e/playwright.config.ts test-log-panel`

This matches the CI invocation in `.github/workflows/e2e.yml:193` (`npx playwright test --config tests/e2e/playwright.config.ts --grep-invert "Heroku"`) on every measurable axis.

## Result

**5 failed / 0 passed / 0 skipped** (10 attempts including the 1 retry per test in non-CI mode). Raw stdout is at `evidence/playwright-output.txt`.

| # | Test | Failure |
|---|------|---------|
| 1 | `log panel shows empty state when no tools have run` | `Webview frame with content "[data-testid="log-panel"]" not found after 15000ms` (the exact #142-symptom error) at `test-log-panel.spec.ts:17:22` |
| 2 | `running a tool creates a log entry` | `locator.waitFor: Timeout 15000ms exceeded` waiting for `iframe.webview.ready ... #active-frame ... .leaflet-interactive` at `test-log-panel.spec.ts:34:28` |
| 3 | `log entries are shown most recent first` | same `.leaflet-interactive` timeout at `:52:28` |
| 4 | `clicking a log entry selects it` | same `.leaflet-interactive` timeout at `:69:28` |
| 5 | `clicking a selected log entry deselects it` | same `.leaflet-interactive` timeout at `:88:28` |

