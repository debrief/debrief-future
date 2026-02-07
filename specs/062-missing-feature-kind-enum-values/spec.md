# Feature Specification: Add Missing FeatureKindEnum Values for Tool Migration

**Feature Branch**: `062-missing-feature-kind-enum-values`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Add missing FeatureKindEnum values for tool migration — add 7 new kinds (SENSOR, TMA_SEGMENT, TRACK_SEGMENT, TUAS_SOLUTION, LIGHTWEIGHT_TRACK, FREQUENCY_RESIDUALS, ZONE) and Feature classes to LinkML schemas; blocks 30+ tool implementations"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sensor Feature Schema Support (Priority: P1)

A tool implementer is building sensor analysis tools (e.g., generate-sensor-range-plot, resolve-ambiguity). They need to represent sensor contact data — bearings, ranges, frequencies — as GeoJSON features with `kind: "SENSOR"`. The schema must define `SensorFeature` and `SensorProperties` so that golden I/O fixtures validate against the schema and Pydantic models can be generated for the service layer.

**Why this priority**: 9+ tools depend on the SENSOR kind, making it the highest-impact addition. Without it, the entire sensor analysis and sensor calibration tool categories are blocked.

**Independent Test**: Can be fully tested by adding `SENSOR` to `FeatureKindEnum`, creating `SensorFeature` and `SensorProperties` classes, regenerating derived schemas, and validating existing sensor golden I/O fixtures against the generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** the updated schema with SENSOR kind, **When** a sensor golden I/O fixture (e.g., `generate-sensor-range-plot.basic.input.json`) is validated against the generated Pydantic model, **Then** validation passes without errors.
2. **Given** the updated schema, **When** derived schemas are regenerated (Pydantic, JSON Schema, TypeScript), **Then** all three outputs include `SensorFeature`, `SensorProperties`, and the `SENSOR` enum value.
3. **Given** a SensorFeature with properties including `sensor_name`, `sensor_type`, `host_track_id`, and a `cuts` array, **When** validated, **Then** all required fields are enforced and optional fields are accepted.

---

### User Story 2 - TMA and Track Segment Schema Support (Priority: P2)

A tool implementer is building track analysis tools (e.g., generate-tma-from-ownship, generate-tma-from-infill). They need to represent TMA segments and track segments as GeoJSON features. The schema must define `TMASegmentFeature`, `TMASegmentProperties`, `TrackSegmentFeature`, and `TrackSegmentProperties` so that the 5+ tools producing these types can be implemented.

**Why this priority**: TMA and track segment types are used by the core track analysis tools. TMA_SEGMENT is referenced by 5+ tools and TRACK_SEGMENT is a prerequisite for infill-based analysis.

**Independent Test**: Can be fully tested by adding TMA_SEGMENT and TRACK_SEGMENT to the enum, creating the corresponding Feature and Properties classes, and validating the existing golden I/O fixtures for track analysis tools.

**Acceptance Scenarios**:

1. **Given** the updated schema with TMA_SEGMENT kind, **When** a TMA golden I/O fixture (e.g., `convert-absolute-tma-to-relative.complex.input.json`) is validated, **Then** validation passes with segment_type, parent_track_id, course, and speed fields accepted.
2. **Given** the updated schema with TRACK_SEGMENT kind, **When** a track segment fixture (e.g., `generate-tma-from-infill.basic.input.json`) is validated, **Then** validation passes with segment_type, parent_track_id, and positions array accepted.
3. **Given** a TMASegmentFeature with `segment_type: "ABSOLUTE"`, **When** validated, **Then** the segment_type value is accepted. **Given** `segment_type: "INVALID"`, **When** validated, **Then** validation fails.

---

### User Story 3 - Remaining Feature Kinds (Priority: P3)

A tool implementer needs the remaining feature kinds — TUAS_SOLUTION, LIGHTWEIGHT_TRACK, FREQUENCY_RESIDUALS, and ZONE — to implement their respective tools. Each kind has a smaller number of dependent tools but is still required for full tool migration coverage.

**Why this priority**: These kinds each serve 1-3 tools. They complete the full set of 7 missing kinds and unblock the remaining tool implementations.

**Independent Test**: Can be fully tested by adding all four kinds, creating their Feature and Properties classes, and validating the corresponding golden I/O fixtures.

**Acceptance Scenarios**:

1. **Given** the updated schema with TUAS_SOLUTION kind, **When** a TUAS fixture is validated, **Then** validation passes with the solution-specific properties accepted.
2. **Given** the updated schema with LIGHTWEIGHT_TRACK kind, **When** a lightweight track fixture (e.g., `convert-lightweight-to-track.basic.input.json`) is validated, **Then** validation passes with the minimal track properties (platform_name, positions, start_time, end_time).
3. **Given** the updated schema with FREQUENCY_RESIDUALS kind, **When** a frequency residuals fixture is validated, **Then** validation passes with null geometry, sensor_name, source_frequency_hz, and residuals array.
4. **Given** the updated schema with ZONE kind, **When** a zone fixture (e.g., from `export-as-geo-pdf.complex.input.json`) is validated, **Then** validation passes with Polygon geometry, zone_name, and zone_type.

---

### User Story 4 - Schema Adherence Tests Pass (Priority: P1)

A schema maintainer regenerates derived schemas after adding new types. All three schema adherence test strategies must pass: golden fixtures validate, round-trip serialization (Python to JSON to TypeScript to JSON to Python) preserves data, and Pydantic-generated JSON Schema structurally matches LinkML-generated JSON Schema.

**Why this priority**: Schema integrity is a constitutional requirement (Article II). Without passing adherence tests, no schema changes can be merged.

**Independent Test**: Can be tested by running the existing schema test suite after regeneration.

**Acceptance Scenarios**:

1. **Given** the updated schemas and regenerated outputs, **When** golden fixture tests run, **Then** all valid fixtures pass validation and all invalid fixtures are rejected.
2. **Given** a feature instance created with Python Pydantic models, **When** serialized to JSON, parsed by TypeScript types, serialized back to JSON, and parsed back by Pydantic, **Then** the round-trip produces an equivalent object.
3. **Given** the regenerated Pydantic JSON Schema and the LinkML-generated JSON Schema, **When** structurally compared, **Then** they are equivalent for all new types.

---

### Edge Cases

- What happens when a feature has `kind: "SENSOR"` but is missing required properties like `sensor_name`? Validation must reject it with a clear error indicating which required field is missing.
- What happens when a FREQUENCY_RESIDUALS feature has null geometry? It must be accepted, since frequency residuals are non-spatial data (similar to SYSTEM kind).
- What happens when a ZONE feature uses a Polygon geometry that is not a simple closed ring? The schema should accept any valid GeoJSON Polygon, delegating geometric validity checks to consumers.
- What happens when a TMA_SEGMENT has an unrecognised `segment_type` value? Validation should reject it if segment_type is constrained to an enum, or accept it if left as a free string.
- What happens when TUAS_SOLUTION shares most properties with TMA_SEGMENT? The schema should define TUAS_SOLUTION as a distinct kind even if its properties overlap, to preserve semantic clarity for tool consumers.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Schema MUST add 7 new values to `FeatureKindEnum`: `SENSOR`, `TMA_SEGMENT`, `TRACK_SEGMENT`, `TUAS_SOLUTION`, `LIGHTWEIGHT_TRACK`, `FREQUENCY_RESIDUALS`, `ZONE`.
- **FR-002**: Schema MUST define `SensorFeature` and `SensorProperties` with required properties: `kind` (= "SENSOR"), `sensor_name`, `sensor_type`, `host_track_id`. Optional properties: `host_platform_name`, `cuts` (array of sensor contact records with `time`, `bearing`, and optional `frequency`, `range`, `origin`, `label`).
- **FR-003**: Schema MUST define `TMASegmentFeature` and `TMASegmentProperties` with required properties: `kind` (= "TMA_SEGMENT"), `segment_type`, `parent_track_id`, `start_time`, `end_time`. Optional properties: `platform_id`, `platform_name`, `track_type`, `course`, `speed`, `positions`.
- **FR-004**: Schema MUST define `TrackSegmentFeature` and `TrackSegmentProperties` with required properties: `kind` (= "TRACK_SEGMENT"), `segment_type`, `parent_track_id`, `start_time`, `end_time`. Optional properties: `positions`, `style`.
- **FR-005**: Schema MUST define `TUASSolutionFeature` and `TUASSolutionProperties` with required properties: `kind` (= "TUAS_SOLUTION"), `parent_track_id`, `start_time`, `end_time`. Optional properties: `platform_id`, `platform_name`, `course`, `speed`, `positions`.
- **FR-006**: Schema MUST define `LightweightTrackFeature` and `LightweightTrackProperties` with required properties: `kind` (= "LIGHTWEIGHT_TRACK"), `platform_name`, `start_time`, `end_time`, `positions`. Optional properties: `style`.
- **FR-007**: Schema MUST define `FrequencyResidualsFeature` and `FrequencyResidualsProperties` with required properties: `kind` (= "FREQUENCY_RESIDUALS"), `sensor_name`, `source_frequency_hz`, `residuals` (array of records with `time` and `residual_hz`). Geometry MUST allow null.
- **FR-008**: Schema MUST define `ZoneFeature` and `ZoneProperties` with required properties: `kind` (= "ZONE"), `zone_name`. Optional properties: `zone_type`, `style`.
- **FR-009**: All new Feature classes MUST follow the existing GeoJSON Feature pattern: `type` (= "Feature"), `id` (unique identifier), `geometry` (appropriate GeoJSON geometry type), `properties` (typed properties class).
- **FR-010**: Derived schemas MUST be regenerated after changes: Pydantic models, JSON Schema, and TypeScript types.
- **FR-011**: All existing schema adherence tests MUST continue to pass after the additions (no regressions).
- **FR-012**: New golden fixture files MUST be created for each new Feature type, containing at least one valid and one invalid example per type.
- **FR-013**: Each new kind's `SensorContact` record type (used in SensorProperties.cuts) and `FrequencyResidual` record type (used in FrequencyResidualsProperties.residuals) MUST be defined as reusable schema classes.

### Key Entities

- **SensorFeature**: Represents sensor contact data (bearings, ranges, frequencies) associated with a host platform. Uses LineString geometry following the sensor's spatial extent. Contains an array of sensor contact records ("cuts") with time-indexed measurements.
- **TMASegmentFeature**: Represents a Target Motion Analysis segment with estimated course and speed. Uses LineString geometry. Can be ABSOLUTE (geographic coordinates) or RELATIVE (relative to ownship). Always references a parent track.
- **TrackSegmentFeature**: Represents a sub-segment of a track, typically infill between known positions. Uses LineString geometry. References a parent track and includes a segment type classifier.
- **TUASSolutionFeature**: Represents a Target Under Active Sonar solution. Uses LineString geometry. Structurally similar to TMA segments but semantically distinct (active sonar vs. passive bearing analysis).
- **LightweightTrackFeature**: A simplified track representation with fewer required properties than a full TrackFeature. Uses LineString geometry. Useful as an intermediate format before conversion to a full track.
- **FrequencyResidualsFeature**: Non-spatial data representing frequency calibration residuals. Uses null geometry. Contains an array of time-indexed residual values relative to a source frequency.
- **ZoneFeature**: A spatial zone or area used for sensor analysis. Uses Polygon geometry. Includes a zone name and type classifier.
- **SensorContact**: A single sensor measurement record within a SensorFeature's cuts array. Contains time, bearing, and optional frequency, range, origin coordinates, and label.
- **FrequencyResidual**: A single frequency residual record within a FrequencyResidualsFeature's residuals array. Contains time and residual value in Hz.

### Assumptions

- **Geometry types**: SensorFeature, TMASegmentFeature, TrackSegmentFeature, TUASSolutionFeature, and LightweightTrackFeature use LineString geometry (consistent with golden I/O fixtures). ZoneFeature uses Polygon geometry. FrequencyResidualsFeature uses null geometry.
- **Segment type values**: TMASegmentProperties.segment_type accepts at minimum ABSOLUTE and RELATIVE. TrackSegmentProperties.segment_type accepts values like INFILL, MANUAL, INTERPOLATED. These will be modelled as enums if the set is closed, or as free strings if extensibility is needed.
- **TUAS_SOLUTION as distinct kind**: Although structurally similar to TMA_SEGMENT, TUAS_SOLUTION is kept as a separate kind to preserve the semantic distinction between active sonar solutions and passive bearing TMA.
- **ZONE is distinct from CIRCLE/RECTANGLE**: ZONE represents an analytical region (e.g., operating area, exclusion zone) with arbitrary polygon boundaries, which is semantically different from the existing annotation shapes.
- **No changes to TimestampedPosition**: Inter-feature properties (bearing, range, frequency) on position records are out of scope. The `positions` arrays in new types use inline coordinate/time records rather than extending `TimestampedPosition`.
- **Schema file organisation**: New types will be added to existing schema files (geojson.yaml for Feature classes, common.yaml for the enum) rather than creating new schema files, to follow the existing pattern. Supporting record types (SensorContact, FrequencyResidual) and any new enums will be added to common.yaml.

### Dependencies

- Existing schema infrastructure (LinkML, Pydantic, JSON Schema, TypeScript generators) must be functional.
- 151 golden I/O fixtures in `shared/tools/` provide the validation targets.
- Feature 049 (tool documentation model) must be at least partially complete to provide the fixture format context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 7 new `FeatureKindEnum` values are present and usable in feature definitions.
- **SC-002**: Each of the 7 new Feature types has a corresponding Properties class with required and optional fields matching the golden I/O fixture structures.
- **SC-003**: 100% of existing schema adherence tests pass after the changes (zero regressions).
- **SC-004**: At least one valid and one invalid golden fixture per new Feature type validates correctly against the generated Pydantic models.
- **SC-005**: Round-trip serialization (Python Pydantic to JSON to TypeScript to JSON to Python Pydantic) preserves all data for each new Feature type.
- **SC-006**: The 30+ tools that depend on these kinds can reference the new types in their implementations without schema validation errors.
- **SC-007**: Pydantic-generated JSON Schema and LinkML-generated JSON Schema are structurally equivalent for all new types.
