# Feature Specification: Results Bottom Panel with Tabbed Layout

**Feature Branch**: `095-results-bottom-panel`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Results bottom panel with tabbed layout — VS Code panel hosting Vega-Lite renderer tabs (requires #085)"

## Clarifications

### Session 2026-02-14

- Q: Which entry points should trigger opening a result in the panel? → A: All three — auto-open on tool completion, STAC browser, and attachments context menu in the activity panel.
- Q: Should the panel only display chart-renderable datasets, or also handle non-chart artifacts (images, reports)? → A: All artifacts — the panel handles datasets as charts and also embeds image/report previews in tabs.
- Q: Are tabs scoped per-plot or is the panel a global flat view across all plots? → A: Per-plot — tab identity is plot + file path; same filename in different plots produces separate tabs.
- Q: Should a tab update live when its underlying result file is overwritten (e.g., tool re-run), or remain a static snapshot? → A: Live update — the analyst may use displayed results to optimise the operation they are tuning (e.g., minimising bearing errors during a plot-lock), so the tab must reflect the latest file content.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a Tool Result After Tool Completion (Priority: P1)

An analyst runs a tool (e.g., buffer zone analysis) that produces a result artifact. The tool's output is persisted to the `results/` sub-folder of the current plot (STAC item). Once stored, the system automatically opens the result in the results panel — a VS Code bottom panel in the same region as the terminal and output panels. The result is displayed in a tab: dataset results appear as charts (via the chart renderer #085), image results (e.g., PNG bearing-time plots) are displayed inline, and other file types show a preview or summary. The analyst sees the result without leaving their current editor layout.

**Why this priority**: This is the primary flow — the analyst runs a tool and immediately sees the result. Without a panel to host result views, there is no integrated viewing experience. This is the minimum viable feature.

**Independent Test**: Can be fully tested by triggering a tool that persists a result artifact to the plot's `results/` sub-folder and confirming the bottom panel opens with a tab displaying the appropriate content (chart for datasets, inline preview for images).

**Acceptance Scenarios**:

1. **Given** a tool has completed and persisted a dataset result to the plot's `results/` sub-folder, **When** the persistence completes, **Then** the bottom panel opens (if not already visible) and displays a tab containing the rendered chart.
2. **Given** a tool has completed and persisted an image result (e.g., PNG) to the plot's `results/` sub-folder, **When** the persistence completes, **Then** the bottom panel opens and displays a tab with the image rendered inline.
3. **Given** the results panel is already open, **When** a new tool result is persisted, **Then** a new tab is created for the result without affecting existing tabs.
4. **Given** the results panel is open with a result tab, **When** the analyst clicks on the tab title, **Then** the tab becomes active and its content is displayed.

---

### User Story 2 - Live Update During Iterative Tuning (Priority: P2)

An analyst is tuning a plot-lock operation to minimise bearing errors. They run a bearing analysis tool and see the result chart in the results panel. They adjust parameters and re-run the tool, which overwrites the same result file. The open tab detects the change and automatically re-renders with the updated data — the analyst sees the improvement (or regression) immediately without needing to close and reopen the tab. This tight feedback loop allows the analyst to iteratively optimise their work.

**Why this priority**: Iterative tuning is a core analyst workflow. Without live update, the analyst would need to manually close and reopen tabs after each tool re-run, breaking their flow. This is essential for practical productivity.

**Independent Test**: Can be tested by opening a result tab, then overwriting the underlying result file with new content, and confirming the tab automatically re-renders with the updated data within a short delay.

**Acceptance Scenarios**:

1. **Given** a result tab is open displaying a chart, **When** the underlying result file is overwritten by a tool re-run, **Then** the tab re-renders with the updated content automatically.
2. **Given** a result tab is open displaying an image, **When** the underlying image file is overwritten, **Then** the tab displays the updated image.
3. **Given** a result tab updates live, **When** the re-render completes, **Then** the tab remains in the same position in the tab bar (it is not closed and reopened).

---

### User Story 3 - Manage Multiple Result Tabs (Priority: P2)

An analyst runs multiple tools during an analysis session, each producing a result. Each result appears as a separate tab in the results panel. The analyst switches between tabs to compare results — for example, switching between a zone histogram and a range-bearing plot. Tabs can be closed individually when the analyst no longer needs a particular result.

**Why this priority**: Analysts frequently run multiple tools in sequence and need to review several results. Without tab management, each new result would replace the previous one, losing context. This is essential for practical use.

**Independent Test**: Can be tested by opening three or more result tabs, switching between them to verify content displays correctly on each switch, and closing individual tabs to verify the remaining tabs are unaffected.

**Acceptance Scenarios**:

1. **Given** the results panel has three open tabs, **When** the analyst clicks the second tab, **Then** the second tab's content is displayed and the other tabs remain available.
2. **Given** a results tab is active, **When** the analyst clicks the tab's close button, **Then** the tab is removed and the nearest remaining tab becomes active.
3. **Given** the last remaining tab is closed, **When** the analyst closes it, **Then** the results panel displays the empty state.
4. **Given** multiple tabs are open, **When** the analyst switches between tabs, **Then** the previously rendered content is restored without unnecessary delay.

---

### User Story 4 - Identify Result Tabs by Title (Priority: P3)

Each tab in the results panel displays a meaningful title derived from the result's metadata — for example, "Zone Histogram — Track Alpha" or "Range-Bearing — Alpha vs Bravo". The analyst can distinguish between multiple results at a glance without needing to click into each tab. If a title is too long, it is truncated with an ellipsis, and the full title is shown on hover.

**Why this priority**: Without meaningful tab titles, the analyst cannot navigate between results efficiently. Labelling tabs with dataset-derived titles is a relatively small addition with significant usability impact.

**Independent Test**: Can be tested by opening multiple results with different dataset metadata and confirming each tab displays the correct title derived from the dataset's title field. Hovering over truncated titles should show the full title.

**Acceptance Scenarios**:

1. **Given** a result dataset with a title "Zone Histogram — Track Alpha", **When** the result is displayed in a tab, **Then** the tab title shows "Zone Histogram — Track Alpha".
2. **Given** a result dataset without a title, **When** the result is displayed in a tab, **Then** the tab shows a default title based on the dataset type (e.g., "Zone Histogram").
3. **Given** a tab title that exceeds the available space, **When** displayed, **Then** the title is truncated with an ellipsis and the full title is visible on hover as a tooltip.

---

### User Story 5 - Open a Result from the STAC Browser or Attachments Menu (Priority: P2)

An analyst wants to review a previously computed result. They can open it in two ways: by selecting a result file in the STAC browser (catalog overview or file tree), or by choosing a result from the attachments context menu in the activity panel. Either action opens the result as a new tab in the results panel, using the same chart rendering as the auto-open flow.

**Why this priority**: Analysts frequently need to revisit results from earlier in a session or from a previous session. The STAC browser and attachments menu provide natural navigation paths to persisted results — without these, analysts can only see results at the moment they are first computed.

**Independent Test**: Can be tested by persisting a result file to a plot's `results/` sub-folder, then opening it via the STAC browser file tree and confirming a chart tab appears. Separately, opening the same result via the attachments dropdown and confirming the same behaviour.

**Acceptance Scenarios**:

1. **Given** a result dataset file exists in a plot's `results/` sub-folder, **When** the analyst selects it in the STAC browser (file tree or catalog overview), **Then** the results panel opens with a tab displaying the chart for that result.
2. **Given** a result dataset file exists in the current plot, **When** the analyst clicks "Open" on the result in the attachments context menu of the activity panel, **Then** the results panel opens with a tab displaying the chart for that result.
3. **Given** the analyst opens the same result file that is already displayed in an existing tab, **When** the open action is triggered, **Then** the existing tab is activated rather than creating a duplicate tab.

---

### User Story 6 - Open Results Panel via Command (Priority: P4)

An analyst wants to access the results panel directly. They open it using a VS Code command (via the command palette or a keyboard shortcut). The panel opens in the bottom panel area, showing any previously opened result tabs or the empty state if no results have been opened in the current session.

**Why this priority**: The panel is primarily opened automatically when results arrive or navigated to via the STAC browser / attachments menu. A manual command provides a fallback access path.

**Independent Test**: Can be tested by executing the "Show Results Panel" command from the command palette and confirming the panel appears in the bottom area.

**Acceptance Scenarios**:

1. **Given** the results panel is hidden, **When** the analyst runs the "Show Results Panel" command, **Then** the bottom panel area opens with the results panel visible.
2. **Given** the results panel has previously opened tabs, **When** the analyst reopens it via command, **Then** the previously opened tabs are still present.

---

### Edge Cases

- What happens when the analyst opens a very large number of result tabs (e.g., 20+)? Tabs overflow horizontally with a scroll mechanism, consistent with VS Code's native tab overflow behaviour.
- What happens when the results panel is opened but no results have been produced yet? The panel displays an empty state message explaining that results will appear here when tools produce output.
- What happens when a result's chart fails to render (e.g., due to a malformed dataset)? The tab still opens, but displays the chart renderer's error state within the tab area, showing what went wrong.
- What happens when the analyst drags the results panel to a different location in VS Code (e.g., side panel)? The panel functions correctly in any location VS Code allows it to be placed.
- What happens when the VS Code window is resized to a very narrow width? Charts within tabs resize responsively to fit the available space.
- What happens when the analyst opens the same result file from different entry points (e.g., first via tool completion, then via STAC browser)? The existing tab is activated rather than creating a duplicate.
- What happens when a result artifact is a file type the panel cannot preview (e.g., a binary report format)? The tab displays a summary (filename, type, size) and offers a link to open the file in VS Code's native viewer or the system default application.
- What happens when two different plots each have a result file with the same name (e.g., both have `results/zone_histogram.json`)? Each produces a separate tab. The tab title includes the plot name to disambiguate (e.g., "Zone Histogram — Plot Alpha" vs "Zone Histogram — Plot Bravo").
- What happens when a result file is being written (mid-write) when the file watcher triggers? The panel waits for the write to complete (file size stabilises or write lock releases) before re-rendering, to avoid displaying partial or corrupt data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a results panel that appears in the VS Code bottom panel area (alongside terminal, output, and problems panels).
- **FR-002**: The results panel MUST support a tabbed layout where each tool result occupies its own tab.
- **FR-003**: For dataset-type results, each tab MUST host the chart renderer component (#085) to display the result as a chart.
- **FR-017**: For image-type results (e.g., PNG, JPEG), each tab MUST render the image inline within the tab area, scaled to fit the available space.
- **FR-018**: For other result file types that are neither datasets nor images, each tab MUST display a summary or fallback view (e.g., filename, file type, and file size) with an option to open the file in VS Code's native viewer.
- **FR-004**: Each tab MUST display a title derived from the result's metadata (title field from dataset metadata, or filename for non-dataset artifacts). If no title is available, the tab MUST display a fallback title based on the result type.
- **FR-019**: When result tabs from multiple plots are open simultaneously, each tab title MUST include the source plot name to disambiguate (e.g., "Zone Histogram — Plot Alpha").
- **FR-005**: Tabs MUST be individually closable via a close button on each tab.
- **FR-006**: When a tab is closed, the nearest remaining tab MUST become active. When the last tab is closed, the panel MUST show the empty state.
- **FR-007**: The results panel MUST be openable via a VS Code command ("Show Results Panel") accessible from the command palette.
- **FR-008**: When a tool completes and persists a result to the plot's `results/` sub-folder, the panel MUST open automatically (if hidden) and create a new tab for the result.
- **FR-014**: The panel MUST accept result open requests from the STAC browser (file tree or catalog overview) and open the selected result file as a new tab.
- **FR-015**: The panel MUST accept result open requests from the attachments context menu in the activity panel and open the selected result file as a new tab.
- **FR-016**: If a result file that is already open in an existing tab is requested again (from any entry point), the panel MUST activate the existing tab rather than creating a duplicate. Tab identity is the combination of the source plot (STAC item) and the result file path — the same filename in different plots produces separate tabs.
- **FR-009**: Switching between tabs MUST restore the previously rendered content without unnecessary delay.
- **FR-020**: When the underlying result file for an open tab is overwritten (e.g., by a tool re-run), the tab MUST detect the change and re-render with the updated content automatically.
- **FR-021**: Live updates MUST preserve the tab's position in the tab bar — the tab is not closed and reopened, it refreshes in place.
- **FR-010**: Tab titles that exceed available space MUST be truncated with an ellipsis, with the full title shown as a tooltip on hover.
- **FR-011**: Charts within tabs MUST resize responsively when the panel or VS Code window is resized.
- **FR-012**: The results panel MUST function correctly regardless of where VS Code allows it to be placed (bottom, side, etc.).
- **FR-013**: The results panel MUST work offline with no network requests.

### Key Entities

- **Results Panel**: A VS Code panel view that lives in the bottom panel area. It hosts multiple result tabs and manages tab lifecycle (creation, activation, closure). It is the container for all result visualisations and previews.
- **Result Tab**: An individual tab within the results panel. Each tab represents one tool result artifact, uniquely identified by the combination of its source plot (STAC item) and file path. The tab's content depends on the artifact type: datasets are rendered as charts via the chart renderer (#085), images are displayed inline, and other file types show a summary with a link to open natively. Tabs can be activated, deactivated, and closed.
- **Result Artifact**: Any file persisted to the `results/` sub-folder of a STAC item (plot). Artifacts fall into three display categories: (1) datasets — rendered as charts, (2) images — displayed inline, (3) other files — shown as a summary/fallback view. The artifact's STAC asset entry (in `item.json`) provides metadata including type, title, and file path.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: View and compare tool result artifacts (charts, images, reports) in a non-intrusive panel that does not disrupt the editor layout.
- **Key Decision(s)**:
  1. Which result tab to view (when multiple results are open)
  2. Whether to close a result tab that is no longer needed
- **Decision Inputs**: Tab titles derived from result metadata help the analyst identify which result is in which tab. The chart content within the active tab provides the analytical data.

### Screen Progression

| Step | Screen/State       | User Action                                          | Result                                                    |
|------|--------------------|------------------------------------------------------|-----------------------------------------------------------|
| 1    | No results yet     | Analyst runs a tool that produces output              | Result persisted to `results/`; panel opens with chart tab |
| 2    | One tab open       | Analyst runs another tool                             | Second tab appears, becomes active, shows new chart        |
| 3    | Multiple tabs open | Analyst clicks a tab title                            | That tab becomes active, its chart is displayed            |
| 4    | Browsing STAC      | Analyst selects a result file in STAC browser         | Result opens as new tab (or existing tab activated)        |
| 5    | Activity panel     | Analyst clicks "Open" on attachments context menu     | Result opens as new tab (or existing tab activated)        |
| 6    | Reviewing results  | Analyst clicks close button on a tab                  | Tab is removed, nearest tab becomes active                 |
| 7    | Panel closed       | Analyst runs "Show Results Panel" command              | Panel reopens showing any previously opened tabs           |

### UI States

- **Empty State**: A centred message reading "No results to display. Run a tool to see results here." displayed when the panel is open but has no tabs.
- **Loading State**: When a new result is being prepared, the tab is created immediately with a loading indicator (skeleton or spinner) while the chart renderer processes the dataset.
- **Error State**: If a result's chart fails to render, the tab displays the chart renderer's error message within the tab area. Other tabs are unaffected.
- **Success State**: The active tab displays the result content appropriate to its type — a rendered chart for datasets, an inline image for image artifacts, or a summary view for other file types. Inactive tabs retain their rendered content for instant switching. The bottom panel placement ensures the current plot remains visible in the editor above while results are reviewed below.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can view tool results in the bottom panel within 1 second of a result being produced (panel open time + tab creation time).
- **SC-002**: Analysts can switch between 5 or more open result tabs and see the chart appear instantly (no re-rendering delay perceptible to the user).
- **SC-003**: 100% of result tabs display a title derived from the dataset metadata, with a sensible fallback when no title is present.
- **SC-004**: The results panel handles at least 20 simultaneous tabs without degradation in tab switching or chart display.
- **SC-005**: Charts in tabs resize correctly when the panel is resized, maintaining readability at any panel width above 300 pixels.
- **SC-006**: The panel functions fully offline with no network requests during any operation.
- **SC-007**: When a result file is overwritten by a tool re-run, the open tab re-renders with updated content within 2 seconds of the write completing.

## Assumptions

- The chart renderer component (#085) is available as a shared React component that accepts a render spec and produces a chart. This feature consumes that component — it does not build its own rendering logic.
- VS Code's webview panel API supports the tabbed layout pattern described here. The implementation will use VS Code's native panel contribution mechanisms.
- Result datasets are persisted files in the `results/` sub-folder of a STAC item (plot). The panel reads result data from these files. Three entry points trigger the panel to open a result: (1) automatic on tool completion, (2) STAC browser selection, (3) attachments context menu in the activity panel.
- Tab state (which tabs are open, their content) is session-scoped — tabs are not persisted across VS Code restarts. Persistence is a potential future enhancement.
- The panel does not manage result lifecycle — it displays what it receives. Clearing old results or managing result storage is handled by other features (e.g., #087 Logical Result ID Registry).

## Dependencies

- **#085 — Chart Renderer + Dataset-to-Spec Transformer**: Provides the chart renderer React component that this panel hosts within each tab. Must be completed first.
- **Shared component library** (`shared/components/`): The chart renderer is consumed from here.

## Scope Boundaries

### In Scope

- VS Code bottom panel registration and display
- Tabbed layout with tab creation, activation, and closure
- Tab titles derived from result dataset metadata
- Hosting result content within tabs: charts (via #085), inline images, and summary/fallback views for other types
- Responsive chart sizing within the panel
- Empty, loading, and error states
- VS Code command to show the panel
- Three entry points: auto-open on tool completion, STAC browser, attachments context menu
- De-duplication — re-opening an already-open result activates the existing tab
- Live update — open tabs re-render when their underlying result file is overwritten (supporting iterative tuning workflows)

### Out of Scope

- Logical result ID registry (#087) — this feature receives results directly, not via ID lookup
- Logical-result-ID-based auto-refresh (#089) — this feature watches the underlying file directly; #089 adds the abstraction layer of logical result IDs and cross-tab refresh coordination
- Custom editor provider for opening results as editor tabs (#088)
- Drag-and-drop reordering of tabs
- Tab persistence across VS Code restarts
- Result filtering, search, or sorting within the panel
- Exporting charts from the panel
