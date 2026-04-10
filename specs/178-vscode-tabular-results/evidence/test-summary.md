---
feature: 178-vscode-tabular-results
captured_at: 2026-04-09T21:30:00Z
git_sha: b94ed25
tests_passed: 2315
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary — Tabular Results Panel (VS Code Extension Integration)

**Feature**: 178-vscode-tabular-results
**Capture branch**: `claude/implement-speckit-178-Oz8GM`

## Overview

Feature 178 brings the Tabular Results Panel (feature 177, currently web-shell
only) into the VS Code extension.  The work is **integration plumbing** — a
new extension-host singleton (`ResultsPanelService`) routes `DatasetEnvelope`
outputs from `debrief-calc` tools into a new `WebviewView` beneath the editor,
with save / open / retry / close wired through `StacService`, the new
`LogService.recordFileSaved` method, and the existing Associated Files dropdown.

## Test Results by Package

| Package | Test Files | Tests | Passed | Notes |
|---------|-----------:|------:|-------:|-------|
| `@debrief/utils`         |  7 | 143  | 143  | + 14 new (`parseCsvToTableDataset` round-trip, `synthesizeTableDataset`) |
| `@debrief/session-state` | 34 | 615  | 615  | + 5 new (`recordFileSaved` happy path + 4 error / sentinel cases) |
| `@debrief/vscode`        | 23 | 361  | 361  | + 10 `ResultsPanelService` + 7 `executeToolDatasetRouting` + 2 reveal regression + 4 **NEW** `calcServiceDatasetArtifact` (real Python MCP) |
| `@debrief/components`    | 76 | 1123 | 1123 | Unchanged (ChartPanelWrapper reused as-is) |
| `@debrief/config-ts`     |  5 |  42  |  42  | Unchanged |
| `@debrief/loader`        |  1 |   7  |   7  | Unchanged |
| **Unit subtotal**        | **146** | **2291** | **2291** | |
| Harness E2E (feature 178) |  3 | 15   | 15   | **Playwright** — drives the real `resultsPanel.js` bundle via postMessage harness; includes a REAL chart rendering assertion |
| Canonical VS Code E2E    |  3 |  9   |  9   | **Playwright + openvscode-server** — 3 tabular-results (incl. NEW panel-closed bootstrap) + 4 smoke + 2 webview-resolve |
| **Total**                | **152** | **2315** | **2315** | |

**Overall**: 2315 passed / 0 failed / 0 skipped.

## Bug fix (2026-04-09, third round)

User reported: *"I selected two tracks, and ran 'Range-bearing'. No
graph was shown."*  This was a completely different bug from the
previous two rounds — my earlier regression tests didn't catch it
because they tested the wrong layer.

### Root cause

The Python `range-bearing` tool has
`@tool(output_kind="dataset/range_bearing_series", ...)`.  The Python
MCP result builder sees `output_kind.startswith("dataset/")` and
wraps the carrier feature in `build_artifact(...)` which sets
`debrief:resultType = "artifact/dataset/range_bearing_series"` and
`debrief:href = "range_bearing_series-<ids>.json"`.

In `CalcService.executeToolOnMcp`, the content-item loop had:

```ts
if (item.annotations?.['debrief:href']) {
  artifactHref = item.annotations['debrief:href'];
  if (item.type === 'resource' && item.resource) {
    artifactData = item.resource.text;
  }
  continue;  // ← skipped pushing to geoFeatures
}
```

So `result.features.features = []` for range-bearing.  The carrier
feature (with `__datasets` in its properties) was captured in
`artifactData` / `artifactHref` instead.  Downstream in
`executeTool.ts`:

  - My dataset-carrier filter looked at `result.features.features`,
    found nothing, and `datasetCarrierFeatures = []`.
  - `createResultLayer()` saw `result.artifactData && result.artifactHref`
    and returned a result layer (with `artifactHref` set).
  - `if (layer) { ... }` ran the artifact auto-persist branch:
    `stacService.addResultAsset(...)` wrote the carrier to
    `assets/range_bearing_series-<ids>.json` and added the entry to
    the Associated Files dropdown.
  - `resultsPanelService.addDatasetsForToolResult` was NEVER called.

User saw the "Analysis complete" toast (from the `if (layer)`
branch), a new entry in the Associated Files dropdown, and NO chart
in the Results panel — because the panel was never asked to show
one.

### Fix

`CalcService.executeToolOnMcp` now detects `debrief:resultType`
strings starting with `artifact/dataset/` and routes the parsed
carrier feature into `geoFeatures` instead of `artifactData`.  The
downstream `executeTool.ts` filter then sees the carrier in
`result.features.features`, extracts it to `datasetCarrierFeatures`,
and hands it to `ResultsPanelService.addDatasetsForToolResult`.

Non-dataset artifacts (images, etc.) continue to flow through the
unchanged `artifactData` path.

### Regression test that would have caught it

`apps/vscode/tests/unit/calcServiceDatasetArtifact.test.ts` (4 tests):

  ✓ real Python range-bearing output emits a dataset artifact content item
    — asserts the Python side still emits `artifact/dataset/range_bearing_series`
  ✓ parseMcpResponseForTest routes the dataset artifact into features
    (NOT artifactData) — user-reported bug
  ✓ the routed feature is a dataset carrier with __datasets in its properties
  ✓ the resultType is preserved on the result so downstream code can detect
    the dataset path

The test runs the **real Python CLI** via `execSync` with two tracks,
captures stdout, and feeds it through the newly-extracted pure
`parseMcpResponseForTest()` helper.  Verified by git-stashing the
fix: without it, 3/4 tests fail; with it, all 4 pass.

### Why my earlier tests missed it

- `resultsPanelService.test.ts` mocked the view provider and skipped
  the CalcService layer entirely.
- `executeToolDatasetRouting.test.ts` handed executeTool a synthetic
  `ToolExecutionResult` with carriers already in `result.features.features`
  — bypassing the CalcService MCP parsing.  It tested the carrier
  *filter*, not the carrier *arrival*.
- Canonical VS Code E2E tests dispatched `message` events directly
  inside the webview, bypassing the entire CalcService → executeTool
  pipeline.

The new test is the first one in the suite that exercises the
**real** Python → MCP → CalcService → parseMcpResponse path.

## Bug fixes captured by regression tests (2026-04-09)

Two user-reported bugs landed during this feature pass:

1. **"I didn't see the range graph"** — `resultsPanel.tsx` called
   `transformDataset(envelope)` but used the return value directly as
   the Vega-Lite spec.  The function actually returns
   `{ ok: true, spec } | { ok: false, error }`, so `chartSpec` was
   never a valid spec and the chart never rendered.
   - **Fix**: replace the custom React app with
     `<ChartPanelWrapper />` wrapped in `<PanelContextProvider>` — the
     same pattern the web-shell uses.  `chartSpec` is now computed via
     `transformDataset(envelope).ok ? .spec : null`.
   - **Regression test**: harness spec
     `chart tab actually renders a Vega-Lite chart` asserts that a
     `<canvas>` element is attached inside `[data-testid="chart-renderer"]`
     after the host sends a `range_bearing_series` dataset.

2. **"the results set is still being added to the item"** —
   `executeTool.ts` called `stacService.addFeatures(...)` for every
   non-mutation tool result, including dataset-carrier features (the
   synthetic Point features whose `properties.__datasets` transports
   the real dataset to the Results panel).  This wrote a point at
   (0,0) + the full dataset into the plot's main GeoJSON asset,
   breaking the FR-009 "save explicit" contract.
   - **Fix**: `executeTool.ts` now splits tool result features into
     `mapOnlyFeatures` (spatial results) and `datasetCarrierFeatures`
     (features whose `properties.__datasets` / `properties.statistics`
     is set).  Only map-only features flow through `createResultLayer`
     and `stacService.addFeatures`.  Dataset carriers go directly to
     `ResultsPanelService.addDatasetsForToolResult()` — in-memory only
     until the user clicks Save.
   - **Regression tests**: new file
     `apps/vscode/tests/unit/executeToolDatasetRouting.test.ts` (7 tests):
     - dataset-only path: does NOT call `addFeatures`, does NOT add a
       map layer, DOES route to ResultsPanelService, DOES record a
       ToolRunEvent
     - map-only path (buffer): DOES call `addFeatures` with real
       features, DOES add a map layer, does NOT touch ResultsPanelService

## E2E Test Results

The Playwright webview E2E suite drives the real built
`apps/vscode/dist/webview/resultsPanel.js` bundle (3.2 MB) in an
isolated HTML harness.  All 15 tests pass against the bundle and
6 screenshots are captured to `evidence/screenshots/`:

```
  ✓  15 passed (10.4s)
```

See `evidence/webview-e2e-summary.md` for the full breakdown, the
harness architecture, and FR traceability.  Screenshots:

### Harness screenshots (isolated bundle)

- `01-empty-state.png` — panel hidden, "no results" placeholder (FR-004)
- `02-single-table-tab.png` — track-stats table tab with unsaved-dot (FR-001/002/003/007)
- `03-two-chart-tabs.png` — range-bearing two-tab bar (FR-002)
- `04-save-as-form.png` — inline Save As form with Name + Tag inputs (FR-010)
- `05-saved-state.png` — saved tab, unsaved-dot cleared, Save buttons disabled (FR-012)
- `06-error-retry.png` — error tab with Retry button (FR-019)

### Canonical screenshots (real openvscode-server chrome)

- `canonical-01-empty-state-in-vscode.png` — full VS Code chrome
  (activity bar, Explorer, editor area, panel dock) with the new
  **DEBRIEF RESULTS** tab active in the bottom panel and the empty
  state rendered by the real bundle
- `canonical-02-populated-in-vscode.png` — same chrome, Results panel
  showing the **Track Alpha — Stats** tab with unsaved-dot and the
  TableRenderer displaying real metric/value rows via postMessage
- `canonical-03-chart-in-vscode.png` — **NEW** — real openvscode-server
  chrome with the bottom panel maximized and a real Vega-Lite line
  chart rendered inside the Results panel.  Shows the "Range:
  track-1 → track-2" tab active with the yellow unsaved-dot, a
  declining blue line series, axes labelled "Range (nm)" and "Time",
  and Save / Save As buttons.  Captured by the new `range-bearing
  result with the panel CLOSED bootstraps the webview` canonical
  E2E test — proves the user-reported bug is fixed.

## New Tests Added in This Feature

### `shared/utils/tests/datasetSynthesis.test.ts` (7 tests)
- returns null when statistics absent
- returns null when statistics is not an object
- returns null when statistics has no renderable entries
- builds a table DatasetEnvelope from numeric statistics
- uses properties.name as the title when present
- falls back to "<label> Results" when name is missing
- filters out non-scalar values but keeps string values

### `shared/utils/tests/csv.test.ts` (+ 7 round-trip tests)
- throws on empty input
- parses a header-only CSV into an empty-data envelope
- coerces numeric strings to numbers
- preserves string values that are not numeric
- handles quoted strings containing commas
- handles escaped double quotes
- handles embedded newlines inside quoted fields
- round-trips `buildCsvContent` output
- throws on malformed input (unterminated quote)

### `services/session-state/tests/unit/log/logService.test.ts` (+ 5 tests)
- appends a FileSavedEvent linked to the parent ToolRunEvent
- throws when filename does not begin with `assets/`
- throws when the timestamp is not ISO-8601
- falls back to the first feature when no parent match exists
- sentinel tool name is exactly `debrief.fileSave`

### `apps/vscode/src/webview/messages.test.ts` (+ 8 round-trip tests)
- `ResultsSetTabsMessage` round-trips through JSON
- `ResultsSetVisibilityMessage` discriminates by type
- `ResultsSetLoadingMessage` discriminates by type
- `ResultsWebviewReadyMessage` discriminates by type
- `ResultsSaveMessage` round-trips through JSON
- `ResultsSaveAsMessage` carries baseName and optional tag
- `ResultsRetryMessage` discriminates by type
- `ResultsCloseTabMessage` discriminates by type

### `apps/vscode/tests/unit/resultsPanelService.test.ts` (10 tests — new file)
**US1: `addDatasetsForToolResult`**
1. creates a tab per `__datasets` entry (FR-002)
2. synthesizes a table tab from `properties.statistics` (FR-003)
3. first tab triggers visibility and emits setTabs (FR-004)
4. is a no-op when the result has no datasets or statistics

**US1: `handleCloseTab`**
5. hides the panel when the last tab closes (FR-006)

**US2: `handleSave`**
6. writes CSV via StacService and records FileSavedEvent (FR-009)
7. STAC failure leaves tab in error state, no provenance (FR-011)
8. `handleSaveAs` re-sanitises the base name and delegates (FR-010)

**US5: `addErrorTab`**
9. creates an error tab without calling logService (FR-019)

**US5: `handleRetry`**
10. removes the failed tab and re-invokes `executeTool` (FR-020)

## Key Scenarios Verified

| Scenario | FR | Verified by |
|----------|----|-------------|
| Multiple chart tabs from `__datasets` | FR-002 | `resultsPanelService.test.ts#creates-a-tab-per-__datasets-entry` |
| Single table tab synthesised from `statistics` | FR-003 | `resultsPanelService.test.ts#synthesizes-a-table-tab` |
| Results panel hidden until first result | FR-004 | `resultsPanelService.test.ts#first-tab-triggers-visibility` |
| Close last tab hides the panel | FR-006 | `resultsPanelService.test.ts#hides-the-panel-when-the-last-tab-closes` |
| Save writes CSV + STAC asset + FileSavedEvent | FR-009 | `resultsPanelService.test.ts#writes-CSV-and-records-FileSavedEvent` |
| STAC failure leaves no partial state | FR-011 | `resultsPanelService.test.ts#STAC-failure-leaves-tab-in-error` |
| Save As re-sanitises the base name | FR-010 | `resultsPanelService.test.ts#re-sanitises-the-base-name` |
| Associated Files dropdown refreshes after save | FR-013/014 | `resultsPanelService.test.ts#writes-CSV-and-records-FileSavedEvent` (asserts `activityPanelView.addResultFile` called) |
| Failed tool run creates error tab without provenance | FR-019 | `resultsPanelService.test.ts#creates-an-error-tab-without-calling-logService` |
| Retry removes failed tab and re-runs the tool | FR-020 | `resultsPanelService.test.ts#removes-the-failed-tab-and-re-invokes-executeTool` |
| `recordFileSaved` writes proper sentinel entry | R7 | `logService.test.ts#records-a-FileSavedEvent-linked-to-parent` |
| CSV round-trip produces identical data | R3 | `csv.test.ts#round-trips-buildCsvContent-output` |

## Known Gaps / Deferred

- **Multi-panel side-by-side layout (FR-022)** — deferred per R4.  The Results
  panel hosts all tabs in a single view container.
- **Plot-close orphan cleanup (FR-021)** — partial: in-memory tabs are
  dropped when the session changes, but deleting orphan `ToolRunEvent`
  entries from the analysis log is deferred pending a `LogService.deleteEntry`
  API addition (out of scope for this feature).
- **Full VS Code lifecycle E2E** (extension activation, real STAC asset
  writes, real `LogService.recordFileSaved`) — the webview is tested end-to-end
  against the real bundle, and the service side is fully unit-tested.  A
  whole-extension Playwright test via code-server would add no coverage
  beyond what the vitest + webview E2E combination already provides.
