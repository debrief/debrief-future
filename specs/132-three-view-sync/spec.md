# Feature Specification: Three-View Synchronization and Filter State

**Feature Branch**: `132-three-view-sync`
**Created**: 2026-03-07
**Status**: Draft
**Input**: User description: "[E08] Three-view synchronization and filter state — shared filter state coordinating filter bar + list + map + timeline; dynamic updates; zero-results handling"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Metadata Filtering Across All Views (Priority: P1)

An analyst opens the STAC browser and adds a metadata filter (e.g., vessel class = "Submarine") via the filter bar. All three views — list, map, and timeline — instantly update to show only exercises matching that filter. The analyst can add multiple filters (vessel class, nationality, tags) and see the combined result reflected everywhere simultaneously.

**Why this priority**: This is the foundational synchronization behaviour. Without metadata filter propagation, the three views operate independently and cannot provide a unified browsing experience. This story enables the core value proposition of "filter once, see everywhere."

**Independent Test**: Can be fully tested by adding/removing metadata filters in the filter bar and verifying that list, map, and timeline each show only matching exercises. Delivers immediate value even without spatial or temporal filtering.

**Acceptance Scenarios**:

1. **Given** the browser is open with 50 exercises loaded, **When** the analyst adds a "vessel_class = Submarine" filter, **Then** all three views update within 200ms to show only submarine exercises
2. **Given** a metadata filter is active showing 10 exercises, **When** the analyst adds a second filter "nationality = UK", **Then** all three views update to show only exercises matching both filters (AND logic)
3. **Given** two metadata filters are active, **When** the analyst removes one filter, **Then** all three views expand to show the broader result set matching the remaining filter
4. **Given** metadata filters are active, **When** the analyst clears all filters, **Then** all three views return to showing the full exercise set

---

### User Story 2 - Spatial Filtering via Map Viewport (Priority: P2)

An analyst pans and zooms the map to focus on a specific geographic region (e.g., the North Atlantic). The list and timeline automatically update to show only exercises whose spatial extent overlaps the current map viewport. When the analyst pans to a new region, the views update dynamically.

**Why this priority**: Spatial filtering is a natural interaction pattern for maritime analysts — they think geographically. This story enables the "zoom to area of interest" workflow that is central to exercise discovery.

**Independent Test**: Can be tested by panning/zooming the map and verifying the list and timeline filter to exercises overlapping the viewport. Works independently of metadata filters.

**Acceptance Scenarios**:

1. **Given** the map shows the full world with 50 exercises, **When** the analyst zooms into the North Atlantic, **Then** the list and timeline update to show only exercises with bounding boxes overlapping the North Atlantic viewport
2. **Given** the map is zoomed to a region showing 5 exercises, **When** the analyst pans east to a new region, **Then** the list and timeline update to reflect exercises in the new viewport
3. **Given** a spatial filter is active, **When** the analyst zooms out to show the full world, **Then** all exercises reappear in the list and timeline
4. **Given** exercises exist without spatial data (no bounding box), **When** a spatial filter is active, **Then** those exercises are excluded from the map but remain visible in the list and timeline (spatial filter does not apply to exercises lacking spatial data)

---

### User Story 3 - Temporal Filtering via Timeline Range (Priority: P3)

An analyst adjusts the timeline range handles to focus on a specific time period (e.g., January–March 2024). The list and map update to show only exercises whose temporal extent overlaps the selected time range. The analyst can drag handles to widen or narrow the range.

**Why this priority**: Temporal filtering completes the three-axis filtering model. Many analysts search for exercises by date range, making this essential for the full discovery workflow, but it builds on the foundation of P1 and P2.

**Independent Test**: Can be tested by adjusting timeline range handles and verifying the list and map filter to exercises overlapping the selected time period. Works independently of metadata and spatial filters.

**Acceptance Scenarios**:

1. **Given** the timeline shows all exercises spanning 2020–2025, **When** the analyst drags the range handles to select Jan–Mar 2024, **Then** the list and map update to show only exercises overlapping that period
2. **Given** a temporal filter is active showing 8 exercises, **When** the analyst narrows the range to a single month, **Then** the list and map update to show only exercises active during that month
3. **Given** a temporal filter is active, **When** the analyst resets the range to cover all time, **Then** all exercises reappear in the list and map
4. **Given** exercises exist without temporal data, **When** a temporal filter is active, **Then** those exercises are excluded from the timeline but remain visible in the list and map (temporal filter does not apply to exercises lacking temporal data)

---

### User Story 4 - Combined Multi-Axis Filtering (Priority: P4)

An analyst applies filters across all three axes simultaneously: a metadata filter (vessel class), a spatial filter (zoomed map viewport), and a temporal filter (timeline range). All views show only exercises satisfying all three filter criteria. Changing any single filter updates the result set across all views.

**Why this priority**: This is the integration story — it validates that metadata, spatial, and temporal filters compose correctly using AND logic. It is the culmination of P1–P3 and represents the full analyst workflow.

**Independent Test**: Can be tested by activating one filter from each axis and verifying that all three views show only the intersection of matching exercises. Removing one filter broadens the result set appropriately.

**Acceptance Scenarios**:

1. **Given** no filters are active, **When** the analyst adds a metadata filter, then zooms the map, then narrows the timeline range, **Then** all views show only exercises matching all three criteria
2. **Given** all three filter axes are active showing 3 exercises, **When** the analyst removes the metadata filter, **Then** all views update to show exercises matching only spatial + temporal criteria (more results)
3. **Given** all three filter axes are active, **When** the analyst pans the map to include more exercises, **Then** the list and timeline update to reflect the broader spatial extent while preserving metadata and temporal filters

---

### User Story 5 - Zero Results Handling (Priority: P5)

An analyst applies a combination of filters that results in no matching exercises. All three views display a consistent "no matches" state. The analyst can see which filters are active and modify or clear them to broaden the search.

**Why this priority**: Empty states are common during exploratory filtering. Without clear feedback, the analyst might think the system is broken. This story ensures graceful degradation and discoverability of the "no results" condition.

**Independent Test**: Can be tested by applying restrictive filters until no exercises match, then verifying all views show appropriate empty states. Clearing a filter returns results.

**Acceptance Scenarios**:

1. **Given** filters are active showing 2 exercises, **When** the analyst adds a further filter that excludes all remaining exercises, **Then** all three views display a "no matching exercises" message
2. **Given** all views show "no matching exercises," **When** the analyst removes one filter, **Then** all views update to show any newly matching exercises
3. **Given** zero results are displayed, **Then** the filter bar remains visible showing all active filters so the analyst can identify which filter to adjust

---

### Edge Cases

- What happens when an exercise has no bounding box? It is excluded from spatial filtering but included in metadata and temporal filtering. It never appears on the map but can appear in the list and timeline.
- What happens when an exercise has no temporal data? It is excluded from temporal filtering but included in metadata and spatial filtering. It shows a "no time data" indicator in the timeline view.
- What happens when the filter bar expression changes rapidly (e.g., typing in a search field)? Filter updates are debounced to prevent excessive re-rendering across all views.
- What happens when the map viewport changes very fast (rapid panning)? Spatial filter updates are debounced (150ms) to prevent performance degradation.
- What happens when all filters are cleared simultaneously? All views return to showing the full exercise set in a single coordinated update.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain a shared filter state that combines metadata filters, spatial filters, and temporal filters into a single composite filter
- **FR-002**: System MUST propagate filter state changes from any source (filter bar, map viewport, timeline range) to all subscribing views within 200ms of the user action
- **FR-003**: System MUST apply AND logic when combining filters across different axes (metadata AND spatial AND temporal)
- **FR-004**: System MUST update the list view to show only exercises passing all active filters
- **FR-005**: System MUST update the map view to show footprints only for exercises passing metadata and temporal filters (spatial filter is implicit via viewport)
- **FR-006**: System MUST update the timeline view to show bars only for exercises passing metadata and spatial filters (temporal filter is implicit via range handles)
- **FR-007**: System MUST display a consistent "no matching exercises" state across all views when no exercises satisfy the active filter combination
- **FR-008**: System MUST preserve filter state when views are resized or rearranged within the panel layout
- **FR-009**: System MUST exclude exercises without spatial data from spatial filtering while including them in metadata and temporal filtering
- **FR-010**: System MUST exclude exercises without temporal data from temporal filtering while including them in metadata and spatial filtering
- **FR-011**: System MUST debounce spatial filter updates (map viewport changes) to prevent excessive recalculation during rapid panning or zooming
- **FR-012**: System MUST allow the analyst to clear all filters at once, returning all views to the unfiltered state
- **FR-013**: System MUST ensure that metadata filter output from the filter bar is fed into the shared filter state as a single source of truth, not applied independently per view
- **FR-014**: System MUST keep the filter bar visible and interactive even when zero results are displayed, so the analyst can modify active filters

### Key Entities

- **FilterState**: The composite object representing all active filters — metadata filter expression, spatial viewport bounds, and temporal time range. All views derive their displayed exercises from this single source of truth.
- **Exercise**: A STAC Item representing a naval exercise with optional spatial extent (bounding box) and optional temporal extent (start/end datetime). Exercises are the objects being filtered across all views.
- **SpatialFilter**: The current map viewport bounds used to filter exercises by geographic overlap. Null when no spatial filter is active.
- **TemporalFilter**: The current timeline range used to filter exercises by time overlap. Null when no temporal filter is active.
- **MetadataFilter**: The CQL2 filter expression from the filter bar, plus the resulting set of matching exercise IDs. Null when no metadata filters are active.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Discover and narrow down exercises of interest using any combination of metadata, spatial, and temporal filters, with all views staying synchronized
- **Key Decision(s)**:
  1. Which filter axis to use first (metadata, spatial, or temporal) — the system supports any order
  2. How aggressively to filter — the analyst can combine multiple axes or use just one
- **Decision Inputs**: The filter bar shows active filter count and criteria; the map shows footprint density; the timeline shows exercise distribution over time. All three provide visual feedback on the current result set size.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|-------------|-------------|--------|
| 1 | Browser opens with all exercises loaded | Views initialize | List shows all exercises; map shows all footprints; timeline shows all bars; filter bar is empty |
| 2 | Analyst wants to narrow by type | Adds "vessel_class = Submarine" filter in filter bar | All views update to show only submarine exercises; filter bar shows one active lozenge |
| 3 | Analyst wants geographic focus | Zooms/pans map to North Atlantic | List and timeline further narrow to show only submarine exercises in the North Atlantic |
| 4 | Analyst wants time focus | Drags timeline range to Jan–Jun 2024 | List and map further narrow to show only submarine exercises in the North Atlantic during Jan–Jun 2024 |
| 5 | Analyst broadens search | Removes the vessel class filter | All views update to show exercises in the North Atlantic during Jan–Jun 2024 (any vessel class) |
| 6 | Too restrictive — no results | Narrows timeline to one day with no exercises | All views show "no matching exercises" message |
| 7 | Analyst recovers | Widens timeline range or clears filters | Views repopulate with matching exercises |

### UI States

- **Empty State**: All views display a centred message: "No matching exercises. Adjust or clear filters to see results." The filter bar remains visible showing all active filters.
- **Loading State**: During initial data load, all views show a placeholder skeleton. Filter bar is disabled until data arrives.
- **Error State**: If data fails to load, all views show an error message with a retry option. Filter bar is hidden until data is available.
- **Success State**: All views display exercises matching the current filter state. The filter bar shows active filter count. Map footprints, list rows, and timeline bars are all in sync.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a metadata filter is added or removed, all three views reflect the updated result set within 200ms
- **SC-002**: When the map viewport changes, the list and timeline update to reflect the spatial filter within 350ms (including 150ms debounce)
- **SC-003**: When the timeline range changes, the list and map update to reflect the temporal filter within 200ms
- **SC-004**: Combined filtering across all three axes (metadata + spatial + temporal) produces the correct intersection of matching exercises — verified with at least 5 distinct filter combinations in tests
- **SC-005**: When no exercises match the active filters, all three views display the "no matching exercises" state consistently and simultaneously
- **SC-006**: An analyst can complete a filter-narrow-discover workflow (add filter, zoom map, adjust timeline, select exercise) in under 10 seconds with 50 exercises loaded
- **SC-007**: Filter state remains consistent after view resize — no stale or out-of-sync results appear
- **SC-008**: Exercises missing spatial or temporal data are handled correctly: they are excluded from the axis they lack data for but remain available via other filter axes

## Assumptions

- The filter bar (#127), list view (#129), map view (#130), and timeline view (#131) are implemented and expose the callback/prop interfaces described in their respective specifications
- The existing session state store (feature #024) provides the reactive state management infrastructure for shared filter state
- The exercise data model follows the STAC Item structure already defined in the project schemas
- Performance targets (200ms, 350ms) are measured with datasets of up to 500 exercises; larger datasets may require additional optimization in future iterations
- The CatalogOverview component (#042) will be replaced or substantially refactored by this feature's composition layer
- Spatial overlap is determined by bounding box intersection (not point-in-polygon or complex geometry)

## Dependencies

- **#127** — Filter Bar Lozenge UI: provides metadata filtering interface and filtered item callbacks
- **#129** — List View: provides exercise list display that accepts filtered items
- **#130** — Map Spatial Filtering: provides map viewport events and footprint rendering
- **#131** — Timeline Gantt View: provides temporal range adjustment and exercise bar rendering
- **#024** — Session State: provides reactive state store infrastructure
