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
- **FR-018**: Extension MUST provide basic keyboard shortcuts (Ctrl+A select all, Delete clear selection, arrow keys pan)
- **FR-019**: Extension MUST display track labels at the start point of each track on the map
- **FR-020**: Extension MUST allow users to customize track colors via context menu
- **FR-021**: Extension MUST store user-customized track colors in plot metadata
- **FR-022**: Extension MUST open plots with map view fitted to all track bounds
- **FR-023**: Extension MUST provide PNG export of current map view
- **FR-024**: Extension MUST expose settings (glow effect, default colors) via VS Code settings.json
- **FR-025**: Extension MUST register STAC stores as virtual folders in VS Code Explorer panel
- **FR-026**: Extension MUST support drag-and-drop of plots from Explorer to open them
- **FR-027**: Extension MUST provide "Debrief: Open Plot" command in Command Palette
- **FR-028**: Extension MUST display a scale control on the map
- **FR-029**: Extension MUST show selected tracks in VS Code's Outline panel
- **FR-030**: Extension MUST display a welcome screen with recent plots when no plot is open
- **FR-031**: Extension MUST track recently opened plots for quick access

### Developer Experience Requirements

- **DX-001**: Extension MUST include VS Code launch configuration (`.vscode/launch.json`) for F5 debugging in Extension Development Host
- **DX-002**: Extension MUST include sample STAC test data (`test-data/`) with valid catalog structure and maritime plot for local testing
- **DX-003**: Sample test data MUST include at least 2 vessel tracks with realistic coordinate sequences
- **DX-004**: Sample test data MUST include at least 1 reference location point

### Key Entities

- **STAC Store**: A registered local directory containing a STAC catalog. Has a path and optional display name.
- **Plot**: A STAC Item containing GeoJSON features representing vessel tracks and reference locations. Has metadata (title, timestamp, source).
- **Track**: A GeoJSON LineString feature representing a vessel's movement over time. Has attributes (name, platform type, time range).
- **Reference Location**: A GeoJSON Point feature marking a significant location. Has attributes (name, type).
- **Selection**: The set of currently selected map elements. Can contain zero or more tracks/locations.
- **Analysis Tool**: A callable operation that takes a selection context and produces results. Has metadata (name, description, applicable selection types).

## User Interface Design

> **Design Review Status**: Wireframes reviewed and approved on 2026-01-15.

### Extension Layout Overview

The extension uses VS Code's standard extension patterns: Explorer panel for data browsing, a sidebar view for analysis controls, and webview panels for map display.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  VS Code Window                                                                  │
├────────┬───────────────────────┬─────────────────────────────────────────────────┤
│        │                       │                                                 │
│ Activity│  Explorer            │              Editor Area                        │
│  Bar   │  (with STAC stores)  │  ┌───────────────────────────────────────────┐  │
│        │ ┌───────────────────┐ │  │  ┌─────────────────────────┐             │  │
│ ┌────┐ │ │ ▼ 📁 Project Files │ │  │  │ [🔍+] [🔍-] [🎯] [📷] │ ← Floating  │  │
│ │ 🗂️◄├─│ │ ▼ 📁 STAC: Local   │ │  │  └─────────────────────────┘   toolbar  │  │
│ └────┘ │ │   📊 Exercise A    │ │  │                                         │  │
│ ┌────┐ │ │   📊 Exercise B    │ │  │  HMS Defender ════════════►  (glow)    │  │
│ │ 🔍 │ │ │ ▶ 📁 STAC: Archive │ │  │       Track B ─────────────►           │  │
│ └────┘ │ └───────────────────┘ │  │                   ◉ Reference           │  │
│ ┌────┐ │                       │  │                                         │  │
│ │ ⚓ │ │  Debrief Sidebar      │  │                        ┌────────────┐   │  │
│ └────┘ │ ┌───────────────────┐ │  │                        │ ├─┤ 500m  │   │  │
│ Debrief│ │ TIME RANGE        │ │  │                        └────────────┘   │  │
│  Icon  │ │ ◀════●══════════▶ │ │  │                          ↑ Scale       │  │
│        │ ├───────────────────┤ │  └───────────────────────────────────────────┘  │
│        │ │ TOOLS (2 tracks)  │ │                                                 │
│        │ │ 📐 Range & Brg [▶]│ │                                                 │
│        │ ├───────────────────┤ │                                                 │
│        │ │ LAYERS            │ │                                                 │
│        │ │ ☑ HMS Defender    │ │                                                 │
│        │ │ ☑ USS Freedom     │ │                                                 │
│        │ └───────────────────┘ │                                                 │
└────────┴───────────────────────┴─────────────────────────────────────────────────┘
```

**Layout Key Points**:
- STAC stores appear in VS Code Explorer panel (drag or double-click to open)
- Command palette provides quick access: `Debrief: Open Plot`
- Debrief sidebar contains only analysis controls (Time, Tools, Layers)
- Selection shown in VS Code's Outline panel
- Map toolbar floats over map canvas (top-left)
- Scale control on map (bottom-right)

### Data Loading

Plots are loaded via two methods:

**1. Explorer Panel**:
- STAC stores appear as virtual folders prefixed "STAC:"
- Drag plot onto editor area, or double-click to open
- Right-click for context menu (Open, Show in Finder/Explorer)

**2. Command Palette**:
- `Ctrl+Shift+P` → "Debrief: Open Plot"
- Searchable quick pick of all plots across registered stores
- Recently opened plots appear first

### Sidebar: Debrief Control Panel

Located in the VS Code sidebar when the Debrief icon is clicked. Contains three collapsible sections for analysis workflow.

```
┌─────────────────────────────────┐
│  TIME RANGE                [▼] │  ← Collapsible header
├─────────────────────────────────┤
│                                 │
│  ◀═══════●═══════════════════▶ │  ← Dual-handle slider
│  09:30       11:45       14:00 │
│                                 │
│  [Full Range] [Fit to Selection]│
│                                 │
├─────────────────────────────────┤
│  TOOLS                     [▼] │  ← Context-sensitive
├─────────────────────────────────┤
│                                 │
│  Selection: 2 tracks            │
│  ┌───────────────────────────┐ │
│  │ 📐 Range & Bearing   [▶] │ │
│  │ 📏 Closest Approach  [▶] │ │
│  │ 🔄 Relative Motion   [▶] │ │
│  └───────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  LAYERS                    [▼] │  ← Layer management
├─────────────────────────────────┤
│                                 │
│  ☑ 🚢 HMS Defender (source)    │
│  ☑ 🚢 USS Freedom (source)     │
│  ───────────────────────────── │  ← Separator
│  ☑ 📐 Range & Bearing (result) │
│                                 │
│  [Clear Results]               │
│                                 │
└─────────────────────────────────┘
```

**Time Range Interactions**:
- Drag slider handles to filter visible time range
- [Full Range] resets to complete data extent
- [Fit to Selection] zooms time to selected tracks

**Tools Panel Interactions**:
- Tools list updates based on current selection context
- Click [▶] to execute tool
- Disabled when no valid selection

**Layers Panel Interactions**:
- Checkbox toggles layer visibility
- Drag to reorder layers
- Right-click for rename/delete options
- [Clear Results] removes all computed layers

### Map Panel (Webview)

The primary workspace showing geospatial data. Opens as an editor tab. Uses Leaflet for map rendering.

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Exercise Alpha                              [×]             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ┌─────────────────────────┐                              │  │
│  │  │ [🔍+] [🔍-] [🎯] [📷]  │  ← Floating toolbar          │  │
│  │  └─────────────────────────┘    (top-left)                │  │
│  │                                                           │  │
│  │   HMS Defender ════════════════════════►                  │  │
│  │   ↑ label        ╲                                        │  │
│  │                   ╲  (glow effect on selected)            │  │
│  │                                                           │  │
│  │        USS Freedom ─────────────────►                     │  │
│  │                                                           │  │
│  │                         ◉ Alpha Point                     │  │
│  │                                                           │  │
│  │  ┌─────────────────────┐                                  │  │
│  │  │ HMS Defender        │  ← Tooltip on hover              │  │
│  │  │ Platform: Destroyer │                                  │  │
│  │  │ Points: 1,247       │                                  │  │
│  │  │ Time: 09:30 - 14:00 │                                  │  │
│  │  └─────────────────────┘                                  │  │
│  │                                                           │  │
│  │                                    ┌──────────────┐       │  │
│  │                                    │ ├──┤ 500m    │       │  │
│  │                                    └──────────────┘       │  │
│  │                                      ↑ Scale control      │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Toolbar Buttons**:
- 🔍+ Zoom in
- 🔍- Zoom out
- 🎯 Fit to bounds (zoom to show all tracks)
- 📷 Export as PNG

**Visual Design - Track Colors**:
- Unselected tracks: Muted colors (grays, light blues) with thin stroke
- Selected tracks: Bright, distinct colors (red, blue, green) with thick stroke + **animated glow effect**
- Hover state: Slight highlight effect (lighter glow than selection)
- Result layers: Dashed lines with distinct markers to differentiate from source tracks

**Selection Glow Effect**:
- Subtle pulsing glow around selected tracks (2-3 second cycle)
- Glow color matches track color at reduced opacity
- Provides clear visual feedback without obscuring track geometry
- Can be disabled in settings for performance-sensitive environments

**Selection Interactions**:
| Action | Result |
|--------|--------|
| Click track | Select (deselect others) |
| Shift+Click track | Add to selection |
| Ctrl/Cmd+Click track | Toggle in selection |
| Click empty space | Clear selection |
| Drag on map | Pan (not box select) |

### Tools Panel

Appears in VS Code's bottom panel area. Shows context-sensitive tools based on current selection.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TOOLS                                                          [─] [□] [×] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Selection: 2 tracks (HMS Defender, USS Freedom)                            │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  📐 Range & Bearing Calculator                              [Execute] │  │
│  │  Calculate distance and bearing between two tracks at matching times  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  📏 Closest Point of Approach                               [Execute] │  │
│  │  Find when and where the tracks came closest to each other            │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  🔄 Relative Motion Analysis                                [Execute] │  │
│  │  Compute motion of one track relative to the other                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  No selection? Select tracks on the map to see available tools.            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tool Execution States**:

```
Idle:          [Execute]              ← Blue button
Running:       [⏳ Running...]        ← Disabled, spinner
Success:       [✓ Complete]           ← Green, then resets
Error:         [⚠️ Failed - Retry]    ← Red, clickable
```

### Empty & Error States

**Welcome State (No Plot Open)**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                                                                 │
│                     ⚓ Debrief                                  │
│                                                                 │
│              Open a plot to get started                         │
│                                                                 │
│     • Drag a plot from Explorer onto this area                  │
│     • Or use  Ctrl+Shift+P → "Debrief: Open Plot"              │
│                                                                 │
│              ────────────────────────────                       │
│                                                                 │
│              Recent plots:                                      │
│              📊 Exercise Alpha (2 hours ago)                    │
│              📊 Training Run 1 (yesterday)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**No STAC Stores Registered**:
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                     📭 No data stores found                     │
│                                                                 │
│     Register a STAC store to browse your plot data.             │
│                                                                 │
│                   [+ Add Store]                                 │
│                                                                 │
│     A STAC store is a folder containing maritime plot data.     │
│     Learn more about STAC stores →                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Store Path Invalid** (in Explorer):
```
┌─────────────────────────────────┐
│  ▼ 📁 STAC: Local Data          │
│    ⚠️ Path not found            │
│    /old/path/to/catalog         │
│    [Remove] [Update Path]       │
└─────────────────────────────────┘
```

**Tool Execution Error**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Range & Bearing Calculator failed                 [Dismiss] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Error: Tracks have no overlapping time range                   │
│                                                                 │
│  💡 Suggestion: Select tracks from the same time period,        │
│     or adjust the time range filter in the sidebar.             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Decision Analysis

- **Primary Goal**: View maritime plot data, select elements of interest, and run analysis tools to gain insights
- **Key Decision(s)**:
  1. Which plot to view (from available STAC catalogs)
  2. Which data elements to select for analysis
  3. Which analysis tool to apply to the selection
- **Decision Inputs**:
  - Catalog browser shows store names and plot titles with timestamps
  - Map shows track geometry with color-coding for selection state
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

### Design Decisions (Resolved)

The following design decisions were made during review on 2026-01-15:

| # | Question | Decision | Rationale |
|---|----------|----------|-----------|
| 1 | ~~Catalog browser location~~ | ~~Sidebar~~ | *Superseded by #13* |
| 2 | Selection feedback | **Color + glow effect** | Enhanced visibility with animated highlight |
| 3 | Time range control | **Sidebar, permanently visible** | Always accessible for time-based analysis |
| 4 | Tools panel location | **Sidebar secondary view** | Integrated experience, always visible |
| 5 | Multi-plot support | **Multiple tabs** | Standard VS Code behavior, enables comparison |
| 6 | Result layer management | **Sidebar layer panel** | Full control: visibility, reorder, delete |
| 7 | Keyboard shortcuts | **Basic shortcuts** | Ctrl+A select all, Delete clears, arrows pan |
| 8 | Track labels | **Labels at start** | Small label at track start point |
| 9 | Track colors | **User-customizable** | Change via context menu, stored in metadata |
| 10 | Initial map view | **Fit all tracks** | Zoom to fit all tracks with padding |
| 11 | Export capabilities | **Image export only** | Export map view as PNG for reports |
| 12 | Settings location | **VS Code settings** | Use settings.json, syncs across devices |
| 13 | Data loading method | **Explorer + Command palette** | Catalogs not in sidebar; use Explorer drag or Cmd+P |
| 14 | Map library | **Leaflet** | Lightweight, well-documented, plugin ecosystem |
| 15 | Toolbar position | **Floating over map (top-left)** | Maximizes map canvas, familiar pattern |
| 16 | Scale control | **On map (bottom-right)** | Standard Leaflet control position |
| 17 | Selection display | **VS Code Outline panel** | Native VS Code integration, no custom UI |
| 18 | Welcome state | **Show recent plots** | Quick access to recently opened data |

**Key Architectural Decision**: The sidebar contains only analysis controls:
- Time range slider (top)
- Tools panel (middle)
- Layer management panel (bottom)

Data browsing happens in VS Code's Explorer panel (STAC stores as virtual folders).

**Additional Design Notes**:
- Keyboard shortcuts follow VS Code conventions (Ctrl+A, Delete, arrow keys)
- Tracks display small labels at start points for identification
- Users can customize track colors via right-click context menu
- Map opens fitted to all track bounds with padding
- PNG export available for including map views in reports
- Leaflet provides map rendering with scale control
- Extension settings live in VS Code's settings.json

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
- **Technology choice**: Leaflet will be used for map rendering (per design decision #14)

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
