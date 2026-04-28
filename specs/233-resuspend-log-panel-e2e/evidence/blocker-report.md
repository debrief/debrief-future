---
feature: 233-resuspend-log-panel-e2e
captured_at: 2026-04-28
git_sha: ec81f2d
status: blocked
blocker: T020 local 5/5 verification failed
---

# Blocker report — T020 local Playwright run failed 5/5

This branch attempted the un-mute described in spec.md FR-001..FR-006 but hit
the explicit STOP-condition at task T020 (local 5/5 verification). Per the
spec's failure-mode guardrails:

> If T020 (local 5/5) fails: STOP. Do NOT commit. Spec §60 (Edge Cases)
> describes the narrow-mute fallback (per-test `test.fixme` for the
> persistently-failing tests, keep the rest active). If applied, this PR's
> scope changes — re-author the commit message and update FR-001 / SC-001 in
> spec.md before continuing.

The runtime changes that were applied while running T013..T019 have been
reverted on this branch so the next operator picks up a clean working tree.
Phase-2 (skip-guard restore) outputs remain on disk under `evidence/` for
diagnostic value but the script itself was not committed (it would fail the
existing fixme'd file and block lint).

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

## Triage notes

Looking at the saved error-context page snapshots under `test-results/`:

1. The **Activity Panel webview renders correctly** — the inner frame shows Time Controller, Tools, Layers, Properties. This is empirical evidence that #142's Patch 3 (`resolveWebviewView` visibility-gate fix) is working at least for `debrief.activityPanel`.
2. The **plot loads (or starts to)** — the page shows an `Info: Loading plot...` toast and the `Exercise Alpha` editor tab is selected.
3. **Test #1 fails before any `getMapFrame` call** — it goes `openPlotViaStacTree` → `getLogPanelFrame`, and `getLogPanelFrame` is what times out finding `[data-testid="log-panel"]`.
4. The error-context page snapshot for test #1 shows the command palette in `getLogPanelFrame` filled with the string `"Debrief Log: Focus on Debrief Log View"` and the result list reads `"No matching results"`. The fill targeted the QuickOpen file-search box (placeholder `Search files by name (append : to go to line or @ to go to symbol)`), not the command palette.
5. Tests #2–#5 fail later, on `mapFrame.locator('.leaflet-interactive').first().waitFor({ state: 'visible' })` — i.e. they get past `getLogPanelFrame` (or never call it before the map step) but the leaflet features never become visible. Whether the underlying cause is the same (webview-resolution still racy on the map iframe) or a different one (plot-data load failed) is not knowable from the snapshot alone.

Two competing hypotheses for the root cause:

- **(a) #142 partial resolution.** Patch 3 demonstrably works for `debrief.activityPanel` but the Log Panel iframe never finishes resolving content, leaving its `[data-testid="log-panel"]` undiscoverable. The map iframe also never renders Leaflet features. This is the spec.md §60 "#142 partially resolves" edge case.
- **(b) Stale command name in `getLogPanelFrame`.** `tests/e2e/models/code-server-page.ts:518` fills `"Debrief Log: Focus on Debrief Log View"`. The view in `apps/vscode/package.json` has `name: "Log"` inside the `debrief-log` (title `Debrief Log`) container; the auto-generated focus title is conventionally `<container-title>: Focus on <view-name> View` → `Debrief Log: Focus on Log View`. The test text duplicates `Debrief Log` and may have always been wrong, kept passing only by an older VS Code/openvscode-server quirk. Tests 2–5 going on to fail at `.leaflet-interactive` (not at `getLogPanelFrame`) is consistent with (b) — i.e. those tests get a frame match but the map stays empty for an unrelated reason — but it's also consistent with (a).

Either way, the spec is explicit that test bodies are out of scope (spec.md §131), so the fix does not belong in this PR.

## What was NOT changed in this branch's HEAD

To leave a clean tree for the next operator, the runtime un-mute (T013..T017, T019) was rolled back:

- `tests/e2e/test-log-panel.spec.ts` — `.fixme` mute and `#233` comment block restored.
- `Taskfile.yml` — skip-guard line and `#210/#233` comment block restored to pre-PR state.
- `tests/e2e/test-webview-probe.spec.ts` — restored from `git restore`.
- `scripts/check-log-panel-skip-guard.sh` — left in working tree (untracked) but **not committed**, since committing it without the un-mute would block lint indefinitely.

The BACKLOG status row remains `implementing` (commit `ec81f2d`) so this branch's intent is visible to anyone scanning the backlog. The status should be reverted to `blocked` if the team decides not to pursue the un-mute on this branch (see §"Recommended next steps" below).

## Recommended next steps

Per the spec's failure-mode guardrails (`tasks.md:254-257` and `quickstart.md` failure-modes table), the merge is blocked. Options:

1. **Investigate hypothesis (b) first** — fix `getLogPanelFrame` and `getWebviewFrame` to use the actual VS Code-generated focus command names (likely `Debrief Log: Focus on Log View` and `View: Show <container>`). The fix lives in `tests/e2e/models/code-server-page.ts`, not in the spec scope. If hypothesis (b) is right, T020 would pass and this PR can resume.
2. **Reopen #142** if (b) doesn't fix it — file a focused issue with this branch's `evidence/playwright-output.txt` + `evidence/blocker-report.md` attached, citing the activity-panel-renders / log-panel-doesn't / leaflet-features-don't asymmetry as the new evidence.
3. **Apply the spec §60 narrow-mute fallback** — keep tests 2..5 muted with per-test `test.fixme` and only un-mute test #1 if (b) fixes it. This reduces this PR to a partial un-mute and requires re-authoring FR-001 / SC-001 + the commit body.

The cleanest path is (1) → (2) — fix the test command names first, see what actually fails, then decide whether #142 truly is incomplete.

## Artefacts captured this run

- `evidence/playwright-output.txt` — raw 5/5 fail output
- `evidence/skip-guard-validation.txt` — pre-state and post-state proof that the restored skip-guard script's contract (FR-005) holds
- `evidence/muted-suite-triage.md` — orphan-helpers section appended (FR-006 follow-up note)
- `evidence/blocker-report.md` — this file
