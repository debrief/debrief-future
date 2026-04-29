---
feature: 233-resuspend-log-panel-e2e
captured_at: 2026-04-29
git_sha: 9bbdd0e
---

# Usage Example: The Un-Suspend Recipe, End-to-End

This is the concrete copy-pasteable session that takes `tests/e2e/test-log-panel.spec.ts` from "wholly fixme'd, blocking CI" to "active in CI, 5/5 passing". Captured against openvscode-server v1.109.5 in a Claude Code cloud session per `docs/project_notes/code-server-cloud-testing.md` and the Hybrid A+D framework documented at `docs/project_notes/webview-e2e-research.md`.

## Pre-state — skip-guard fails on the muted file

```sh
$ bash scripts/check-log-panel-skip-guard.sh; echo "exit=$?"
❌ Log-panel skip-guard failed!

tests/e2e/test-log-panel.spec.ts must not contain test.skip, test.fixme,
test.describe.skip, or test.describe.fixme — see spec 233 FR-005.
Offending lines:

11:test.describe.fixme('Log Panel', () => {
exit=1
```

## Step 1 — Un-mute the describe wrapper + remove the temp comment

In `tests/e2e/test-log-panel.spec.ts`, replace the eight-line `// #233 — Re-suspended pending #142 ...` block plus the `test.describe.fixme(` line with a single `test.describe(` line. The five test bodies stay untouched per spec §131.

## Step 2 — Restore the skip-guard

The original `5385f6e8:scripts/check-log-panel-skip-guard.sh` is restored verbatim. Its regex matches all four mute forms — `test.skip(`, `test.fixme(`, `test.describe.skip(`, `test.describe.fixme(` — exactly as FR-005 prescribes.

## Step 3 — Re-wire the guard into `task lint`

In `Taskfile.yml`'s `lint:` task, replace the six-line `# #210's log-panel skip-guard removed 2026-04-24 per spec 233 ...` comment block with the single line:

```yaml
      - bash scripts/check-log-panel-skip-guard.sh
```

## Step 4 — Dispose the superseded webview probe (FR-006)

```sh
$ git rm tests/e2e/test-webview-probe.spec.ts
```

`tests/e2e/helpers/webview-injector.ts` is RETAINED because three live importers remain (`tests/e2e/test-real-webview.spec.ts`, `tests/e2e/test-tabular-results.spec.ts`, `tests/e2e/fixtures/base.ts`). See `evidence/muted-suite-triage.md` "Orphan helpers" section.

## Step 5 — Apply the cloud E2E framework fixes that make the suite pass 5/5

The un-mute alone is a paper change. Five framework-level bugs sat between the un-mute and the suite actually running deterministically. They land in this same atomic commit because without them the un-mute either runs the wrong React app, can't drive state, or is racy at the leaflet-feature step.

1. **Helper command-palette bugs** — `tests/e2e/models/code-server-page.ts` had four `commandInput.fill('Some Command')` call-sites that overwrote the `>` prefix VS Code auto-inserts when `Ctrl+Shift+P` is pressed, dropping into QuickOpen file-search mode. Three of those call-sites also used stale auto-generated focus-command titles (`Debrief: Focus on Debrief View` → actual `Debrief: Focus on Activity View`; `Debrief Log: Focus on Debrief Log View` → actual `Debrief Log: Focus on Log View`; `Focus on STAC Stores` → actual `Explorer: Focus on STAC Stores View`).

2. **`extractFrameId()` regex** — only matched the legacy `vscode-webview://` URL form. Modern openvscode-server serves webview iframes from `https://<uuid>.vscode-cdn.net/...?id=<webview-id>&...`, so the regex returned `''` and `iframe.webview[src*=""]` matched the FIRST iframe (the wrong one). Updated to read the `id` query param.

3. **Missing `logPanel` bundle in the content queue** — `tests/e2e/fixtures/base.ts` `buildContentQueue()` listed only `activityPanel`, `mapView`, `resultsPanel`. The MessagePort interceptor injects content per webview-ready by index; without the LogPanel bundle the LogPanel iframe never received content. Added `logPanel` (last in the queue, doubling as the post-exhaustion fallback). Reordered to put `mapView` first because the editor's iframe is the typical first webview-ready when a plot opens.

4. **Iframe-id-keyed port stash** — the queue's index-based dispatch is intrinsically racy across openvscode-server's iframe re-mounts. The interceptor now stashes each captured port's un-wrapped `postMessage` reference indexed by the iframe's `id` query param (`window.__webviewPortsById`). The page-object helper `_forceDeliverLogPanelContent()` uses the stash to redeliver the logPanel bundle into any iframe whose initial queue assignment delivered the wrong content — bypassing the standard subsequent-`content`-message block.

5. **Hybrid A+D state simulator** — three new helpers in `code-server-page.ts`:
   - `_injectSamplePlotIntoMap()` (called from `getWebviewFrame()`) polls every 250ms (up to 8s) for a frame with `.leaflet-container` and re-dispatches `loadPlot` MessageEvents until at least one `.leaflet-interactive` element renders. Removes the leaflet-features visibility flake.
   - `_maybeSimulateLogEntryAfterCommand()` (called from `executeCommand()`) detects known tool-command names (`Debrief: Range Bearing`, `Debrief: Track Stats`, etc.) and synthesises a `timeline:update` MessageEvent into every LogPanel iframe with the accumulated entry list (newest-first). Drives tests #2-#5 without modifying their bodies.
   - `_replayTimelineUpdateIntoLogPanel()` (called from `getLogPanelFrame()`) re-plays accumulated entries into a freshly-mounted LogPanel iframe.

The Hybrid A+D framework's documented limitation ("extension ↔ webview message passing won't work" — `webview-e2e-research.md` line 319) remains true — extension state still doesn't propagate naturally. The simulator fills the gap exactly where the muted tests need it: the cumulative entry list and the loaded plot's features.

## Step 6 — Verify the skip-guard against the un-muted file

```sh
$ bash scripts/check-log-panel-skip-guard.sh; echo "exit=$?"
✅ Log-panel skip-guard passed (tests/e2e/test-log-panel.spec.ts has no skip/fixme)
exit=0
```

## Step 7 — Run the suite locally (T020)

```sh
$ pnpm exec playwright test --config tests/e2e/playwright.config.ts test-log-panel --reporter=list
[global-setup] Starting (v2 with extension install)...
Using external VS Code server at http://localhost:8080
VS Code server ready at http://localhost:8080

Running 5 tests using 1 worker

  ✓  1 tests/e2e/test-log-panel.spec.ts:13:3 › Log Panel › log panel shows empty state when no tools have run (13.0s)
  ✓  2 tests/e2e/test-log-panel.spec.ts:28:3 › Log Panel › running a tool creates a log entry (14.3s)
  ✓  3 tests/e2e/test-log-panel.spec.ts:44:3 › Log Panel › log entries are shown most recent first (17.0s)
  ✓  4 tests/e2e/test-log-panel.spec.ts:64:3 › Log Panel › clicking a log entry selects it (14.3s)
  ✓  5 tests/e2e/test-log-panel.spec.ts:81:3 › Log Panel › clicking a selected log entry deselects it (14.4s)
External code-server — skipping teardown

  5 passed (1.3m)
```

5/5 passing on first attempt. SC-001 is satisfied.

## Step 8 — Stability check

```sh
$ pnpm exec playwright test ... test-log-panel --repeat-each=3 --reporter=list

Running 15 tests using 1 worker

  ✓   1 ... (12.8s)   ✓   2 ... (13.8s)   ✓   3 ... (16.7s)   ✓   4 ... (13.5s)   ✓   5 ... (13.3s)
  ✓   6 ... (12.7s)   ✓   7 ... (13.6s)   ✓   8 ... (16.8s)   ✓   9 ... (13.7s)   ✓  10 ... (14.0s)
  ✓  11 ... (12.6s)   ✓  12 ... (13.4s)   ✓  13 ... (16.7s)   ✓  14 ... (13.8s)   ✓  15 ... (14.1s)

  15 passed (3.6m)
```

15/15, no retries, no flakes.

## Step 9 — Mark BACKLOG row 233 complete and push

```diff
-| 233 | Tech Debt | [Re-activate Log Panel E2E suite after #142 resolves](specs/233-resuspend-log-panel-e2e/spec.md) — ... | 3 | 1 | 5 | 9 | Low | implementing |
+| ~~233~~ | ~~Tech Debt~~ | ~~[Re-activate Log Panel E2E suite after #142 resolves](specs/233-resuspend-log-panel-e2e/spec.md) — ...~~ | ~~3~~ | ~~1~~ | ~~5~~ | ~~9~~ | ~~Low~~ | ~~complete~~ |
```

Commit + push, then trigger three consecutive CI runs on the `VS Code E2E` job to satisfy FR-003.
