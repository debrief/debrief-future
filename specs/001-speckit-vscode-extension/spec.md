# Feature Specification: Debrief VS Code Extension

**Feature Branch**: `001-speckit-vscode-extension`
**Created**: 2026-01-15
**Status**: Draft
**Input**: User description: "Stage 6 (VS Code Extension) from tracer delivery plan: Display and interaction layer for Debrief maritime analysis. Browse STAC catalogs, display plots on Leaflet map with tracks and reference locations, selection model for data interaction, tool discovery via debrief-calc MCP, execute tools and refresh display."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Display Plot Data (Priority: P1)

A maritime analyst opens VS Code with the Debrief extension installed. They want to view existing plot data from their local STAC catalog. The analyst navigates through the catalog browser in the extension sidebar, locates a plot containing vessel tracks from a recent exercise, and opens it. The extension displays the plot on an interactive map showing the vessel tracks and reference location.

**Why this priority**: This is the core value proposition—analysts need to see their data. Without visualization, no other features are useful.

**Independent Test**: Can be fully tested by loading any valid STAC plot and verifying tracks display correctly on the map. Delivers immediate value by enabling data review.

**Acceptance Scenarios**:

1. **Given** the user has registered STAC stores in their configuration, **When** they open the Debrief panel in VS Code, **Then** they see a tree view of available stores and their catalogs
2. **Given** a STAC catalog is expanded in the tree view, **When** the user clicks on a plot item, **Then** the map panel opens displaying the plot's tracks and reference location
3. **Given** a plot is displayed on the map, **When** the user hovers over a track, **Then** they see a tooltip with track metadata (name, platform type)

---

### User Story 2 - Select Data Elements (Priority: P2)

With a plot displayed, the analyst wants to select specific tracks or time periods for analysis. They click on a track to select it, or use a time range selector to highlight a portion of the data. The selection is clearly indicated visually on the map.

**Why this priority**: Selection is the prerequisite for tool execution. Without selection, analysts cannot perform targeted analysis on specific data subsets.

**Independent Test**: Can be tested by displaying any plot and verifying selection interactions work correctly. Delivers value by enabling focused data examination.

**Acceptance Scenarios**:

1. **Given** a plot is displayed with multiple tracks, **When** the user clicks on a track, **Then** that track is visually highlighted as selected
2. **Given** a track is selected, **When** the user holds Shift and clicks another track, **Then** both tracks are selected (multi-select)
3. **Given** tracks are selected, **When** the user clicks on empty map space, **Then** the selection is cleared
4. **Given** a time range control is visible, **When** the user adjusts the time range, **Then** only data within that range is displayed/selectable

---

### User Story 3 - Discover and Execute Analysis Tools (Priority: P3)

With data selected, the analyst wants to perform calculations. The extension automatically discovers which analysis tools are applicable based on the current selection context. The analyst chooses a tool, executes it, and sees the results appear on the map.

**Why this priority**: Tool execution transforms raw data into insights. This completes the analysis workflow but depends on display and selection being functional first.

**Independent Test**: Can be tested by selecting tracks and verifying tool discovery and execution produces visible results. Delivers value through automated analysis.

**Acceptance Scenarios**:

1. **Given** one or more tracks are selected, **When** the user opens the tools panel, **Then** they see a list of tools applicable to the current selection type
2. **Given** applicable tools are listed, **When** the user clicks an "Execute" button on a tool, **Then** the tool runs and progress is indicated
3. **Given** a tool execution completes successfully, **When** the result is written, **Then** the map refreshes to display the new result layer
4. **Given** a tool execution fails, **When** an error occurs, **Then** the user sees a clear error message explaining what went wrong

---

### User Story 4 - Manage STAC Store Configuration (Priority: P4)

A new analyst installs the extension but has no STAC stores configured. They use the extension to register their local STAC catalog location. Returning users may want to add additional stores or remove outdated ones.

**Why this priority**: Configuration is a one-time setup activity. Most users will have stores already configured via the Loader app (Stage 4).

**Independent Test**: Can be tested by starting with no configuration and verifying stores can be added and appear in the catalog browser.

**Acceptance Scenarios**:

1. **Given** no STAC stores are configured, **When** the user opens the catalog browser, **Then** they see an empty state with guidance to add a store
2. **Given** the settings command is invoked, **When** the user provides a valid STAC catalog path, **Then** the store appears in the catalog browser
3. **Given** an existing store is listed, **When** the user removes it via settings, **Then** it no longer appears in the catalog browser

---

### Edge Cases

- What happens when a STAC catalog path becomes invalid (folder deleted/moved)?
- How does the extension handle plots with thousands of track points (performance)?
- What happens when a tool execution takes longer than expected?
- How does the extension behave when the debrief-calc service is unavailable?
- What happens when the user tries to select data while a tool is executing?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST read registered STAC stores from the shared debrief-config location
- **FR-002**: Extension MUST display a hierarchical tree view of STAC catalogs and their contents
- **FR-003**: Extension MUST render plot data on an interactive map using web mapping technology
- **FR-004**: Extension MUST display vessel tracks as polylines with distinct colors per track
- **FR-005**: Extension MUST display reference locations as point markers on the map
- **FR-006**: Extension MUST support single-click selection of individual tracks
- **FR-007**: Extension MUST support multi-select for tracks (Shift+click or Ctrl/Cmd+click)
- **FR-008**: Extension MUST provide visual feedback for selected elements (highlighting, color change)
- **FR-009**: Extension MUST query available analysis tools from debrief-calc based on current selection context
- **FR-010**: Extension MUST display tool names and descriptions in a discoverable tools panel
- **FR-011**: Extension MUST allow execution of selected tools against the current selection
- **FR-012**: Extension MUST show execution progress for long-running tool operations
- **FR-013**: Extension MUST automatically refresh the map display when tool results are written
- **FR-014**: Extension MUST display error messages when tool execution fails
- **FR-015**: Extension MUST allow users to add and remove STAC store registrations
- **FR-016**: Extension MUST support map navigation (pan, zoom) while viewing plots
- **FR-017**: Extension MUST persist view state (last opened catalog, map position) across sessions

### Key Entities

- **STAC Store**: A registered local directory containing a STAC catalog. Has a path and optional display name.
- **Plot**: A STAC Item containing GeoJSON features representing vessel tracks and reference locations. Has metadata (title, timestamp, source).
- **Track**: A GeoJSON LineString feature representing a vessel's movement over time. Has attributes (name, platform type, time range).
- **Reference Location**: A GeoJSON Point feature marking a significant location. Has attributes (name, type).
- **Selection**: The set of currently selected map elements. Can contain zero or more tracks/locations.
- **Analysis Tool**: A callable operation that takes a selection context and produces results. Has metadata (name, description, applicable selection types).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: View maritime plot data, select elements of interest, and run analysis tools to gain insights
- **Key Decision(s)**:
  1. Which plot to view (from available STAC catalogs)
  2. Which data elements to select for analysis
  3. Which analysis tool to apply to the selection
- **Decision Inputs**:
  - Catalog browser shows store names and plot titles with timestamps
  - Map shows track geometry and colors
  - Tool panel shows tool names, descriptions, and applicability to current selection

### Screen Progression

| Step | Screen/State              | User Action                    | Result                                          |
|------|---------------------------|--------------------------------|-------------------------------------------------|
| 1    | VS Code with extension    | Click Debrief icon in sidebar  | Catalog browser panel opens                     |
| 2    | Catalog browser expanded  | Expand store, click plot       | Map panel opens showing plot tracks             |
| 3    | Map with tracks displayed | Click on a track               | Track highlights, selection indicator appears   |
| 4    | Track selected            | Open tools panel               | Available tools listed for selection context    |
| 5    | Tools listed              | Click Execute on a tool        | Progress indicator shows, tool runs             |
| 6    | Tool complete             | View results                   | Map refreshes with result layer visible         |

### UI States

- **Empty State**: "No STAC stores configured. Use the Add Store command to register a catalog location."
- **Loading State**: Spinner with "Loading catalog..." or "Executing [tool name]..."
- **Error State**: Red notification banner with error message and "Retry" or "Dismiss" actions
- **Success State**: Green notification "Analysis complete" that auto-dismisses, map shows new results

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate from opening VS Code to viewing a plot on the map in under 30 seconds
- **SC-002**: Map displays plots with up to 10,000 track points without noticeable lag
- **SC-003**: 95% of users can successfully select a track and execute a tool on first attempt without documentation
- **SC-004**: Tool execution results appear on the map within 2 seconds of computation completing
- **SC-005**: Full end-to-end workflow (browse → display → select → analyze → view results) is demonstrable
- **SC-006**: Extension successfully reads configuration from all supported platforms (Linux, macOS, Windows)
- **SC-007**: Pre-release extension is published to VS Code Marketplace for beta testing
- **SC-008**: Beta feedback collected on map display, selection UX, and tool invocation

## Assumptions

- Users have VS Code installed (version compatible with extension API requirements)
- STAC stores have been previously registered via the Loader app (Stage 4) or manual configuration
- The debrief-calc service is available locally for tool discovery and execution
- Plots contain valid GeoJSON data conforming to the Debrief schema
- Users have sufficient local storage to hold STAC catalogs and tool results

## Dependencies

- **debrief-config** (Stage 3): For reading registered STAC store locations
- **debrief-stac** (Stage 1): For STAC catalog read operations
- **debrief-calc** (Stage 5): For tool discovery and execution via MCP
- **Shared schemas** (Stage 0): For GeoJSON and STAC data structures

## Out of Scope

- Creating new plots (handled by Loader app - Stage 4)
- Importing data files (handled by Loader app - Stage 4)
- Editing track data or plot metadata
- 3D visualization
- Collaborative/multi-user features
- Cloud-based STAC catalogs (local catalogs only for this stage)
- Timeline visualization component (future enhancement)
