# Feature Specification: Restore Web Shell Playwright Tests

**Feature Branch**: `054-restore-web-shell-tests`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Restore web-shell Playwright tests by implementing required app components so that 34 skipped tests across 5 test files can be unskipped and pass"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse STAC Catalog (Priority: P1)

A user opens the web shell and sees a welcome view with a catalog overview. The catalog displays STAC items as a visual timeline, showing the temporal extent of each dataset. The user can hover over timeline entries to see details and double-click an item to open it for analysis.

**Why this priority**: Catalog browsing is the entry point for every other workflow. Without the ability to see and select datasets, no downstream features (plot loading, selection, analysis) can function. This story restores 4 tests.

**Independent Test**: Can be fully tested by loading the web shell at `/`, verifying the welcome view renders with a title, subtitle, catalog overview with timeline entries, and tooltip on hover. Delivers value as the foundational navigation experience.

**Acceptance Scenarios**:

1. **Given** the web shell loads at `/`, **When** the page renders, **Then** the welcome view displays with heading "Debrief Web Shell" and subtitle "STAC Catalog Browser"
2. **Given** the welcome view is displayed, **When** STAC data has loaded, **Then** the catalog overview shows a timeline with at least two items ("Exercise Alpha" and "Training Run 1") as timeline bars or points
3. **Given** the catalog timeline is visible, **When** the user hovers over a timeline entry, **Then** a tooltip appears with the item name and temporal extent
4. **Given** a catalog item is visible, **When** the user double-clicks on a timeline entry, **Then** the view transitions from the welcome view to the analysis view

---

### User Story 2 - Load and View Plot Data (Priority: P1)

After selecting a STAC item from the catalog, the user sees an analysis view with a map displaying geographic features, a sidebar, and an activity panel. The user can navigate back to the catalog at any time.

**Why this priority**: Plot loading and map rendering are required for all analytical features. This story restores 6 tests and, combined with Story 1, establishes the core navigation loop.

**Independent Test**: Can be fully tested by double-clicking a catalog item, verifying the analysis view renders with a map containing geographic features, a sidebar, and an activity panel. The back button returns to the catalog view.

**Acceptance Scenarios**:

1. **Given** the user double-clicks a STAC item in the catalog, **When** the analysis view opens, **Then** a map is displayed showing geographic features from the selected dataset
2. **Given** the analysis view is active, **When** the view has loaded, **Then** a sidebar and activity panel are visible alongside the map
3. **Given** the analysis view is active, **When** the user clicks the "Back to Catalog" button, **Then** the view returns to the welcome view with the catalog overview

---

### User Story 3 - Synchronize Selection Between Map and Panel (Priority: P2)

While viewing a plot, the user can select features by clicking on them in the map or in the feature list panel. Selections are synchronized: clicking a feature on the map highlights it in the panel, and clicking a feature in the panel highlights it on the map. Clicking the map background clears the selection.

**Why this priority**: Selection synchronization is essential for interactive analysis, enabling the user to correlate geographic and tabular views. This story restores 5 tests and depends on the plot loading from Story 2.

**Independent Test**: Can be fully tested by loading a plot, clicking a map feature, verifying the feature list highlights the corresponding row, then clicking a panel row and verifying the map highlights the corresponding feature.

**Acceptance Scenarios**:

1. **Given** the analysis view shows a plot with features, **When** the user clicks a feature on the map, **Then** the corresponding row in the feature list panel is highlighted as selected
2. **Given** the analysis view shows a plot with features, **When** the user clicks a feature row in the panel, **Then** the corresponding feature on the map is highlighted as selected
3. **Given** a feature is currently selected, **When** the user clicks the map background (not on any feature), **Then** the selection is cleared in both the map and the panel

---

### User Story 4 - Control Temporal Playback (Priority: P2)

While viewing a plot, the user interacts with a time controller to play back data over time. The time controller provides play/pause, a time scrubber, speed control, display mode toggle, and a current time display. The controller activates when time-stamped data is loaded.

**Why this priority**: Temporal playback is a core capability of Debrief for analyzing track data over time. This story restores 13 tests and depends on plot loading from Story 2.

**Independent Test**: Can be fully tested by loading a plot with time-stamped data, verifying the time controller appears with all controls, and interacting with play/pause and the scrubber to change the displayed time.

**Acceptance Scenarios**:

1. **Given** the analysis view loads a plot with time-stamped data, **When** the data finishes loading, **Then** the time controller becomes active (ready state) and displays all controls: play/pause, scrubber, speed selector, display mode toggle, and time display
2. **Given** the time controller is in ready state, **When** the user clicks play, **Then** the scrubber position advances and the time display updates to reflect the current playback time
3. **Given** playback is active, **When** the user clicks pause, **Then** playback stops and the scrubber holds its current position
4. **Given** the time controller is active, **When** the user drags the scrubber to a new position, **Then** the time display updates to the corresponding time and map features reflect the selected moment
5. **Given** the time controller is active, **When** the user changes the speed setting, **Then** playback rate adjusts accordingly

---

### User Story 5 - Execute Analysis Tools (Priority: P3)

While viewing a plot, the user sees a tools panel that lists available analysis tools. Tools are context-sensitive: they activate or deactivate based on the current selection. The user can run an active tool and see its result displayed as a message, which can be dismissed.

**Why this priority**: Tool execution is the primary analytical capability, but it depends on both plot loading and selection working correctly. This story restores 6 tests and represents the final layer of functionality.

**Independent Test**: Can be fully tested by loading a plot, selecting a track feature, verifying that relevant tools become active, clicking a tool's run button, and confirming the result message appears with expected content.

**Acceptance Scenarios**:

1. **Given** the analysis view is active with no features selected, **When** the user views the tools panel, **Then** all tools are displayed in an inactive state
2. **Given** a track feature is selected on the map, **When** the tools panel updates, **Then** the "Track Length" and "Bounding Box" tools become active with run buttons
3. **Given** any feature is selected (not necessarily a track), **When** the tools panel updates, **Then** the "Bounding Box" tool becomes active
4. **Given** the "Track Length" tool is active, **When** the user clicks its run button, **Then** a result message appears containing the computed length with a unit indicator
5. **Given** a tool result message is displayed, **When** the user clicks the dismiss button, **Then** the message is removed from the view

---

### Edge Cases

- What happens when the STAC catalog is empty (no items available)?
- How does the system handle a STAC item with no geographic features (empty plot)?
- What happens when the user double-clicks a timeline entry while the analysis view is still loading a previous item?
- How does the time controller behave when data has only a single time stamp (no range)?
- What happens when the user tries to run a tool while a previous tool result is still displayed?
- How does selection sync behave when a map feature has no corresponding row in the panel (data mismatch)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web shell MUST display a welcome view at the root URL with heading "Debrief Web Shell" and subtitle "STAC Catalog Browser"
- **FR-002**: The welcome view MUST include a catalog overview component with a timeline showing STAC items as bars or points
- **FR-003**: The catalog timeline MUST display at least two pre-loaded sample items ("Exercise Alpha" and "Training Run 1") at startup
- **FR-004**: The catalog timeline MUST show a tooltip with item details when the user hovers over an entry
- **FR-005**: The welcome view MUST transition to an analysis view when the user double-clicks a catalog item
- **FR-006**: The analysis view MUST display a map showing geographic features from the selected STAC item
- **FR-007**: The analysis view MUST include a sidebar and an activity panel alongside the map
- **FR-008**: The analysis view MUST provide a "Back to Catalog" button that returns to the welcome view
- **FR-009**: The activity panel MUST display a feature list showing all features in the loaded plot
- **FR-010**: Clicking a feature on the map MUST highlight the corresponding row in the feature list
- **FR-011**: Clicking a row in the feature list MUST highlight the corresponding feature on the map
- **FR-012**: Clicking the map background (no feature) MUST clear the selection in both map and panel
- **FR-013**: The activity panel MUST include a time controller that activates when time-stamped data is loaded
- **FR-014**: The time controller MUST provide play/pause, scrubber (0-100 range), speed selector, display mode toggle, and time display controls
- **FR-015**: The time controller MUST advance the scrubber and update the time display during playback
- **FR-016**: The activity panel MUST include a tools panel listing available analysis tools
- **FR-017**: Tools MUST activate or deactivate based on the current feature selection (context-sensitive activation)
- **FR-018**: The "Track Length" tool MUST activate when a track is selected; the "Bounding Box" tool MUST activate when any feature is selected
- **FR-019**: Running an active tool MUST display a result message containing the computed output
- **FR-020**: Tool result messages MUST be dismissible via a close/dismiss button
- **FR-021**: All 34 existing Playwright tests across 5 test files MUST pass when their `.skip` annotations are removed
- **FR-022**: All tested DOM selectors (as documented in the restoration requirements) MUST be present in the rendered application

### Key Entities

- **STAC Item**: A dataset entry in the catalog with a name, temporal extent, and associated geographic features. Displayed as a timeline bar or point in the catalog overview.
- **Plot**: A loaded STAC item displayed in the analysis view, consisting of geographic features rendered on a map and listed in the activity panel.
- **Feature**: A geographic entity within a plot (e.g., a track, a point, a zone). Features are selectable and can be displayed on both the map and in the feature list.
- **Track**: A specific type of feature representing a series of positions over time. Tracks are eligible for temporal playback and track-specific analysis tools.
- **Analysis Tool**: A context-sensitive operation that can be executed against selected features. Tools have active/inactive states and produce dismissible result messages.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Browse available datasets, select one for analysis, interact with its features on a map, control temporal playback, and run analysis tools
- **Key Decision(s)**:
  1. Which dataset to open from the catalog
  2. Which feature to select for inspection or analysis
  3. Which analysis tool to run against the selected feature
- **Decision Inputs**: Catalog timeline shows available datasets with temporal extents. Map shows geographic features. Feature list shows item names. Tools panel shows which tools are applicable to the current selection.

### Screen Progression

| Step | Screen/State        | User Action                     | Result                                                    |
|------|---------------------|---------------------------------|-----------------------------------------------------------|
| 1    | Welcome view        | Views catalog timeline          | STAC items shown as bars/points with temporal extents      |
| 2    | Welcome view        | Hovers over timeline entry      | Tooltip appears with item name and details                 |
| 3    | Welcome view        | Double-clicks a catalog item    | Transitions to analysis view with map, sidebar, and panels |
| 4    | Analysis view       | Clicks a feature on the map     | Feature highlighted on map; corresponding row selected     |
| 5    | Analysis view       | Clicks a row in feature list    | Row highlighted; corresponding map feature selected        |
| 6    | Analysis view       | Interacts with time controller  | Playback advances; map updates to show features at time    |
| 7    | Analysis view       | Clicks run on an active tool    | Result message displayed with computed output              |
| 8    | Analysis view       | Dismisses tool result           | Message removed from view                                  |
| 9    | Analysis view       | Clicks "Back to Catalog"        | Returns to welcome view with catalog overview              |

### UI States

- **Empty State**: Welcome view with catalog timeline but no items — displays an empty timeline area (edge case when catalog has no data)
- **Loading State**: Transition between welcome and analysis views — map and panels render progressively as data loads
- **Error State**: If STAC data fails to load, the catalog area or analysis view shows an appropriate error indication
- **Success State**: Welcome view shows populated timeline; analysis view shows map with features, active time controller, and context-sensitive tools panel

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 34 Playwright tests pass when `.skip` annotations are removed, achieving a 100% pass rate across all 5 test files
- **SC-002**: Phase 1 tests (catalog-browse and plot-load: 10 tests) pass independently before Phase 2 or Phase 3 tests are restored
- **SC-003**: Phase 2 tests (selection-sync and time-controller: 18 tests) pass when restored after Phase 1
- **SC-004**: Phase 3 tests (tool-execution: 6 tests) pass when restored after Phases 1 and 2
- **SC-005**: Tests pass in both local development (browser-based Playwright) and CI/cloud environments (sandboxed Chromium)
- **SC-006**: The web shell welcome-to-analysis navigation round-trip (open item, navigate back) completes without errors in under 5 seconds

## Assumptions

- The Playwright test infrastructure (config, page objects, component objects, CI workflow) is already working and does not need modification
- The test bodies preserved in the `.skip`-annotated files are correct and do not need changes to their assertions or selectors
- Sample STAC data ("Exercise Alpha" and "Training Run 1") will be bundled with or embedded in the web shell for test purposes
- The phased restoration order (P1 → P2 → P3) reflects actual dependency chains: selection sync and time controller require plot loading, tool execution requires selection
- The DOM selectors documented in the restoration requirements represent the contract between tests and app components
