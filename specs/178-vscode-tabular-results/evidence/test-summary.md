---
feature: 178-vscode-tabular-results
captured_at: 2026-04-08T18:45:31Z
git_sha: 9576bf9
tests_passed: 2278
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
| `@debrief/vscode`        | 21 | 348  | 348  | + 10 new (`ResultsPanelService` — US1/US2/US5 coverage) |
| `@debrief/components`    | 76 | 1123 | 1123 | Unchanged (ChartPanelWrapper reused as-is) |
| `@debrief/config-ts`     |  5 |  42  |  42  | Unchanged |
| `@debrief/loader`        |  1 |   7  |   7  | Unchanged |
| **Total**                | **144** | **2278** | **2278** | |

**Overall**: 2278 passed / 0 failed / 0 skipped.

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

- **Playwright VS Code webview E2E tests** — the `tests/e2e/test-tabular-results-*.spec.ts`
  specs outlined in tasks.md are **not yet written** in this implementation pass.
  The feature is fully functional at the unit level; the E2E suite is a polish
  task that requires a running VS Code instance via `@sparticuz/chromium` and
  should be added in a follow-up.
- **Multi-panel side-by-side layout (FR-022)** — deferred per R4.  The Results
  panel hosts all tabs in a single view container.
- **Plot-close orphan cleanup (FR-021)** — partial: in-memory tabs are
  dropped when the session changes, but deleting orphan `ToolRunEvent`
  entries from the analysis log is deferred pending a `LogService.deleteEntry`
  API addition (out of scope for this feature).
