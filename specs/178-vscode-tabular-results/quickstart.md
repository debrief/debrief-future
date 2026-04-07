# Quickstart — Tabular Results Panel (VS Code)

**Feature**: 178-vscode-tabular-results
**Audience**: Developers picking up the implementation, reviewers verifying it works.

This document is the *minimum* path to seeing the feature working end-to-end.

---

## Prerequisites

- Repo cloned and `pnpm install` / `uv sync` complete.
- `task verify` passes on `main`.
- A REP sample file under `demo/samples/` (e.g. `boat1.rep`).
- Python MCP debrief-calc server runs locally (handled automatically by the VS Code extension when launched).

## Build & launch

```sh
# 1. Build all workspaces (TypeScript + esbuild webview bundles)
pnpm build

# 2. Open the VS Code extension host
cd apps/vscode
code --extensionDevelopmentPath=$(pwd) ../..
```

In the dev host:

1. Open the demo workspace.
2. Open `boat1.rep` via the Debrief command palette (`Debrief: Import REP`).
3. The plot opens in the editor; the **Activity** sidebar appears.

## Verify each user story

### US1 — View tool results in a tabular panel (P1)

1. In the map, select a track.
2. From the Activity panel, run **track-stats**.
3. **Expected**: A new view container labelled **Results** appears in the panel area beneath the editor with one table tab showing track statistics. The tab has an unsaved indicator dot.
4. Run **range-bearing** with two selected tracks.
5. **Expected**: Two new tabs (Range, Bearing) appear in the same Results view as Vega-Lite charts.

### US2 — Save results as CSV with provenance (P1)

1. With the track-stats tab active, click **Save**.
2. **Expected**:
   - Toast: `Result saved: track-stats--<date>.csv`.
   - The unsaved dot disappears; the Save button is disabled.
   - The file appears under `<plot-dir>/assets/track-stats--<date>.csv`.
3. Run `cat .../assets/track-stats--*.csv` — confirm the CSV header + rows.
4. Open the analysis log (`.../prov/log.json` or via the LogPanel) and confirm:
   - The original `ToolRunEvent` for `track-stats` is present.
   - A new entry with `was_generated_by.tool === 'debrief.fileSave'` is present.
   - That entry's `used[0]` equals the `ToolRunEvent.activity_id`.

### US3 — Discover saved results via Layers toolbar (P2)

1. Open the Layers toolbar Associated Files dropdown (in the Activity panel).
2. **Expected**: The newly-saved CSV appears under a "Results" section.
3. The dropdown updates without manual refresh (no view reload).

### US4 — Act on saved result files (P2)

From the Associated Files dropdown, on the saved CSV:

| Click | Expected |
|-------|----------|
| **Open** | The CSV is parsed back into a flat dataset and reopens as a new tab in the Results panel (already in saved state). |
| **Reveal in Explorer** | VS Code's Explorer expands to the asset folder and selects the file. |
| **Open With** | VS Code's editor picker dialog appears. |
| **Delete** | A confirmation dialog appears; on confirm, the asset disappears from STAC and from disk. |

### US5 — Recover from tool errors (P3)

1. Trigger a failure (e.g. select a non-track feature and run a track-only tool, or kill the MCP server temporarily).
2. **Expected**: A new tab appears with the error message and a Retry button. No new entry appears in the analysis log.
3. Click **Retry**.
4. **Expected**: The tool re-invokes; on success the tab transitions to the unsaved-success state with a fresh dataset.

### Lifecycle — Plot close cleanup

1. Run a tool, do **not** save the result.
2. Note the orphan `ToolRunEvent` in the log.
3. Close the plot.
4. Reopen the plot.
5. **Expected**: The orphan `ToolRunEvent` is gone (or marked deleted, depending on `LogService.deleteEntry` semantics).
6. Run a tool, **save** the result, then close the plot.
7. **Expected**: Both the `ToolRunEvent` and its paired `FileSavedEvent` remain in the log on reopen.

---

## Run the test suite

```sh
# Unit tests for the new ResultsPanelService and LogService.recordFileSaved
pnpm --filter @debrief/vscode test
pnpm --filter @debrief/session-state test

# Shared utility tests (csv parser round-trip)
pnpm --filter @debrief/utils test

# Playwright E2E (real VS Code webview)
cd tests/e2e && node ../../apps/web-shell/run-playwright.mjs --grep 'tabular-results'
```

All four MUST pass before pushing.

## CI gate (the four steps from CLAUDE.md)

```sh
task verify
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Results panel never appears | First-result visibility message not sent | Check `ResultsPanelService.addDatasetsForToolResult` calls `postMessage(results:setVisibility, …)` |
| CSV save succeeds but dropdown empty | `ActivityPanelViewProvider.addResultFile` not called | Verify the `ResultsPanelService` constructor receives the activity panel provider |
| Save button enabled after save | Webview state stale | Confirm `postMessage(results:setTabs, …)` fires after `recordFileSaved` resolves |
| Retry duplicates the failed tab | Old tab not removed before re-running | Confirm `handleRetry` removes the failed tab before invoking `executeTool` |
| Orphan ToolRunEvent not cleaned | `SessionManager.onActiveSessionChange` handler not subscribed | Check `ResultsPanelService` constructor wires `sessionManager.onActiveSessionChange` |
