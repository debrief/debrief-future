# Feature Specification: Generate Courses and Speeds for Track

**Feature Branch**: `061-generate-courses-speeds`
**Created**: 2026-02-13
**Status**: Draft
**Input**: User description: "Add generate courses and speeds for track tool spec — derive course and speed data from consecutive track positions using great-circle math"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Derive Course and Speed for a Standard Track (Priority: P1)

An analyst has loaded a track with multiple timestamped positions. They want to understand the vessel's navigational behaviour — heading and speed between each pair of consecutive positions. They invoke the "generate courses and speeds" tool on the selected track. The tool calculates the initial bearing (course) and speed in knots between each consecutive position pair, and writes these values back into the track's position metadata. The analyst can now see course and speed values alongside each position in the track.

**Why this priority**: This is the core use case — deriving fundamental navigational data that feeds into all further maritime analysis workflows.

**Independent Test**: Can be fully tested by providing a track with 3+ positions at known coordinates/times and verifying the calculated course and speed values match expected great-circle computations.

**Acceptance Scenarios**:

1. **Given** a track with 5 positions at known coordinates and timestamps, **When** the analyst invokes "generate courses and speeds", **Then** the returned track contains course (degrees, 0-360) and speed (knots) values for each position, computed using Haversine distance and initial bearing formulas.
2. **Given** a track where positions already have course and speed values, **When** the analyst invokes the tool, **Then** the existing values are overwritten with newly computed values.

---

### User Story 2 - Handle Edge Case Tracks Gracefully (Priority: P2)

An analyst has a track with only a single position, or positions where the vessel is stationary (same coordinates at different times). The tool handles these edge cases without errors, producing sensible default values.

**Why this priority**: Robustness for real-world data is essential — tracks can have gaps, single fixes, or stationary periods.

**Independent Test**: Can be tested by providing a single-position track and a track with co-located positions, and verifying the tool returns appropriate values without errors.

**Acceptance Scenarios**:

1. **Given** a track with only 1 position, **When** the analyst invokes the tool, **Then** the tool returns the track unchanged (no course or speed can be derived from a single position) and no error is raised.
2. **Given** a track with two positions at identical coordinates but different timestamps (stationary vessel), **When** the tool runs, **Then** course is set to 0 degrees and speed is set to 0 knots for the affected position.
3. **Given** a track with two positions at very close timestamps (under 1 second apart), **When** the tool runs, **Then** speed is calculated correctly without division-by-zero errors.

---

### User Story 3 - Provenance Recording (Priority: P3)

After generating courses and speeds, the analyst can trace back which source track was used to produce the enriched output. The tool records provenance metadata linking the output to the original input track.

**Why this priority**: Provenance traceability is required by the Constitution for all transformations, but is secondary to the core calculation functionality.

**Independent Test**: Can be tested by invoking the tool and verifying the output contains provenance annotations referencing the source track feature ID.

**Acceptance Scenarios**:

1. **Given** a track with ID "track-alpha", **When** the tool generates courses and speeds, **Then** the result annotations include `debrief:sourceFeatures: ["track-alpha"]` and a descriptive label.

---

### Edge Cases

- What happens when a track has only 1 position? The tool returns the track unchanged — no course or speed values are written.
- What happens when consecutive positions are at identical coordinates? Course is set to 0 degrees, speed is set to 0 knots.
- What happens when consecutive positions have very small time differences (under 1 second)? Speed is still calculated (distance / time); no special handling needed since floating-point arithmetic handles small denominators.
- What happens when consecutive positions have zero time difference (identical timestamps)? Speed is set to 0 knots, course is still computed from bearing.
- What happens when a track contains non-track features? Non-track features are skipped silently.
- What happens when the track crosses the antimeridian (International Date Line)? The bearing calculation handles longitude wrapping correctly via the atan2 formula.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The tool MUST accept a single track feature with at least one timestamped position as input.
- **FR-002**: The tool MUST calculate the initial bearing (course) between each consecutive pair of positions using the great-circle (forward azimuth) formula, producing a value in degrees from 0 to 360.
- **FR-003**: The tool MUST calculate the speed between each consecutive pair of positions using the Haversine distance formula, producing a value in knots (nautical miles per hour).
- **FR-004**: The tool MUST write the computed course and speed values into the existing `course` and `speed` fields of each position's metadata (as defined in the `TimestampedPosition` schema).
- **FR-005**: For the last position in the track, the tool MUST carry forward the course and speed values from the preceding leg (since there is no "next" position to compute against).
- **FR-006**: For a single-position track, the tool MUST return the track unchanged without adding course or speed values.
- **FR-007**: When consecutive positions are at identical coordinates, the tool MUST set course to 0 degrees and speed to 0 knots.
- **FR-008**: When consecutive positions have identical timestamps (zero elapsed time), the tool MUST set speed to 0 knots for that leg.
- **FR-009**: The tool MUST return a mutation result containing the enriched track feature with provenance annotations recording the source track ID.
- **FR-010**: The tool specification document MUST follow the 9-section tool documentation model defined by feature #049.
- **FR-011**: The tool specification MUST include golden I/O example files (`.input.json` and `.output.json`) with at least a basic example and an edge-case example.

### Key Entities

- **Track Feature**: A GeoJSON Feature with LineString geometry representing a vessel's path. Contains an array of `TimestampedPosition` entries in its properties, where each entry corresponds to a coordinate in the geometry.
- **TimestampedPosition**: Metadata for a single track position, including `time` (ISO8601 timestamp), and optional `course` (degrees, 0-360), `speed` (knots), and `depth` (meters) fields.
- **Course**: The initial (forward) bearing from one position to the next, measured in degrees clockwise from true north (0-360).
- **Speed**: The rate of travel between consecutive positions, calculated as great-circle distance divided by elapsed time, expressed in knots (nautical miles per hour).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The tool specification document contains all 9 required sections as defined by the #049 tool documentation model (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References).
- **SC-002**: Golden I/O example files produce correct course and speed values when validated against independent great-circle calculations, with floating-point tolerance of 0.01 degrees for course and 0.01 knots for speed.
- **SC-003**: The specification covers at least 3 edge cases (single position, stationary vessel, zero time interval) with defined expected behaviours.
- **SC-004**: Course values in all examples fall within the valid range [0, 360) degrees.
- **SC-005**: Speed values in all examples are non-negative.
- **SC-006**: The specification can be used by an implementer to produce both a Python and TypeScript implementation without needing additional clarification.

## Assumptions

- The tool operates on a single track feature (not a FeatureCollection of multiple tracks). If a FeatureCollection is provided, only features with `kind: TRACK` are processed.
- Coordinates follow GeoJSON convention: `[longitude, latitude]`.
- Earth is modelled as a sphere with radius 3440.065 nautical miles (6371.0 km) for Haversine distance, consistent with existing project math utilities.
- The tool category in the taxonomy is `track/manipulation` since it mutates the input track by adding derived properties.
- The result type is `mutation/track/courses_speeds`.
- Course for position N is the bearing from position N to position N+1 (forward-looking).
- The last position inherits course and speed from the penultimate leg.

## Dependencies

- **#049 — Tool Documentation Model**: Defines the 9-section template structure that this tool spec must follow.
- **TimestampedPosition schema** (`shared/schemas/src/linkml/common.yaml`): Defines the `course` and `speed` fields that this tool populates.
- **Existing math utilities** (`range_bearing.py`, `track_stats.py`): Haversine distance and initial bearing formulas to be referenced (not duplicated) in the specification.
