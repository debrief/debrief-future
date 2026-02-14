# Feature Specification: Results Bottom Panel with Tabbed Layout

**Feature Branch**: `095-results-bottom-panel`
**Created**: 2026-02-14
**Status**: Draft
**Input**: User description: "Results bottom panel with tabbed layout — VS Code panel hosting Vega-Lite renderer tabs (requires #085)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View a Tool Result in the Bottom Panel (Priority: P1)

An analyst runs a tool (e.g., buffer zone analysis) that produces a result dataset. The system opens a results panel in the VS Code bottom panel area — in the same region as the terminal and output panels. The result is displayed as a chart within a tab in this panel. The analyst can see the chart without leaving their current editor layout, as the bottom panel is a non-intrusive location familiar from the terminal experience.

**Why this priority**: This is the core value — providing a dedicated, non-intrusive location for viewing tool results. Without a panel to host the charts, the chart renderer component (#085) has nowhere to appear. This is the minimum viable feature.

**Independent Test**: Can be fully tested by triggering a result display action with a valid dataset and confirming the bottom panel opens with a tab containing a rendered chart. Delivers immediate value by giving analysts a place to see their results.

**Acceptance Scenarios**:

1. **Given** a tool has produced a result dataset, **When** the result is sent to the results panel, **Then** the bottom panel opens (if not already visible) and displays a tab containing the rendered chart.
2. **Given** the results panel is already open, **When** a new result is sent to the panel, **Then** a new tab is created for the result without affecting existing tabs.
3. **Given** the results panel is open with a chart tab, **When** the analyst clicks on the tab title, **Then** the tab becomes active and its chart is displayed.

---

### User Story 2 - Manage Multiple Result Tabs (Priority: P2)

An analyst runs multiple tools during an analysis session, each producing a result. Each result appears as a separate tab in the results panel. The analyst switches between tabs to compare results — for example, switching between a zone histogram and a range-bearing plot. Tabs can be closed individually when the analyst no longer needs a particular result.

**Why this priority**: Analysts frequently run multiple tools in sequence and need to review several results. Without tab management, each new result would replace the previous one, losing context. This is essential for practical use.

**Independent Test**: Can be tested by opening three or more result tabs, switching between them to verify charts render correctly on each switch, and closing individual tabs to verify the remaining tabs are unaffected.

**Acceptance Scenarios**:

1. **Given** the results panel has three open tabs, **When** the analyst clicks the second tab, **Then** the second tab's chart is displayed and the other tabs remain available.
2. **Given** a results tab is active, **When** the analyst clicks the tab's close button, **Then** the tab is removed and the nearest remaining tab becomes active.
3. **Given** the last remaining tab is closed, **When** the analyst closes it, **Then** the results panel displays the empty state.
4. **Given** multiple tabs are open, **When** the analyst switches between tabs, **Then** the previously rendered chart is restored without re-processing the dataset.

---

### User Story 3 - Identify Result Tabs by Title (Priority: P3)

Each tab in the results panel displays a meaningful title derived from the result's metadata — for example, "Zone Histogram — Track Alpha" or "Range-Bearing — Alpha vs Bravo". The analyst can distinguish between multiple results at a glance without needing to click into each tab. If a title is too long, it is truncated with an ellipsis, and the full title is shown on hover.

**Why this priority**: Without meaningful tab titles, the analyst cannot navigate between results efficiently. Labelling tabs with dataset-derived titles is a relatively small addition with significant usability impact.

**Independent Test**: Can be tested by opening multiple results with different dataset metadata and confirming each tab displays the correct title derived from the dataset's title field. Hovering over truncated titles should show the full title.

**Acceptance Scenarios**:

1. **Given** a result dataset with a title "Zone Histogram — Track Alpha", **When** the result is displayed in a tab, **Then** the tab title shows "Zone Histogram — Track Alpha".
2. **Given** a result dataset without a title, **When** the result is displayed in a tab, **Then** the tab shows a default title based on the dataset type (e.g., "Zone Histogram").
3. **Given** a tab title that exceeds the available space, **When** displayed, **Then** the title is truncated with an ellipsis and the full title is visible on hover as a tooltip.

---

### User Story 4 - Open Results Panel via Command (Priority: P4)

An analyst wants to view results from previously completed tools. They open the results panel using a VS Code command (via the command palette or a keyboard shortcut). The panel opens in the bottom panel area, showing any previously opened result tabs or the empty state if no results have been opened in the current session.

**Why this priority**: The panel is primarily opened automatically when results arrive, but users need a manual way to re-access it if they closed it. This is a secondary access path.

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

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a results panel that appears in the VS Code bottom panel area (alongside terminal, output, and problems panels).
- **FR-002**: The results panel MUST support a tabbed layout where each tool result occupies its own tab.
- **FR-003**: Each tab MUST host the chart renderer component (#085) to display the result's chart.
- **FR-004**: Each tab MUST display a title derived from the result dataset's metadata (title field). If no title is available, the tab MUST display a fallback title based on the dataset type.
- **FR-005**: Tabs MUST be individually closable via a close button on each tab.
- **FR-006**: When a tab is closed, the nearest remaining tab MUST become active. When the last tab is closed, the panel MUST show the empty state.
- **FR-007**: The results panel MUST be openable via a VS Code command ("Show Results Panel") accessible from the command palette.
- **FR-008**: When a new result is sent to the panel, the panel MUST open automatically (if hidden) and create a new tab for the result.
- **FR-009**: Switching between tabs MUST restore the previously rendered chart without re-processing the dataset from scratch.
- **FR-010**: Tab titles that exceed available space MUST be truncated with an ellipsis, with the full title shown as a tooltip on hover.
- **FR-011**: Charts within tabs MUST resize responsively when the panel or VS Code window is resized.
- **FR-012**: The results panel MUST function correctly regardless of where VS Code allows it to be placed (bottom, side, etc.).
- **FR-013**: The results panel MUST work offline with no network requests.

### Key Entities

- **Results Panel**: A VS Code panel view that lives in the bottom panel area. It hosts multiple result tabs and manages tab lifecycle (creation, activation, closure). It is the container for all result visualisations.
- **Result Tab**: An individual tab within the results panel. Each tab represents one tool result, has a title derived from the result metadata, and contains a chart renderer instance displaying the result's chart. Tabs can be activated, deactivated, and closed.
- **Result Dataset**: The standard result dataset JSON (from #085's schema) that is passed to the panel for display. The panel delegates rendering to the chart renderer component — it does not interpret the dataset itself.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: View and compare tool results as charts in a non-intrusive panel that does not disrupt the editor layout.
- **Key Decision(s)**:
  1. Which result tab to view (when multiple results are open)
  2. Whether to close a result tab that is no longer needed
- **Decision Inputs**: Tab titles derived from result metadata help the analyst identify which result is in which tab. The chart content within the active tab provides the analytical data.

### Screen Progression

| Step | Screen/State       | User Action                              | Result                                                    |
|------|--------------------|------------------------------------------|-----------------------------------------------------------|
| 1    | No results yet     | Analyst runs a tool that produces output  | Results panel opens in bottom area with a chart in a tab   |
| 2    | One tab open       | Analyst runs another tool                 | Second tab appears, becomes active, shows new chart        |
| 3    | Multiple tabs open | Analyst clicks a tab title               | That tab becomes active, its chart is displayed            |
| 4    | Reviewing results  | Analyst clicks close button on a tab     | Tab is removed, nearest tab becomes active                 |
| 5    | Panel closed       | Analyst runs "Show Results Panel" command | Panel reopens showing any previously opened tabs           |

### UI States

- **Empty State**: A centred message reading "No results to display. Run a tool to see results here." displayed when the panel is open but has no tabs.
- **Loading State**: When a new result is being prepared, the tab is created immediately with a loading indicator (skeleton or spinner) while the chart renderer processes the dataset.
- **Error State**: If a result's chart fails to render, the tab displays the chart renderer's error message within the tab area. Other tabs are unaffected.
- **Success State**: The active tab displays a fully rendered chart with title, axes, labels, and data. Inactive tabs retain their rendered content for instant switching.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can view tool results in the bottom panel within 1 second of a result being produced (panel open time + tab creation time).
- **SC-002**: Analysts can switch between 5 or more open result tabs and see the chart appear instantly (no re-rendering delay perceptible to the user).
- **SC-003**: 100% of result tabs display a title derived from the dataset metadata, with a sensible fallback when no title is present.
- **SC-004**: The results panel handles at least 20 simultaneous tabs without degradation in tab switching or chart display.
- **SC-005**: Charts in tabs resize correctly when the panel is resized, maintaining readability at any panel width above 300 pixels.
- **SC-006**: The panel functions fully offline with no network requests during any operation.

## Assumptions

- The chart renderer component (#085) is available as a shared React component that accepts a render spec and produces a chart. This feature consumes that component — it does not build its own rendering logic.
- VS Code's webview panel API supports the tabbed layout pattern described here. The implementation will use VS Code's native panel contribution mechanisms.
- Result datasets arrive via an internal messaging mechanism (e.g., a service event or command) that this feature's planning phase will define. The spec does not prescribe the delivery mechanism.
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
- Hosting the chart renderer component within tabs
- Responsive chart sizing within the panel
- Empty, loading, and error states
- VS Code command to show the panel
- Automatic panel opening when a result arrives

### Out of Scope

- Logical result ID registry (#087) — this feature receives results directly, not via ID lookup
- Auto-refresh when results update (#089) — tabs display static snapshots of results
- Custom editor provider for opening results as editor tabs (#088)
- Drag-and-drop reordering of tabs
- Tab persistence across VS Code restarts
- Result filtering, search, or sorting within the panel
- Exporting charts from the panel
