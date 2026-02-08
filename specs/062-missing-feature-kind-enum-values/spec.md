# Feature Specification: Compound Track Model with Embedded Children

**Feature Branch**: `062-missing-feature-kind-enum-values`
**Created**: 2026-02-07
**Revised**: 2026-02-08
**Status**: Draft
**Supersedes**: Original flat FeatureKindEnum approach
**Input**: User description: "Add missing FeatureKindEnum values for tool migration" — revised after design review to compound track model with embedded children (see `docs/062-compound-track-model-srd.md`)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Compound Track Geometry (Priority: P1)

A tool implementer is building track analysis tools that operate on multi-segment tracks. A track may consist of multiple segments from disparate data sources, or a mix of recorded TrackSegments, AbsoluteTMA legs, RelativeTMA legs, and DynamicInfill segments. The schema must support both simple single-segment tracks (LineString) and compound multi-segment tracks (MultiLineString) with per-segment metadata.

**Why this priority**: Multi-segment tracks are fundamental to TMA workflows. Without compound geometry support, no TMA tools can be implemented and tracks from multiple data sources cannot be faithfully represented.

**Independent Test**: Can be tested by creating TrackFeature instances with MultiLineString geometry and a parallel `segments` metadata array, then validating against the generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** a simple single-segment track, **When** represented as a TrackFeature with LineString geometry and a flat `positions` array, **Then** validation passes (backward compatible with existing schema).
2. **Given** a multi-segment track with 3 segments (TrackSegment, AbsoluteTMA, DynamicInfill), **When** represented as a TrackFeature with MultiLineString geometry and `segments[0..2]` metadata, **Then** validation passes with each segment's type, positions, and type-specific properties accepted.
3. **Given** a TrackFeature with MultiLineString geometry, **When** `segments` array length does not match the number of LineStrings in the geometry, **Then** validation fails with a clear error.
4. **Given** a RelativeTMA segment, **When** validated, **Then** the `host_track_id` and offset properties are accepted alongside `segment_type`, `course`, and `speed`.

---

### User Story 2 — Embedded Sensor Data (Priority: P1)

A tool implementer is building sensor analysis tools (e.g., generate-sensor-range-plot, resolve-ambiguity). Sensor data is represented as an embedded array within TrackProperties. Each sensor entry has metadata (name, type, base frequency) and an array of child contact measurements (time, bearing, optional frequency, range, ambiguous bearing).

**Why this priority**: 9+ tools depend on sensor data. Sensors have no independent geometry — they are rendered dynamically from the host track's interpolated position at contact time, with bearing lines extending to the viewport edge.

**Independent Test**: Can be tested by creating a TrackFeature with a `sensors` array containing sensor entries with contact measurements, then validating against generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** a TrackFeature with one sensor containing 5 contacts, **When** validated, **Then** the sensor's `name` (required), `base_frequency` (optional), and contacts array are accepted, with each contact's `time` and `bearing` enforced as required.
2. **Given** a sensor contact with bearing only (no range, no frequency), **When** validated, **Then** validation passes — bearing-only contacts are the common case.
3. **Given** a sensor contact with an ambiguous bearing, **When** validated, **Then** both `bearing` and `ambiguous_bearing` fields are accepted.
4. **Given** a TrackFeature with zero sensors, **When** validated, **Then** validation passes — sensors are optional.

---

### User Story 3 — Embedded TUA Data (Priority: P2)

A tool implementer needs to represent Target Uncertainty Area solutions within a track. TUAs are time-indexed ellipsoidal estimates with centre position (absolute or relative), orientation, and major/minor axes.

**Why this priority**: TUA display and analysis tools require this data. TUAs derive their rendered position from the host track, particularly for relative TUAs where the centre is expressed as bearing/range from ownship.

**Independent Test**: Can be tested by creating a TrackFeature with a `tuas` array containing TUA solution entries, then validating against generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** a TrackFeature with a TUA array containing absolute TUA solutions, **When** validated, **Then** each solution's `time`, `centre` (lat/lon), `orientation`, `maxima`, and `minima` are accepted.
2. **Given** a relative TUA solution with `bearing` and `range` instead of absolute `centre`, **When** validated, **Then** validation passes with the relative positioning fields accepted.
3. **Given** a TUA solution with null ellipse dimensions (orientation, maxima, minima all null), **When** validated, **Then** validation passes — ellipse data is optional.
4. **Given** a TrackFeature with zero TUAs, **When** validated, **Then** validation passes — TUAs are optional.

---

### User Story 4 — Hierarchical Tool Selection Model (Priority: P2)

A tool designer needs to specify that their tool requires a sensor contact, a track segment, or a TUA as input. With sensors, segments, and TUAs embedded inside tracks, the selection model must support hierarchical kind paths so the presentation layer can derive selectable types from the track's internal structure.

**Why this priority**: Without hierarchical selection, tools cannot target embedded children. This blocks all sensor analysis, TMA manipulation, and TUA analysis tools.

**Independent Test**: Can be tested by defining tools with hierarchical kind requirements and verifying that the selection matching logic correctly identifies applicable tools given a track with embedded children.

**Acceptance Scenarios**:

1. **Given** a tool with requirement `kind: "TRACK.SENSOR"`, **When** a track containing sensors is selected, **Then** the tool is offered as applicable.
2. **Given** a tool with requirement `kind: "TRACK.SENSOR.CONTACT"`, **When** a specific sensor contact within a track is selected, **Then** the tool is offered.
3. **Given** a tool with requirement `kind: "TRACK.SEGMENT"` and `segment_type: "ABSOLUTE_TMA"`, **When** a track containing an AbsoluteTMA segment is selected, **Then** the tool is offered.
4. **Given** a tool with requirement `kind: "TRACK"`, **When** a track is selected, **Then** existing track-level tools continue to work (backward compatible).

---

### User Story 5 — Schema Adherence Tests Pass (Priority: P1)

A schema maintainer regenerates derived schemas after adding compound track support. All schema adherence test strategies must pass: golden fixtures validate, round-trip serialisation preserves data, and Pydantic-generated JSON Schema structurally matches LinkML-generated JSON Schema.

**Why this priority**: Schema integrity is a constitutional requirement (Article II). Without passing adherence tests, no schema changes can be merged.

**Acceptance Scenarios**:

1. **Given** the updated schemas and regenerated outputs, **When** golden fixture tests run, **Then** all existing fixtures continue to pass (zero regressions) and new compound track fixtures pass.
2. **Given** a compound TrackFeature with MultiLineString geometry, segments, sensors, and TUAs, **When** round-trip serialised (Python to JSON to TypeScript to JSON to Python), **Then** all data is preserved.
3. **Given** the regenerated Pydantic JSON Schema and the LinkML-generated JSON Schema, **When** structurally compared, **Then** they are equivalent for all new and modified types.

---

### Edge Cases

- **Mixed geometry types on TrackFeature**: A TrackFeature uses LineString for simple tracks or MultiLineString for compound tracks. If `segments` array is present, geometry MUST be MultiLineString. If geometry is LineString, `segments` MUST be absent and the flat `positions` array is used.
- **Segment array / geometry coordinate count mismatch**: `segments.length` must equal the number of LineStrings in MultiLineString `coordinates`. Validation must reject mismatches.
- **Positions array / coordinate count mismatch per segment**: `segments[i].positions.length` must equal the number of coordinate pairs in `geometry.coordinates[i]`. Validation must reject mismatches.
- **Sensor contact with no bearing**: Invalid — `bearing` is required on every contact. Validation must reject.
- **TUA with neither absolute centre nor relative bearing/range**: Invalid — one positioning mode must be provided. Validation must reject.
- **Empty sensors or TUAs array**: Permitted — an empty array is equivalent to the field being absent.
- **Existing simple TrackFeature fixtures**: Must continue to validate without modification. The compound model is additive.

## Requirements *(mandatory)*

### Functional Requirements — Compound Track Geometry

- **FR-001**: `TrackFeature.geometry` MUST accept either LineString (simple track) or MultiLineString (compound track) as a union type.
- **FR-002**: Schema MUST define a MultiLineString geometry class with `type: "MultiLineString"` and nested coordinate arrays.
- **FR-003**: `TrackProperties` MUST define an optional `segments` array of segment metadata objects. When present, geometry MUST be MultiLineString. When absent, geometry MUST be LineString and the existing flat `positions` array is used.
- **FR-004**: Segment metadata MUST include required properties: `segment_type` (enum), `start_time`, `end_time`, `positions` (array of timestamped positions).
- **FR-005**: Schema MUST define a segment type enum with values: `TRACK`, `ABSOLUTE_TMA`, `RELATIVE_TMA`, `DYNAMIC_INFILL`.
- **FR-006**: Segment metadata MUST include optional properties common to all segment types: `name`, `style`.
- **FR-007**: Segment metadata MUST include optional TMA-specific properties: `course` (degrees), `speed` (knots), `base_frequency` (Hz). These are meaningful for TMA segment types and ignored for plain TRACK segments.
- **FR-008**: Segment metadata for RELATIVE_TMA segments MUST include: `host_track_id` (required — the track this solution is relative to), `host_sensor_name` (optional), `offset_bearing` (degrees), `offset_range` (metres).
- **FR-009**: Segment metadata for DYNAMIC_INFILL segments MUST include: `before_leg` (required — name of preceding TMA leg), `after_leg` (required — name of following TMA leg).
- **FR-010**: The parallel array invariant MUST be enforced: `segments[i].positions.length` corresponds to the number of coordinate pairs in `geometry.coordinates[i]`.

### Functional Requirements — Embedded Sensors

- **FR-011**: `TrackProperties` MUST define an optional `sensors` array of sensor data objects.
- **FR-012**: Sensor data MUST include required properties: `name` (string).
- **FR-013**: Sensor data MUST include optional properties: `base_frequency` (Hz), `offset` (sensor offset distance from host platform, in metres), `worm_in_hole` (boolean — display mode).
- **FR-014**: Sensor data MUST include a `contacts` array of sensor contact objects.
- **FR-015**: Sensor contact MUST include required properties: `time` (datetime), `bearing` (degrees 0-360).
- **FR-016**: Sensor contact MUST include optional properties: `range` (metres), `frequency` (Hz), `ambiguous_bearing` (degrees 0-360), `label` (string), `comment` (string).
- **FR-017**: Sensors have no independent geometry. Rendering (origin position from host track at contact time, bearing line to viewport edge) is a presentation concern, not a schema concern.

### Functional Requirements — Embedded TUAs

- **FR-018**: `TrackProperties` MUST define an optional `tuas` array of TUA data objects. Each entry represents a named collection of TUA solutions.
- **FR-019**: TUA data MUST include required properties: `name` (string), `host_track_name` (string — the track this TUA set relates to).
- **FR-020**: TUA data MUST include a `solutions` array of TUA solution objects.
- **FR-021**: TUA solution MUST include required properties: `time` (datetime), `label` (string).
- **FR-022**: TUA solution MUST include optional absolute positioning: `centre_lat` (degrees), `centre_lon` (degrees).
- **FR-023**: TUA solution MUST include optional relative positioning: `bearing` (degrees), `range` (metres). Relative positioning is resolved against the host track's position at solution time.
- **FR-024**: TUA solution MUST include optional ellipse properties: `orientation` (degrees from north), `maxima` (metres — semi-major axis), `minima` (metres — semi-minor axis). All three may be null when ellipse data is unavailable.
- **FR-025**: TUA solution MUST include optional properties: `course` (degrees), `speed` (knots), `depth` (metres).
- **FR-026**: TUAs have no independent geometry. Rendering (ellipse at resolved position) is a presentation concern.

### Functional Requirements — Hierarchical Tool Selection

- **FR-027**: `SelectionRequirement.kind` MUST accept dot-delimited hierarchical kind paths (e.g., `TRACK.SENSOR`, `TRACK.SENSOR.CONTACT`, `TRACK.SEGMENT`).
- **FR-028**: The presentation layer MUST derive selectable types from track structure — when a track contains sensors, the selection model must expose `TRACK.SENSOR` as a matchable kind.
- **FR-029**: Existing flat kind values (e.g., `TRACK`, `POINT`, `CIRCLE`) MUST continue to work unchanged.
- **FR-030**: `SelectionRequirement` for `TRACK.SEGMENT` MAY include an optional `segment_type` filter to match specific segment types.

### Functional Requirements — Schema Integrity

- **FR-031**: All new and modified types MUST follow the schema-first development approach. Generated models and types are derived from the master schema.
- **FR-032**: Derived schemas MUST be regenerated after changes.
- **FR-033**: All existing schema adherence tests MUST continue to pass (zero regressions).
- **FR-034**: New golden fixture files MUST be created for: simple track (backward compatible), compound track (MultiLineString with mixed segment types), track with sensors, track with TUAs, track with all embedded children.

### Key Entities

- **MultiLineString Geometry**: GeoJSON MultiLineString geometry type. Each LineString represents one track segment.
- **SegmentMetadata**: Per-segment metadata for compound tracks. Contains segment type discriminator, temporal extent, positions array, and type-specific properties (TMA course/speed, relative offset, infill leg references).
- **SegmentTypeEnum**: Discriminator for track segment types: `TRACK`, `ABSOLUTE_TMA`, `RELATIVE_TMA`, `DYNAMIC_INFILL`.
- **SensorData**: A named sensor with metadata and an array of contacts. Embedded within `TrackProperties.sensors`. Contains sensor name, optional base frequency, optional offset, and contacts array.
- **SensorContact**: A single sensor measurement. Contains time, bearing (required), and optional range, frequency, ambiguous bearing, label, comment.
- **TUAData**: A named collection of TUA solutions associated with a host track. Embedded within `TrackProperties.tuas`.
- **TUASolution**: A single TUA estimate at a point in time. Contains time, label, positioning (absolute or relative), optional ellipse parameters, and optional kinematic estimates.

### Assumptions

- **Geometry union on TrackFeature**: The schema's union construct or equivalent will be used to allow TrackFeature.geometry to accept either LineString or MultiLineString. If the schema language does not cleanly support this, an abstract geometry base or runtime validation will be used.
- **Parallel array enforcement**: The coordinate-count / positions-count invariant is documented as a schema constraint. If the schema language cannot express cross-field cardinality rules, enforcement will be in validation code and tested via golden fixtures.
- **No changes to FeatureKindEnum**: No new enum values are added. All new concepts are embedded within TrackFeature.
- **TUA positioning modes**: A TUASolution has either absolute positioning (centre_lat/centre_lon) or relative positioning (bearing/range), never both. This is a logical constraint documented in the schema description.
- **Backward compatibility**: Existing simple TrackFeature instances with LineString geometry and flat `positions` array remain valid. The compound model is purely additive.

### Dependencies

- Existing schema infrastructure (generators for Pydantic, JSON Schema, TypeScript) must be functional.
- Feature 053 (hierarchical selection paths) provides the selection path mechanism that the hierarchical tool selection model builds upon.
- Existing golden I/O fixtures in `shared/tools/` must not be broken by the changes.

### Items Out of Scope

- **Frequency residuals**: These are STAC assets (separate documents), not GeoJSON features. Addressed in a separate spec.
- **Lightweight tracks**: Dropped. The concept saw limited adoption in legacy Debrief.
- **Zones**: Existing annotation types (CIRCLE, RECTANGLE) cover the zone use case. No new kind needed.
- **Sensor rendering logic**: How bearing lines are drawn from host track position to viewport edge is a frontend concern.
- **TUA rendering logic**: How ellipses are drawn at resolved positions is a frontend concern.
- **SATC (Semi-Automated Track Construction)**: The SATC algorithm is a calculation service concern. SATC outputs will conform to the compound track model.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: TrackFeature supports both LineString (simple) and MultiLineString (compound) geometry with appropriate validation.
- **SC-002**: Segment metadata captures all legacy segment types (TrackSegment, AbsoluteTMA, RelativeTMA, DynamicInfill) with their type-specific properties.
- **SC-003**: Sensor data and sensor contact types capture all domain-relevant fields from the legacy sensor model.
- **SC-004**: TUA data and TUA solution types capture both absolute and relative positioning with optional ellipse parameters.
- **SC-005**: 100% of existing schema adherence tests pass after changes (zero regressions).
- **SC-006**: At least one golden fixture per new structure (compound track, sensors, TUAs) validates correctly.
- **SC-007**: Round-trip serialisation preserves all data for compound TrackFeature instances.
- **SC-008**: Hierarchical kind paths are accepted in selection requirements and backward compatible with existing flat kind values.
- **SC-009**: No new `FeatureKindEnum` values are added — the enum remains unchanged.
