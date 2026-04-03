# Feature Specification: Tabular Results Panel

**Feature Branch**: `177-tabular-results-panel`  
**Created**: 2026-04-03  
**Status**: Draft  
**Input**: User description: "Tabular Results Panel — display and optional persistence of debrief-calc tabular tool outputs within the VS Code extension"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Tabular Tool Results (Priority: P1)

An analyst selects one or more features on the plot and runs a tabular analysis tool (e.g. track statistics, area summary, or range-bearing). The results appear automatically in a dedicated panel beneath the plot, rendered either as a table or chart depending on the tool's declared display type. The analyst can review the output immediately without leaving the plot context.

**Why this priority**: This is the core capability — without result display, no other feature (saving, provenance, error handling) is meaningful. It delivers immediate analytical value by surfacing computed statistics alongside the plot.

**Independent Test**: Can be fully tested by running any tabular tool against selected features and verifying the results panel appears with correctly rendered output.

**Acceptance Scenarios**:

1. **Given** a plot is open with features loaded, **When** the analyst selects a feature and runs `track-stats`, **Then** a results panel appears beneath the plot at a 70/30 split showing a table of flat statistics (one row per metric with metric name and value columns)
2. **Given** a plot is open with features loaded, **When** the analyst selects features and runs `range-bearing`, **Then** a results panel appears showing a chart (time-series line chart with time on x-axis, range and bearing on y-axes)
3. **Given** no tabular tool has been run in this session, **When** the analyst looks at the plot area, **Then** no results panel or placeholder is visible
4. **Given** a results panel is already showing output from a previous run, **When** the analyst runs the same tool again with different features, **Then** the previous result is silently replaced with the new result

---

### User Story 2 - Save Results to Plot Assets (Priority: P2)

After reviewing tool output, the analyst wants to persist the results as a CSV file within the plot's asset folder. They can quick-save with an automatic date-stamped filename, or use Save As to provide a custom name and optional tag. Saved files are registered as assets on the plot and linked to provenance records.

**Why this priority**: Persistence completes the analytical workflow — analysts need to keep results for reporting and audit. It depends on Story 1 (display) being functional first.

**Independent Test**: Can be fully tested by running a tabular tool, clicking Save, and verifying the CSV file appears in the asset folder with correct content, STAC registration, and provenance records.

**Acceptance Scenarios**:

1. **Given** a results panel shows an unsaved result, **When** the analyst clicks Save, **Then** a CSV file is written to the plot's asset folder with a date-stamped filename, the file is registered as a STAC asset, a provenance record is created, and the unsaved indicator disappears
2. **Given** a results panel shows an unsaved result, **When** the analyst clicks Save As and provides a base name and tag, **Then** a CSV file is written with the format `{base-name}--{tag}.csv` after applying filename sanitisation
3. **Given** the analyst enters unsafe characters (spaces, special characters) in Save As fields, **When** the filename is constructed, **Then** unsafe characters are replaced with hyphens, consecutive hyphens are collapsed, and the result is a safe filename
4. **Given** a result has already been saved, **When** the analyst looks at the panel title bar, **Then** the unsaved indicator is absent and the Save button is greyed/disabled
5. **Given** a Save As filename already exists in the asset folder, **When** the analyst confirms the save, **Then** a prompt appears asking whether to overwrite or cancel

---

### User Story 3 - Multiple Tool Panels Side by Side (Priority: P3)

An analyst runs multiple different tabular tools during an analysis session. The first two tool types appear as side-by-side panels. When a third tool type is run, it opens as a tab within the rightmost panel, creating a tab group. This allows the analyst to compare outputs from different tools simultaneously.

**Why this priority**: Multi-panel support enhances the analysis workflow but is not required for basic single-tool usage. It builds on the panel lifecycle from Story 1.

**Independent Test**: Can be fully tested by running two different tabular tools and verifying both panels appear side by side, then running a third and verifying it creates a tab group.

**Acceptance Scenarios**:

1. **Given** one tabular result panel is displayed, **When** the analyst runs a different tabular tool type, **Then** a second panel appears horizontally alongside the first
2. **Given** two tabular result panels are displayed, **When** the analyst runs a third tabular tool type, **Then** a new tab appears within the rightmost panel rather than creating a third panel
3. **Given** multiple panels are open, **When** the analyst closes one panel, **Then** the remaining panels adjust layout according to the standard window manager behaviour

---

### User Story 4 - Error Handling and Retry (Priority: P4)

When a tool execution fails, the analyst sees a clear error message in the panel with a Retry button. They can retry the same operation without re-selecting features or re-entering parameters. No provenance record is created for failed runs.

**Why this priority**: Error handling is essential for a robust experience but is an exceptional flow, not the primary path.

**Independent Test**: Can be fully tested by simulating a tool failure and verifying the error state displays correctly with a functioning Retry button.

**Acceptance Scenarios**:

1. **Given** a tabular tool execution fails, **When** the result panel updates, **Then** a human-readable error message is shown, the Retry button appears in the title bar, any previous result is cleared, and no provenance record is created
2. **Given** an error is displayed with a Retry button, **When** the analyst clicks Retry, **Then** the tool is re-invoked with the same parameters and selection, and the loading state is shown
3. **Given** a Retry succeeds, **When** the result arrives, **Then** the error state is replaced with the normal result display and standard provenance recording occurs

---

### User Story 5 - Provenance and Cleanup on Plot Close (Priority: P5)

When the analyst closes a plot, any unsaved tool run provenance entries are cleaned up while saved entries (with corresponding file save records) are retained permanently. This keeps the provenance log tidy without losing audit-critical records.

**Why this priority**: Provenance cleanup is important for long-term data hygiene but operates passively — analysts don't interact with it directly during normal use.

**Independent Test**: Can be fully tested by running tools (some saved, some not), closing the plot, and verifying that only saved run records persist in the provenance log.

**Acceptance Scenarios**:

1. **Given** the analyst has run tools with some results saved and some unsaved, **When** the plot is closed, **Then** provenance entries for unsaved runs are deleted, entries for saved runs are retained, all panels are destroyed, and no prompt is shown
2. **Given** a saved result's CSV file is externally deleted, **When** the background scanner runs (within 60 minutes), **Then** the STAC asset is flagged as unavailable and the provenance log card shows a "File not found" indicator

---

### Edge Cases

- What happens when the analyst runs the same tool while a previous run is still in flight? The earlier response is discarded; the most recently invoked run wins (last-wins concurrency).
- What happens when two saves occur within the same millisecond? A numeric suffix is appended to the second filename (e.g. `-2`).
- What happens when STAC registration fails after a successful file write? The file is deleted and an error is shown — no partial state is allowed.
- What happens when the analyst saves via Save As with an empty tag? The filename omits the tag portion entirely (just `{base-name}.csv`).
- What happens when a base name or tag exceeds the length limit? Base name is truncated to 64 characters, tag to 32 characters, after sanitisation.
- What happens on session restart? The panel split resets to 70/30 and no panels are visible until the next tool run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display tabular tool results in a dedicated panel beneath the plot, appearing only when the first result arrives in a session
- **FR-002**: System MUST render results as either a table or chart based on the tool's declared `display` type — table for flat statistics, chart for time-series data
- **FR-003**: System MUST set the initial plot/results split to 70% plot / 30% results, with user-draggable adjustment that persists only for the window lifetime
- **FR-004**: System MUST show an unsaved indicator in the panel title bar for results that have not been saved
- **FR-005**: System MUST support Save (date-stamped filename) and Save As (analyst-named with optional tag) for persisting results as CSV
- **FR-006**: System MUST sanitise all analyst-supplied filename text by replacing non-alphanumeric characters (except `.`, `-`, `_`) with hyphens, collapsing consecutive hyphens, trimming leading/trailing hyphens, and enforcing length limits (64 chars for base name, 32 for tag)
- **FR-007**: System MUST register saved CSV files as STAC assets on the plot Item, and if STAC registration fails after file write, delete the file and show an error (no partial state)
- **FR-008**: System MUST create a provenance tool-run record on each successful tool execution, and a separate file-saved record on each save, linked by the tool-run identifier
- **FR-009**: System MUST NOT create provenance records for failed tool runs
- **FR-010**: System MUST display error messages with a Retry button when tool execution fails, clearing any previous result
- **FR-011**: System MUST arrange multiple tool-type panels side by side horizontally (up to two), with additional tool types opening as tabs in the rightmost panel
- **FR-012**: System MUST delete provenance tool-run records that have no corresponding file-saved record when the plot is closed
- **FR-013**: System MUST derive CSV column names dynamically from the tool's returned data keys, not from a hardcoded column list
- **FR-014**: System MUST format CSV output with ISO 8601 UTC timestamps, 4 significant figures for numeric values, locale-independent decimal separator (`.`), Unix line endings, and UTF-8 encoding
- **FR-015**: System MUST detect externally deleted CSV asset files within 60 minutes and flag the corresponding STAC asset as unavailable
- **FR-016**: System MUST discard in-flight results when the same tool is re-invoked before the previous run completes (last-wins concurrency)
- **FR-017**: System MUST support re-running tools after parameter tuning via the Provenance Log, treating re-runs identically to fresh runs
- **FR-018**: All user-facing strings (panel titles, error messages, form labels, accessibility labels) MUST be externalisable for internationalisation
- **FR-019**: System MUST provide accessibility attributes on all interactive panel elements (aria-labels on buttons, role attributes on status and alert elements, standard table semantics)

### Key Entities

- **ToolRunEvent**: A provenance record created when a tabular tool executes successfully. Contains a unique identifier, the tool name, feature IDs used as input, execution timestamp, and parameters. Immutable after creation.
- **FileSavedEvent**: A provenance record created when an analyst saves a result to disk. References the originating ToolRunEvent, records the saved filename and save timestamp. Immutable after creation.
- **STAC Asset**: A registration entry on the plot's STAC Item for each saved CSV file. Keyed by a unique identifier combining the tool name and FileSavedEvent ID. Tracks file location, content type, originating tool, and persistence timestamp.
- **Tabular Tool Declaration**: A tool registry entry with a `display` field (table or chart) and optional chart specification. Determines how results are rendered in the panel.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Review computed analysis results and optionally persist them for reporting and audit
- **Key Decision(s)**:
  1. Whether to save a displayed result or discard it (by running a new tool or closing the plot)
  2. When saving, whether to use automatic date-stamped naming (Save) or provide a custom descriptive name (Save As)
- **Decision Inputs**: The analyst sees the tool output (table or chart), the unsaved indicator in the title bar, and the tool/feature names identifying what was computed. The Save As form shows the proposed filename before confirmation.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Plot displayed without results area | Analyst selects features and runs a tabular tool | Results panel appears beneath plot at 70/30 split |
| 2 | Panel shows loading state (spinner in title, greyed previous result if any) | Analyst waits for computation | Result rendered as table or chart per tool declaration |
| 3 | Result displayed with unsaved indicator | Analyst reviews the output | Analyst decides to save, re-run, or move on |
| 4 | Analyst clicks Save | System writes CSV, registers STAC asset, creates provenance record | Unsaved indicator removed; Save button greyed |
| 5 | Analyst clicks Save As | Inline form appears with base name and optional tag fields | Analyst enters custom name and confirms |
| 6 | Analyst runs a different tool type | Second panel appears side by side | Both results visible simultaneously |
| 7 | Analyst closes the plot | Unsaved run records cleaned up; all panels destroyed | Results area disappears entirely |

### UI States

- **Empty State**: No results area is visible — the panel does not exist until a tabular tool returns its first result. There is no placeholder, prompt, or reserved space.
- **Loading State**: If a panel already exists with a previous result, a spinner appears in the title bar and the existing result is greyed out (reduced opacity). Save/Save As buttons are disabled. If no panel exists yet, no loading indicator is shown — the panel materialises when the result arrives.
- **Error State**: The panel body displays a human-readable error message. Any previous result is cleared. A Retry button appears in the title bar. The unsaved indicator and Save button are hidden.
- **Success State**: The panel body shows the tool output (table or chart). The title bar displays the tool name, feature name(s), and an unsaved indicator if the result has not been saved. Save and Save As buttons are active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can view tabular tool results immediately after execution without navigating away from the plot
- **SC-002**: Analysts can save any displayed result to the plot's asset folder in two clicks or fewer (Save) or three interactions or fewer (Save As with custom name)
- **SC-003**: Every saved result is traceable — the provenance log links tool parameters, input features, and output file for 100% of saved results
- **SC-004**: No orphaned provenance records remain after a plot is closed — unsaved run records are cleaned up automatically
- **SC-005**: All saved CSV files are valid, parseable, and follow consistent formatting (ISO 8601 timestamps, 4 significant figures, locale-independent decimals)
- **SC-006**: Externally deleted files are detected and flagged within 60 minutes, preventing stale asset references
- **SC-007**: The panel supports at least three concurrent tool types (two side-by-side panels plus tabbed overflow) without layout errors
- **SC-008**: 100% of interactive panel elements have appropriate accessibility attributes (aria-labels, roles, table semantics)

## Assumptions

- The existing `debrief-calc` MCP integration and tool registry are functional and available for use
- The Vega-Lite / vega-embed charting stack is already integrated and available for chart-type rendering
- The STAC catalog service (`debrief-stac`) supports asset registration on plot Items
- The Provenance Log (Analysis Log) infrastructure exists and supports creating and querying ToolRunEvent and FileSavedEvent records
- ULID generation is available for creating unique event and asset identifiers
- The VS Code extension's webview supports split-pane layouts with draggable dividers
- Tool registry schema (LinkML) can be extended with `display` and `vega_lite_spec` fields
- All three initial tabular tools (`track-stats`, `area-summary`, `range-bearing`) exist in the registry and return GeoJSON with analytical data in `properties`
