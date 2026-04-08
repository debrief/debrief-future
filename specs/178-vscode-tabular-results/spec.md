# Feature Specification: Tabular Results Panel — VS Code Extension Integration

**Feature Branch**: `claude/vscode-tabular-results-CFFcS`
**Created**: 2026-04-07
**Status**: Draft
**Input**: SRD: `docs/tabular-results-vscode-integration-srd.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View tool results in a tabular panel (Priority: P1)

An analyst running a `debrief-calc` tool from the VS Code extension needs to see the tool's tabular/chart output beneath the map, not just as map layers. Today, only GeoJSON layers appear; statistics and chart datasets are invisible.

**Why this priority**: This is the core capability gap — without it, the feature does not exist in VS Code at all. Every other story builds on a working display.

**Independent Test**: Run `track-stats` against a selected track in the VS Code extension and verify a Results panel appears beneath the map showing the statistics in a table. Run `range-bearing` and verify two chart tabs (Range / Bearing) render.

**Acceptance Scenarios**:

1. **Given** a plot is open and a track is selected, **When** the analyst runs `track-stats`, **Then** a Results panel appears beneath the map with a table tab showing the statistics.
2. **Given** a plot is open with two tracks selected, **When** the analyst runs `range-bearing`, **Then** two chart tabs (Range, Bearing) appear in the Results panel.
3. **Given** the Results panel is empty at session start, **When** no results have arrived, **Then** the panel is hidden (no empty placeholder).
4. **Given** multiple result tabs are open, **When** the analyst clicks a tab, **Then** that tab becomes active; the analyst can also close individual tabs.
5. **Given** a result tab has just been created, **When** the analyst views it, **Then** an unsaved indicator (dot) is displayed on the tab.

---

### User Story 2 - Save results as CSV with provenance (Priority: P1)

An analyst wants to persist a tool result as a CSV file alongside the plot, registered as a STAC asset and linked to the originating tool run for provenance tracking.

**Why this priority**: Saving is the only way results become part of the analyst's deliverable. Without it, the panel is read-only and the work is lost on close.

**Independent Test**: With a result tab open, click Save; verify a CSV is written to the plot's `assets/` directory, registered as a STAC asset, recorded as a `FileSavedEvent` in the analysis log, and the unsaved indicator clears.

**Acceptance Scenarios**:

1. **Given** an unsaved result tab, **When** the analyst clicks Save, **Then** a date-stamped CSV is written to `assets/`, registered as a STAC asset, a `FileSavedEvent` is appended to the analysis log linked to the originating tool run, and the tab is marked saved (Save button disabled).
2. **Given** an unsaved result tab, **When** the analyst clicks Save As, **Then** an inline form appears for base name and optional tag; submitting it sanitises the inputs and behaves identically to Save with the chosen filename.
3. **Given** a save is in progress, **When** STAC asset registration fails after the file is written, **Then** the file is deleted from disk and an error is shown to the user (no partial state remains).
4. **Given** a saved result tab, **When** the analyst views it, **Then** the unsaved indicator is gone and the Save button is disabled.

---

### User Story 3 - Discover saved results via Layers toolbar (Priority: P2)

An analyst wants to find previously saved tool results without leaving the plot view, through the existing Associated Files dropdown in the Layers toolbar.

**Why this priority**: Discoverability of saved artifacts is essential for re-use, but a workable workflow exists without it (results are still on disk).

**Independent Test**: Save a result, then open the Layers toolbar Associated Files dropdown and confirm the file appears under "Results" without a manual reload.

**Acceptance Scenarios**:

1. **Given** at least one result has been saved for the current plot, **When** the analyst opens the Associated Files dropdown, **Then** all saved results are listed under a "Results" section, derived from the STAC item's assets.
2. **Given** a save has just completed, **When** the dropdown is opened (or is already open), **Then** the new file appears without a manual refresh.

---

### User Story 4 - Act on saved result files (Priority: P2)

An analyst wants to open, locate, or delete saved result files from the Associated Files dropdown.

**Why this priority**: File management closes the loop on the saved-artifact workflow but is not required for the initial display/save value.

**Independent Test**: From the Associated Files dropdown, click Open / Open With / Reveal in Explorer / Delete on a saved CSV and verify the expected behaviour.

**Acceptance Scenarios**:

1. **Given** a saved result file in the dropdown, **When** the analyst clicks **Open**, **Then** the CSV is loaded into the Results panel as a new tab (parsed back into a flat dataset).
2. **Given** a saved result file in the dropdown, **When** the analyst clicks **Reveal in Explorer**, **Then** VS Code's Explorer view opens, expands to the asset folder, and selects the file.
3. **Given** a saved result file, **When** the analyst clicks **Open With**, **Then** VS Code's editor picker is shown.
4. **Given** a saved result file, **When** the analyst clicks **Delete** and confirms, **Then** the STAC asset is unregistered and the file is removed from disk.

---

### User Story 5 - Recover from tool errors (Priority: P3)

An analyst whose tool execution failed wants to see the error in the Results panel and retry the run with the same parameters.

**Why this priority**: Improves recovery UX but failed runs are rare relative to successful ones; a workaround (re-run from the toolbar) exists.

**Independent Test**: Trigger a tool failure (e.g., invalid selection), verify the corresponding tab shows the error and a Retry button, click Retry and verify the tool re-runs with the original parameters.

**Acceptance Scenarios**:

1. **Given** a tool execution fails, **When** the result tab is shown, **Then** the error message and a Retry button are displayed and no provenance record is created for the failed run.
2. **Given** a failed result tab, **When** the analyst clicks Retry, **Then** the tool is re-invoked with the same parameters and selection.

---

### Edge Cases

- **Plot closed with unsaved results**: Unsaved tabs are discarded and the corresponding `ToolRunEvent` records (without a paired `FileSavedEvent`) are deleted from provenance.
- **Multiple distinct tool types open simultaneously**: Up to two distinct tool-type panels are shown side by side; further tool types open as additional tabs in the rightmost panel. *(Optional — see Assumptions.)*
- **Save with name collision**: The generated date-stamped filename should not collide; if it does, the system disambiguates rather than overwriting.
- **Tool returns neither `__datasets` nor `statistics`**: No Results tab is created; only the existing map-layer behaviour applies.
- **Result panel hidden then re-shown**: When the first result of the session arrives, the panel becomes visible with roughly a 70/30 map-to-results split.
- **Open action on a CSV edited externally**: The dropdown still reflects the STAC asset; opening parses the current file contents.

## Requirements *(mandatory)*

### Functional Requirements

**Result display**

- **FR-001**: System MUST display a Results panel beneath the map in the VS Code extension whenever a tool returns a tabular or chart dataset.
- **FR-002**: System MUST extract each `DatasetEnvelope` from a tool result's `properties.__datasets` and route it to the Results panel as a tab.
- **FR-003**: System MUST synthesize a table-style `DatasetEnvelope` from `properties.statistics` when no `__datasets` is present, matching the web-shell's behaviour.
- **FR-004**: System MUST hide the Results panel until the first result of the session arrives (no empty placeholder).
- **FR-005**: System MUST allocate roughly 70% of vertical space to the map and 30% to the Results panel when the panel first appears.
- **FR-006**: Users MUST be able to switch between result tabs and close individual tabs.
- **FR-007**: System MUST display an unsaved indicator on each result tab until the result is saved.

**Save flow**

- **FR-008**: Each result tab MUST expose Save and Save As actions; Save MUST be disabled once the tab is saved.
- **FR-009**: System MUST, on Save, build a CSV from the dataset, generate a date-stamped filename, write the file to the plot's `assets/` directory, register it as a STAC asset, and append a `FileSavedEvent` to the analysis log linked to the originating tool run.
- **FR-010**: Save As MUST present an inline form for base name and optional tag, sanitise inputs, and otherwise behave identically to Save.
- **FR-011**: If STAC asset registration fails after the file has been written, system MUST delete the file and surface an error (no partial state).
- **FR-012**: System MUST clear the unsaved indicator and disable the Save button after a successful save.

**Associated Files dropdown**

- **FR-013**: Saved CSV files MUST appear in the existing Layers toolbar Associated Files dropdown under a "Results" section, derived from the STAC item's assets.
- **FR-014**: The Associated Files list MUST refresh automatically after a save (no manual reload).

**File actions**

- **FR-015**: Clicking **Open** on a saved result MUST load the CSV into the Results panel as a new tab, parsing the CSV back into a flat dataset. *(Subject to clarification — see Assumptions.)*
- **FR-016**: Clicking **Reveal in Explorer** MUST open VS Code's Explorer view and select the file.
- **FR-017**: Clicking **Open With** MUST surface VS Code's editor picker for the file.
- **FR-018**: Clicking **Delete** MUST prompt for confirmation, then unregister the STAC asset and delete the file from disk.

**Error / Retry**

- **FR-019**: System MUST display an error message and a Retry button on a result tab when the tool execution fails, and MUST NOT create a provenance record for the failed run.
- **FR-020**: Retry MUST re-invoke the tool with the same parameters and selection.

**Lifecycle**

- **FR-021**: When a plot is closed, system MUST discard unsaved result tabs and delete any `ToolRunEvent` records without a paired `FileSavedEvent`.
- **FR-022**: System MUST support up to two distinct tool-type panels side by side; additional tool types MUST open as tabs in the rightmost panel. *(Optional / may be deferred — see Assumptions.)*

**Cross-cutting**

- **FR-023**: All user-facing strings MUST be externalisable for internationalisation.
- **FR-024**: All interactive elements MUST expose accessibility attributes (labels, roles, table semantics).
- **FR-025**: Shared display and CSV-handling components MUST be reused across the VS Code extension and the web-shell without forking.

### Key Entities

- **Result Tab**: An in-session view of a single tool's dataset. Has a unique id, originating tool id, dataset envelope, save state (unsaved/saved/error), and link to the originating tool run.
- **Dataset Envelope**: A structured payload describing a dataset and how to display it (table or chart), produced by a tool.
- **Saved Result File**: A CSV file persisted in the plot's `assets/` directory, registered as a STAC asset, and linked via provenance to the originating tool run.
- **Tool Run Event**: A provenance log entry recording a tool invocation, its parameters, and its activity id.
- **File Saved Event**: A provenance log entry recording that a tool result was saved to disk, linked to a tool run event.
- **Associated File Listing**: The list of result files surfaced in the Layers toolbar dropdown, derived from STAC assets.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: View, save, and manage tool result datasets within the VS Code extension's plot view.
- **Key Decisions**:
  1. Whether the displayed result is worth keeping (save vs discard).
  2. What filename to give a saved result (default vs Save As with custom base name/tag).
  3. Which previously-saved result to reopen, reveal, or delete.
  4. Whether to retry a failed tool run.
- **Decision Inputs**: Tool name in tab label, unsaved indicator dot, dataset preview (table/chart), date-stamped default filename, list of existing saved results in the Associated Files dropdown, error messages on failed runs.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot view, no results yet (panel hidden) | Run a tool from the toolbar | Results panel appears beneath the map (~70/30 split) with a new unsaved tab |
| 2 | Results panel with one or more unsaved tabs | Click Save (or Save As → enter name) | CSV is written, STAC asset registered, provenance recorded, tab marked saved |
| 3 | Saved result | Open the Layers toolbar Associated Files dropdown | Saved file appears under "Results" |
| 4 | Associated Files dropdown | Click Open / Reveal / Open With / Delete | Corresponding file action runs |
| 5 | Failed tool run | View error tab, click Retry | Tool re-invokes with original parameters |

### UI States

- **Empty State**: Results panel is hidden until the first result of the session arrives.
- **Loading State**: Tool execution in progress is indicated on the tab (spinner / pending state) until the dataset arrives or an error is reported.
- **Error State**: Failed result tab shows the error message and a Retry button; no provenance record is created.
- **Success State**: Tab displays the table or chart, with Save / Save As available and an unsaved indicator until saved; once saved, the indicator clears and Save is disabled.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An analyst can run `track-stats` and see a tabular result in the Results panel within 5 seconds of tool completion in 100% of successful runs.
- **SC-002**: An analyst can save a tool result as a CSV in three or fewer clicks (Save) or in under 30 seconds via Save As, with the file appearing in the Associated Files dropdown without manual refresh.
- **SC-003**: 100% of successful saves produce a CSV file on disk, a STAC asset registration, and a provenance `FileSavedEvent` linked to the originating tool run; failed saves leave no partial state.
- **SC-004**: Closing a plot with unsaved results removes 100% of orphan `ToolRunEvent` records (those without a paired `FileSavedEvent`).
- **SC-005**: Feature parity with the web-shell Tabular Results Panel for the originally-specified P1/P2 user journeys is achieved, verified by a Playwright E2E suite covering display, save, dropdown listing, and at least one file action against a real VS Code webview.
- **SC-006**: Zero forks of shared display or CSV-handling components — both the VS Code extension and the web-shell consume the same modules.
- **SC-007**: All user-facing strings in the new Results panel are externalised for i18n, and all interactive elements pass an accessibility audit (labels, roles, table semantics).

## Assumptions

- The shared `ChartPanelWrapper`, `TableRenderer`, `ChartRenderer`, `DatasetEnvelope` type, CSV utilities (`buildCsvContent`, `generateCsvFilename`, `sanitizeFilename`), `stacService` (`addResultAsset`, `getResultFilesFromItem`, `assetToAssociatedFile`), and `logService.recordToolResult` are reused unchanged from the web-shell / existing VS Code services.
- The Python MCP tool result shapes (`properties.statistics`, `properties.__datasets`) are stable and identical to those consumed by the web-shell.
- The Results panel is realised as a new VS Code webview view beneath the map, communicating with the extension host via message passing — GoldenLayout is **not** introduced to the VS Code extension.
- "Open" on a saved CSV reopens the file as a new tab in the Results panel (matching the web-shell). If during clarification this is judged too costly, falling back to "open in VS Code's text/CSV editor" is acceptable.
- Multi-panel side-by-side support (FR-022) is optional; if VS Code's native panel system makes it expensive, it MAY be deferred to a follow-up without blocking the rest of the feature.
- Filtering or searching within result tables is out of scope.
- E2E coverage is provided in the existing `tests/e2e/` Playwright suite (real VS Code webview), mirroring the web-shell tests under `apps/web-shell/playwright/tests/`.

## Out of Scope

- Introducing GoldenLayout to the VS Code extension.
- In-table filter / search controls.
- Editing CSVs in place from the Results panel.
- Cross-plot result aggregation.

## Dependencies

- Existing shared components and utilities (`shared/components`, `shared/utils`).
- VS Code services: `stacService`, `logService`, `calcService`, `executeTool.ts`, `activityPanelView.ts`, existing webview/bundling pattern in `apps/vscode/src/webview/`.
- Python MCP tools producing `__datasets` / `statistics` payloads.
- Existing Playwright E2E harness in `tests/e2e/`.
