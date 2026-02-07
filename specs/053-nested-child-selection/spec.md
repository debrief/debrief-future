# Feature Specification: Nested Child Selection

**Feature Branch**: `053-nested-child-selection`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "We need to change our selection model, so that children of elements can be shown as selected. Actually, we may need to support child-of/child-of/child-of elements, since in the future one Track may be comprised of several track segments, and the user may have selected one position on one of these segments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select a Position Within a Track (Priority: P1)

An analyst viewing a plot with several vessel tracks clicks on an individual position point within a track. The system records the selection as a path identifying both the track and the specific position, not just the track. The properties panel displays details for that single position (timestamp, course, speed) rather than the whole-track summary. Other tools and panels can inspect the selection path to understand exactly what the user pointed at.

**Why this priority**: This is the core capability — without position-level selection, the entire feature has no value. Every downstream story depends on the system being able to represent "this specific child element within this parent."

**Independent Test**: Can be fully tested by clicking a position on a rendered track and verifying the selection state contains a path that identifies both the track and the position index.

**Acceptance Scenarios**:

1. **Given** a plot with a track containing 20 positions, **When** the user clicks position 7, **Then** the selection contains a path that identifies the track and position 7 specifically.
2. **Given** no prior selection, **When** the user clicks a position, **Then** the selection contains exactly one entry — the full path to that position.
3. **Given** a position is selected, **When** the user clicks a different position on the same track, **Then** the previous selection is replaced with the new position path.

---

### User Story 2 - Mixed-Depth Multi-Selection (Priority: P2)

An analyst needs to compare data across different levels of detail. They select an entire track (parent level), then Ctrl+click a specific position on a different track (child level). The system holds both selections simultaneously — the whole track and the individual position — in a single selection set with mixed depths.

**Why this priority**: Analysts frequently need to compare a whole track's properties against a single position on another track. Without mixed-depth selection, they lose the ability to work across levels in one operation.

**Independent Test**: Can be tested by selecting a whole track, then Ctrl+clicking a position on another track, and verifying both entries coexist in the selection state.

**Acceptance Scenarios**:

1. **Given** track A is selected, **When** the user Ctrl+clicks position 5 on track B, **Then** the selection contains both `track-A` and `track-B/positions/5`.
2. **Given** a mixed-depth selection exists, **When** the user clears the selection, **Then** all entries at all depths are removed.
3. **Given** position 3 on track A is selected, **When** the user Ctrl+clicks position 8 on track B, **Then** both position paths coexist in the selection.

---

### User Story 3 - Deeply Nested Selection (Priority: P3)

In a future scenario, a track is composed of multiple segments, and each segment contains positions. An analyst selects a specific position within a specific segment of a track. The selection path captures all three levels: track, segment, and position. This story validates that the selection model supports arbitrary nesting depth, not just two levels.

**Why this priority**: While the immediate need is track/position (two levels), the architecture must support deeper nesting from day one to avoid a costly refactor when track segments are introduced.

**Independent Test**: Can be tested by constructing a three-level data structure (track > segment > position) and verifying the selection path correctly identifies all three levels.

**Acceptance Scenarios**:

1. **Given** a track with segment "leg-alpha" containing 10 positions, **When** the user selects position 3 of that segment, **Then** the selection path encodes track, segment, and position.
2. **Given** a three-level selection path, **When** a consumer parses the path, **Then** it can extract each level independently (track ID, segment ID, position index).

---

### User Story 4 - Tool Receives Leaf-Only Selection (Priority: P2)

A calc tool is invoked while the user has selected a specific position within a track. The tool receives only the exact selection paths — it does not receive the parent track as an implicit additional selection. If the tool needs parent-level information, it is responsible for parsing the path upward.

**Why this priority**: Clean leaf-only semantics prevent ambiguity in tool behaviour. Tools that operate on whole tracks must not accidentally receive phantom selections when the user intended position-level precision.

**Independent Test**: Can be tested by selecting a position, invoking a tool, and verifying the tool receives exactly the leaf path — not the parent track ID as a separate entry.

**Acceptance Scenarios**:

1. **Given** position 4 of track-hms-defender is selected, **When** a tool queries the selection, **Then** it receives `["track-hms-defender/positions/4"]`, not `["track-hms-defender", "track-hms-defender/positions/4"]`.
2. **Given** a tool requires whole-track selection, **When** only a position within that track is selected, **Then** the tool does not match as eligible (selection requirements are not implicitly satisfied by child selections).

---

### Edge Cases

- What happens when a selection path references a position index that no longer exists (e.g., data was reloaded with fewer positions)? The selection entry should be retained but marked as unresolvable; it should not silently disappear or cause errors.
- What happens when a feature ID contains forward slashes? The path uses RFC 6901 escaping (`~1` for `/`, `~0` for `~`), so a feature with ID `track/alpha` is encoded as `track~1alpha`.
- What happens when the user selects a parent track explicitly, then also selects a child position within it? Both entries coexist — the system does not deduplicate or collapse them. `["track-001", "track-001/positions/4"]` is a valid selection.
- What happens with an empty selection path (zero-length string)? It is treated as invalid and rejected.
- What happens when a path has a trailing slash (e.g., `track-001/`)? Trailing slashes are stripped during normalisation — `track-001/` becomes `track-001`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent selections as path strings using forward-slash-separated segments, following JSON Pointer (RFC 6901) conventions for escaping (`~0` for `~`, `~1` for `/`).
- **FR-002**: The system MUST support selection paths of arbitrary depth (1 level, 2 levels, 3 levels, or more) with no hard-coded depth limit.
- **FR-003**: Each path segment MUST be interpreted based on its level name: some levels use ID-based addressing (e.g., `/segments/segment-alpha`), while others use index-based addressing (e.g., `/positions/4`). The schema defines which levels are ID-based and which are index-based.
- **FR-004**: The selection MUST be leaf-only — selecting a child element does not implicitly add the parent to the selection. Only the exact path the user pointed at is recorded.
- **FR-005**: The system MUST support multi-selection containing paths at mixed depths (e.g., a whole track alongside a position within a different track).
- **FR-006**: The system MUST support multi-selection of children across different parents (e.g., positions from two different tracks in the same selection).
- **FR-007**: A single-segment path (e.g., `track-hms-defender`) MUST remain valid and represent a whole-feature selection, preserving backward compatibility with existing flat selection behaviour.
- **FR-008**: The primary selection field MUST accept a full path string, allowing any depth of element to be designated as primary.
- **FR-009**: The system MUST validate selection paths for well-formedness (non-empty, no trailing slashes after normalisation, valid escape sequences).
- **FR-010**: The system MUST define a canonical set of level names and their addressing mode (ID-based or index-based) that all consumers can reference.

### Key Entities

- **Selection Path**: A forward-slash-separated string identifying a specific element at any depth within a feature hierarchy. The first segment is always a feature ID. Subsequent segments alternate between level names and addresses (IDs or indices). Example: `track-hms-defender/positions/4` or `track-hms-defender/segments/leg-alpha/positions/3`.
- **Level Definition**: A named nesting level within the feature hierarchy, with a defined addressing mode (ID-based or index-based). Examples: `segments` (ID-based), `positions` (index-based).
- **Feature Selection**: The complete selection state, comprising an array of selection paths, a primary path, and a timestamp. Extends the existing `FeatureSelection` concept to accept paths instead of flat IDs.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Select a specific element within a hierarchical feature (e.g., a single position within a track) so that properties, tools, and other panels can respond to that precise selection.
- **Key Decision(s)**:
  1. Which element to select — the whole feature or a specific child within it
  2. Whether to replace the current selection or add to it (single-click vs. Ctrl+click)
- **Decision Inputs**: The map display shows tracks as lines and positions as points along those lines. Clicking on the line selects the whole track; clicking on a discrete position point selects that position. Visual highlighting distinguishes selected elements at every level.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map showing tracks | User clicks a position point on a track | Position is selected; path recorded at position depth |
| 2 | Position selected | Properties panel updates | Shows position-level details (timestamp, course, speed) |
| 3 | Position selected | User Ctrl+clicks a whole track line | Track added to selection alongside existing position selection |
| 4 | Mixed selection | User views tools panel | Tool eligibility reflects exact selection paths and depths |
| 5 | Mixed selection | User clicks empty area | Selection cleared entirely |

### UI States

- **Empty State**: No elements selected; properties panel shows plot-level summary or "No selection" message.
- **Loading State**: Not applicable — selection is instantaneous from local data.
- **Error State**: If a selection path references an element that cannot be resolved (e.g., stale index), the entry remains in the selection but the UI indicates "unresolvable" status (e.g., dimmed highlight, tooltip explaining the path could not be resolved).
- **Success State**: Selected elements are visually highlighted on the map. Child selections show a distinct highlight style from parent/whole-feature selections so the user can distinguish selection depth at a glance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select an individual position within a track in a single click, and the selection state correctly identifies both the parent track and the specific position.
- **SC-002**: The selection model supports at least 4 levels of nesting depth without degradation in selection or display responsiveness.
- **SC-003**: Existing workflows that select whole tracks continue to work identically — single-segment paths behave exactly as the current flat feature ID selection.
- **SC-004**: 100% of selection paths round-trip correctly through serialisation and deserialisation, including paths containing escaped characters (`~0`, `~1`).
- **SC-005**: Tools that require whole-feature selections do not falsely match when only child elements within those features are selected (leaf-only semantics enforced).
- **SC-006**: Users can hold a mixed-depth selection (whole features and child positions from different parents) and all selected elements are visually distinguished on the map simultaneously.

## Assumptions

- The existing `FeatureSelection` interface will be extended (not replaced) — the `featureIds` array will accept path strings in addition to flat IDs, maintaining backward compatibility.
- The set of known level names (e.g., `positions`, `segments`) will be defined in the shared schema so that all consumers (services, extensions, webviews) can agree on addressing modes.
- Position-level click detection on the map is a prerequisite that may require separate work in the map rendering layer (detecting clicks on individual coordinate points within a LineString).
- RFC 6901 escaping is sufficient; we do not need a more complex encoding scheme.
