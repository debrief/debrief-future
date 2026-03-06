# Feature Specification: Move Track

**Feature Branch**: `079-move-track`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Implement move-track tool [E03] — offset track by range/bearing with map drag support"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Offset a Track by Range and Bearing (Priority: P1)

An analyst has a track representing a vessel's path and wants to explore "what-if" scenarios by repositioning it. They invoke the move-track tool with a compass bearing and distance. Every coordinate in the track is offset by that bearing and distance, producing a new track at the translated position. The original timestamps, altitude, and per-position metadata are preserved — only the geographic coordinates change.

**Why this priority**: This is the core capability of the tool. Without the ability to translate a track by range/bearing, the E03 buffer zone cascade cannot function — step 2 (move track) feeds into step 3 (buffer zones), step 4 (point classification), and step 5 (histogram).

**Independent Test**: Can be fully tested by providing a single track feature with known coordinates, invoking the tool with a specific bearing and distance, and verifying that all output coordinates are offset by the correct amount using great-circle math.

**Acceptance Scenarios**:

1. **Given** a track feature with 3 positions along the English Channel, **When** the analyst invokes move-track with direction=180 (South) and range_nm=5, **Then** each position in the returned track is offset approximately 5 nautical miles due South, and timestamps/altitude values are unchanged.
2. **Given** a track feature, **When** the tool completes, **Then** the result includes provenance annotations linking the moved track back to the source track feature.
3. **Given** a track feature with a compound (MultiLineString) geometry containing embedded children, **When** the tool is invoked, **Then** all coordinates in all line segments are translated, preserving the compound structure.

---

### User Story 2 - Precision Editing via PROV Log (Priority: P2)

As part of the E03 reactive PROV cascade, the move-track operation is recorded in the provenance log with its range and bearing parameters. When the analyst clicks "edit" on that log entry, the range and bearing fields become editable. Changing these values and confirming causes the move-track to re-execute with updated parameters, triggering a cascade through downstream tools (buffer zones, point classification, histogram).

**Why this priority**: Precision editing via the PROV log is the primary interaction model for the E03 demo. The tool must expose its parameters in a way that the PROV replay system can capture, display, and re-invoke with modified values.

**Independent Test**: Can be tested by invoking the tool twice with different range/bearing values on the same input track and verifying that the outputs differ correspondingly — confirming the tool is stateless and parameterised.

**Acceptance Scenarios**:

1. **Given** the tool was previously invoked with direction=90 and range_nm=5, **When** it is re-invoked with direction=90 and range_nm=10, **Then** the returned track is offset twice as far from the original as the first invocation.
2. **Given** the tool output with provenance metadata, **When** the metadata is inspected, **Then** the parameters (direction, range_nm) are recorded, enabling the PROV system to present them for editing.

---

### User Story 3 - Map Drag Interaction (Priority: P3)

When the analyst enters edit mode on the move-track PROV entry, the moved track becomes draggable on the map. Dragging the track translates to updated range and bearing values. When the drag completes, the tool re-executes with the computed range/bearing, and the PROV cascade propagates downstream.

**Why this priority**: Map drag provides fluid, exploratory interaction complementing the precision range/bearing inputs. However, the drag-to-parameter conversion is a UI concern handled by the frontend — the tool itself only needs to accept range/bearing parameters. The tool's contract remains the same regardless of whether input comes from typed values or drag gestures.

**Independent Test**: The tool itself does not need special drag support — it always accepts range/bearing parameters. The drag interaction is a frontend concern. This story is tested at the integration level by verifying that a sequence of rapid re-invocations with different parameters produces correct results each time.

**Acceptance Scenarios**:

1. **Given** the tool is invoked 5 times in quick succession with different range/bearing values (simulating a drag), **When** each invocation completes, **Then** each result reflects the parameters of that specific invocation (the tool is stateless).
2. **Given** range_nm=0 and direction=0 (representing no drag offset), **When** the tool is invoked, **Then** the track is returned unchanged (no-op).

---

### Edge Cases

- What happens when the input track has only one position? The tool should translate that single position, producing a valid single-point track.
- What happens when the track crosses the antimeridian? The translated coordinates must be correctly normalised to [-180, 180] longitude.
- What happens when the input is an empty feature collection? The tool returns an error indicating no track features were found.
- What happens when the input contains non-track features mixed with tracks? Non-track features are silently skipped; only track features are translated.
- What happens when range_nm is zero? The tool returns the track unchanged (no-op mutation).
- What happens when range_nm is negative? The tool returns an error.
- What happens when the track has altitude and timestamp data in its coordinates? These values are preserved unchanged — only longitude and latitude are modified.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept one or more track features (LineString or MultiLineString geometry with `kind: "TRACK"`) and translate all coordinates by the specified bearing and distance.
- **FR-002**: System MUST accept two parameters: `direction` (compass bearing in degrees, 0=North, 90=East, default: 90) and `range_nm` (distance in nautical miles, default: 5, must be >= 0).
- **FR-003**: System MUST use great-circle (Vincenty destination formula) calculations for coordinate translation, ensuring accuracy over nautical-mile distances.
- **FR-004**: System MUST preserve all non-geographic coordinate components (altitude, timestamp) unchanged during translation — only longitude and latitude values are modified.
- **FR-005**: System MUST normalise the direction parameter to the [0, 360) range via modulo arithmetic.
- **FR-006**: System MUST normalise translated longitudes to the [-180, 180] range to handle antimeridian crossing.
- **FR-007**: System MUST return a mutation result type, linking each translated track back to its source feature via provenance annotations.
- **FR-008**: System MUST return the track unchanged when range_nm is zero (no-op mutation with appropriate label).
- **FR-009**: System MUST return an error when range_nm is negative.
- **FR-010**: System MUST return an error when the input contains no track features.
- **FR-011**: System MUST silently skip non-track features in the input and process only features with `kind: "TRACK"`.
- **FR-012**: System MUST handle compound track geometry (MultiLineString) by translating all coordinates across all line segments.
- **FR-013**: System MUST record the tool parameters (direction, range_nm) in provenance metadata so the PROV replay system can capture and re-invoke with modified values.
- **FR-014**: System MUST work entirely offline with no network dependencies.

### Key Entities

- **Track Feature**: A GeoJSON Feature with LineString or MultiLineString geometry and `kind: "TRACK"`. Contains position coordinates as `[longitude, latitude, altitude, timestamp_ms]` tuples. This is the input to the move-track tool.
- **Moved Track**: The output — a Track Feature with all geographic coordinates offset by the specified bearing and distance. Structurally identical to the input but at a new position. Retains the original feature ID for mutation tracking.
- **Movement Vector**: The combination of compass bearing (degrees) and distance (nautical miles) that defines the translation. Corresponds to the tool's two parameters.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Given any valid track, the tool produces a correctly offset track within 1 second for tracks of up to 1,000 positions.
- **SC-002**: Each translated position is offset by the specified distance and bearing — verified by computing the inverse (distance and bearing from original to translated position) and confirming it matches the input parameters within 0.1% tolerance.
- **SC-003**: Timestamps and altitude values in the output track are bit-identical to the input — no modification to non-geographic coordinate components.
- **SC-004**: The tool produces correct results when re-invoked with different parameters on the same input — verified by testing 3 different range/bearing combinations and confirming each output differs as expected.
- **SC-005**: All output tracks include correct provenance metadata (result type, source features, human-readable label, tool parameters) — verified by automated tests checking annotation fields.
- **SC-006**: Golden example input/output pairs pass validation, confirming the tool produces deterministic, reproducible results for known inputs.

## Assumptions

- The input track feature follows existing Debrief GeoJSON conventions with `kind: "TRACK"` and LineString or MultiLineString geometry using `[lon, lat, altitude, timestamp_ms]` coordinate tuples.
- Distance units are nautical miles (1 nm = 1.852 km), consistent with maritime domain conventions.
- The tool follows the same Vincenty destination formula pattern established by the move-shape tool, adapted for track geometry instead of annotation geometry.
- The tool is stateless — it does not persist results itself; the caller (PROV system) handles storage via STAC.
- Map drag interaction (User Story 3) is a frontend responsibility. The frontend converts drag gestures into range/bearing parameters and re-invokes the tool. The tool contract is identical regardless of input source.
- The result type follows the `mutation/{domain}/{specific_type}` pattern: `mutation/track/moved`.

## Dependencies

- **#049 (Tool Documentation Model)**: Defines the 9-section tool specification format and `@tool` decorator pattern that this tool must follow.
- **#062 (Compound Track Model)**: Defines the TrackFeature with MultiLineString compound geometry that this tool must handle.
