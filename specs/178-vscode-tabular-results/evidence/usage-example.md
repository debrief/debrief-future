# Usage Example — Tabular Results Panel in VS Code

**Feature**: 178-vscode-tabular-results
**Captured at**: 2026-04-08

This walkthrough exercises the P1 and P2 user stories end-to-end inside
the VS Code extension.

## Prerequisites

- Debrief VS Code extension built and installed
- A STAC store configured with at least one plot (e.g. a REP sample)
- `debrief-calc` available (for running `track-stats` / `range-bearing`)

## Walkthrough

### 1. Open a plot (US1 prereq)

1. In the Debrief activity sidebar, expand the STAC Stores tree.
2. Double-click an item (e.g. `sample-track.json`).
3. The Map view opens.  The bottom **Debrief Results** panel is **hidden**
   (no tab placeholder — FR-004).

### 2. Run `track-stats` against a single track (US1)

1. Click a track on the map to select it.
2. Open the **Tools** section in the Activity panel.
3. Click **track-stats** (or use the Command Palette → `Debrief: Track Stats`).
4. Wait for the spinner to complete.
5. The **Debrief Results** panel (bottom dock) **appears** with a single
   table tab labelled with the tool's output name (e.g. "Stats").
6. The tab carries an **unsaved-dot indicator**.

**Expected panel content**: a two-column table of metric / value rows.

### 3. Run `range-bearing` against two tracks (US1)

1. Shift-click a second track on the map.
2. Click **range-bearing** in the Activity panel Tools.
3. The Results panel now has **three tabs**: the existing Stats table
   plus **Range** and **Bearing** chart tabs (each with the unsaved dot).

### 4. Close a tab (US1)

1. Click the `×` on the Range tab.  The tab is removed; Bearing and Stats remain.
2. Click the `×` on Bearing → Stats is still visible.
3. Click the `×` on Stats → the panel **collapses** (hidden again, FR-006).

### 5. Save a result as CSV (US2)

1. Re-run `track-stats` to create a new unsaved tab.
2. Click **Save** in the tab-bar toolbar (right side).
3. A VS Code information toast appears: "Saved track-stats--YYYY-MM-DDTHH-MM-SS.csv".
4. The unsaved dot **disappears** from the tab.
5. The **Save** button becomes disabled (FR-012).
6. On disk, a new file exists at `<plot-dir>/assets/track-stats--<date>.csv`.
7. The plot's STAC item JSON now contains an `assets` entry for this file,
   with `roles: ['result']` and `debrief:parentActivityId` metadata.
8. The analysis log contains a new `FileSavedEvent` LogEntry:
   - `was_generated_by.tool === 'debrief.fileSave'`
   - `used[0]` equals the ToolRunEvent's `activity_id`
   - `generated[0] === 'assets/track-stats--<date>.csv'`

### 6. Save with a custom name (US2 — Save As)

1. Run `track-stats` again.
2. Click **Save As**.
3. An inline form appears below the tab bar with Name and Tag inputs.
4. Type `my-stats` in Name, `v2` in Tag.  Click **OK**.
5. The file is written as `my-stats--v2.csv`.

### 7. Find the saved file in the Layers toolbar (US3)

1. Click the **Associated Files** dropdown in the Layers toolbar.
2. The newly saved CSV appears under a "Results" group — **no manual refresh
   required** (FR-014).

### 8. Open a saved CSV as a tab (US4 — Open action)

1. In the Associated Files dropdown, click **Open** on the saved CSV.
2. A new tab appears in the Results panel, parsed from the CSV via
   `parseCsvToTableDataset`.  The tab is in `saved` state immediately
   (no unsaved dot, Save disabled).

### 9. Reveal in Explorer (US4)

1. In the Associated Files dropdown, click **Reveal** on the saved CSV.
2. VS Code's Explorer view focuses the `assets/` folder and highlights the
   file (FR-016).

### 10. Delete a saved result (US4)

1. In the Associated Files dropdown, click **Delete** on a saved CSV.
2. A confirmation dialog appears ("Delete my-stats--v2.csv?").
3. Click **Delete**.
4. The file is removed from disk; the STAC item's `assets` entry is
   unregistered; the dropdown removes the entry (FR-018).

### 11. Recover from a tool error (US5)

1. With no selection, try running `track-stats`.
2. The Results panel shows a new **error tab** with the error message and
   a **Retry** button (FR-019).  No `FileSavedEvent` or `ToolRunEvent` is
   created for the failed run (verified in the log panel).
3. Select a valid track.
4. Click **Retry** — the tool re-runs, and on success the error tab is
   replaced by a fresh unsaved success tab.

## Success Criteria Traceability

| SC | Covered by step(s) |
|----|--------------------|
| SC-001 (table visible within 5s of tool completion) | Step 2, Step 3 |
| SC-002 (save in ≤ 3 clicks / 30s)            | Step 5 (Save), Step 6 (Save As) |
| SC-003 (save produces file + asset + prov)   | Step 5 |
| SC-004 (orphan ToolRunEvents cleared on close) | (deferred — see test-summary.md known gaps) |
| SC-005 (feature parity with web-shell)        | Steps 1–11 (mirrors web-shell P1/P2 journeys) |
| SC-006 (zero forks of shared components)      | `ChartPanelWrapper` reused, `synthesizeTableDataset` extracted to shared |
| SC-007 (i18n + a11y on all strings)           | Uses `DEFAULT_RESULTS_PANEL_LABELS` from feature 177 |
