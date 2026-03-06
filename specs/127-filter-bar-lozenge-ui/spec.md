# Feature Specification: Filter Bar with Lozenge UI and AND/OR Logic

**Feature Branch**: `127-filter-bar-lozenge-ui`
**Created**: 2026-03-06
**Status**: Draft
**Epic**: E08 — STAC Stack Browser Discovery UI
**Input**: User description: "[E08] Filter bar with lozenge UI and AND/OR logic — persistent filter bar with add/edit/remove lozenges, all filter types, OR container with drag support, CQL2 serialisation (requires #125, #126)"
**Depends on**: #125 (STAC Extension spec + mock data fixtures), #126 (CQL2 filter engine)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Add and Remove Metadata Filters (Priority: P1)

An analyst exploring the STAC archive needs to narrow results by adding metadata filters one at a time. Each filter appears as a lozenge (pill-shaped element) in a persistent bar above the results views. Clicking a lozenge's remove button deletes the filter and results update immediately.

**Why this priority**: This is the core interaction loop — every filter bar session begins with adding at least one filter. Without add/remove, no other filter bar functionality is useful.

**Independent Test**: Can be fully tested by adding a vessel class filter lozenge, verifying results narrow, then removing it and verifying results restore to unfiltered state.

**Acceptance Scenarios**:

1. **Given** the filter bar is empty, **When** the analyst clicks the plus (+) button, **Then** a dropdown of available filter types appears (Vessel Class, Plot Tag, Feature Tag, Author, Duration, Title, Plot Contents, Track Name, Nationality, Folder/Collection).
2. **Given** the filter type dropdown is open and the analyst selects "Vessel Class", **When** they select a value from the hierarchical dropdown, **Then** a lozenge displaying "Vessel Class: [value]" is added to the filter bar and results update dynamically.
3. **Given** a lozenge is present in the filter bar, **When** the analyst clicks the remove button on the lozenge, **Then** the lozenge is removed, the filter is deactivated, and results update immediately.
4. **Given** multiple lozenges are present, **When** the analyst removes one, **Then** only that filter is removed; all other lozenges and their filters remain active.

---

### User Story 2 — Edit an Active Filter (Priority: P2)

An analyst who has already added a filter needs to change its value without removing and re-adding it. Clicking the lozenge body opens it for inline editing.

**Why this priority**: Editing is the second most frequent interaction after adding. Analysts often refine their queries by adjusting values rather than starting over.

**Independent Test**: Can be tested by adding a nationality filter, clicking the lozenge to open it, changing the value, and verifying results update to reflect the new value.

**Acceptance Scenarios**:

1. **Given** a "Nationality: French" lozenge exists, **When** the analyst clicks the lozenge body (not the remove button), **Then** an edit popover opens showing the current value and available alternatives.
2. **Given** the edit popover is open for a nationality filter, **When** the analyst selects "British", **Then** the lozenge updates to "Nationality: British" and results update dynamically.
3. **Given** the edit popover is open, **When** the analyst clicks outside the popover or presses Escape, **Then** the popover closes without changing the filter value.

---

### User Story 3 — Combine Filters with AND Logic (Priority: P3)

An analyst needs to apply multiple filters simultaneously. All top-level lozenges are combined with AND logic by default — only exercises matching all active filters appear in results.

**Why this priority**: AND conjunction is the default filtering mode specified in the SRD. This story validates that multiple lozenges compose correctly.

**Independent Test**: Can be tested by adding two filters (e.g., nationality + duration), verifying only exercises matching both criteria appear, then removing one filter and verifying the result set expands.

**Acceptance Scenarios**:

1. **Given** a "Nationality: French" lozenge and a "Duration: <24H" lozenge, **When** both are active, **Then** only exercises that are both French AND under 24 hours appear in results.
2. **Given** three active lozenges (Nationality, Duration, Vessel Class), **When** one is removed, **Then** results expand to include exercises matching the remaining two filters.
3. **Given** two filters that together match no exercises, **When** both are active, **Then** all results views display "No matches".

---

### User Story 4 — Create OR Groups with Drag Support (Priority: P4)

An analyst needs to express OR logic — for example, finding exercises involving Type 23 frigates OR Type 45 destroyers. They create an OR container and either drag existing lozenges into it or add new filters directly inside it.

**Why this priority**: OR groups are the key differentiator of this filter bar from simple filter lists. They enable complex queries that analysts need for real discovery workflows. They are lower priority than basic AND because AND alone covers most sessions.

**Independent Test**: Can be tested by creating an OR container, adding two vessel class lozenges inside it, and verifying that exercises matching either vessel class are returned (rather than requiring both).

**Acceptance Scenarios**:

1. **Given** the plus (+) button dropdown, **When** the analyst selects "OR group", **Then** an empty OR container lozenge appears in the filter bar with its own mini plus (+) button inside.
2. **Given** an empty OR container and two existing top-level lozenges, **When** the analyst drags a lozenge into the OR container, **Then** the lozenge moves into the container (it is not copied) and results update to reflect OR logic within the group.
3. **Given** an OR container with a mini plus (+) button, **When** the analyst clicks it and adds a filter, **Then** a new lozenge is created directly inside the OR container.
4. **Given** an OR container with "Vessel: Type23" and "Vessel: Type45", and a top-level "Nationality: French" lozenge, **Then** results show exercises matching (Type23 OR Type45) AND French nationality.
5. **Given** an OR container with one lozenge, **When** the analyst drags the last lozenge out of the container, **Then** the lozenge returns to the top level and the empty OR container remains (or is automatically removed).

---

### User Story 5 — Support All SRD Filter Types with Appropriate Input Methods (Priority: P5)

The filter bar must support all 10 filter types from SRD Section 4.4, each with an appropriate input method (hierarchical dropdown, flat dropdown, free-text search, or bucket selector).

**Why this priority**: Completeness of filter types ensures all metadata dimensions are filterable. This builds on P1 (add/remove) by specifying each filter type's input control.

**Independent Test**: For each of the 10 filter types, add a filter via the plus button, select a value using the type-specific input, verify the lozenge appears with correct label, and verify results filter correctly.

**Acceptance Scenarios**:

1. **Given** the analyst selects "Vessel Class" from the filter type dropdown, **When** the value input appears, **Then** it is a hierarchical dropdown showing the vessel taxonomy tree (domain > role > class > type), and selecting a parent node filters for all descendants.
2. **Given** the analyst selects "Plot Duration", **When** the value input appears, **Then** it is a dropdown with five fixed options: `<6H`, `<24H`, `<72H`, `<10D`, `>10D`.
3. **Given** the analyst selects "Plot Title", **When** the value input appears, **Then** it is a free-text input field that filters by substring match (case-insensitive).
4. **Given** the analyst selects "Plot Tag", **When** the value input appears, **Then** it is a dropdown populated from distinct tag values found in the current data set.

---

### User Story 6 — CQL2 Serialisation of Filter State (Priority: P6)

The current filter bar state must be representable as CQL2 JSON at all times. This ensures compatibility with saved filter configurations (#128) and future backend API queries.

**Why this priority**: CQL2 serialisation is required for persistence and future backend transition, but is not visible to the analyst in normal usage. It is a supporting capability.

**Independent Test**: Can be tested by composing a filter state with AND and OR predicates, retrieving the serialised CQL2 JSON, and validating it conforms to the OGC CQL2 JSON encoding specification.

**Acceptance Scenarios**:

1. **Given** two top-level lozenges (Nationality: French, Duration: <24H), **When** the filter state is serialised, **Then** it produces a valid CQL2 JSON object with an `"and"` array containing two comparison expressions.
2. **Given** a top-level lozenge AND an OR container with two lozenges, **When** the filter state is serialised, **Then** the CQL2 JSON contains an `"and"` array with the top-level predicate and a nested `"or"` array.
3. **Given** an empty filter bar (no active filters), **When** the filter state is serialised, **Then** a valid CQL2 expression representing "match all" is produced.

---

### Edge Cases

- What happens when the analyst adds a filter type that already has an active lozenge of the same type? A second lozenge is added (multiple filters of the same type are permitted, e.g., two nationality filters combined with AND).
- What happens when the analyst drags a lozenge into an OR container that already contains a lozenge of a different filter type? The drag is accepted — OR containers can contain mixed filter types.
- What happens when all lozenges are removed from an OR container? The empty OR container remains visible with its mini plus (+) button. The analyst can add new filters or remove the container entirely.
- What happens when the analyst tries to nest an OR container inside another OR container? This is not permitted — the drop target does not accept OR containers (one level of nesting only, per SRD Section 4.5).
- What happens when the data set contains zero items? The filter type dropdowns show empty value lists (except fixed options like duration buckets), and all views display "No matches".
- What happens when a filter value selected in a dropdown no longer matches any items after other filters are applied? The lozenge remains visible but results show "No matches" or a reduced set. Lozenges are not automatically removed when they become unproductive.
- What happens when the analyst rapidly adds and removes filters? Each change triggers a result update; updates are debounced so intermediate states do not cause visual flicker.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The filter bar MUST be a persistent UI element displayed above the results views, visible at all times during the discovery workflow.
- **FR-002**: Each active metadata filter MUST be displayed as a lozenge (pill-shaped element) showing the filter type and selected value.
- **FR-003**: The filter bar MUST include a plus (+) button that opens a dropdown listing all available filter types.
- **FR-004**: The filter bar MUST support all 10 filter types from SRD Section 4.4: Vessel Class, Plot Tag, Feature Tag, Author, Plot Duration, Plot Title, Plot Contents, Track Name, Track Nationality, and Folder/Collection.
- **FR-005**: Each filter type MUST use an appropriate input method:
  - Vessel Class: Hierarchical dropdown (taxonomy tree)
  - Plot Tag, Feature Tag, Author, Track Name, Nationality: Flat dropdown populated from data
  - Plot Duration: Dropdown with fixed buckets (`<6H`, `<24H`, `<72H`, `<10D`, `>10D`)
  - Plot Title, Plot Contents: Free-text input
  - Folder/Collection: Dropdown or browse control
- **FR-006**: Clicking a lozenge body MUST open an edit popover allowing the analyst to change the filter value.
- **FR-007**: Each lozenge MUST include a remove control that deletes the filter when activated.
- **FR-008**: All top-level lozenges MUST be combined with AND logic — only exercises matching all active filters appear in results.
- **FR-009**: The filter bar MUST support OR container lozenges, available via the plus (+) button as a filter type option ("OR group").
- **FR-010**: Lozenges within an OR container MUST be combined with OR logic, and the OR container itself MUST be AND'd with all other top-level lozenges.
- **FR-011**: The analyst MUST be able to drag existing top-level lozenges into an OR container, moving them (not copying).
- **FR-012**: The OR container MUST include a mini plus (+) button for adding new filter lozenges directly inside it.
- **FR-013**: Only one level of OR nesting MUST be supported — OR containers MUST NOT be nestable inside other OR containers.
- **FR-014**: Results across all views (list, map, timeline) MUST update dynamically whenever any filter is added, edited, or removed.
- **FR-015**: The current filter bar state MUST be serialisable as CQL2 JSON conforming to the OGC CQL2 JSON encoding specification, using the CQL2 filter engine from #126.
- **FR-016**: An empty filter bar (no active filters) MUST result in all exercises being shown (no filtering applied).
- **FR-017**: When active filters match no exercises, all results views MUST display "No matches".
- **FR-018**: Dropdown filter inputs MUST be populated dynamically from the values present in the current data set.
- **FR-019**: Vessel class filtering via the hierarchical dropdown MUST support selecting a parent taxonomy node, which filters for all descendant vessel types.
- **FR-020**: Rapid successive filter changes MUST be debounced to prevent visual flicker in results views.

### Key Entities

- **Filter Bar**: The persistent UI container holding all active filter lozenges and the add (+) button. Sits above the three results views.
- **Lozenge**: A pill-shaped UI element representing a single active filter. Displays the filter type label and selected value. Supports click-to-edit and remove actions. Can be dragged between the top level and OR containers.
- **OR Container**: A special lozenge that groups child lozenges with OR logic. Contains its own mini plus (+) button and accepts dragged lozenges. AND'd with other top-level elements.
- **Filter Type Dropdown**: A menu opened via the plus (+) button listing all available filter types and the "OR group" option.
- **Edit Popover**: An inline editing overlay that opens when a lozenge is clicked, allowing the analyst to change the filter value using the type-specific input control.
- **Filter State**: The structured representation of all active filters, their values, and their logical grouping (AND/OR). Serialisable as CQL2 JSON.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Build a metadata filter query to narrow the exercise result set.
- **Key Decision(s)**:
  1. Which metadata dimension to filter on (Vessel Class, Tag, Nationality, etc.)
  2. What value to select for each filter
  3. Whether filters should be combined with AND (default) or grouped with OR logic
- **Decision Inputs**: The available filter types are listed in the plus (+) dropdown. Value options are populated from the current data set (dropdown filters) or entered freely (text filters). The current result count and visual feedback across all three views help the analyst assess whether the filter is too broad or too narrow.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Empty filter bar with plus (+) button; all exercises visible | Analyst clicks plus (+) | Filter type dropdown opens listing all 10 types + "OR group" |
| 2 | Filter type dropdown open | Analyst selects "Nationality" | Value dropdown opens showing distinct nationalities from data |
| 3 | Value dropdown open | Analyst selects "French" | Lozenge "Nationality: French" appears; results narrow to French exercises |
| 4 | One lozenge active | Analyst clicks plus (+) again, selects "Duration", picks "<24H" | Second lozenge appears; results show French exercises under 24 hours (AND) |
| 5 | Two lozenges active | Analyst clicks plus (+), selects "OR group" | Empty OR container appears with mini plus (+) |
| 6 | OR container visible | Analyst drags "Nationality: French" lozenge into OR container | Lozenge moves into container; analyst adds "Nationality: British" via mini plus (+) |
| 7 | OR container with two lozenges + top-level Duration lozenge | Results reflect (French OR British) AND duration under 24 hours | Analyst refines or opens an exercise |

### UI States

- **Empty State**: Filter bar shows only the plus (+) button. Text hint: "Add filters to narrow results". All exercises are visible in results views.
- **Loading State**: When results are updating after a filter change, a subtle loading indicator appears in the filter bar (e.g., brief spinner or progress bar). Lozenges remain interactive.
- **Error State**: If the filter engine encounters an unexpected error, the filter bar displays a warning banner with a message (e.g., "Filter could not be applied") and reverts to the last valid filter state. Lozenges remain visible and editable.
- **Success State**: Normal operating state — lozenges are displayed, results are current, and the result count is visible. No explicit "success" indicator beyond the updated results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysts can add, edit, and remove metadata filters in under 3 seconds per interaction, with results updating within 500 milliseconds of each filter change.
- **SC-002**: All 10 filter types from SRD Section 4.4 are fully functional with appropriate input methods, demonstrable in Storybook with the 100-item mock data set from #125.
- **SC-003**: AND logic correctly narrows results — adding a second filter to a result set of N items always produces a subset of size ≤ N (verified across all filter type combinations in Storybook).
- **SC-004**: OR container groups correctly broaden results within their group — an OR group with two predicates returns the union of individual matches, AND'd with other top-level filters.
- **SC-005**: Drag-to-group interaction successfully moves lozenges between the top level and OR containers, with the filter state updating correctly after each move.
- **SC-006**: CQL2 JSON serialisation of any filter bar state produces valid OGC CQL2 JSON, verifiable by round-tripping through the CQL2 filter engine (#126).
- **SC-007**: 90% of first-time users can build a two-filter AND query without guidance, measured by successful task completion in usability testing.
- **SC-008**: Storybook stories demonstrate all filter combinations: single filter, multiple AND filters, OR group, mixed AND+OR, empty filter, and zero-result scenarios.

## Assumptions

- The filter bar operates entirely client-side against in-memory mock data during the Storybook phase. The CQL2 filter engine (#126) handles evaluation; this feature handles the UI and state management.
- STAC extension property names and the vessel taxonomy structure are provided by #125 and are stable before this feature is implemented.
- The filter bar does not own spatial or temporal filtering — those are handled implicitly by the map and timeline views respectively. Only metadata filters appear as lozenges.
- Saved filter configurations (SRD Section 4.6) are out of scope for this feature and will be handled by #128.
- The "Plot Contents" full-text search is implemented as a client-side substring match for Storybook purposes, consistent with the SRD note about backend full-text indexing being a production concern.
- Dropdown values (tags, nationalities, track names, authors) are populated from the full data set, not from the currently filtered subset. This avoids confusing the analyst when filters are active.
- Multiple lozenges of the same filter type are permitted (e.g., two nationality filters AND'd together), allowing analysts to express intersections of the same dimension.
