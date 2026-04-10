# Feature Specification: Sensor Schema Overhaul

**Feature Branch**: `116-sensor-schema-overhaul`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Full SensorContact/SensorData redesign with display properties, array offset modes, measured positions; update 9 tool spec fixtures"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full-fidelity sensor data round-trips through the system (Priority: P1)

A developer loads a track fixture containing a towed array sensor with contacts that include bearings, ambiguous bearings, frequencies, ranges, display properties (color, visibility, line style, label placement), and an explicit sensor origin override. The data is validated by the Python schema layer, serialized to JSON, deserialized by the TypeScript schema layer, re-serialized back to JSON, and re-loaded into Python. Every field value is identical after the full round trip.

**Why this priority**: This is the foundational capability. If the schema cannot faithfully represent and round-trip all legacy sensor data fields, every downstream phase (import, rendering, analysis, TMA) is blocked. The schema is the single source of truth for the entire sensor pipeline.

**Independent Test**: Can be fully tested by creating a fixture file with all SensorContact and SensorData fields populated, running it through the Python-JSON-TypeScript-JSON-Python round-trip pipeline, and asserting field-level equality at each stage.

**Acceptance Scenarios**:

1. **Given** a JSON fixture with a track containing a sensor with all optional fields populated (color, line_style, label_location, put_label_at, visible, show_label, origin), **When** the fixture is validated by the Python schema layer, **Then** all fields are correctly parsed with proper types and constraints.
2. **Given** a valid Python SensorData model, **When** serialized to JSON and deserialized in TypeScript, **Then** all fields (including nested contacts and measured_positions) are present with correct values.
3. **Given** a TypeScript SensorData object, **When** serialized to JSON and re-loaded in Python, **Then** field values match the original model exactly.
4. **Given** a fixture with only required fields (time, bearing for contacts; name, contacts for sensors), **When** validated, **Then** optional fields default correctly (visible=true, has_bearing=true, show_label=false) and absent fields are null/undefined.

---

### User Story 2 - Display properties persist with sensor data across save/load cycles (Priority: P1)

An analyst customizes sensor display settings: sets the sensor color to red, changes bearing line style to dashed, places labels at the end of bearing lines aligned right, and hides specific contacts. After saving the plot and reopening it later, all display customizations are preserved exactly as configured.

**Why this priority**: Display properties are a critical gap in the current schema. Without them, any visual customization is lost on save/reload, which is a fundamental usability failure for analysts who spend significant time configuring displays. This directly enables Phase 3 (rendering).

**Independent Test**: Can be fully tested by setting display properties on sensor data, saving to a STAC Item, loading the STAC Item back, and verifying all display properties match.

**Acceptance Scenarios**:

1. **Given** a SensorData object with color="#FF0000", visible=true, line_thickness=3, **When** persisted as a STAC Item and reloaded, **Then** all SensorData-level display properties are preserved.
2. **Given** a SensorContact with color="#00FF00" (override), line_style=DASHED, label_location=RIGHT, put_label_at=END, visible=false, show_label=true, **When** persisted and reloaded, **Then** all contact-level display properties are preserved.
3. **Given** a SensorContact with no color set (null), **When** the system needs to determine its color, **Then** the contact inherits color from its parent SensorData (color inheritance pattern from legacy).

---

### User Story 3 - Array centre modes are captured in the schema (Priority: P1)

A developer configures a towed array sensor with array_centre_mode set to MEASURED and provides a time-series of measured array positions. The schema validates the measured_positions array, enforces required fields (time, latitude, longitude), and round-trips the full configuration. A second sensor with array_centre_mode=WORM and no measured_positions also validates correctly.

**Why this priority**: Array centre modes directly affect where bearing lines originate. The schema must capture the mode and any associated data (measured positions) so that Phase 4 (array offset calculations) can compute correct origins. Without this, bearing line rendering in Phase 3 would always use the platform position, which is incorrect for towed arrays.

**Independent Test**: Can be fully tested by creating fixtures with each array_centre_mode (PLAIN, WORM, MEASURED), validating them, and verifying that measured_positions is accepted for all modes.

**Acceptance Scenarios**:

1. **Given** a SensorData with array_centre_mode=MEASURED and three measured_positions entries, **When** validated, **Then** the model accepts it and all positions are parsed with correct time, latitude, and longitude.
2. **Given** a SensorData with array_centre_mode=PLAIN and no measured_positions, **When** validated, **Then** the model accepts it (measured_positions not required for PLAIN/WORM).
3. **Given** a SensorData with array_centre_mode=MEASURED but no measured_positions, **When** validated, **Then** the model still accepts it (measured positions may be provided later; fallback to PLAIN is a runtime behavior, not a schema constraint).

---

### User Story 4 - Tool spec fixtures updated to match new schema (Priority: P2)

A developer running the existing 9 sensor tool spec golden example tests sees all tests pass after the schema overhaul. The tool input/output fixtures reference the expanded SensorContact and SensorData shapes (with display properties, boolean presence flags, and array centre mode) so that downstream tool implementations will produce schema-compliant outputs.

**Why this priority**: The 9 sensor tool specs define the contract for future tool implementations. If their fixtures still reference the old (incomplete) schema, tool authors will build against the wrong contract, creating rework when the schema is eventually updated. Updating fixtures now ensures a single, consistent schema contract.

**Independent Test**: Can be fully tested by running the fixture validation suite against all sensor tool golden examples and verifying zero validation errors.

**Acceptance Scenarios**:

1. **Given** the updated SensorContact schema with new fields, **When** each of the 9 sensor tool spec input/output fixtures is validated, **Then** all fixtures pass schema validation.
2. **Given** a tool spec fixture that previously used only bearing and range, **When** updated, **Then** it includes relevant new fields (has_bearing, visible, etc.) where they affect the tool's behavior, and omits them where they do not.
3. **Given** all 9 tool spec fixtures are updated, **When** the golden example test suite runs, **Then** zero validation errors occur.

---

### User Story 5 - Golden fixtures validate schema correctness for new fields and enums (Priority: P2)

A developer adds an invalid enum value to the schema. The invalid golden fixture catches the regression by failing validation. Conversely, the valid golden fixtures confirm that all legitimate combinations of new fields (enums, booleans, nested measured positions) are accepted.

**Why this priority**: Golden fixtures are the project's primary safety net for schema changes (per Constitution Art. II). Without comprehensive valid/invalid fixtures for the new fields, regressions in later phases may go undetected until they cause runtime failures.

**Independent Test**: Can be fully tested by running the fixture validation suite against all golden fixtures in the fixtures directory and verifying that valid fixtures pass and invalid fixtures fail with the expected errors.

**Acceptance Scenarios**:

1. **Given** a valid fixture with all new enum values (ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum), **When** validated, **Then** it passes.
2. **Given** an invalid fixture with an out-of-range enum value (e.g., array_centre_mode="INVALID"), **When** validated, **Then** it fails with a clear validation error.
3. **Given** an invalid fixture where bearing is outside 0-360, **When** validated, **Then** it fails (existing constraint preserved).
4. **Given** a valid fixture with a minimal SensorContact (only time and bearing), **When** validated, **Then** it passes with all optional fields absent.

---

### Edge Cases

- What happens when a SensorContact has has_bearing=false but a bearing value is present? The schema accepts this — the flag controls display behavior, not data presence (legacy stores the raw value regardless).
- How does the system handle a bearing of exactly 0 or exactly 360? Both are valid (0 and 360 represent the same direction; legacy accepts both).
- What happens when measured_positions is an empty array? The schema accepts this (array may be populated later).
- What happens when origin is provided as [lon, lat] on a SensorContact that also has a parent sensor with array offset? The explicit origin takes precedence (matching legacy `_absoluteOrigin` behavior); this is a runtime decision, not a schema constraint.
- How are contacts ordered when times are identical? The schema accepts duplicate timestamps (ordering is by insertion order; legacy allowed same-time contacts from different operators).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a SensorContact schema with required fields: time (datetime, ISO8601) and bearing (float, 0-360 degrees)
- **FR-002**: System MUST define optional SensorContact data fields: has_bearing (boolean, default true), ambiguous_bearing (float, 0-360), has_ambiguous (boolean), range (float, metres, >=0), frequency (float, Hz), has_frequency (boolean), label (string), comment (string)
- **FR-003**: System MUST define SensorContact display properties: color (string, nullable for inheritance), visible (boolean, default true), show_label (boolean, default false), line_style (enum: SOLID, DASHED, DOT, DASH_DOT), label_location (enum: LEFT, CENTER, RIGHT), put_label_at (enum: START, MIDDLE, END)
- **FR-004**: System MUST define an optional SensorContact origin field as a coordinate pair [longitude, latitude] that overrides the calculated sensor position
- **FR-005**: System MUST define a SensorData schema with required fields: name (string) and contacts (array of SensorContact)
- **FR-006**: System MUST define optional SensorData fields: base_frequency (float, Hz), offset (float, metres), array_centre_mode (enum: PLAIN, WORM, MEASURED), worm_in_hole (boolean, default false), color (string), visible (boolean, default true), line_thickness (integer)
- **FR-007**: System MUST define an optional SensorData measured_positions field as an array of MeasuredArrayPosition records
- **FR-008**: System MUST define a MeasuredArrayPosition schema with required fields: time (datetime), latitude (float), longitude (float)
- **FR-009**: System MUST define four new enumerations: ArrayCentreModeEnum (PLAIN, WORM, MEASURED), LineStyleEnum (SOLID, DASHED, DOT, DASH_DOT), LabelLocationEnum (LEFT, CENTER, RIGHT), LineLabelPositionEnum (START, MIDDLE, END)
- **FR-010**: System MUST generate validated models, portable schema definitions, and typed interfaces from the updated master schema definitions
- **FR-011**: System MUST provide golden fixtures (valid and invalid) that exercise all new fields, enums, and edge cases
- **FR-012**: System MUST pass round-trip tests: Python to JSON to TypeScript to JSON to Python with zero data loss for all sensor fields
- **FR-013**: System MUST update all 9 existing sensor tool spec fixtures to reference the new SensorContact and SensorData shapes
- **FR-014**: System MUST preserve backward compatibility for existing valid fixtures (fixtures with only the previously-defined fields must continue to validate)

### Key Entities

- **SensorContact**: A single sensor observation at a point in time, capturing bearing, optional range/frequency, ambiguity data, operator notes, and per-contact display properties. Belongs to exactly one SensorData parent.
- **SensorData**: A named sensor instrument (e.g., "TOWED_ARRAY") attached to a track, containing configuration (offset, array centre mode, base frequency), default display properties, and an ordered collection of SensorContacts.
- **MeasuredArrayPosition**: A timestamped geographic position recording the actual location of a towed array centre, used by the MEASURED array centre mode for interpolation.
- **ArrayCentreModeEnum**: Determines how the bearing line origin is calculated relative to the host platform: PLAIN (simple backtrack), WORM (follow track path), MEASURED (use actual position data).
- **LineStyleEnum**: Visual style for bearing lines: SOLID, DASHED, DOT, DASH_DOT.
- **LabelLocationEnum**: Horizontal alignment of contact labels: LEFT, CENTER, RIGHT.
- **LineLabelPositionEnum**: Position along the bearing line where the label is placed: START (origin), MIDDLE, END (far end).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All fields from the legacy SensorContactWrapper (16 fields) and SensorWrapper (10 fields) are represented in the new schema, plus MeasuredArrayPosition (3 fields)
- **SC-002**: Round-trip tests pass with 100% field preservation across Python-JSON-TypeScript-JSON-Python for a comprehensive fixture exercising all fields
- **SC-003**: At least 3 valid and 3 invalid golden fixtures are created covering new fields, enums, and edge cases
- **SC-004**: All 9 sensor tool spec fixture files (across analysis, calibration, and detection categories) pass schema validation after updates
- **SC-005**: Generated types are produced without manual intervention from the updated master schema definitions
- **SC-006**: Existing valid sensor fixtures continue to validate without modification (backward compatibility)
- **SC-007**: Schema adherence test suite completes with zero failures after the overhaul

## Assumptions

- The compound track model (#062) is complete and SensorData continues to be embedded under `track.properties.sensors[]` — no change to the embedding location.
- Bearing accuracy and frequency accuracy fields are intentionally excluded per the E07 epic decision (legacy parsed but never stored these).
- Color values use CSS hex string format (e.g., "#FF0000") consistent with the existing style system in the codebase.
- The `has_bearing`, `has_ambiguous`, and `has_frequency` boolean presence flags default to true when absent, matching legacy behavior where data is assumed present unless explicitly marked otherwise.
- REP export is out of scope — the schema is designed for import and internal representation only.
- The origin coordinate pair on SensorContact follows the GeoJSON convention of [longitude, latitude].
- Schema-per-phase for TMA is a separate concern (Phase 6) — this overhaul does not define TMA schemas.

## Dependencies

- **#062 (complete)**: Compound track model with embedded sensors — provides the TrackProperties structure that SensorData embeds into.

## Out of Scope

- REP sensor format parsing (Phase 2, #117)
- Sensor rendering on map (Phase 3, #118)
- Array offset calculation logic (Phase 4, #119) — only the schema fields are defined here
- TMA schemas (Phase 6, #121)
- Bearing/frequency accuracy fields (deferred per epic decision)
- Multi-static sonar, active sonar two-way propagation
- Sensor arc coverage shapes (DynamicTrackCoverage — addressed in #117 and #118)
