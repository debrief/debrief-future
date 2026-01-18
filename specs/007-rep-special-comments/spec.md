# Feature Specification: REP File Special Comments

**Feature Branch**: `007-rep-special-comments`
**Created**: 2026-01-18
**Status**: Draft
**Input**: Extend the REP handler to parse all special comment types, producing GeoJSON features that conform to annotation schemas.

## User Scenarios & Testing

### User Story 1 - Parse Narrative Annotations (Priority: P1)

An analyst loads a REP file containing exercise data. The system extracts not just track positions but also the timestamped narrative entries that operators recorded during the exercise, such as "POSSUB TRACK 14" or "FINEX CALLED, ENTER TRANSITION". These narratives provide critical context about operator decisions and detections.

**Why this priority**: Narrative entries are the most common annotation type in REP files and provide essential operational context that makes exercise replay meaningful. Without narratives, track data alone doesn't tell the operational story.

**Independent Test**: Load a REP file with NARRATIVE entries and verify they appear as structured data with timestamp, track association, and text content.

**Acceptance Scenarios**:

1. **Given** a REP file with `;NARRATIVE: 951212 050200 NELSON comment text`, **When** the file is parsed, **Then** a narrative annotation is created with timestamp "1995-12-12T05:02:00", track name "NELSON", and text "comment text"
2. **Given** a REP file with `;NARRATIVE2: 951212 050500 NELSON GenComment2 detailed text`, **When** the file is parsed, **Then** a narrative annotation is created with the additional entry type "GenComment2"
3. **Given** a REP file with multiple NARRATIVE entries for the same track, **When** parsed, **Then** all entries are captured and associated with the correct track

---

### User Story 2 - Parse Shape Annotations (Priority: P1)

An analyst loads a REP file containing operational boundaries and reference areas marked by the original operators. Circles define search areas, rectangles define operational boundaries, and lines show reference paths. These shapes are extracted and available for display alongside track data.

**Why this priority**: Shape annotations (CIRCLE, RECT, LINE) define the operational context — search patterns, boundaries, and reference areas — that are essential for understanding the tactical situation.

**Independent Test**: Load a REP file with CIRCLE, RECT, and LINE entries and verify they produce GeoJSON features with correct geometry and properties.

**Acceptance Scenarios**:

1. **Given** a REP file with `;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 test circle`, **When** parsed, **Then** a circle annotation is created with center at 21.8N/21.0W, radius 2000 meters, symbol "D", and label "test circle"
2. **Given** a REP file with `;RECT: @A 21.4 0 0 N 21.5 0 0 W 21.5 0 0 N 21.6 0 0 W test rectangle`, **When** parsed, **Then** a rectangle annotation is created with the two corner coordinates and label "test rectangle"
3. **Given** a REP file with `;LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W test line`, **When** parsed, **Then** a line annotation is created connecting the two points with label "test line"

---

### User Story 3 - Parse Text and Vector Annotations (Priority: P2)

An analyst loads a REP file with waypoint markers (TEXT) and bearing/range indicators (VECTOR). These provide reference points and directional information that operators added during the exercise.

**Why this priority**: Text and vector annotations add important reference markers but are less common than shapes and narratives.

**Independent Test**: Load a REP file with TEXT and VECTOR entries and verify correct position and properties.

**Acceptance Scenarios**:

1. **Given** a REP file with `;TEXT: @E 21.7 0 0 N 21.5 0 0 W waypoint alpha`, **When** parsed, **Then** a text annotation is created at the specified position with label "waypoint alpha"
2. **Given** a REP file with `;VECTOR: @C 21.6 12 0 N 21.5 11 0 W 5000 270 bearing marker`, **When** parsed, **Then** a vector annotation is created with origin, range 5000m, bearing 270 degrees, and label "bearing marker"
3. **Given** a REP file with `;TEXT: @C[LAYER=SVG_Annotations,SYMBOL=torpedo] 20.26 0 0 N 18.92 0 0 W torpedo`, **When** parsed, **Then** the annotation includes layer "SVG_Annotations" and symbol type "torpedo"

---

### User Story 4 - Parse Polygon Annotations (Priority: P2)

An analyst loads a REP file containing multi-vertex shapes that define complex operational areas like search patterns or exclusion zones. Both closed polygons and open polylines are supported.

**Why this priority**: Polygons extend the shape capability beyond simple circles and rectangles to support real-world operational boundaries.

**Independent Test**: Load a REP file with POLY and POLYLINE entries and verify correct multi-vertex geometry.

**Acceptance Scenarios**:

1. **Given** a REP file with `;POLY: @GA30 21.9 0 0 N 21.5 0 0 W 22 0 0 N 21.8 0 0 W 22.1 0 0 N 21.5 0 0 W test poly`, **When** parsed, **Then** a closed polygon annotation is created with three vertices
2. **Given** a REP file with `;POLYLINE:` and multiple coordinate pairs, **When** parsed, **Then** an open polyline annotation is created (not closed)

---

### User Story 5 - Parse Temporal Annotations (Priority: P2)

An analyst loads a REP file with time-bound text annotations and ellipse shapes that represent uncertainty estimates at specific times or over time periods.

**Why this priority**: Temporal annotations (TIMETEXT, PERIODTEXT, ELLIPSE) add time-awareness to static shapes, enabling replay at specific exercise moments.

**Independent Test**: Load a REP file with TIMETEXT, PERIODTEXT, and ELLIPSE entries and verify temporal bounds are captured.

**Acceptance Scenarios**:

1. **Given** a REP file with `;TIMETEXT: @C 951212 050200 21.7 0 0 N 21.7 0 0 W event marker`, **When** parsed, **Then** a text annotation is created with timestamp "1995-12-12T05:02:00"
2. **Given** a REP file with `;PERIODTEXT: @C 951212 050200 951212 060200 21.7 0 0 N 21.2 0 0 W period label`, **When** parsed, **Then** a text annotation is created with start and end timestamps
3. **Given** a REP file with `;ELLIPSE: @F[LAYER=TUAs] 951212 055200 21.4 0 0 N 21.1 0 0 W 65.0 5000 3000 uncertainty`, **When** parsed, **Then** an ellipse annotation is created with orientation, major axis, minor axis, and layer assignment

---

### User Story 6 - Parse Dynamic Annotations (Priority: P3)

An analyst loads a REP file with time-varying shapes that change position over the course of an exercise. Multiple entries with the same quoted name represent the same shape at different times.

**Why this priority**: Dynamic annotations enable complex replay scenarios but are less common in typical REP files.

**Independent Test**: Load a REP file with DYNAMIC_RECT entries sharing the same name and verify they are grouped as a single shape with multiple time positions.

**Acceptance Scenarios**:

1. **Given** a REP file with `;DYNAMIC_RECT: @A "Zone Alpha" 951212 051000.000 22 00 0 N 21 00 0 W 21 50 0 N 20 50 0 W label`, **When** parsed, **Then** a dynamic rectangle is created with name "Zone Alpha" and timestamp
2. **Given** multiple DYNAMIC_CIRCLE entries with the same quoted name but different timestamps, **When** parsed, **Then** they are grouped as positions of the same dynamic shape

---

### User Story 7 - Parse Sensor and TMA Data (Priority: P3)

An analyst loads a REP file containing sensor contact data and target motion analysis (TMA) solutions. These represent detections and track solutions from the exercise.

**Why this priority**: Sensor and TMA data are specialized annotations used in advanced analysis scenarios.

**Independent Test**: Load a REP file with SENSOR and TMA entries and verify contact and solution data is captured.

**Acceptance Scenarios**:

1. **Given** a REP file with `;SENSOR: 951212 050200 NELSON @C 21.5 0 0 N 20.8 0 0 W 045 5000 RADAR contact`, **When** parsed, **Then** a sensor contact is created with bearing, range, and type
2. **Given** a REP file with `;TMA_POS:` entry, **When** parsed, **Then** a TMA position fix is created with uncertainty ellipse parameters

---

### User Story 8 - Preserve Track Parsing (Priority: P1)

An analyst loads a REP file with both track positions and annotations. The existing track parsing continues to work exactly as before, while annotations are extracted in addition to tracks.

**Why this priority**: No regression in existing functionality is critical — this is an extension, not a replacement.

**Independent Test**: Load existing REP test files and verify track output is byte-for-byte identical to current output.

**Acceptance Scenarios**:

1. **Given** a REP file processed by the current parser producing track output X, **When** the same file is processed by the enhanced parser, **Then** the track output is identical to X
2. **Given** a REP file with only track data (no special comments), **When** parsed, **Then** the result is unchanged from current behavior

---

### Edge Cases

- What happens when a special comment has invalid or malformed syntax?
  - Invalid annotations produce warnings but do not fail the parse; processing continues
- What happens when coordinates are out of valid range (latitude > 90 or longitude > 180)?
  - A warning is recorded with the line number; the annotation is skipped
- What happens when a DYNAMIC shape name is missing quotes?
  - Treated as malformed; warning recorded and annotation skipped
- What happens when an unknown special comment prefix is encountered (e.g., `;CUSTOM:`)?
  - Unknown prefixes are silently ignored (treated as regular comments)
- What happens when a label contains newline escape sequences (e.g., `test\npoly`)?
  - The escape sequence is preserved in the label for downstream handling
- What happens when timestamps have varying precision (HHMMSS vs HHMMSS.SSS)?
  - Both formats are supported; milliseconds default to 0 when not provided

## Requirements

### Functional Requirements

- **FR-001**: System MUST recognize all documented special comment prefixes: NARRATIVE, NARRATIVE2, CIRCLE, RECT, LINE, TEXT, VECTOR, POLY, POLYLINE, ELLIPSE, ELLIPSE2, TIMETEXT, PERIODTEXT, WHEEL, DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY, SENSOR, SENSOR2, TMA_POS, TMA_RB, TRACKSPLIT
- **FR-002**: System MUST parse DMS coordinates in the format `DD MM SS.S H DDD MM SS.S H` where H is hemisphere indicator (N/S for latitude, E/W for longitude)
- **FR-003**: System MUST parse symbol notation including simple codes (`@A`), codes with layer (`@C[LAYER=X]`), codes with symbol type (`@C[SYMBOL=Y]`), and combined attributes
- **FR-004**: System MUST produce GeoJSON features that conform to the annotation schemas defined in item 015
- **FR-005**: System MUST preserve existing track parsing behavior with no changes to track output
- **FR-006**: System MUST include provenance data (source file path and line number) for each parsed annotation
- **FR-007**: System MUST record warnings for malformed annotations without failing the overall parse
- **FR-008**: System MUST handle timestamps in both HHMMSS and HHMMSS.SSS formats
- **FR-009**: System MUST parse quoted names in DYNAMIC annotations (e.g., `"Zone Alpha"`)
- **FR-010**: System MUST validate parsed annotations against Pydantic models before including in output

### Key Entities

- **Annotation**: A geographic or temporal marker extracted from a special comment, containing geometry (if applicable), properties (symbol, label, layer), and provenance
- **Symbol**: Styling information encoded in `@X[...]` notation, including color code, layer assignment, and symbol type
- **Narrative Entry**: A timestamped text record associated with a track, capturing operator observations
- **Dynamic Shape**: A named shape with multiple time-indexed positions, representing movement over time
- **Sensor Contact**: A detection record with bearing, range, type, and optional position
- **TMA Solution**: A target motion analysis position fix with uncertainty ellipse

## Success Criteria

### Measurable Outcomes

- **SC-001**: Parser correctly extracts 100% of annotations from the upstream `shapes.rep` reference file
- **SC-002**: Track parsing regression tests pass with identical output to baseline
- **SC-003**: All parsed annotations validate against item 015 Pydantic schemas without errors
- **SC-004**: Malformed annotations produce clear warnings including line numbers
- **SC-005**: Parser processes REP files within 10% of current performance (minimal overhead)
- **SC-006**: Coordinate parsing handles all hemisphere combinations (N/S/E/W) and boundary values (poles, dateline)
- **SC-007**: Symbol parsing correctly extracts layer and symbol type from all documented attribute formats

## Assumptions

- **A-001**: Item 015 (LinkML annotation schemas) will be completed before this implementation begins
- **A-002**: The upstream `shapes.rep` file from Debrief repository represents the canonical set of annotation formats
- **A-003**: Symbol color/style decoding is deferred to the UI layer; this parser preserves raw symbol codes
- **A-004**: Annotation editing and creation are out of scope; this is parse-only functionality
- **A-005**: Custom or organization-specific annotation types are out of scope
- **A-006**: STAC storage strategy for annotations will be determined separately

## Dependencies

- **Requires**: Item 015 - LinkML schemas for annotation types (CRITICAL prerequisite)
- **Extends**: Item 002 - debrief-io service (REP handler already exists)
- **Enables**: Full REP file support in tracer bullet demonstration

## Out of Scope

- UI rendering of annotations (frontend responsibility)
- STAC storage strategy for annotations
- Annotation editing/creation (parse only)
- Custom/organization-specific annotation types
- Symbol color/style decoding (preserve raw codes, decode in UI layer)
