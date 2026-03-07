# Feature Specification: Map View with Live Spatial Filtering

**Feature Branch**: `130-map-spatial-filtering`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: Map view displaying spatial footprints on map, with pan/zoom acting as a live spatial filter to dynamically narrow list and timeline views
**Depends on**: #125 (STAC Extension spec + mock data fixtures), #126 (CQL2 Filter Engine)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — View Exercise Spatial Footprints on Map (Priority: P1)

An analyst opens the Discovery UI and sees a map displaying the spatial footprints (bounding boxes) of all exercises matching the current filter criteria. Each footprint is positioned geographically, allowing the analyst to understand where exercises took place and identify clusters of activity in particular regions.

**Why this priority**: Without spatial footprints rendered on the map, no other map-based interaction (filtering, selection, colour coding) is possible. This is the foundational visual layer that all other stories build upon.

**Independent Test**: Load a set of STAC items with bounding boxes and verify that each item's footprint appears on the map at the correct geographic location.

**Acceptance Scenarios**:

1. **Given** a catalog containing 20 exercises with bounding boxes, **When** the map view renders, **Then** all 20 bounding boxes are visible on the map at their correct geographic positions.
2. **Given** a catalog containing exercises with varying geographic extents (from harbour-scale to ocean-scale), **When** the map view renders, **Then** the map auto-fits to show all footprints with appropriate padding.
3. **Given** a catalog where some exercises lack bounding box data, **When** the map view renders, **Then** exercises without spatial data are omitted from the map but remain visible in the list and timeline views.

---

### User Story 2 — Pan and Zoom as Live Spatial Filter (Priority: P1)

An analyst pans and zooms the map to a region of interest. As the viewport changes, the list and timeline views dynamically update to show only exercises whose spatial extent overlaps with the current map viewport. This allows the analyst to "browse by geography" — narrowing results simply by navigating the map.

**Why this priority**: Live spatial filtering is the core differentiating capability of this feature. Without it, the map is purely a display — with it, the map becomes an active discovery tool. Co-prioritised with P1 as both are essential to deliver any meaningful value.

**Independent Test**: Pan the map to a region containing a subset of exercises and verify that the list and timeline views show only exercises whose bounding boxes overlap the visible map area.

**Acceptance Scenarios**:

1. **Given** 50 exercises spread across different oceans, **When** the analyst zooms into the North Atlantic, **Then** the list and timeline views update to show only exercises whose bounding boxes overlap the North Atlantic viewport.
2. **Given** the map is zoomed to show all exercises, **When** the analyst pans east until some exercises leave the viewport, **Then** those exercises disappear from the list and timeline views.
3. **Given** the map is tightly zoomed to a single exercise, **When** the analyst zooms out, **Then** additional exercises appear in the list and timeline as their footprints enter the viewport.
4. **Given** a viewport that contains no exercise footprints, **When** the analyst stops panning, **Then** the list and timeline show a "no matches" indicator.

---

### User Story 3 — Exercise Colour Scheme on Map (Priority: P2)

An analyst views exercises on the map and can distinguish between them visually through colour coding. Exercises are coloured according to the active colour scheme, providing consistent visual identity across the map, list, and timeline views.

**Why this priority**: Colour coding aids visual identification and cross-referencing between views but is not required for the core spatial filtering functionality to work. It enhances usability but the feature is functional without it.

**Independent Test**: Load exercises with an active colour scheme and verify that each exercise footprint on the map uses the assigned colour, matching the colour shown in the list and timeline views.

**Acceptance Scenarios**:

1. **Given** 10 exercises with an active colour scheme, **When** the map renders, **Then** each exercise footprint uses its assigned colour for both outline and fill.
2. **Given** exercises displayed in all three views (map, list, timeline), **When** an exercise has been assigned a colour, **Then** the same colour appears consistently in all three views.
3. **Given** an exercise without an assigned colour, **When** the map renders, **Then** the exercise uses a default colour that is visually distinct from the background.

---

### User Story 4 — Select Exercise from Map (Priority: P3)

An analyst identifies an exercise of interest on the map and selects it to open it in a new editor tab. This provides a direct path from geographic discovery to detailed analysis without switching between views.

**Why this priority**: Selection is a convenience interaction that completes the discovery-to-analysis workflow. The map is fully useful for spatial filtering without it, but selection streamlines the analyst's workflow.

**Independent Test**: Double-click an exercise footprint on the map and verify that the exercise opens in a new editor tab.

**Acceptance Scenarios**:

1. **Given** exercises displayed on the map, **When** the analyst double-clicks an exercise footprint, **Then** the exercise opens in a new editor tab.
2. **Given** overlapping exercise footprints, **When** the analyst double-clicks in the overlapping region, **Then** the topmost exercise is selected.
3. **Given** an exercise footprint on the map, **When** the analyst hovers over it, **Then** a tooltip shows the exercise title and date range.

---

### User Story 5 — Cross-View Synchronisation (Priority: P2)

When the analyst applies metadata filters (via the filter bar), the map view updates to show only matching exercises. Conversely, when the analyst uses the map viewport as a spatial filter, the list and timeline views reflect only exercises visible in the current viewport. All views stay in sync: filters narrow the map, and the map viewport narrows the other views.

**Why this priority**: Cross-view synchronisation ensures the map integrates coherently with the rest of the Discovery UI. Without it, the map operates in isolation rather than as part of a unified discovery experience.

**Independent Test**: Apply a metadata filter that reduces the visible exercises, then verify the map only shows footprints for matching exercises. Pan the map to exclude some of those, then verify the list and timeline further narrow.

**Acceptance Scenarios**:

1. **Given** 50 exercises and a nationality filter set to "GB", **When** the filter is applied, **Then** the map shows only footprints for exercises matching nationality "GB".
2. **Given** metadata filters have reduced visible exercises to 10, **When** the analyst zooms the map to show only 3 of those 10, **Then** the list and timeline show only those 3 exercises.
3. **Given** a spatial filter is active (viewport narrowed), **When** the analyst clears all metadata filters, **Then** the map still shows only exercises within the viewport, while new exercises that match the expanded metadata criteria appear if their footprints fall within the viewport.

---

### Edge Cases

- What happens when zero exercises have bounding box data? The map shows a world view with no footprints; list and timeline show all exercises unaffected by spatial filtering.
- What happens when the viewport is panned to show no exercises? The list and timeline display a "no matching exercises" indicator; the map remains interactive.
- What happens when hundreds of exercise footprints overlap in a small area? Footprints render with transparency so overlapping areas are visually apparent; performance remains responsive.
- What happens when the user rapidly pans/zooms the map? Spatial filter updates are debounced to avoid excessive recalculation; the list and timeline update after the user pauses.
- What happens when an exercise's bounding box spans the antimeridian (date line)? The footprint renders correctly across the date line without visual artefacts.
- What happens when the map view is resized (e.g., split pane adjusted)? The map re-renders to fill the available space and maintains the current viewport centre.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The map view MUST display spatial footprints (bounding boxes) for all exercises matching the current metadata filter criteria.
- **FR-002**: The map view MUST auto-fit to show all visible footprints when exercises are first loaded or when filters change significantly.
- **FR-003**: Panning and zooming the map MUST act as a live spatial filter — the list and timeline views MUST update to show only exercises whose bounding boxes overlap the current map viewport.
- **FR-004**: Spatial filter updates MUST be debounced so that rapid pan/zoom gestures do not cause excessive recalculation (updates occur after the user pauses interaction).
- **FR-005**: Exercises without bounding box data MUST be excluded from the map but MUST remain visible in list and timeline views (unaffected by spatial filtering).
- **FR-006**: Each exercise footprint MUST be coloured according to the active colour scheme, maintaining visual consistency with list and timeline views.
- **FR-007**: When no colour scheme is active or an exercise has no assigned colour, the exercise MUST use a visually distinct default colour.
- **FR-008**: Double-clicking an exercise footprint MUST open the exercise in a new editor tab.
- **FR-009**: Hovering over an exercise footprint MUST display a tooltip showing the exercise title and date range.
- **FR-010**: When metadata filters change, the map MUST update to show only footprints for exercises matching the current filter criteria.
- **FR-011**: The map MUST indicate when the current viewport contains no matching exercises (e.g., visual cue or message overlay).
- **FR-012**: The map viewport state (centre, zoom, bounds) MUST be reflected in the shared session state so that other views can consume it for spatial filtering.
- **FR-013**: The map MUST handle overlapping footprints gracefully, rendering with sufficient transparency for overlap to be visually apparent.

### Key Entities

- **Exercise Footprint**: A geographic bounding box representing the spatial extent of a STAC exercise item. Defined by four coordinates (west, south, east, north). Used for both display on the map and intersection testing with the viewport.
- **Map Viewport**: The currently visible geographic area of the map, defined by its bounds (or as a 4-corner polygon in session state). Changes to the viewport drive the spatial filter applied to list and timeline views.
- **Spatial Filter Result**: The subset of exercises whose bounding boxes overlap the current map viewport. Computed by intersecting exercise footprints with viewport bounds.
- **Colour Assignment**: A mapping from exercise identifier to a display colour, provided by the active colour scheme. Applied consistently across map, list, and timeline views.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Discover exercises of interest by geographic region, using the map as both a visualisation and an interactive filter.
- **Key Decision(s)**:
  1. Which geographic region to focus on (accomplished by panning and zooming)
  2. Which exercise to open for detailed analysis (accomplished by double-clicking a footprint)
- **Decision Inputs**: Spatial footprint positions and sizes show where exercises took place; colour coding distinguishes exercises; tooltips provide title and date range; list and timeline views show the filtered results in alternative formats.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|-------------|-------------|--------|
| 1 | Map shows all exercise footprints | Analyst observes geographic distribution | Footprints visible across the world map |
| 2 | Map at full extent | Analyst pans/zooms to a region of interest | List and timeline update to show only overlapping exercises |
| 3 | Map focused on a region | Analyst hovers over a footprint | Tooltip shows exercise title and date range |
| 4 | Tooltip visible | Analyst double-clicks a footprint | Exercise opens in a new editor tab |
| 5 | Viewport contains no exercises | Analyst sees empty state | "No matching exercises" indicator shown |

### UI States

- **Empty State**: When no exercises have bounding boxes, the map shows a default world view with a message indicating no spatial data is available. When exercises exist but none fall within the viewport, the map shows a "no matching exercises" overlay.
- **Loading State**: While exercises are being fetched or filters are being applied, the map shows the previous state with a subtle loading indicator (e.g., dimmed overlay or spinner).
- **Error State**: If exercise data fails to load, the map shows an error message with guidance to retry or check the data source.
- **Success State**: Exercise footprints are visible on the map, coloured by scheme, interactive (hover tooltips, double-click to open), and the list/timeline views are synchronised with the viewport.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All exercises with bounding box data are displayed as footprints on the map at their correct geographic positions, verified against test fixture coordinates.
- **SC-002**: Panning or zooming the map causes the exercise list to update within 300ms (after debounce), showing only exercises whose footprints overlap the visible viewport.
- **SC-003**: Spatial filtering correctly identifies overlapping exercises — zero false positives (exercises shown that do not overlap) and zero false negatives (exercises hidden that do overlap), verified against a test set of 100 exercises.
- **SC-004**: Exercise footprint colours match the active colour scheme and are consistent across map, list, and timeline views, verified by visual comparison in automated tests.
- **SC-005**: Double-clicking an exercise footprint opens the exercise in a new editor tab within 1 second.
- **SC-006**: The map handles 200 simultaneous exercise footprints without visible rendering lag (initial render under 2 seconds, pan/zoom interactions remain smooth at 30+ fps).
- **SC-007**: Cross-view synchronisation works bidirectionally — metadata filter changes update the map, and map viewport changes update the list and timeline — verified in integration tests.

## Assumptions

- The colour scheme system (#134) provides a mapping from exercise identifier to colour. If #134 is not yet implemented, a default single-colour scheme is used and the colour integration is designed to be pluggable.
- Exercise bounding boxes follow the STAC specification format: `[west, south, east, north]` as a 4-element numeric array.
- The existing `CatalogOverview` component's map helpers (`bboxToBounds`, `combinedBounds`, `FitBounds`) are reusable and serve as the foundation for the new map view.
- The session state store's spatial slice (`viewport`, `setViewport`) is the mechanism for communicating viewport changes to other views.
- The CQL2 filter engine (#126) handles metadata filtering; this feature adds spatial filtering as an additional, composable filter dimension.
- Debounce timing for spatial filter updates (during rapid pan/zoom) defaults to 150ms, balancing responsiveness with performance.
- The "no matching exercises" indicator is a lightweight overlay on the map, not a modal dialog or blocking state.
- Antimeridian-crossing bounding boxes are an edge case that should be handled but may use a simplified rendering approach (split into two rectangles) rather than a full geodesic solution.
