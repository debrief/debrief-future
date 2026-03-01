# Feature Specification: PROV Log Input Snapshot for Mutation Replay

**Feature Branch**: `116-fix-move-tool-bearing`
**Created**: 2026-03-01
**Status**: Draft
**Input**: User description: "Fix move tool to store pre-operation geometry in PROV log for correct replay. When a mutation tool is replayed with modified parameters, the new parameters should be applied to the original (pre-operation) coordinates, not the current position."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Replaying move-shape with changed bearing orbits around original position (Priority: P1)

An analyst moves a circle annotation East by 5 km using the move-shape tool. Later, they adjust the bearing parameter in the PROV log (e.g., via a parameter slider). The system replays the operation using the **pre-operation coordinates** stored in the PROV log entry, not the feature's current (already-moved) coordinates. As the analyst drags the bearing from 0 to 360 degrees, the shape traces a circle of radius 5 km around its original position.

**Why this priority**: This is the core bug. Without this fix, replaying with a different bearing accumulates drift — applying the new bearing to the already-moved position rather than the original. This makes parameter tuning unpredictable and broken for spatial mutations.

**Independent Test**: Can be fully tested by applying move-shape to a feature, then replaying the same PROV entry with a different bearing value, and verifying the result is computed from the stored pre-operation coordinates rather than the current position.

**Acceptance Scenarios**:

1. **Given** a circle at position A that has been moved East 5 km to position B, **When** the move operation is replayed with bearing changed to 0 (North), **Then** the circle ends up 5 km North of position A (not 5 km North of position B).
2. **Given** a circle at position A that has been moved East 5 km, **When** the move operation is replayed with the same parameters (bearing=90, distance=5 km), **Then** the circle remains at position B (idempotent — same result as original application).
3. **Given** a circle at position A that has been moved East 5 km, **When** the move operation is replayed with bearing changed to 270 (West), **Then** the circle ends up 5 km West of position A (opposite side).

---

### User Story 2 - Input snapshot stored in PROV log entry (Priority: P1)

When any coordinate-mutating tool executes, the PROV log entry MUST include a snapshot of the input feature geometry and relevant spatial properties as they were before the operation. This snapshot is the "anchor" that enables correct replay.

**Why this priority**: Co-equal with US1 — without the stored snapshot, replay cannot work correctly. This is the data model change that enables the behaviour described in US1.

**Independent Test**: Can be tested by executing a move-shape operation and inspecting the PROV log entry on the output feature to verify it contains the pre-operation geometry and properties.

**Acceptance Scenarios**:

1. **Given** a circle feature with center at [0, 50] and polygon vertices, **When** move-shape is executed with direction=90 and distance_km=5, **Then** the PROV log entry on the output feature contains a snapshot of the input geometry (polygon coordinates) and the original center property [0, 50].
2. **Given** a vector feature with origin at [0, 50] and bearing=45, **When** move-shape is executed, **Then** the PROV log entry contains a snapshot of the input geometry coordinates and the original origin property.
3. **Given** a text feature (Point geometry), **When** move-shape is executed, **Then** the PROV log entry contains a snapshot of the original point coordinates.

---

### User Story 3 - General pattern for all coordinate-mutating tools (Priority: P2)

The input-snapshot convention is established as a general pattern that all coordinate-mutating tools follow. Any tool whose output_kind starts with `mutation/` and modifies feature geometry MUST store the pre-operation geometry in its PROV log entry. This ensures consistent replay behaviour across all spatial mutation tools.

**Why this priority**: Establishing this as a convention prevents the same bug from recurring in future tools (rotate, scale, etc.). Lower priority than the immediate fix because those tools don't exist yet.

**Independent Test**: Can be tested by verifying that the provenance creation function provides a mechanism for any tool to attach input geometry, and that documentation/conventions describe when to use it.

**Acceptance Scenarios**:

1. **Given** the provenance system provides a way to store input snapshots, **When** a new coordinate-mutating tool is developed, **Then** the developer has a documented convention and utility for storing the pre-operation geometry.
2. **Given** the move-shape tool stores input snapshots, **When** the same pattern is applied to a hypothetical rotate-shape tool, **Then** the rotate tool's replay also uses the stored original coordinates.

---

### User Story 4 - Chained mutations replay correctly (Priority: P2)

An analyst applies two sequential move operations: first East 5 km, then North 3 km. Each operation stores its own input snapshot — the geometry as it was immediately before that specific operation. When the second operation's bearing is replayed (changed from North to South), the system applies the new bearing to the intermediate position (after the first move), not to the original unmoved position and not to the final doubly-moved position.

**Why this priority**: Chaining is a natural workflow. Each PROV entry must capture its own "previous step" state, not the global original.

**Independent Test**: Apply two sequential moves, then replay the second with different parameters. Verify the result is computed from the state after the first move.

**Acceptance Scenarios**:

1. **Given** a feature at position A, moved East 5 km to position B, then moved North 3 km to position C, **When** the second move operation is replayed with bearing=180 (South), **Then** the feature ends up 3 km South of position B (not 3 km South of A or C).

---

### Edge Cases

- What happens when a feature has no prior PROV history? The input snapshot is simply the feature's current geometry at the time of the operation.
- What happens when replaying with distance changed to 0? The feature should return to its pre-operation position (the stored snapshot location).
- What happens when the stored input snapshot contains properties that no longer exist on the feature? The snapshot is authoritative for replay — the stored geometry is used regardless of the feature's current state.
- What happens if a non-spatial mutation tool (e.g., set-track-color) is executed? Non-spatial mutations do not modify geometry and therefore do not need to store geometry snapshots.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The PROV log entry for any coordinate-mutating tool MUST include a snapshot of the input feature's geometry and spatially-relevant properties as they were immediately before the operation.
- **FR-002**: The input snapshot MUST include the full geometry object (type + coordinates) and any kind-specific spatial properties (e.g., `center` for circles, `origin` for vectors).
- **FR-003**: When a PROV log entry is replayed with modified parameters, the system MUST apply the new parameters to the stored input snapshot geometry, not to the feature's current geometry.
- **FR-004**: Replaying a PROV entry with the original (unchanged) parameters MUST produce the same output as the original execution (idempotent replay).
- **FR-005**: Each PROV log entry MUST store its own input snapshot independently — the snapshot represents the state immediately before that specific operation, supporting correct chained-operation replay.
- **FR-006**: Non-spatial mutation tools (tools that modify only styling or metadata properties) MUST NOT be required to store geometry snapshots.
- **FR-007**: The input snapshot MUST be stored within the existing PROV log entry structure, not as a separate top-level property on the feature.
- **FR-008**: The move-shape tool MUST be updated to provide input geometry and spatial properties to the provenance system so they are captured in the log entry.

### Key Entities

- **Input Snapshot**: A record of a feature's geometry and spatially-relevant properties as they existed immediately before a mutation operation. Stored within the PROV log entry. Contains the geometry object and any kind-specific spatial properties (center, origin, etc.).
- **PROV Log Entry (LogEntry)**: An existing provenance record attached to features. Extended with an optional input snapshot field for coordinate-mutating tools.
- **Coordinate-Mutating Tool**: Any tool whose output modifies feature geometry coordinates. Identified by output_kind starting with `mutation/` and producing features with different coordinates than the input.

## Assumptions

- The replay mechanism (the component that re-executes a tool with modified parameters) is responsible for reading the input snapshot from the PROV log and passing it as the tool's input instead of the feature's current geometry. The tool itself does not need to know whether it is being replayed or invoked fresh.
- The snapshot storage overhead is acceptable because coordinate-mutating operations are relatively infrequent compared to reads, and the geometry data is compact (typically a few dozen coordinate pairs at most).
- Only geometry and spatially-relevant properties need to be captured — non-spatial properties (labels, styles, etc.) are not included in the snapshot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When a move-shape operation is replayed with a different bearing, the output feature's position is computed relative to the stored pre-operation location, not the current location. Verified by: moving a feature East, replaying with bearing=0 (North), and confirming the result is North of the original position.
- **SC-002**: Replaying a move-shape operation with identical parameters produces coordinates within 0.001 degrees of the original output (idempotent replay). Verified by: comparing replay output to original output.
- **SC-003**: The PROV log entry for move-shape contains the input geometry and spatial properties. Verified by: inspecting the provenance array on an output feature after a move-shape operation.
- **SC-004**: Chained move operations replay correctly — replaying the Nth operation uses the state after operation N-1. Verified by: applying two moves, replaying the second with different parameters, and confirming the result is relative to the intermediate position.
- **SC-005**: The input snapshot convention is documented and available as a utility for future coordinate-mutating tools. Verified by: the provenance creation function accepts optional input snapshot data.
