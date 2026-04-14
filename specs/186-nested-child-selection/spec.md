# Feature Specification: Nested Child Selection

**Feature Branch**: `186-nested-child-selection`
**Created**: 2026-04-14
**Status**: Draft
**Input**: User description: "Add specification for nested child selection feature — enabling users to select individual child elements (e.g., positions within tracks) rather than only whole features. Defines the selection model, user workflows, and acceptance criteria for supporting arbitrary-depth hierarchical selection using RFC 6901 path-based selection with mixed-depth multi-selection and leaf-only semantics."

## Clarifications

### Session 2026-04-14

- Q: What happens when the user Ctrl+clicks an element that is already in the current selection? → A: Toggle — the path is removed if present, added otherwise. Selection entries are unique by path.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select a Position Within a Track (Priority: P1)

An analyst viewing a plot with several vessel tracks clicks on a single position point along a track. The system records the selection as a path that identifies both the parent track and the specific position within it — not just the whole track. The properties panel updates to show the details for that individual position (timestamp, course, speed) rather than a whole-track summary. Other panels and tools can inspect the selection path to understand precisely which element the user pointed at.

**Why this priority**: This is the core capability — without position-level selection, the entire feature delivers no value. Every other story builds on the system being able to represent "this specific child inside this parent".

**Independent Test**: Click a position point on a rendered track and confirm the selection state contains a path that identifies both the parent track and the position index. Verify the properties panel updates to show position-level attributes rather than track-level attributes.

**Acceptance Scenarios**:

1. **Given** a plot with a track containing 20 positions, **When** the user clicks the 7th position, **Then** the selection contains a single path that identifies both the track and position index 7.
2. **Given** no prior selection, **When** the user clicks a position, **Then** the selection contains exactly one entry — the full path to that position.
3. **Given** position 3 of a track is selected, **When** the user clicks position 10 of the same track, **Then** the previous selection is replaced with the new position path.
4. **Given** a position is selected, **When** the properties panel renders, **Then** it shows position-level details (timestamp, course, speed), not the whole-track summary.

---

### User Story 2 - Mixed-Depth Multi-Selection (Priority: P2)

An analyst needs to compare information across different levels of detail. They first select an entire track (parent-level selection). They then hold Ctrl and click a specific position on a different track (child-level selection). The system holds both entries simultaneously in a single selection set — one whole track and one individual position, living side-by-side at different depths.

**Why this priority**: Analysts routinely compare a whole track's summary against a single position on another track. Without mixed-depth multi-selection they must repeat their workflow twice or lose comparison context entirely.

**Independent Test**: Select a whole track, then Ctrl+click a position on a different track, and confirm the selection state contains both entries at different depths simultaneously.

**Acceptance Scenarios**:

1. **Given** track A is selected, **When** the user Ctrl+clicks position 5 on track B, **Then** the selection contains both the track A path and the track B/position 5 path.
2. **Given** a mixed-depth selection exists, **When** the user clears the selection, **Then** all entries at every depth are removed.
3. **Given** position 3 on track A is selected, **When** the user Ctrl+clicks position 8 on track B, **Then** both position paths coexist in the selection.
4. **Given** a mixed-depth selection exists, **When** a tool or panel inspects the selection, **Then** it receives the full collection of paths preserving each entry's exact depth.
5. **Given** position 5 on track B is already in the selection, **When** the user Ctrl+clicks position 5 on track B again, **Then** that path is removed from the selection and the remaining entries are unchanged.

---

### User Story 3 - Deeply Nested Selection (Priority: P3)

In a forward-looking scenario, a track is composed of multiple segments, and each segment contains positions. An analyst selects a specific position within a specific segment of a track. The selection path captures all three levels (track, segment, position). This story validates that the selection model supports arbitrary nesting depth, not just two levels, so that introducing segments later does not force a costly refactor.

**Why this priority**: The immediate need is two-level (track/position), but the architecture must support deeper nesting from day one. Implementing arbitrary depth now avoids a breaking rework when segmented tracks are introduced.

**Independent Test**: Construct a three-level data structure (track → segment → position) and confirm the selection path correctly identifies all three levels and can be decomposed into each.

**Acceptance Scenarios**:

1. **Given** a track with a segment identified as "leg-alpha" containing 10 positions, **When** the user selects position 3 of that segment, **Then** the selection path encodes the track, the segment, and the position.
2. **Given** a three-level selection path, **When** a consumer parses the path, **Then** it can extract each level independently (track ID, segment ID, position index).
3. **Given** the selection model specification, **When** reviewed against the architecture, **Then** no hard-coded depth limit exists in the selection representation.

---

### User Story 4 - Tool Receives Leaf-Only Selection (Priority: P2)

A calc tool is invoked while the user has a specific position selected within a track. The tool receives only the exact leaf selection path — the parent track is not implicitly added as a second selection entry. If the tool needs parent information, it derives that by parsing the path upward. Similarly, a tool that requires a whole-track selection does not match when only a child position is selected.

**Why this priority**: Leaf-only semantics prevent ambiguity in tool behaviour. Tools that operate on whole tracks must not accidentally match when the user intended position-level precision — and vice versa.

**Independent Test**: Select a position, invoke a tool, and confirm the tool receives exactly the leaf path — not the parent track ID as a separate entry. Separately, verify that a whole-track tool does not become eligible when only a child is selected.

**Acceptance Scenarios**:

1. **Given** position 4 of a track is selected, **When** a tool queries the selection, **Then** it receives one entry — the position path — and not a separate parent-track entry.
2. **Given** a tool requires whole-track selection, **When** only a position within that track is selected, **Then** the tool's selection requirements are not implicitly satisfied and it is not presented as eligible.
3. **Given** a tool needs parent-track context, **When** it receives a leaf position path, **Then** it can recover the parent track ID by parsing the path itself.

---

### Edge Cases

- **Stale references**: A selection path references a position index that no longer exists (for example, data was reloaded with fewer positions). The entry is retained but marked as unresolvable; it does not silently disappear or cause errors.
- **Escaped characters in feature IDs**: A feature ID contains a forward slash or tilde. The path encodes these using RFC 6901 escaping (`~1` for `/`, `~0` for `~`), so a feature with ID `track/alpha` is encoded as `track~1alpha`.
- **Parent and child simultaneously selected**: The user explicitly selects a parent track and separately selects a child position within it. Both entries coexist; the system does not deduplicate or collapse them.
- **Empty path**: A zero-length string path is treated as invalid and rejected.
- **Trailing slash**: A path with a trailing slash is normalised by stripping the trailing slash (for example, `track-001/` becomes `track-001`).
- **Invalid escape sequence**: A path contains an unrecognised escape sequence (such as `~2`). The path is rejected as malformed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST represent each selection entry as a path string made of forward-slash-separated segments, following JSON Pointer (RFC 6901) escaping conventions (`~0` for `~`, `~1` for `/`).
- **FR-002**: The system MUST support selection paths of arbitrary depth (1 level, 2 levels, 3 levels, or more) with no hard-coded depth limit.
- **FR-003**: Each level in a path MUST be interpreted according to a canonical Level Registry that maps every level name to its addressing mode (ID-based or index-based). Some levels use ID-based addressing (for example, segments addressed by a segment ID); others use index-based addressing (for example, positions addressed by a numeric index). The registry is the single source of truth; no consumer may hardcode or infer a level's addressing mode.
- **FR-004**: The Level Registry MUST be defined in the master schema (LinkML) so that Python, TypeScript, and JSON Schema consumers derive an identical view of level semantics. Changing a level's addressing mode is a breaking schema change.
- **FR-005**: Every level name appearing in any selection path MUST be present in the Level Registry. Paths that reference an undefined level name MUST be rejected as malformed.
- **FR-006**: A selection path MUST have the shape `feature-id` (single segment, whole-feature selection) or `feature-id/<level-name>/<address>[/...]` — levels always appear as level-name/address pairs after the feature ID. Paths that break this alternation MUST be rejected.
- **FR-007**: Child selection MUST be leaf-only: selecting a child element does not implicitly add the parent to the selection. Only the exact path the user pointed at is recorded.
- **FR-008**: The system MUST support a multi-selection that contains paths at mixed depths simultaneously (for example, a whole track alongside a position within a different track).
- **FR-009**: The system MUST support a multi-selection that contains children from different parents (for example, positions from two different tracks in the same selection).
- **FR-010**: Whole-feature selection MUST be expressed as a single-segment path (for example, `track-hms-defender`). The selection model does not expose a separate "flat ID" form — the single-segment path is the canonical representation.
- **FR-011**: The primary selection designation MUST accept a full path string at any depth, so that any selected element — whole feature or nested child — can be designated as primary.
- **FR-012**: The system MUST validate selection paths for well-formedness (non-empty, no trailing slash after normalisation, no invalid escape sequences, alternating level-name/address pairs after the feature ID) and reject malformed paths.
- **FR-013**: The system MUST normalise selection paths consistently (strip trailing slashes, decode escape sequences only when interpreting segments) so that equivalent paths compare as equal.
- **FR-014**: When a selection path cannot be resolved against current data (for example, an index that no longer exists, or an ID-addressed child that was deleted), the entry MUST be retained in the selection and flagged as unresolvable rather than silently removed.
- **FR-015**: Clearing the selection MUST remove all entries regardless of their depth.
- **FR-016**: Selection entries MUST be unique by path. Ctrl+click on a path already present in the selection MUST remove that entry (toggle behaviour); Ctrl+click on a path not present MUST append it. Duplicate paths MUST never coexist in a single selection.

### Key Entities

- **Selection Path**: A forward-slash-separated string identifying a specific element at any depth within a feature hierarchy. The first segment is always a feature ID. Subsequent segments alternate between level names and addresses (IDs or indices). Examples: `track-hms-defender`, `track-hms-defender/positions/4`, `track-hms-defender/segments/leg-alpha/positions/3`.
- **Level Registry**: The canonical, schema-defined mapping from every supported level name (for example, `segments`, `positions`) to its addressing mode (ID-based or index-based). Authored in LinkML; derived into Pydantic, TypeScript, and JSON Schema. The only permitted source of level semantics — consumers resolve every path segment's mode by looking the level name up in this registry.
- **Feature Selection**: The complete selection state, comprising an ordered collection of selection paths, a primary path (itself a path string), and a timestamp. Every entry — whole-feature or nested child — is a path; there is no second form.

## User Interface Flow

### Decision Analysis

- **Primary Goal**: Select a specific element within a hierarchical feature (for example, a single position within a track) so that properties, tools, and other panels can respond to that precise selection.
- **Key Decisions**:
  1. Which element to select — the whole feature (parent level) or a specific child within it.
  2. Whether to replace the current selection or add to it (single-click replaces; Ctrl+click extends).
  3. Whether to designate a selected element as the primary focus (the element whose details drive property panels when multiple are selected).
- **Decision Inputs**: The map display shows tracks as lines and positions as discrete points along those lines. Clicking a track line selects the whole track; clicking a discrete position point selects that position. Visual highlighting distinguishes selected elements at every level and distinguishes parent-level selection from child-level selection. The cursor hit-target changes (for example, line vs. point) so users can anticipate what a click will select.

### Screen Progression

| Step | Screen/State | User Action | Result |
|------|--------------|-------------|--------|
| 1 | Map displaying tracks with positions | User clicks a position point on a track | The position is selected; a path identifying track + position is recorded |
| 2 | Position selected | Properties panel updates automatically | Properties panel shows position-level details (timestamp, course, speed) |
| 3 | Position selected | User Ctrl+clicks a whole track line on a different track | The track is added alongside the existing position; both coexist in the selection |
| 4 | Mixed-depth selection | User Ctrl+clicks the position again | The position is removed from the selection (toggle); the track remains |
| 5 | Mixed-depth selection | User opens the tools panel | Tool eligibility reflects the exact selection paths and respects leaf-only semantics |
| 6 | Mixed-depth selection | User clicks an empty area of the map | The entire selection is cleared |

### UI States

- **Empty State**: No elements are selected. The properties panel shows a plot-level summary or a "No selection" message. Tools requiring a selection are disabled with a tooltip explaining why.
- **Loading State**: Not applicable — selection changes respond instantaneously to user input from local data. If a data reload is in progress, selection input is accepted but resolution is deferred until data is available.
- **Error State**: If a selection path cannot be resolved (for example, the referenced index no longer exists after a data reload), the entry remains in the selection and the UI indicates an unresolvable status — for example, a dimmed highlight on the last-known location (if any), a badge or icon in the properties panel, and a tooltip explaining that the path could not be resolved.
- **Success State**: Every selected element is visually highlighted on the map. Child-level selections use a distinct highlight style from parent/whole-feature selections so the user can distinguish selection depth at a glance. The properties panel shows details appropriate to the primary selection's depth.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select an individual position within a track in a single click, and the resulting selection state correctly identifies both the parent track and the specific position in 100% of cases.
- **SC-002**: The selection model supports at least 4 levels of nesting depth without degradation in selection responsiveness, display update time, or serialisation correctness.
- **SC-003**: Every selection entry in the system is a path (single-segment for whole features, multi-segment for nested children); no consumer handles an alternative flat-ID form, and no code path exists to read or produce one.
- **SC-004**: 100% of selection paths round-trip correctly through serialisation and deserialisation, including paths containing escaped characters (`~0` for `~` and `~1` for `/`).
- **SC-005**: Tools that require whole-feature selections never falsely match when only a child element within those features is selected — leaf-only semantics are enforced in every tool-eligibility evaluation.
- **SC-006**: Users can hold a mixed-depth multi-selection that contains whole features and child elements from different parents simultaneously, and every selected element is visually distinguishable on the map at the same time.
- **SC-007**: When a selection path cannot be resolved against current data, the entry is retained and visually marked as unresolvable in every view that renders it, and no errors are surfaced to the user.
- **SC-008**: Every level name appearing in any selection path across the system resolves to an addressing mode via the Level Registry; paths referencing undefined level names are rejected at the boundary and never reach application code.

## Assumptions

- Pre-v4.0.0 constitutional freedom applies (Article XIV.1): this feature is delivered as a breaking schema change. The selection state schema will be rewritten so that every entry is a path — there is no dual-form "flat ID or path" accommodation and no deprecation path. All producers and consumers are updated together in a single coordinated change.
- The Level Registry is authored as a LinkML enumeration/slot definition in the master schema, in keeping with Article II.1 (single source of truth). Pydantic and TypeScript bindings are derived, never hand-written.
- Position-level click detection on the map is a prerequisite that may require additional work in the map rendering layer (detecting clicks on individual coordinate points within a LineString). The selection model itself is independent of how the click is captured.
- RFC 6901 escaping is sufficient for expected feature ID characters; no more complex encoding scheme is required.
- "Primary" selection designation applies equally at every depth — the same notion of a single primary focus used for whole-feature selection extends unchanged to child-level paths.
- The set of selection-aware consumers (properties panel, tools, other panels, serialisers) will be updated together; no consumer is expected to gracefully handle paths without understanding depth or to silently tolerate unknown level names.
