# Feature Specification: Compound Track Model with Embedded Children

**Feature Branch**: `062-compound-track-model`
**Created**: 2026-02-08
**Status**: Draft
**Supersedes**: Original 062-missing-feature-kind-enum-values spec
**Input**: Design discussion concluding that sensors, TUAs, and track segments are structurally part of TrackFeature rather than independent root-level GeoJSON features.

## Background & Design Rationale

The original spec proposed adding 7 new `FeatureKindEnum` values as independent root-level GeoJSON features. Design review revealed this conflicts with the domain model:

- **Sensors** have no independent spatial existence. A bearing-only sensor contact is a ray from the host track's position — the origin is derived from the track at contact time, and the bearing line extends to the viewport edge. Representing sensors as root-level features would require either always bundling the parent track or denormalising track positions into the sensor.

- **TMA segments** (Absolute, Relative, DynamicInfill) and plain **TrackSegments** are not separate features — they are segments that compose the track itself. A track from disparate data sources is inherently multi-segment even without TMA involvement. Legacy Debrief models this as a `SegmentList` containing typed segments within the track.

- **TUAs (Target Uncertainty Areas)** are time-indexed ellipsoidal estimates that derive their position from the host track (especially relative TUAs). Like sensors, they have no independent spatial existence.

- **Frequency residuals** are analysis artefacts stored as separate STAC assets, not GeoJSON features.

- **Lightweight tracks** are dropped — the concept saw limited adoption in legacy Debrief.

- **Zones** are covered by existing annotation types (CIRCLE, RECTANGLE) — no new kind is needed.

The revised approach: **zero new `FeatureKindEnum` values**. Instead, TrackFeature evolves to support compound geometry (MultiLineString) with per-segment metadata, and embedded child arrays (sensors, TUAs) within TrackProperties.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Compound Track Geometry (Priority: P1)

A tool implementer is building track analysis tools that operate on multi-segment tracks. A track may consist of multiple segments from disparate data sources, or a mix of recorded TrackSegments, AbsoluteTMA legs, RelativeTMA legs, and DynamicInfill segments. The schema must support both simple single-segment tracks (LineString) and compound multi-segment tracks (MultiLineString) with per-segment metadata.

**Why this priority**: Multi-segment tracks are fundamental to TMA workflows. Without compound geometry support, no TMA tools can be implemented and tracks from multiple data sources cannot be faithfully represented.

**Independent Test**: Can be tested by creating TrackFeature instances with MultiLineString geometry and a parallel `segments` metadata array, then validating against the generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** a simple single-segment track, **When** represented as a TrackFeature with LineString geometry and a flat `positions` array, **Then** validation passes (backward compatible with existing schema).
2. **Given** a multi-segment track with 3 segments (TrackSegment, AbsoluteTMA, DynamicInfill), **When** represented as a TrackFeature with MultiLineString geometry and `segments[0..2]` metadata, **Then** validation passes with each segment's type, positions, and type-specific properties accepted.
3. **Given** a TrackFeature with MultiLineString geometry, **When** `segments` array length does not match the number of LineStrings in the geometry, **Then** validation fails with a clear error.
4. **Given** a RelativeTMA segment, **When** validated, **Then** the `host_track_id` and `offset` properties are accepted alongside `segment_type`, `course`, and `speed`.

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

A tool implementer needs to represent Target Uncertainty Area solutions within a track. TUAs are time-indexed ellipsoidal estimates with centre position (absolute or relative), orientation, and major/minor axes. They are loaded from TMA_POS or TMA_RB lines in REP files.

**Why this priority**: TUA display and analysis tools require this data. TUAs derive their rendered position from the host track, particularly for relative TUAs where the centre is expressed as bearing/range from ownship.

**Independent Test**: Can be tested by creating a TrackFeature with a `tuas` array containing TUA solution entries, then validating against generated Pydantic models.

**Acceptance Scenarios**:

1. **Given** a TrackFeature with a TUA array containing absolute TUA solutions, **When** validated, **Then** each solution's `time`, `centre` (lat/lon), `orientation`, `maxima`, and `minima` are accepted.
2. **Given** a relative TUA solution with `bearing` and `range` instead of absolute `centre`, **When** validated, **Then** validation passes with the relative positioning fields accepted.
3. **Given** a TUA solution with null ellipse dimensions (orientation, maxima, minima all null), **When** validated, **Then** validation passes — ellipse data is optional per the REP format (NULL values permitted).
4. **Given** a TrackFeature with zero TUAs, **When** validated, **Then** validation passes — TUAs are optional.

---

### User Story 4 — Hierarchical Tool Selection Model (Priority: P2)

A tool designer needs to specify that their tool requires a sensor contact, a track segment, or a TUA as input. The current `SelectionRequirement.kind` field uses flat `FeatureKindEnum` values. With sensors, segments, and TUAs embedded inside tracks, the selection model must support hierarchical kind paths so the presentation layer can derive selectable types from the track's internal structure.

**Why this priority**: Without hierarchical selection, tools cannot target embedded children. This blocks all sensor analysis, TMA manipulation, and TUA analysis tools.

**Independent Test**: Can be tested by defining tools with hierarchical kind requirements and verifying that the selection matching logic correctly identifies applicable tools given a track with embedded children.

**Acceptance Scenarios**:

1. **Given** a tool with requirement `kind: "TRACK.SENSOR"`, **When** a track containing sensors is selected, **Then** the tool is offered as applicable.
2. **Given** a tool with requirement `kind: "TRACK.SENSOR.CONTACT"`, **When** a specific sensor contact within a track is selected (via selection path), **Then** the tool is offered.
3. **Given** a tool with requirement `kind: "TRACK.SEGMENT"` and `segment_type: "ABSOLUTE_TMA"`, **When** a track containing an AbsoluteTMA segment is selected, **Then** the tool is offered.
4. **Given** a tool with requirement `kind: "TRACK"`, **When** a track is selected, **Then** existing track-level tools continue to work (backward compatible).

---

### User Story 5 — Schema Adherence Tests Pass (Priority: P1)

A schema maintainer regenerates derived schemas after adding compound track support. All schema adherence test strategies must pass: golden fixtures validate, round-trip serialisation preserves data, and Pydantic-generated JSON Schema structurally matches LinkML-generated JSON Schema.

**Why this priority**: Schema integrity is a constitutional requirement (Article II). Without passing adherence tests, no schema changes can be merged.

**Acceptance Scenarios**:

1. **Given** the updated schemas and regenerated outputs, **When** golden fixture tests run, **Then** all existing fixtures continue to pass (zero regressions) and new compound track fixtures pass.
2. **Given** a compound TrackFeature with MultiLineString geometry, segments, sensors, and TUAs, **When** round-trip serialised (Python → JSON → TypeScript → JSON → Python), **Then** all data is preserved.
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

- **FR-001**: `TrackFeature.geometry` MUST accept either `GeoJSONLineString` (simple track) or `GeoJSONMultiLineString` (compound track) as a union type.
- **FR-002**: Schema MUST define `GeoJSONMultiLineString` geometry class with `type: "MultiLineString"` and nested coordinate arrays.
- **FR-003**: `TrackProperties` MUST define an optional `segments` array of `SegmentMetadata` objects. When present, geometry MUST be MultiLineString. When absent, geometry MUST be LineString and the existing flat `positions` array is used.
- **FR-004**: `SegmentMetadata` MUST include required properties: `segment_type` (enum), `start_time`, `end_time`, `positions` (array of `TimestampedPosition`).
- **FR-005**: Schema MUST define `SegmentTypeEnum` with values: `TRACK`, `ABSOLUTE_TMA`, `RELATIVE_TMA`, `DYNAMIC_INFILL`.
- **FR-006**: `SegmentMetadata` MUST include optional properties common to all segment types: `name`, `style` (LineProperties).
- **FR-007**: `SegmentMetadata` MUST include optional TMA-specific properties: `course` (degrees), `speed` (knots), `base_frequency` (Hz). These are meaningful for TMA segment types and ignored for plain TRACK segments.
- **FR-008**: `SegmentMetadata` for `RELATIVE_TMA` segments MUST include: `host_track_id` (required — the track this solution is relative to), `host_sensor_name` (optional — towed array origin), `offset_bearing` (degrees), `offset_range` (metres).
- **FR-009**: `SegmentMetadata` for `DYNAMIC_INFILL` segments MUST include: `before_leg` (required — name of preceding TMA leg), `after_leg` (required — name of following TMA leg).
- **FR-010**: The parallel array invariant MUST be enforced: `segments[i].positions.length` corresponds to the number of coordinate pairs in `geometry.coordinates[i]`.

### Functional Requirements — Embedded Sensors

- **FR-011**: `TrackProperties` MUST define an optional `sensors` array of `SensorData` objects.
- **FR-012**: `SensorData` MUST include required properties: `name` (string).
- **FR-013**: `SensorData` MUST include optional properties: `base_frequency` (Hz), `offset` (sensor offset distance from host platform, in metres), `worm_in_hole` (boolean — display mode).
- **FR-014**: `SensorData` MUST include a `contacts` array of `SensorContact` objects.
- **FR-015**: `SensorContact` MUST include required properties: `time` (datetime), `bearing` (degrees 0–360).
- **FR-016**: `SensorContact` MUST include optional properties: `range` (metres), `frequency` (Hz), `ambiguous_bearing` (degrees 0–360), `label` (string), `comment` (string).
- **FR-017**: Sensors have no independent geometry. Rendering (origin position from host track at contact time, bearing line to viewport edge) is a presentation concern, not a schema concern.

### Functional Requirements — Embedded TUAs

- **FR-018**: `TrackProperties` MUST define an optional `tuas` array of `TUAData` objects. Each `TUAData` entry represents a named collection of TUA solutions (paralleling the legacy `tma` type which groups `tma_solution` elements).
- **FR-019**: `TUAData` MUST include required properties: `name` (string), `host_track_name` (string — the track this TUA set relates to).
- **FR-020**: `TUAData` MUST include a `solutions` array of `TUASolution` objects.
- **FR-021**: `TUASolution` MUST include required properties: `time` (datetime), `label` (string).
- **FR-022**: `TUASolution` MUST include optional absolute positioning: `centre_lat` (degrees), `centre_lon` (degrees).
- **FR-023**: `TUASolution` MUST include optional relative positioning: `bearing` (degrees), `range` (metres). Relative positioning is resolved against the host track's position at solution time.
- **FR-024**: `TUASolution` MUST include optional ellipse properties: `orientation` (degrees from north), `maxima` (metres — semi-major axis), `minima` (metres — semi-minor axis). All three may be null when ellipse data is unavailable.
- **FR-025**: `TUASolution` MUST include optional properties: `course` (degrees), `speed` (knots), `depth` (metres).
- **FR-026**: TUAs have no independent geometry. Rendering (ellipse at resolved position) is a presentation concern.

### Functional Requirements — Hierarchical Tool Selection

- **FR-027**: `SelectionRequirement.kind` MUST accept dot-delimited hierarchical kind paths (e.g., `TRACK.SENSOR`, `TRACK.SENSOR.CONTACT`, `TRACK.SEGMENT`).
- **FR-028**: The presentation layer MUST derive selectable types from track structure — when a track contains sensors, the selection model must expose `TRACK.SENSOR` as a matchable kind.
- **FR-029**: Existing flat kind values (e.g., `TRACK`, `POINT`, `CIRCLE`) MUST continue to work unchanged.
- **FR-030**: `SelectionRequirement` for `TRACK.SEGMENT` MAY include an optional `segment_type` filter to match specific segment types.

### Functional Requirements — Schema Integrity

- **FR-031**: All new and modified types MUST follow LinkML schema-first development. Pydantic models, JSON Schema, and TypeScript types are generated from LinkML.
- **FR-032**: Derived schemas MUST be regenerated after changes.
- **FR-033**: All existing schema adherence tests MUST continue to pass (zero regressions).
- **FR-034**: New golden fixture files MUST be created for: simple track (LineString, backward compatible), compound track (MultiLineString with mixed segment types), track with sensors, track with TUAs, track with all embedded children.

### Key Entities

- **GeoJSONMultiLineString**: GeoJSON MultiLineString geometry. Each LineString represents one track segment. Added to `geojson.yaml`.

- **SegmentMetadata**: Per-segment metadata for compound tracks. Contains segment type discriminator, temporal extent, positions array, and type-specific properties (TMA course/speed, relative offset, infill leg references). Added to `geojson.yaml`.

- **SegmentTypeEnum**: Discriminator for track segment types: `TRACK`, `ABSOLUTE_TMA`, `RELATIVE_TMA`, `DYNAMIC_INFILL`. Added to `common.yaml`.

- **SensorData**: A named sensor with metadata and an array of contacts. Embedded within `TrackProperties.sensors`. Contains sensor name, optional base frequency, optional offset, and contacts array. Added to `geojson.yaml` or a new `sensors.yaml`.

- **SensorContact**: A single sensor measurement. Contains time, bearing (required), and optional range, frequency, ambiguous bearing, label, comment. Added alongside `SensorData`.

- **TUAData**: A named collection of TUA solutions associated with a host track. Embedded within `TrackProperties.tuas`. Added to `geojson.yaml` or a new `tua.yaml`.

- **TUASolution**: A single TUA estimate at a point in time. Contains time, label, positioning (absolute or relative), optional ellipse parameters, and optional kinematic estimates. Added alongside `TUAData`.

### Assumptions

- **Geometry union on TrackFeature**: LinkML's `any_of` construct or equivalent will be used to allow TrackFeature.geometry to accept either LineString or MultiLineString. If LinkML does not cleanly support this, an abstract geometry base or runtime validation will be used.
- **Parallel array enforcement**: The coordinate-count / positions-count invariant is documented as a schema constraint. If LinkML cannot express cross-field cardinality rules, enforcement will be in Pydantic validators and tested via golden fixtures.
- **No changes to FeatureKindEnum**: No new enum values are added. All new concepts are embedded within TrackFeature.
- **Schema file organisation**: New types may be added to existing files (`geojson.yaml`, `common.yaml`) or to new module files (`sensors.yaml`, `tua.yaml`) imported by `debrief.yaml`, following whichever approach keeps files at a manageable size.
- **TUA positioning modes**: A TUASolution has either absolute positioning (centre_lat/centre_lon) or relative positioning (bearing/range), never both. This is a logical constraint documented in the schema description; structural enforcement depends on LinkML capabilities.
- **Backward compatibility**: Existing simple TrackFeature instances with LineString geometry and flat `positions` array remain valid. The compound model is purely additive.

### Dependencies

- Existing schema infrastructure (LinkML, Pydantic, JSON Schema, TypeScript generators) must be functional.
- Feature 053 (hierarchical selection paths) provides the selection path mechanism that the hierarchical tool selection model builds upon.
- Existing golden I/O fixtures in `shared/tools/` must not be broken by the changes.

### Items Out of Scope

- **Frequency residuals**: These are STAC assets (separate documents), not GeoJSON features. They will be addressed in a separate STAC asset management spec.
- **Lightweight tracks**: Dropped. The concept saw limited adoption in legacy Debrief and will be revisited with a simpler UI-focused approach if the need arises.
- **Zones**: Existing annotation types (CIRCLE, RECTANGLE) cover the zone use case. No new `FeatureKindEnum` value is needed.
- **Sensor rendering logic**: How bearing lines are drawn from host track position to viewport edge is a frontend/rendering concern, not a schema concern.
- **TUA rendering logic**: How ellipses are drawn at resolved positions is a frontend/rendering concern.
- **SATC (Semi-Automated Track Construction)**: The SATC algorithm and its contribution model are a debrief-calc concern, not a schema concern. SATC outputs will conform to the compound track model (producing segments of type ABSOLUTE_TMA or TRACK).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: TrackFeature supports both LineString (simple) and MultiLineString (compound) geometry with appropriate validation.
- **SC-002**: `SegmentMetadata` captures all legacy segment types (TrackSegment, AbsoluteTMASegment, RelativeTMASegment, DynamicInfillSegment) with their type-specific properties.
- **SC-003**: `SensorData` and `SensorContact` capture all domain-relevant fields from the legacy `sensor` and `sensor_contact` XSD types.
- **SC-004**: `TUAData` and `TUASolution` capture both absolute and relative TUA positioning with optional ellipse parameters.
- **SC-005**: 100% of existing schema adherence tests pass after changes (zero regressions).
- **SC-006**: At least one golden fixture per new structure (compound track, sensors, TUAs) validates correctly.
- **SC-007**: Round-trip serialisation preserves all data for compound TrackFeature instances.
- **SC-008**: Hierarchical kind paths are accepted in `SelectionRequirement.kind` and backward compatible with existing flat kind values.
- **SC-009**: No new `FeatureKindEnum` values are added — the enum remains unchanged.
