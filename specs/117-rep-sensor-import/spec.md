# Feature Specification: REP Sensor Import

**Feature Branch**: `117-rep-sensor-import`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "[E07] REP sensor import -- SENSOR v1/v2/v3 and SENSORARC parsers in debrief-io (requires #116)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - SENSOR v1 lines produce embedded sensor contacts on tracks (Priority: P1)

An analyst loads a REP file containing `;SENSOR:` lines alongside regular track position lines. After import, each track feature has a `sensors` array in its properties. Sensor contacts with the same sensor name on the same track are merged into a single SensorData entry. Each contact carries the parsed bearing, range, color (from symbology code), label, and timestamp. When the location is explicitly provided (DMS coordinates), the contact's origin field is populated. When the location is NULL, the origin is left empty (derived at render time from the host track).

**Why this priority**: SENSOR v1 is the most common sensor format in legacy REP files and establishes the fundamental parsing-to-embedded-schema pipeline. All other sensor formats (v2, v3, arc) extend this foundation. Without v1 working, nothing downstream can be validated.

**Independent Test**: Can be fully tested by creating a REP file with track positions and `;SENSOR:` lines, running it through the parser, and asserting that the output TrackFeature GeoJSON contains the correct `properties.sensors[]` array with properly structured SensorContact objects matching the #116 schema.

**Acceptance Scenarios**:

1. **Given** a REP file with track positions for "NELSON" and three `;SENSOR:` lines referencing "NELSON" with sensor name "TOWED_ARRAY", **When** the file is parsed, **Then** the NELSON TrackFeature has `properties.sensors` containing one SensorData entry named "TOWED_ARRAY" with 3 contacts.
2. **Given** a `;SENSOR:` line with explicit DMS coordinates (non-NULL location), **When** parsed, **Then** the resulting SensorContact has its `origin` field set to `[longitude, latitude]` in GeoJSON coordinate order.
3. **Given** a `;SENSOR:` line with NULL location, **When** parsed, **Then** the resulting SensorContact has a null/absent `origin` field (position will be derived from the host track at render time).
4. **Given** a `;SENSOR:` line with symbology code `@C` (Red), **When** parsed, **Then** the parent SensorData's color is set to the corresponding CSS hex value from the symbology table.
5. **Given** a `;SENSOR:` line with a quoted track name (e.g., `"NEL STYLE"`), **When** parsed, **Then** the contact is correctly associated with the track whose platform_id matches the quoted name.
6. **Given** a `;SENSOR:` line with range in yards, **When** parsed, **Then** the range value is converted to metres before being stored in the SensorContact (matching the schema's metres convention).

---

### User Story 2 - SENSOR2 lines add ambiguous bearing and frequency data (Priority: P1)

An analyst loads a REP file containing `;SENSOR2:` lines. After import, the resulting sensor contacts include ambiguous bearing and frequency fields in addition to the primary bearing and range. The `has_ambiguous` and `has_frequency` boolean flags are set based on whether valid values (non-NULL/NAN) were provided in the REP line.

**Why this priority**: SENSOR2 is the second most common format and introduces the two fields critical for downstream analysis (ambiguity resolution and Doppler processing). Without ambiguous bearing support, the entire bearing residual and TMA pipeline (Phases 5-7) lacks input data.

**Independent Test**: Can be fully tested by creating a REP file with `;SENSOR2:` lines containing various combinations of valid and NULL ambiguous bearings and frequencies, parsing the file, and asserting the correct presence/absence of fields and boolean flags on each SensorContact.

**Acceptance Scenarios**:

1. **Given** a `;SENSOR2:` line with a valid ambiguous bearing (e.g., 240.5) and frequency (e.g., 169.4), **When** parsed, **Then** the SensorContact has `ambiguous_bearing=240.5`, `has_ambiguous=true`, `frequency=169.4`, and `has_frequency=true`.
2. **Given** a `;SENSOR2:` line with NULL ambiguous bearing and NULL frequency, **When** parsed, **Then** the SensorContact has `ambiguous_bearing` absent/null, `has_ambiguous=false`, `frequency` absent/null, and `has_frequency=false`.
3. **Given** multiple `;SENSOR2:` lines with the same track name and sensor name, **When** parsed, **Then** all contacts are merged into one SensorData entry on the correct track, ordered by timestamp.

---

### User Story 3 - SENSOR3 lines are parsed with accuracy fields gracefully ignored (Priority: P2)

An analyst loads a REP file containing `;SENSOR3:` lines. These lines extend the SENSOR2 format with bearing accuracy and frequency accuracy fields. The parser extracts all SENSOR2 fields and gracefully skips the accuracy fields (which are parsed but not stored, matching the legacy Debrief behavior and the #116 schema decision to defer accuracy fields).

**Why this priority**: SENSOR3 is used in multi-static sonar scenarios and newer datasets. While the accuracy fields themselves are deferred, the parser must not choke on SENSOR3 lines. Without this, REP files containing SENSOR3 data would produce warnings or fail to import entirely.

**Independent Test**: Can be fully tested by creating a REP file with `;SENSOR3:` lines (including bearing accuracy and frequency accuracy values), parsing the file, and asserting that the resulting SensorContacts have all SENSOR2-equivalent fields correctly populated and that no warnings are produced for the accuracy fields.

**Acceptance Scenarios**:

1. **Given** a `;SENSOR3:` line with bearing accuracy (e.g., 5.0) and frequency accuracy (e.g., 2.0), **When** parsed, **Then** the SensorContact is created with bearing, range, ambiguous_bearing, and frequency correctly populated, and the accuracy values are silently discarded.
2. **Given** a `;SENSOR3:` line with NULL accuracy fields, **When** parsed, **Then** the SensorContact is identical to what a corresponding `;SENSOR2:` line would produce.
3. **Given** a REP file mixing `;SENSOR:`, `;SENSOR2:`, and `;SENSOR3:` lines for the same track and sensor name, **When** parsed, **Then** all contacts are merged into a single SensorData entry regardless of which format version was used.

---

### User Story 4 - SENSORARC lines produce coverage annotations on tracks (Priority: P2)

An analyst loads a REP file containing `;SENSORARC` lines. Each SENSORARC defines a time-bounded arc coverage area around a track, with left/right angular bounds and inner/outer range bounds. After import, these are stored as DynamicTrackCoverage annotations associated with the parent track, not as SensorContact entries.

**Why this priority**: Sensor arcs represent a fundamentally different data type from bearing contacts. They define coverage zones rather than point observations. The rendering pipeline (Phase 3, #118) needs this data to draw fan/wedge shapes. However, they are less common in typical REP files than SENSOR/SENSOR2 lines, hence P2.

**Independent Test**: Can be fully tested by creating a REP file with `;SENSORARC` lines, parsing the file, and asserting that the output contains properly structured coverage annotations with the correct track association, time bounds, angular bounds, and range bounds.

**Acceptance Scenarios**:

1. **Given** a `;SENSORARC` line with start/end timestamps, track name, left angle 270, right angle 90, inner range 0, and outer range 5000, **When** parsed, **Then** a DynamicTrackCoverage annotation is created with the correct time bounds, angular bounds, and range bounds.
2. **Given** a `;SENSORARC` line referencing track "FRIGATE", **When** parsed, **Then** the resulting coverage annotation has its track association set to "FRIGATE".
3. **Given** a `;SENSORARC` line, **When** parsed, **Then** no SensorContact is created (coverage arcs are annotations, not contacts).

---

### User Story 5 - NULL and NAN bearing values produce contacts with has_bearing=false (Priority: P1)

An analyst loads a REP file containing sensor lines where the bearing field is NULL or NAN. These represent frequency-only observations (no bearing data available). After import, the resulting SensorContacts have `has_bearing=false` and a bearing value of 0 (or the sentinel value), indicating that the bearing data should not be displayed but the contact record still exists.

**Why this priority**: Frequency-only contacts are common in passive sonar datasets and are critical input for Doppler analysis (Phase 5). If the parser rejects or mishandles NULL/NAN bearings, these observations are silently lost.

**Independent Test**: Can be fully tested by creating sensor lines with NULL and NAN bearing values, parsing them, and verifying that `has_bearing` is false and the contact is otherwise correctly populated.

**Acceptance Scenarios**:

1. **Given** a `;SENSOR:` line with bearing value "NULL", **When** parsed, **Then** the SensorContact has `has_bearing=false` and `bearing=0`.
2. **Given** a `;SENSOR2:` line with bearing value "NAN", **When** parsed, **Then** the SensorContact has `has_bearing=false` and `bearing=0`.
3. **Given** a sensor line with a valid bearing of 0.0 (true north), **When** parsed, **Then** the SensorContact has `has_bearing=true` and `bearing=0.0` (zero is a valid bearing, not a sentinel).

---

### User Story 6 - Refactoring existing annotation builders to embed in tracks (Priority: P1)

The existing annotation system in debrief-io handles `;SENSOR:` and `;SENSOR2:` lines by creating standalone GeoJSON features with `kind: "SENSOR"` or `kind: "SENSOR2"`. This approach must be refactored so that sensor lines are no longer treated as standalone annotations. Instead, the parser must collect sensor data during the parsing pass, then embed the parsed sensors into the parent TrackFeature's `properties.sensors[]` array using the schema types defined in #116.

**Why this priority**: The current standalone-feature approach contradicts the architectural decision that sensors are embedded in tracks. Until this refactoring is complete, no sensor data flows through the correct schema pipeline. This is a prerequisite for all other user stories.

**Independent Test**: Can be fully tested by parsing a REP file that produces both track features and sensor data, then verifying that (a) no standalone SENSOR/SENSOR2 features appear in the output, (b) sensor data appears under the correct TrackFeature's `properties.sensors[]`, and (c) the embedded data conforms to the SensorData/SensorContact schema from #116.

**Acceptance Scenarios**:

1. **Given** a REP file with track positions and `;SENSOR:` lines, **When** parsed, **Then** the output contains zero features with `kind: "SENSOR"` or `kind: "SENSOR_CONTACT"` (no standalone sensor features).
2. **Given** a REP file with sensors for track "NELSON", **When** parsed, **Then** the TrackFeature for "NELSON" has a `properties.sensors` array with the correct SensorData entries.
3. **Given** a REP file with sensor lines referencing a track name that has no position data in the file, **When** parsed, **Then** a warning is emitted indicating the orphaned sensor data and the contacts are not silently discarded.

---

### Edge Cases

- What happens when a `;SENSOR:` line references a track name not present in the REP file? A warning is emitted and the sensor data is either attached to an auto-created minimal track entry or collected as orphaned data (depending on whether other format handlers might provide the track).
- How does the system handle a bearing value of exactly 360? It is treated as valid (equivalent to 0 degrees), matching the #116 schema constraint of 0-360 inclusive.
- What happens when range is provided in yards (legacy `;SENSOR:` format) vs. metres? The parser converts yards to metres (1 yard = 0.9144 metres) before storing in the SensorContact, since the schema uses metres.
- What happens when the same sensor name appears on different `;SENSOR:` and `;SENSOR2:` lines for the same track? All contacts are merged into a single SensorData entry regardless of which format version produced them.
- How does the system handle DMS coordinates with negative degrees? Negative degrees in DMS are valid (the parser already handles this via hemisphere indicators N/S/E/W).
- What happens when a `;SENSORARC` line has inner range equal to outer range? The arc is accepted as a zero-width ring (degenerate but valid).
- What happens when sensor lines appear in the file before the track position lines they reference? The parser processes all lines first, then associates sensors with tracks, so ordering does not matter.
- How does the system handle a `;SENSOR3:` line with bearing accuracy and frequency accuracy set to NULL? The accuracy fields are silently ignored regardless of their value (NULL, valid float, or NAN).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse `;SENSOR:` (v1) lines from REP files, extracting timestamp, track name (quoted or unquoted), symbology code, optional DMS coordinates (or NULL), bearing, range, sensor name, and free-text label
- **FR-002**: System MUST parse `;SENSOR2:` (v2) lines from REP files, extracting all v1 fields plus ambiguous bearing and frequency (which may be NULL)
- **FR-003**: System MUST parse `;SENSOR3:` (v3) lines from REP files, extracting all v2 fields plus bearing accuracy and frequency accuracy, silently discarding the accuracy values (not stored per #116 decision)
- **FR-004**: System MUST parse `;SENSORARC` lines from REP files, extracting start/end timestamps, track name, left/right arc angles, and inner/outer range bounds
- **FR-005**: System MUST embed parsed sensor contacts into the parent TrackFeature's `properties.sensors[]` array as SensorData/SensorContact objects conforming to the #116 schema
- **FR-006**: System MUST merge contacts with the same sensor name on the same track into a single SensorData entry
- **FR-007**: System MUST convert symbology color codes (A-Q) to CSS hex color values and assign them to the SensorData's color property
- **FR-008**: System MUST handle NULL and NAN bearing values by creating contacts with `has_bearing=false` and `bearing=0`
- **FR-009**: System MUST convert range values from yards (legacy `;SENSOR:` format) to metres before storing in SensorContact
- **FR-010**: System MUST populate the SensorContact `origin` field with `[longitude, latitude]` when explicit DMS coordinates are provided in the sensor line, and leave it null when the location is NULL
- **FR-011**: System MUST store SENSORARC data as DynamicTrackCoverage annotations associated with the parent track, not as SensorContact entries
- **FR-012**: System MUST set boolean presence flags (`has_bearing`, `has_ambiguous`, `has_frequency`) based on whether valid (non-NULL/NAN) values were provided in the source line
- **FR-013**: System MUST emit a warning when sensor lines reference a track name that has no track position data in the same file
- **FR-014**: System MUST refactor existing standalone sensor annotation builders (`build_sensor`, `build_sensor2`) to produce embedded sensor data instead of standalone GeoJSON features
- **FR-015**: System MUST order contacts within each SensorData entry by timestamp
- **FR-016**: System MUST handle all four sensor line formats within a single file, merging contacts from `;SENSOR:`, `;SENSOR2:`, and `;SENSOR3:` into the same SensorData entries when sensor names match
- **FR-017**: System MUST preserve the free-text label from sensor lines in the SensorContact `label` field
- **FR-018**: System MUST record provenance information linking each imported sensor contact back to the source REP file and line number

### Key Entities

- **SensorContact**: A single sensor observation parsed from a `;SENSOR:`, `;SENSOR2:`, or `;SENSOR3:` line. Contains timestamp, bearing, optional range/frequency/ambiguous bearing, display flags, optional explicit origin, and label. Conforms to the schema defined in #116.
- **SensorData**: A named sensor instrument (e.g., "TOWED_ARRAY") containing an ordered collection of SensorContacts parsed from multiple REP lines. Embedded in `TrackFeature.properties.sensors[]`. Color derived from the symbology code of the first contact parsed for that sensor.
- **DynamicTrackCoverage**: A time-bounded arc coverage zone parsed from a `;SENSORARC` line. Defines angular bounds (left/right) and range bounds (inner/outer) around a track. Stored as an annotation feature, not as a sensor contact.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four REP sensor line formats (`;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, `;SENSORARC`) are successfully parsed with zero data loss for their respective fields
- **SC-002**: Parsed sensor contacts are embedded in the correct TrackFeature's `properties.sensors[]` array and validate against the #116 SensorData/SensorContact schema
- **SC-003**: 100% of contacts with the same sensor name on the same track are merged into a single SensorData entry
- **SC-004**: NULL/NAN bearing values produce contacts with `has_bearing=false` and no parser errors or warnings
- **SC-005**: Existing REP files that previously produced standalone SENSOR/SENSOR2 annotation features now produce embedded sensor data with zero standalone sensor features in the output
- **SC-006**: Range values are correctly converted from yards to metres within 0.01% precision
- **SC-007**: SENSORARC lines produce DynamicTrackCoverage annotations (not SensorContacts) with correct track association, time bounds, and angular/range bounds
- **SC-008**: REP files containing a mix of track positions, annotations, and all four sensor formats parse in under 1 second for files up to 10,000 lines
- **SC-009**: The parser produces meaningful warnings (not errors) for sensor lines referencing tracks not present in the file

## Assumptions

- The SensorData and SensorContact schemas from #116 are complete and available before implementation of this feature begins.
- Range values in `;SENSOR:` (v1) lines are in yards, matching the legacy ImportSensor.java implementation. `;SENSOR2:` and `;SENSOR3:` range values are also in yards.
- The `;SENSORARC` range values (inner/outer) are in metres, matching the legacy ImportSensorArc.java implementation.
- Symbology-to-color mapping follows the existing `symbology.py` module's COLOR_MAP (A=Blue, B=Green, C=Red, etc.), with '@' prefix stripped before lookup.
- A single SensorData's color is derived from the symbology code of the first `;SENSOR:` line parsed for that sensor name on that track. Subsequent lines for the same sensor do not override the color.
- The existing `parse_timestamp` and `parse_dms_coordinate` utility functions in the REP handler are reusable for sensor line parsing.
- Quoted track names in `;SENSOR:` lines use double quotes (e.g., `"NEL STYLE"`). `;SENSOR2:` and `;SENSOR3:` track names are unquoted.
- The parser processes all lines in a single pass, accumulating sensor data in memory, then attaches sensors to tracks after all lines are processed.

## Dependencies

- **#116 Sensor Schema Overhaul (in progress)**: Defines the SensorData, SensorContact, MeasuredArrayPosition schemas and enumerations (ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum) that parsed sensor data must conform to. This feature cannot be implemented until #116 is merged.
- **#062 Compound Track Model (complete)**: Provides the TrackFeature structure with `properties.sensors[]` embedding location.

## Out of Scope

- Sensor rendering on map (Phase 3, #118)
- Array offset calculations (Phase 4, #119) -- only the `origin` field from explicit coordinates is set; calculated origins from array offset modes are a runtime concern
- Bearing/frequency accuracy storage -- SENSOR3 accuracy fields are parsed but discarded per #116 decision
- REP export of sensor data -- REP is import-only
- TMA line parsing (`;TMA_POS:`, `;TMA_RB:`) -- separate feature
- Measured array position import -- measured positions are not present in REP format; they come from other data sources
- Sensor display property import beyond color -- line_style, label_location, put_label_at, line_thickness, and show_label are not present in REP format lines; they are set through the UI or other configuration mechanisms
