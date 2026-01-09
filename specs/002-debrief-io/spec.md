# Feature Specification: debrief-io

**Feature Branch**: `002-debrief-io`
**Created**: 2026-01-09
**Status**: Draft
**Input**: Tracer Bullet Delivery Plan - Stage 2
**Dependencies**: Stage 0 (Schemas) MUST be complete

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parse REP File to GeoJSON (Priority: P1)

An analyst loads a REP file (legacy Debrief format) and receives validated GeoJSON features
representing tracks, sensor contacts, and reference locations. The parser handles the minimal
subset needed for tracer bullet validation.

**Why this priority**: REP is the primary legacy format. Without parsing, no data can enter the
new system. This is the critical path for demonstrating the architecture.

**Independent Test**: Pass a test REP file to `parse_rep()`, receive a list of validated GeoJSON
features matching expected structure.

**Acceptance Scenarios**:

1. **Given** a valid REP file with track data, **When** `parse_rep()` is called, **Then** returns
   list of TrackFeature GeoJSON objects.
2. **Given** a REP file with multiple tracks, **When** parsed, **Then** each track is a separate
   TrackFeature with correct platform ID.
3. **Given** a REP file with timestamped positions, **When** parsed, **Then** TrackFeature
   properties include temporal extent and positions array with ISO8601 timestamps.
4. **Given** a REP file with reference location, **When** parsed, **Then** returns
   ReferenceLocation GeoJSON feature.

---

### User Story 2 - Validate Parsed Features (Priority: P1)

All parsed features are validated against the Pydantic models from Stage 0 before being returned.
Invalid data raises clear errors with context.

**Why this priority**: Constitution Article II requires schema compliance. Invalid data must not
propagate through the system.

**Independent Test**: Parse valid REP file, all features pass Pydantic validation. Parse malformed
REP, receive validation errors with line numbers.

**Acceptance Scenarios**:

1. **Given** parsed features, **When** validation runs, **Then** all features conform to Stage 0
   Pydantic models.
2. **Given** a REP file with invalid coordinate, **When** parsed, **Then** ValidationError includes
   line number and field name.
3. **Given** a REP file with missing required field, **When** parsed, **Then** error message
   specifies which field is missing.

---

### User Story 3 - Parse Sensor Contacts (Priority: P2)

The parser extracts sensor contact data from REP files, linking contacts to their parent tracks
and capturing bearing, range (if available), and timestamp.

**Why this priority**: Sensor contacts are essential for TMA analysis but the tracer bullet can
demonstrate with tracks alone.

**Independent Test**: Parse REP file containing sensor detections, verify SensorContact features
with correct parent track references.

**Acceptance Scenarios**:

1. **Given** REP file with sensor contacts, **When** parsed, **Then** returns SensorContact
   GeoJSON features.
2. **Given** a sensor contact in REP, **When** parsed, **Then** SensorContact includes bearing,
   timestamp, and parent track reference.
3. **Given** sensor contact with range data, **When** parsed, **Then** range is included in
   SensorContact properties.

---

### User Story 4 - Handler Discovery and Registration (Priority: P2)

The io service supports multiple file formats via a handler registry. Handlers are discovered
by file extension and can be added by contrib extensions.

**Why this priority**: Extensibility is core to the architecture, but tracer bullet only needs
REP handler.

**Independent Test**: Register a custom handler, parse file with that extension, verify custom
handler is invoked.

**Acceptance Scenarios**:

1. **Given** a file with .rep extension, **When** `parse()` is called, **Then** REP handler is
   automatically selected.
2. **Given** a registered custom handler for .xyz, **When** .xyz file is parsed, **Then** custom
   handler processes the file.
3. **Given** an unknown file extension, **When** `parse()` is called, **Then** raises
   UnsupportedFormatError with extension name.

---

### User Story 5 - MCP Tool Exposure (Priority: P2)

The parse operation is exposed via MCP tool, accepting file path and returning GeoJSON features.
This enables the loader app to invoke parsing without direct Python imports.

**Why this priority**: MCP integration is needed for Electron loader, but Python library works
standalone for testing.

**Independent Test**: Start MCP server, call `parse_file` tool with REP path, receive same GeoJSON
as direct Python call.

**Acceptance Scenarios**:

1. **Given** MCP server running, **When** `parse_file` tool is called with REP path, **Then**
   returns list of GeoJSON features.
2. **Given** MCP tool call, **When** parsing fails, **Then** error response includes error type
   and details.
3. **Given** MCP server, **When** listing available handlers, **Then** returns supported extensions
   with handler metadata.

---

### Edge Cases

- What happens when REP file has encoding issues (non-UTF8)?
- How does parser handle REP files with unknown/unsupported record types?
- What happens when REP file is truncated mid-record?
- How are ambiguous timestamps (no timezone) handled?
- What happens when coordinate is outside valid range (-180 to 180, -90 to 90)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse REP files extracting track positions as TrackFeature GeoJSON.
- **FR-002**: System MUST parse REP reference locations as ReferenceLocation GeoJSON.
- **FR-003**: System MUST validate all parsed features against Stage 0 Pydantic models.
- **FR-004**: System MUST report parsing errors with source file location (line number where
  possible).
- **FR-005**: System MUST support handler registration for additional file formats.
- **FR-006**: System MUST select appropriate handler based on file extension.
- **FR-007**: System MUST expose parse operation via MCP tool using mcp-common infrastructure.
- **FR-008**: System MUST handle file encoding detection (UTF-8, Latin-1 common in legacy files).
- **FR-009**: Parser MUST be a pure transformation — no side effects, no file system writes.
- **FR-010**: System MUST parse sensor contacts linking to parent tracks when present in REP.

### Key Entities

- **TrackFeature**: GeoJSON Feature with LineString geometry (track path) and properties including
  platform ID, track type, temporal extent, and positions array.
- **SensorContact**: GeoJSON Feature with Point geometry (contact location or estimated position)
  and properties including parent track ID, bearing, range, timestamp.
- **ReferenceLocation**: GeoJSON Feature with Point geometry for fixed reference points.
- **ParseResult**: Container for parsed features plus any warnings encountered during parsing.
- **ParseError**: Structured error with error type, message, source file, and line number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Can parse provided test REP file (two tracks + reference location) to valid GeoJSON.
- **SC-002**: All output features pass Pydantic validation from Stage 0 schemas.
- **SC-003**: Parse errors include line number for at least 80% of error cases.
- **SC-004**: Handler registry correctly routes files by extension.
- **SC-005**: MCP tool returns identical results to direct Python API.
- **SC-006**: Unit tests cover REP format edge cases with >90% code coverage.
- **SC-007**: Integration test: parse REP → validate features → verify against expected structure.
