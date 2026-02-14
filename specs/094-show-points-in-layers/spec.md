# Feature Specification: Show Child Points in Layers Panel

**Feature Branch**: `094-show-points-in-layers`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "We've introduced styling properties for points on a track. But, we're unable to view them in the Layers component. So, we can't select them. I'm pretty sure we have an ADR for to pass feature sub-items in the selected list. Research all of the above, and establish a way of expanding a Track to view its child positions. Note: we'll also do this for multi-point or multi-polygon features."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expand a Track to View Its Positions (Priority: P1)

An analyst is working with a plot containing several vessel tracks. They have previously applied per-position styling (custom symbols, labels) to specific positions on a track, but cannot see or select those individual positions from the Layers panel. The analyst clicks an expand control next to a track entry in the Layers panel. The track row expands to reveal a list of child positions beneath it, each showing its timestamp and any custom label. The analyst can now click on an individual position to select it, which records a selection path identifying both the track and the specific position index.

**Why this priority**: This is the core problem being solved — analysts have per-position styling properties but no way to browse or select individual positions from the Layers panel. Without this, the styling work from feature 048 cannot be fully utilized.

**Independent Test**: Can be fully tested by loading a track with position styling, expanding it in the Layers panel, and verifying that child position rows appear with correct labels and timestamps.

**Acceptance Scenarios**:

1. **Given** a plot with a track containing 20 positions, **When** the analyst clicks the expand control on the track row, **Then** child rows appear beneath the track showing each position's timestamp.
2. **Given** a track has a position with a custom label override ("Contact Alpha"), **When** the track is expanded, **Then** that position's row displays "Contact Alpha" as its label instead of just a timestamp.
3. **Given** an expanded track, **When** the analyst clicks the collapse control, **Then** the child position rows are hidden and the track row returns to its compact form.
4. **Given** an expanded track, **When** the analyst clicks a child position row, **Then** the selection state contains a path identifying both the parent track and the specific position (e.g., `track-001/positions/4`).

---

### User Story 2 - Expand a Multi-Point Feature to View Its Points (Priority: P2)

An analyst has run a calc tool that produced a multi-point result (e.g., intercept points). The result appears as a single entry in the Layers panel. The analyst expands it to see each individual point within the multi-point feature. They can select a specific point to inspect its properties or to use it as input to another tool.

**Why this priority**: Multi-point results from calc tools are a common output. Without expansion, the analyst can only interact with the entire result as a single unit, losing precision when feeding results into subsequent tools.

**Independent Test**: Can be tested by loading a multi-point feature, expanding it in the Layers panel, and verifying individual point rows appear with coordinate or label information.

**Acceptance Scenarios**:

1. **Given** a multi-point feature with 3 points, **When** the analyst expands it, **Then** 3 child rows appear, each representing one point.
2. **Given** an expanded multi-point feature, **When** the analyst clicks a child point row, **Then** the selection contains a path identifying the parent feature and the specific point index (e.g., `intercept-001/positions/0`).

---

### User Story 3 - Expand a Multi-Polygon Feature to View Its Polygons (Priority: P2)

An analyst has a multi-polygon feature (e.g., coverage zones from a tool result). They expand it in the Layers panel to see each constituent polygon listed individually. They can select a specific polygon to highlight it on the map or inspect its properties.

**Why this priority**: Same rationale as multi-point — multi-polygon results need individual polygon access for precise selection and downstream tool input.

**Independent Test**: Can be tested by loading a multi-polygon feature, expanding it in the Layers panel, and verifying individual polygon rows appear.

**Acceptance Scenarios**:

1. **Given** a multi-polygon feature with 2 polygons, **When** the analyst expands it, **Then** 2 child rows appear, each representing one polygon.
2. **Given** an expanded multi-polygon feature, **When** the analyst clicks a child polygon, **Then** the selection contains a path identifying the parent feature and the specific polygon index.

---

### User Story 4 - Multi-Select Across Parents and Children (Priority: P3)

An analyst needs to compare a specific position on one track with a whole different track. They expand the first track, select a position, then Ctrl+click the second track's row (without expanding it). The selection contains both the position path and the whole-track ID simultaneously.

**Why this priority**: Mixed-depth multi-selection is already supported in the selection model (feature 053). This story validates that the expanded Layers panel correctly integrates with that capability.

**Independent Test**: Can be tested by expanding one track, selecting a child position, then Ctrl+clicking a different feature row, and verifying both entries coexist in the selection state.

**Acceptance Scenarios**:

1. **Given** position 5 on track A is selected, **When** the analyst Ctrl+clicks track B's row, **Then** the selection contains both `track-A/positions/5` and `track-B`.
2. **Given** a child position and a whole feature are both selected, **When** the analyst clicks an empty area or presses Escape, **Then** all selections are cleared.

---

### User Story 5 - Expand a Compound Track to View Segments and Positions (Priority: P3)

In a future scenario, a track is composed of multiple named segments, each containing positions. The analyst expands the track to see its segments, then expands a segment to see its positions. This validates three-level nesting in the Layers panel.

**Why this priority**: While compound tracks are not yet common, the architecture must support deeper nesting from day one. This story ensures the expand/collapse mechanism is recursive, not hard-coded to two levels.

**Independent Test**: Can be tested by constructing a compound track with segments, expanding to three levels in the Layers panel, and verifying correct selection paths at each depth.

**Acceptance Scenarios**:

1. **Given** a compound track with 2 segments, **When** the analyst expands the track, **Then** 2 segment rows appear.
2. **Given** an expanded segment, **When** the analyst expands one segment, **Then** position rows appear beneath it.
3. **Given** a position within a segment is clicked, **Then** the selection path encodes all three levels (e.g., `track-001/segments/leg-alpha/positions/3`).

---

### Edge Cases

- What happens when a track has zero positions (e.g., an empty track after data load)? The expand control should still appear, but expanding reveals a "No child items" message.
- What happens when a feature has only one child item? The expand control still appears (a single-position track or single-point multi-point is still expandable).
- What happens when the user collapses a track while one of its child positions is selected? The selection is preserved — the position remains selected even though its row is hidden. The parent track row should indicate that a child within it is selected (e.g., a subtle visual indicator).
- What happens when the feature data is reloaded and the number of positions changes while a child was selected? The selection path is retained but may become unresolvable (consistent with feature 053 edge case handling).
- What happens with very large tracks (e.g., 10,000 positions)? The child list should remain performant; the existing virtualisation approach should extend to child items.
- What happens when multiple features are expanded simultaneously? Each expanded feature independently shows its children; there is no single-expansion constraint.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Layers panel MUST display an expand/collapse control on any feature that contains child elements (tracks with positions, multi-point features, multi-polygon features, compound tracks with segments).
- **FR-002**: When a feature is expanded, its child elements MUST appear as indented rows beneath the parent feature row, visually distinguishable from top-level feature rows.
- **FR-003**: Each child row MUST display a meaningful label: timestamp for positions, index or label for multi-point/multi-polygon children, segment name for track segments.
- **FR-004**: Clicking a child row MUST produce a selection path using the existing selection path model (feature 053), e.g., `{featureId}/positions/{index}`.
- **FR-005**: The expand/collapse mechanism MUST support arbitrary nesting depth — a compound track can expand to show segments, and each segment can expand to show positions.
- **FR-006**: Multiple features MUST be expandable simultaneously; expanding one feature does not collapse another.
- **FR-007**: The expanded/collapsed state of each feature MUST be preserved during the current session (not lost when scrolling through a virtualised list).
- **FR-008**: When a parent feature is collapsed and a child within it is currently selected, the parent row MUST display a visual indicator that a child selection exists within it.
- **FR-009**: Standard multi-select behaviours (Ctrl+click to toggle, Shift+click for range) MUST work across both parent and child rows, producing correct selection paths at each depth.
- **FR-010**: Features without expandable children (simple points, annotations, single-geometry features) MUST NOT display an expand/collapse control.
- **FR-011**: The Layers panel MUST remain performant with tracks containing large numbers of positions (up to 10,000) by using virtualisation for child rows.
- **FR-012**: The system MUST determine whether a feature is expandable based on its kind and data content: TRACK features with positions, MULTI_POINT features with multiple coordinates, MULTI_POLYGON features with multiple polygons, and compound tracks with segments.

### Key Entities

- **Expandable Feature**: A feature in the Layers panel that contains child elements which can be revealed. Determined by feature kind (TRACK, MULTI_POINT, MULTI_POLYGON) and the presence of child data (positions array, multi-geometry coordinates, segments).
- **Child Row**: A row displayed beneath an expanded parent feature, representing one child element (a position, a point within a multi-point, a polygon within a multi-polygon, or a segment within a compound track). Each child row maps to a specific selection path.
- **Expansion State**: A per-feature record of whether the feature is currently expanded or collapsed in the Layers panel. Tracked at the session level (not persisted across sessions).

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Browse and select individual child elements (positions, points, polygons) within composite features from the Layers panel, so that per-element styling and properties can be inspected and per-element selections can drive tool invocations.
- **Key Decision(s)**:
  1. Whether to expand a feature to see its children or interact with the feature as a whole
  2. Whether to select a child element or the parent feature
  3. Whether to add to the existing selection (Ctrl+click) or replace it
- **Decision Inputs**: The expand/collapse chevron indicates a feature has children. Child rows show timestamps, labels, or indices to help the analyst identify specific elements. A subtle indicator on collapsed rows shows when a child within is selected.

### Screen Progression

| Step | Screen/State               | User Action                                   | Result                                                           |
|------|----------------------------|-----------------------------------------------|------------------------------------------------------------------|
| 1    | Layers panel with tracks   | Analyst sees chevron on a track row            | Indicates the track can be expanded                              |
| 2    | Track row with chevron     | Analyst clicks the chevron / expand control    | Track row expands; child position rows appear indented beneath   |
| 3    | Expanded track             | Analyst scans child rows (timestamps, labels)  | Identifies the position of interest                              |
| 4    | Child row identified       | Analyst clicks a child position row            | Selection state records the full path (e.g., `track/positions/7`) |
| 5    | Child position selected    | Properties panel updates                       | Shows position-level details (timestamp, course, speed, style)   |
| 6    | Position selected          | Analyst clicks chevron again to collapse       | Child rows hidden; parent row shows "child selected" indicator   |

### UI States

- **Empty State**: Layers panel shows "No features available" (no features loaded at all). If a feature is expanded but has no children, it shows "No child items" beneath the parent row.
- **Loading State**: Not applicable — child data is already present in the loaded feature; expansion is instantaneous from local data.
- **Error State**: If a selection path becomes unresolvable (e.g., data reloaded with fewer positions), the child row for the stale selection is dimmed with a tooltip explaining it cannot be resolved.
- **Success State**: Expanded feature shows child rows with clear labels. Selected children are highlighted. Collapsed parents with selected children show a subtle dot or badge indicator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can expand a track in the Layers panel and see all its child positions in a single click, without needing to interact with the map.
- **SC-002**: Users can select an individual position from the expanded Layers panel, and the selection state contains the correct parent-child path that other panels and tools can interpret.
- **SC-003**: Expanding and collapsing features with up to 500 positions completes without perceptible delay (remains responsive).
- **SC-004**: All three expandable feature kinds (TRACK, MULTI_POINT, MULTI_POLYGON) support the same expand/collapse/select workflow — no feature kind is treated as a special case from the user's perspective.
- **SC-005**: Existing workflows that do not use expansion (clicking feature rows to select whole features) continue to work identically — the expand control does not interfere with basic selection.
- **SC-006**: When a child element is selected and the parent is collapsed, the analyst can still see at a glance that a child within that feature is selected.

## Dependencies

- **Feature 053 (Nested Child Selection)**: Provides the selection path model, path utilities (`parsePath`, `buildPath`, `getRoot`), and level registry. This feature builds on top of 053's infrastructure.
- **Feature 048 (GeoJSON Position Metadata)**: Provides per-position styling properties (`PositionStyle`, `PositionStyleOverride`) that motivated the need to browse individual positions.

## Assumptions

- The selection path infrastructure from feature 053 (path parsing, level registry, `FeatureSelection` accepting paths) is already implemented and available.
- Child data (positions array, multi-geometry coordinates, segments) is already present in the loaded GeoJSON features and does not need to be fetched separately.
- The existing list virtualisation approach can be extended or adapted to handle variable-height rows caused by expanded features with children.
- The `positions` level name (index-addressed) and `segments` level name (id-addressed) from the level registry are sufficient for all current expandable feature types. Multi-point and multi-polygon children will also use the `positions` level or an equivalent index-addressed level.
- Position labels are derived from the position's timestamp and any `PositionStyleOverride` label. If no override label exists, the timestamp is the primary label.
