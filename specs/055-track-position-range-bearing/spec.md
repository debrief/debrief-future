# Feature Specification: Track-Position to Track Range/Bearing Tool Spec

**Feature Branch**: `055-track-position-range-bearing`
**Created**: 2026-02-17
**Status**: Draft
**Input**: User description: "Add track-position to track range/bearing tool spec — measure range and bearing from a selected track position to the closest-in-time point on another track"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Measure Range and Bearing from a Selected Position (Priority: P1)

An analyst has two tracks on a plot and selects a single position on one of them (e.g., position 4 on track-hms-defender, via the nested child selection path `track-hms-defender/positions/4`). They invoke the "track-position range bearing" tool with the second track as the other input. The tool finds the position on the second track with the closest timestamp to the selected position (snap-to-nearest — no interpolation) and returns the range in nautical miles and bearing in degrees from the selected position to the matched position.

**Why this priority**: This is the core use case — measuring range and bearing from a specific point on one track to the temporally closest point on another. It enables granular point-to-point analysis that the existing whole-track range-bearing tool does not support.

**Independent Test**: Can be fully tested by providing a track-position selection path and a second track with known coordinates and timestamps, and verifying the output range and bearing match expected Haversine/great-circle calculations.

**Acceptance Scenarios**:

1. **Given** position 4 on track-alpha is selected (timestamp 2024-01-15T10:30:00Z), and track-bravo has positions at 10:29:00, 10:31:00, and 10:33:00, **When** the analyst invokes the tool, **Then** the tool matches the position at 10:31:00 on track-bravo (closest in time), and returns the range (nm) and bearing (degrees) from track-alpha/positions/4 to that matched position.
2. **Given** position 0 on track-alpha is selected (timestamp 2024-01-15T10:00:00Z), and track-bravo has a position at exactly 10:00:00Z, **When** the tool runs, **Then** the exact-time match is used and the correct range and bearing are returned.

---

### User Story 2 - Handle Temporal Edge Cases (Priority: P2)

An analyst selects a position on a track and invokes the tool with a second track that has no temporal overlap (all positions are hours before or after the selected position). The tool still finds the closest-in-time position — even if the time gap is large — and returns the measurement. There is no minimum temporal proximity requirement.

**Why this priority**: Real-world data frequently has gaps, and the tool must work robustly regardless of how far apart the timestamps are. A strict overlap requirement would make the tool fragile and confusing.

**Independent Test**: Can be tested by providing two tracks with non-overlapping time ranges and verifying the tool returns a valid measurement using the temporally closest positions.

**Acceptance Scenarios**:

1. **Given** the selected position has timestamp 2024-01-15T10:00:00Z and track-bravo's positions span 2024-01-15T14:00:00Z to 2024-01-15T15:00:00Z, **When** the tool runs, **Then** it matches the earliest position on track-bravo (14:00:00Z) since that is closest in absolute time difference, and returns valid range and bearing.
2. **Given** track-bravo has only 1 position, **When** the tool runs, **Then** that single position is always matched regardless of time difference.

---

### User Story 3 - Provenance Recording (Priority: P3)

After computing the range and bearing, the tool records provenance metadata linking the output to both the selected track-position and the matched track. The matched position's index and timestamp are included in the output so the analyst can trace exactly which positions were compared.

**Why this priority**: Provenance traceability is required by the Constitution for all transformations, but is secondary to the core measurement capability.

**Independent Test**: Can be tested by invoking the tool and verifying the output contains provenance annotations referencing both source features and metadata about the matched position.

**Acceptance Scenarios**:

1. **Given** position 4 of track-alpha and track-bravo are inputs, **When** the tool computes the result, **Then** the output includes `debrief:sourceFeatures` listing both track IDs, a label describing the measurement, and metadata identifying the matched position index on track-bravo.

---

### Edge Cases

- What happens when the second track has only 1 position? That position is always matched regardless of time difference, and range/bearing are computed normally.
- What happens when two positions on the second track are equidistant in time from the selected position? The earlier position (lower index) is used as the tiebreaker.
- What happens when the selected position and the matched position are at identical coordinates? Range is 0 nm, bearing is 0 degrees.
- What happens when the selected position and the matched position have identical timestamps? The tool operates normally — exact time match is the ideal case.
- What happens when the second track has no positions (empty)? Return an error response.
- What happens when the selection path does not point to a valid position? Return an error response indicating the position could not be resolved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool spec MUST follow the #049 tool documentation model with all 9 required sections (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References).
- **FR-002**: The tool MUST accept a selected track-position identified by a nested child selection path (e.g., `track-001/positions/4`) following the #053 nested child selection model.
- **FR-003**: The tool MUST accept a second track feature containing at least one timestamped position.
- **FR-004**: The tool MUST find the position on the second track with the smallest absolute time difference from the selected position's timestamp (snap-to-nearest semantics, no interpolation).
- **FR-005**: When two positions on the second track are equidistant in time, the tool MUST use the earlier position (lower index) as the tiebreaker.
- **FR-006**: The tool MUST calculate the range between the two positions using the Haversine great-circle distance formula, returning the result in nautical miles.
- **FR-007**: The tool MUST calculate the initial bearing from the selected position to the matched position using the spherical trigonometry forward-azimuth formula, returning the result in degrees (0-360).
- **FR-008**: The output MUST be a single measurement (not a time series or geometry), containing range, bearing, and metadata about the matched position (index, timestamp, coordinates).
- **FR-009**: The tool MUST record provenance annotations including both source feature IDs and a descriptive label.
- **FR-010**: The tool spec MUST include golden I/O example files (`.input.json` and `.output.json`) with at least a basic example and an edge-case example.
- **FR-011**: The tool MUST return an error response when the second track has no positions.
- **FR-012**: The tool MUST return an error response when the selection path does not resolve to a valid position on the first track.

### Key Entities

- **Track-Position**: A single position within a track, identified by a nested child selection path (e.g., `track-alpha/positions/4`). Contains coordinates (`[lon, lat]`) and a timestamp.
- **Track Feature**: A GeoJSON Feature with LineString geometry and `times` array in properties, representing a vessel's path with timestamped positions.
- **Measurement Result**: A single-value output containing range (nautical miles), bearing (degrees), and metadata about which positions were compared.
- **Temporal Match**: The position on the second track with the smallest absolute time difference from the selected position's timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The tool specification document contains all 9 required sections as defined by the #049 tool documentation model (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References).
- **SC-002**: Golden I/O example files produce correct range and bearing values when validated against independent great-circle calculations, with floating-point tolerance of 0.01 nm for range and 0.1 degrees for bearing.
- **SC-003**: The specification covers at least 4 edge cases (single-position second track, equidistant timestamps, identical coordinates, empty second track) with defined expected behaviours.
- **SC-004**: Bearing values in all examples fall within the valid range [0, 360) degrees.
- **SC-005**: The specification can be used by an implementer to produce both a Python and TypeScript implementation without needing additional clarification.
- **SC-006**: The tool correctly uses snap-to-nearest semantics without interpolation, and this is verifiable through the golden examples.

## Assumptions

- The tool operates on a pre-resolved track-position (the caller extracts the coordinates and timestamp from the selection path before invoking the tool algorithm). The tool spec defines the input schema to include the resolved position data.
- Coordinates follow GeoJSON convention: `[longitude, latitude]`.
- Earth is modelled as a sphere with radius 3440.065 nautical miles (6371.0 km) for Haversine distance, consistent with existing project math utilities in `range_bearing.py`.
- The tool category in the taxonomy is `track/measurement` since it produces a measurement artifact rather than mutating tracks.
- The result type is `artifact/measurement/position_range_bearing`.
- Timestamps are compared as absolute values (epoch milliseconds) — timezone is irrelevant.
- The existing `_calculate_bearing` and `_calculate_range` functions in `range_bearing.py` provide the reference math implementation.

## Dependencies

- **#049 — Tool Documentation Model**: Defines the 9-section template structure that this tool spec must follow. Status: complete.
- **#053 — Nested Child Selection**: Defines the selection path format (e.g., `track-001/positions/4`) used to identify the selected track-position. Status: complete.
- **Existing math utilities** (`range_bearing.py`): Haversine distance and initial bearing formulas to be referenced in the specification.
