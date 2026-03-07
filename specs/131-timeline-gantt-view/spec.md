# Feature Specification: Timeline/Gantt View with Temporal Filtering

**Feature Branch**: `131-timeline-gantt-view`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "[E08] Timeline/Gantt view with temporal filtering — temporal extent bars, time range adjustment as live temporal filter (requires #125)"
**Epic**: E08 — STAC Stack Browser Discovery UI

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View exercise temporal extents (Priority: P1)

An analyst opens the STAC Stack Browser and sees a Gantt-style timeline displaying horizontal bars representing the temporal extent of each matching exercise. Each bar spans from the exercise's start datetime to its end datetime. Exercises with only a single datetime display as point markers. The time axis shows ISO 8601 formatted dates and adjusts its scale to fit the overall range of all visible exercises.

**Why this priority**: The timeline is the foundational visual element — without temporal extent bars, none of the interactive features have meaning. This is the minimum viable rendering that enables all subsequent stories.

**Independent Test**: Can be fully tested by loading a set of exercises with known temporal extents and verifying bars render at correct positions relative to the time axis.

**Acceptance Scenarios**:

1. **Given** 10 exercises with start/end datetimes spanning 2020–2025, **When** the timeline view loads, **Then** all 10 exercises display as horizontal bars positioned proportionally along the time axis.
2. **Given** an exercise with only a single datetime (no start/end range), **When** the timeline renders, **Then** that exercise displays as a point marker at the corresponding position on the time axis.
3. **Given** exercises spanning a 6-hour period, **When** the timeline renders, **Then** the time axis labels show appropriate granularity (hours/minutes rather than years).
4. **Given** no exercises match current filters, **When** the timeline view renders, **Then** a "No matches" empty state message is displayed.

---

### User Story 2 - Adjust time range as live temporal filter (Priority: P1)

An analyst adjusts the visible time range on the timeline (by dragging handles at the edges of the range, or by selecting a sub-range) to narrow down to a period of interest. As the time range changes, the list view and map view dynamically update to show only exercises whose temporal extent overlaps the selected time window. This filtering is live — no submit button is needed.

**Why this priority**: Live temporal filtering is the core differentiating capability of the timeline view. It transforms the timeline from a passive display into an interactive discovery tool.

**Independent Test**: Can be tested by adjusting the time range and verifying that exercises outside the range disappear from list and map views, while exercises inside the range remain.

**Acceptance Scenarios**:

1. **Given** 10 exercises visible across all views, **When** the analyst drags the time range to cover only 2022–2023, **Then** only exercises with temporal overlap in 2022–2023 remain visible in the list and map views.
2. **Given** a narrowed time range showing 3 exercises, **When** the analyst expands the range to cover the full dataset, **Then** all exercises reappear in the list and map views.
3. **Given** a time range set to a period with no exercises, **When** the views update, **Then** all three views (list, map, timeline) display "No matches".
4. **Given** the analyst is adjusting the time range, **When** the range changes, **Then** list and map update dynamically without requiring any manual refresh action.

---

### User Story 3 - Exercise selection opens editor (Priority: P2)

An analyst identifies an exercise of interest on the timeline and selects it (e.g., by double-clicking the bar or point marker) to open it in a new editor tab. The Stack Browser remains open with all current filters intact, allowing the analyst to continue browsing.

**Why this priority**: Opening exercises for analysis is the end goal of the discovery workflow, but depends on the timeline rendering and filtering being in place first.

**Independent Test**: Can be tested by double-clicking a timeline bar and verifying a new editor tab opens for the corresponding exercise.

**Acceptance Scenarios**:

1. **Given** exercises displayed on the timeline, **When** the analyst double-clicks a bar, **Then** the corresponding exercise opens in a new editor tab.
2. **Given** the analyst opened an exercise from the timeline, **When** the editor tab opens, **Then** the Stack Browser remains open with its current filter state preserved.
3. **Given** a point marker (single-datetime exercise) on the timeline, **When** the analyst double-clicks it, **Then** the exercise opens in a new editor tab.

---

### User Story 4 - Colour scheme applied to timeline bars (Priority: P3)

The timeline bars are coloured according to the active colour scheme (e.g., by age, vessel class, or tag). The colours match those used in the map view, providing visual consistency across views. A shared legend explains the colour encoding.

**Why this priority**: Colour encoding enhances pattern recognition but is an additive visual enhancement that depends on the colour scheme engine (#134). The timeline must function fully without colours first.

**Independent Test**: Can be tested by activating a colour scheme and verifying that timeline bars update their fill colour to match the scheme, consistent with the map view.

**Acceptance Scenarios**:

1. **Given** the active colour scheme is "by vessel class", **When** the timeline renders, **Then** each exercise bar is coloured according to its vessel class, matching the colours used in the map view.
2. **Given** the colour scheme changes from "by age" to "by tag", **When** the timeline updates, **Then** bar colours change to reflect the new scheme.
3. **Given** a colour scheme is active, **When** the analyst views the timeline, **Then** a legend is visible explaining the colour mapping.

---

### Edge Cases

- What happens when an exercise has no temporal metadata at all? Display a "no time data" label in place of a bar (consistent with existing CatalogOverview behaviour).
- What happens when all exercises share identical start/end datetimes? The time axis pads the range by a minimum interval (e.g., 1 hour either side) to avoid zero-width bars.
- What happens when the time range handles are dragged past each other (inverted range)? The system prevents inversion by clamping handles to not cross each other.
- How does the timeline handle very large numbers of exercises (100+)? Vertical scrolling is available for the exercise list while the time axis remains fixed. Performance must remain responsive.
- What happens when exercises span vastly different timescales (hours vs. years)? The time axis auto-scales to fit the overall range; very short exercises may appear as thin bars or point markers within a wide axis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render horizontal bars for each exercise whose temporal extent is known (start_datetime and end_datetime both present).
- **FR-002**: System MUST render point markers for exercises with only a single datetime value.
- **FR-003**: System MUST display a time axis with ISO 8601 formatted labels that auto-scales to the range of all visible exercises.
- **FR-004**: System MUST provide interactive handles (or equivalent mechanism) for adjusting the visible time range.
- **FR-005**: Adjusting the time range MUST act as a live temporal filter — list and map views update dynamically to show only exercises overlapping the selected time window.
- **FR-006**: System MUST emit temporal filter changes to the shared filter state so other views can subscribe and react.
- **FR-007**: Double-clicking an exercise bar or point marker MUST trigger exercise selection, opening the exercise in a new editor tab.
- **FR-008**: System MUST display a "No matches" empty state when no exercises satisfy current filters (including temporal filter).
- **FR-009**: System MUST display a "no time data" label for exercises missing all temporal metadata.
- **FR-010**: System MUST apply the active colour scheme to exercise bars when a colour scheme is active, consistent with the map view.
- **FR-011**: System MUST support hover tooltips on timeline bars showing exercise title and date range.
- **FR-012**: System MUST support vertical scrolling for large numbers of exercises while keeping the time axis fixed.
- **FR-013**: System MUST prevent time range handles from crossing each other (no inverted ranges).
- **FR-014**: System MUST pad the time range by a minimum interval when all exercises share identical datetimes, to avoid zero-width rendering.

### Key Entities

- **Exercise**: A STAC Item representing an exercise/plot, with temporal properties (`datetime`, `start_datetime`, `end_datetime`), spatial extent (`bbox`), and extension metadata (vessel class, tags, etc.).
- **Temporal Extent Bar**: A horizontal bar on the timeline representing the time span of a single exercise, from start to end datetime.
- **Time Range Selection**: The user-adjustable window on the time axis that defines the active temporal filter. Defined by a start and end boundary.
- **Temporal Filter**: A filter derived from the time range selection, emitted to the shared filter state store. Exercises overlapping the selected range pass the filter.
- **Colour Scheme**: An externally provided mapping (from #134) that assigns colours to exercises based on a configurable dimension (age, vessel class, tag).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Discover exercises by their temporal characteristics and narrow results to a time period of interest.
- **Key Decision(s)**:
  1. Which time period to focus on (by adjusting the time range)
  2. Which exercise to open for analysis (by selecting from the timeline)
- **Decision Inputs**: Exercise names displayed as row labels; temporal extent bars showing duration and overlap; colour encoding showing classification; tooltip with title and date range on hover.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1    | Timeline loaded with all matching exercises | Analyst reviews temporal extent bars and time axis | Visual overview of when exercises occurred |
| 2    | Full timeline visible | Analyst drags a time range handle to narrow the window | List and map views update to show only temporally overlapping exercises |
| 3    | Filtered timeline with subset of exercises | Analyst hovers over a bar | Tooltip shows exercise title and date range |
| 4    | Tooltip visible on target exercise | Analyst double-clicks the bar | Exercise opens in a new editor tab; Browser remains open |
| 5    | Narrowed time range active | Analyst expands time range back to full extent | All exercises reappear across all views |

### UI States

- **Empty State**: "No matches" message displayed when no exercises satisfy current filters (metadata + spatial + temporal combined).
- **Loading State**: Bars render progressively as exercise data becomes available; time axis appears once the first exercise with temporal data loads.
- **Error State**: If exercise data cannot be loaded, display an error message in place of the timeline with guidance to check the data source.
- **Success State**: All matching exercises displayed as horizontal bars (or point markers), time axis formatted, colour scheme applied, tooltips functional, time range handles ready for interaction.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All exercises with temporal metadata render as correctly positioned bars or point markers on the timeline within 1 second of data availability.
- **SC-002**: Adjusting the time range updates list and map views within 200 milliseconds, with no user-initiated refresh needed.
- **SC-003**: The timeline displays and performs responsively with at least 100 exercises loaded simultaneously.
- **SC-004**: Exercise selection from the timeline opens the correct exercise in a new editor tab 100% of the time.
- **SC-005**: The time axis correctly formats ISO 8601 dates at all zoom levels, from hours to decades.
- **SC-006**: Colour scheme changes propagate to all timeline bars within 200 milliseconds, matching the map view colours exactly.
- **SC-007**: Zero-results state is displayed consistently across all three views (list, map, timeline) when filters eliminate all exercises.

## Assumptions

- The shared filter state store (coordinated by #132) will provide a subscription mechanism for temporal filter changes. This spec emits filter state; it does not own the store.
- Exercise data includes standard STAC temporal properties (`datetime`, `start_datetime`, `end_datetime`) as defined by #125.
- The colour scheme engine (#134) will expose a function or hook to map exercise metadata to colours; this spec consumes that mapping.
- The existing CatalogOverview component's timeline helpers (`parseTime`, `computeTimeRange`, `formatDate`, bar positioning math) provide a proven foundation that the E08 timeline view will build upon or extract from.
- The timeline view is one of three synchronised views; cross-view synchronisation is owned by #132.

## Dependencies

- **#125** (STAC Extension spec + mock data fixtures) — required; provides exercise data model and test fixtures.
- **#132** (Three-view synchronisation and filter state) — required for cross-view filter propagation; timeline emits temporal filter state.
- **#134** (Colour scheme engine with legend) — optional; timeline functions without colours but applies them when available.
