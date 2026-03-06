# Feature Specification: List View with Spatial Thumbnails

**Feature Branch**: `129-list-view-thumbnails`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: Scrollable exercise list with metadata summary, spatial thumbnail, flexible sorting, recent-work resumption
**Depends on**: #125 (STAC Extension spec + mock data fixtures)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Matching Exercises in a Scrollable List (Priority: P1)

An analyst opens the STAC Stack Browser and sees a scrollable list of exercises matching the current filter state. Each list item shows the exercise title, a metadata summary (vessel classes, tags, author, duration), a date/temporal summary, and a spatial thumbnail showing the track patterns. The analyst scans the list to identify exercises of interest.

**Why this priority**: The list is the primary discovery interface — without it, analysts cannot browse or identify exercises. Every other list view feature (sorting, recent work, selection) depends on having a functional, populated list.

**Independent Test**: Load the 100-item mock fixture set with no active filters and verify all items appear in a scrollable list with title, metadata summary, date summary, and spatial thumbnail visible for each item.

**Acceptance Scenarios**:

1. **Given** 100 mock STAC items with no active filters, **When** the list view renders, **Then** all 100 items appear in a scrollable container, each showing exercise title, metadata summary, date summary, and spatial thumbnail.
2. **Given** a list item for an exercise with 3 vessel classes, 2 tags, and a 48-hour duration, **When** the analyst views the item, **Then** the metadata summary displays all vessel classes, tags, author name, and a human-readable duration (e.g., "2 days").
3. **Given** a list item for an exercise with track data, **When** the analyst views the spatial thumbnail, **Then** the thumbnail displays a recognisable representation of the exercise's track patterns within its geographic extent.
4. **Given** a list item for an exercise with a temporal range, **When** the analyst views the date summary, **Then** the date range is displayed in a human-readable format (e.g., "12 Jan 2024 – 14 Jan 2024").

---

### User Story 2 — Continue Recent Work (Priority: P2)

An analyst launches the STAC Stack Browser and immediately sees a prominent "Recently Opened" section at the top of the list. This section shows exercises they have recently worked on, ordered by last-opened time, enabling one-click resumption. Approximately 70% of analyst sessions begin this way.

**Why this priority**: The recent-work flow is the most common analyst workflow. Making it prominent and accessible eliminates the need to re-apply filters or scroll through long lists to find an exercise the analyst was just working on.

**Independent Test**: Open three exercises in succession, then reopen the list view and verify the "Recently Opened" section shows all three exercises in reverse chronological order with relative timestamps.

**Acceptance Scenarios**:

1. **Given** an analyst who has previously opened 5 exercises, **When** they open the STAC Stack Browser, **Then** a "Recently Opened" section appears at the top of the list showing those 5 exercises ordered by most recently opened first.
2. **Given** a recently opened exercise in the list, **When** the analyst views it, **Then** a relative timestamp is displayed (e.g., "2 hours ago", "yesterday", "3 days ago").
3. **Given** the recently opened section, **When** the analyst clicks an exercise, **Then** the exercise opens in a new editor tab and the Stack Browser remains open with filters intact.
4. **Given** an analyst with no recently opened exercises, **When** the list view renders, **Then** the recently opened section is either hidden or shows a brief message indicating no recent activity.

---

### User Story 3 — Sort Exercises by Different Criteria (Priority: P3)

An analyst viewing the exercise list wants to reorder the results by different criteria to find exercises more efficiently. They can sort by recency (most recently created/modified first), alphabetically by title, or by duration (longest or shortest first). The sort control is accessible and persistent within the session.

**Why this priority**: Sorting enables targeted discovery when the analyst has a specific criterion in mind (e.g., "show me the longest exercises" or "show alphabetically to find Exercise Neptune"). This complements filtering for a complete discovery experience.

**Independent Test**: Load the full fixture set, apply each sort option in turn, and verify the list reorders correctly for each.

**Acceptance Scenarios**:

1. **Given** 100 exercises in the list, **When** the analyst selects "Sort by Recency", **Then** items are ordered by date descending (most recent temporal start first).
2. **Given** 100 exercises in the list, **When** the analyst selects "Sort by Title", **Then** items are ordered alphabetically by title (A–Z).
3. **Given** 100 exercises in the list, **When** the analyst selects "Sort by Duration", **Then** items are ordered by computed duration descending (longest first).
4. **Given** a sort selection, **When** the analyst changes filters, **Then** the filtered results retain the current sort order.
5. **Given** the sort control, **When** the analyst clicks the same sort option again, **Then** the sort direction toggles (ascending/descending).

---

### User Story 4 — Select an Exercise to Open (Priority: P4)

An analyst identifies an exercise of interest in the list and clicks it to open. The exercise opens in a new editor tab while the Stack Browser remains open with all filters and sort settings intact, allowing the analyst to continue browsing or open additional exercises.

**Why this priority**: Exercise selection is the endpoint of the discovery workflow. It must be reliable and non-destructive (the browser state is preserved for further browsing).

**Independent Test**: Click an exercise in the list, verify a new editor tab opens for that exercise, and verify the Stack Browser retains its filter and sort state.

**Acceptance Scenarios**:

1. **Given** a list of exercises, **When** the analyst clicks an exercise item, **Then** the exercise opens in a new editor tab.
2. **Given** an open exercise, **When** the analyst returns to the Stack Browser, **Then** all active filters, sort selection, and scroll position are preserved.
3. **Given** a recently opened exercise, **When** clicked from the "Recently Opened" section, **Then** the exercise opens in a new editor tab and is moved to the top of the recently opened list.

---

### User Story 5 — Dynamic List Updates from Filter Changes (Priority: P5)

As the analyst adjusts metadata filters (via filter bar), spatial filters (via map viewport), or temporal filters (via timeline range), the list dynamically updates to show only matching exercises. No manual refresh is required.

**Why this priority**: Dynamic synchronisation with the shared filter state is essential for the three-view coordination model defined in E08. However, this depends on the synchronisation layer (#132) and can be demonstrated with metadata filters first.

**Independent Test**: Apply a vessel-class filter, verify the list reduces to matching items. Pan the map, verify the list updates to show only items within the viewport. Adjust the timeline range, verify the list updates accordingly.

**Acceptance Scenarios**:

1. **Given** 100 exercises displayed, **When** the analyst applies a vessel-class filter via the filter bar, **Then** the list immediately updates to show only exercises matching the filter.
2. **Given** a filtered list, **When** the analyst removes all filters, **Then** the full list of exercises is restored.
3. **Given** a list with active filters, **When** the combined filters match zero exercises, **Then** the list displays a "No matches" message with guidance to adjust filters.

---

### Edge Cases

- What happens when an exercise has no track data (annotation-only plot)? The spatial thumbnail shows the geographic extent with any annotation shapes, or a placeholder if no spatial data exists.
- What happens when an exercise has no temporal data? The date summary shows "No date information" and the item sorts to the end when sorted by recency or duration.
- What happens when an exercise title is very long? The title is truncated with an ellipsis, and the full title is available via a tooltip on hover.
- What happens when metadata fields (vessel classes, tags) contain many values? The metadata summary shows the first few values with a "+N more" indicator.
- What happens when the list contains hundreds of items? The list uses virtualised scrolling to maintain performance (only rendering visible items).
- What happens when the recent-work list contains exercises that no longer exist in the store? Stale entries are silently removed from the recent list.
- What happens when sort is applied with filters active? The filtered subset is sorted by the selected criterion — sorting does not affect which items match.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The list view MUST display each exercise as a list item containing: exercise title, metadata summary, date/temporal summary, and spatial thumbnail.
- **FR-002**: The metadata summary MUST show vessel classes, tags, author, and duration extracted from STAC extension properties (`debrief:vessel_classes`, `debrief:tags`, `debrief:author`) and computed duration.
- **FR-003**: Duration MUST be computed from `start_datetime` and `end_datetime` and displayed in a human-readable format (e.g., "2 hours", "3 days", "1 week").
- **FR-004**: The spatial thumbnail MUST render a miniature representation of the exercise's track patterns within its geographic extent, sufficient for visual recognition of different exercises.
- **FR-005**: The spatial thumbnail MUST derive its content from the exercise's bounding box and track geometry data.
- **FR-006**: The list MUST support flexible sorting with at least three sort dimensions: recency (by temporal start date), alphabetical (by title), and duration (by computed duration).
- **FR-007**: Sort selection MUST persist within the browser session and survive filter changes.
- **FR-008**: Each sort dimension MUST support toggling between ascending and descending order.
- **FR-009**: The list MUST include a prominent "Recently Opened" section at the top displaying exercises the analyst has previously opened, ordered by most recently opened first.
- **FR-010**: Recently opened entries MUST display a relative timestamp (e.g., "2 hours ago", "yesterday").
- **FR-011**: The recently opened section MUST update when an exercise is opened (add or move to top).
- **FR-012**: Clicking an exercise MUST open it in a new editor tab while the Stack Browser remains open with all state (filters, sort, scroll position) intact.
- **FR-013**: The list MUST dynamically update when the combined filter state changes (metadata, spatial, or temporal filters) without requiring a manual refresh.
- **FR-014**: When the combined filter state matches zero exercises, the list MUST display a "No matches" empty state with guidance to adjust filters.
- **FR-015**: The list MUST handle large item counts (100+ exercises) without degraded scrolling performance using virtualised rendering.
- **FR-016**: Long exercise titles MUST be truncated with an ellipsis and the full title available via tooltip.
- **FR-017**: Metadata arrays with many values (vessel classes, tags) MUST show a truncated summary with an overflow indicator (e.g., "+3 more").
- **FR-018**: The list MUST be styled using VS Code CSS custom properties for theme compatibility.

### Key Entities

- **Exercise List Item**: A visual representation of a STAC item in the list. Contains a title, metadata summary, temporal summary, spatial thumbnail, and selection action. Maps to a `CatalogOverviewItem` extended with STAC extension properties.
- **Spatial Thumbnail**: A miniature rendered representation of an exercise's track patterns within its geographic extent. Generated from bounding box and track geometry. Fixed dimensions sufficient for visual recognition.
- **Sort Configuration**: The analyst's current sort selection. Contains a sort dimension (recency, alphabetical, duration) and direction (ascending, descending). Persists within the browser session.
- **Recently Opened Entry**: A record of an exercise previously opened by the analyst. Contains the exercise identifier, title, store reference, and last-opened timestamp. Ordered by recency.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Find and open an exercise from the STAC archive, either by browsing filtered results or resuming recent work.
- **Key Decision(s)**:
  1. Should I resume a recently opened exercise, or browse for a different one?
  2. Which exercise from the filtered/sorted list matches my needs?
- **Decision Inputs**: Exercise title, metadata summary (vessel classes, tags, author, duration), spatial thumbnail showing track patterns, date range, and relative "last opened" timestamps for recent items.

### Screen Progression

| Step | Screen/State                                                           | User Action                                                          | Result                                                       |
|------|------------------------------------------------------------------------|----------------------------------------------------------------------|--------------------------------------------------------------|
| 1    | List loads with recently opened section at top, full exercise list below | Analyst scans recently opened exercises                              | Recognises prior work or scrolls to full list                |
| 2    | Full list with sort control                                            | Analyst selects a sort dimension (e.g., "Duration")                  | List reorders by selected criterion                          |
| 3    | Sorted/filtered list                                                   | Analyst scrolls to scan exercises, reading metadata and thumbnails   | Identifies exercise of interest                              |
| 4    | Exercise identified                                                    | Analyst clicks exercise item                                         | Exercise opens in new editor tab; browser state preserved    |

### UI States

- **Empty State**: "No exercises found. Adjust your filters or add exercises to the STAC store." Displayed when no exercises exist in the store regardless of filter state.
- **Loading State**: Skeleton placeholder items displayed during initial data load, preserving list layout proportions.
- **No Matches State**: "No matches for current filters." with a suggestion to broaden filter criteria. Displayed when filters exclude all exercises.
- **Success State**: Scrollable list with recently opened section and exercise items, each showing metadata and spatial thumbnail.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 100 mock fixture items display correctly in the list with title, metadata summary, date summary, and spatial thumbnail visible — zero items rendered without complete information.
- **SC-002**: Spatial thumbnails for exercises with different track patterns are visually distinguishable from each other by a human reviewer.
- **SC-003**: Sorting by each of the three dimensions (recency, alphabetical, duration) produces a correctly ordered list, verified by automated comparison of adjacent items.
- **SC-004**: An analyst can locate and open a recently opened exercise within 2 interactions (open browser, click recent item) — no filtering or scrolling required.
- **SC-005**: The list renders and becomes interactive within 1 second for 100 items, including thumbnail generation.
- **SC-006**: Scrolling through 100+ items maintains smooth visual performance with no visible jank or lag.
- **SC-007**: All filter state changes (metadata, spatial, temporal) produce an updated list within 500 milliseconds.
- **SC-008**: Opening an exercise from the list preserves all browser state (filters, sort, scroll position) when the analyst returns to the browser.

## Assumptions

- The STAC extension properties (`debrief:vessel_classes`, `debrief:tags`, `debrief:author`, `debrief:track_names`, `debrief:nationalities`) are defined and available in item.json files per #125.
- Duration is computed from `start_datetime` and `end_datetime` at display time, consistent with #125 and #126 decisions.
- The existing `CatalogOverviewItem` interface will be extended (or a new interface created) to include STAC extension properties needed for metadata display.
- Spatial thumbnails are rendered client-side from available track geometry data (GeoJSON), not pre-generated static images.
- The recently opened list follows the existing `RecentPlotsService` pattern from the VS Code extension, with a configurable maximum count (default 10).
- Virtualised scrolling (e.g., `@tanstack/react-virtual`, already a project dependency) is used for large item counts.
- The list is one of three synchronised views; the synchronisation mechanism itself is defined by #132 (Three-View Synchronisation). This spec defines the list's contract with that shared state, not the synchronisation implementation.
- The sort model is extensible — additional sort dimensions can be added in future without modifying the list component's core logic.
