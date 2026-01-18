# Implement REP file special comments (NARRATIVE, CIRCLE, etc.)

**ID**: 007
**Category**: Enhancement
**Status**: proposed
**Prerequisite**: Item 015 (LinkML schemas for annotation types)

## Problem

The current REP file parser (`services/io/src/debrief_io/handlers/rep.py`) only extracts track position data. REP files also contain rich annotation data via "special comments" — lines beginning with semicolons followed by keywords like `;NARRATIVE:`, `;CIRCLE:`, `;RECT:`, etc.

These annotations are essential for understanding the operational context of exercises:

- **NARRATIVE entries** capture timestamped operator decisions, detections, and events ("POSSUB TRACK 14", "FINEX CALLED, ENTER TRANSITION")
- **Shape annotations** (CIRCLE, RECT, LINE, VECTOR) define reference areas, search patterns, and operational boundaries
- **TEXT annotations** mark waypoints and reference labels

Currently, these are skipped with a TODO comment at line 231:
```python
# TODO: Handle special comments like ;NARRATIVE:, ;CIRCLE:, etc.
```

Without parsing these annotations, analysed exercises lose critical context that operators recorded during the event.

## REP Special Comment Format

Based on the [official Debrief file format reference](https://debrief.github.io/tutorial/reference.html) and sample data from `shapes.rep`, the supported special comment types are:

### Coordinate Format

All coordinates use DMS (Degrees Minutes Seconds) format with hemisphere indicator:
```
DD MM SS.S H DDD MM SS.S H
```
Where `H` is the hemisphere (`N`/`S` for latitude, `E`/`W` for longitude).

Example: `21 30 45.5 N 120 15 30.0 W` = 21°30'45.5"N, 120°15'30.0"W

### Symbol Format

Symbols use `@X` notation where `X` encodes color, style, and fill. Optional attributes can be added in brackets:
- Simple: `@A`, `@D`, `@CB22`
- With layer: `@C[LAYER=TUAs]`
- With symbol type: `@C[SYMBOL=missile]`
- Combined: `@C[LAYER=SVG_Annotations,SYMBOL=anomaly]`

### Static Annotations

| Prefix | Description | Format |
|--------|-------------|--------|
| `;NARRATIVE:` | Timestamped narrative | `YYMMDD HHMMSS TRACKNAME TEXT` |
| `;NARRATIVE2:` | Narrative with entry type | `YYMMDD HHMMSS TRACKNAME ENTRYTYPE TEXT` |
| `;CIRCLE:` | Circle shape | `@SYM LAT LON RADIUS LABEL` |
| `;RECT:` | Rectangle (two corners) | `@SYM LAT1 LON1 LAT2 LON2 LABEL` |
| `;LINE:` | Line (two points) | `@SYM LAT1 LON1 LAT2 LON2 LABEL` |
| `;TEXT:` | Text annotation | `@SYM LAT LON LABEL` |
| `;VECTOR:` | Range/bearing vector | `@SYM LAT LON RANGE BEARING LABEL` |
| `;POLY:` | Polygon (N vertices) | `@SYM LAT1 LON1 LAT2 LON2 ... LABEL` |
| `;POLYLINE:` | Polyline (N vertices) | `@SYM LAT1 LON1 LAT2 LON2 ... LABEL` |
| `;ELLIPSE:` | Timed ellipse | `@SYM[LAYER] YYMMDD HHMMSS LAT LON ORIENT MAJOR MINOR LABEL` |
| `;ELLIPSE2:` | Period ellipse | `@SYM[LAYER] YYMMDD HHMMSS YYMMDD HHMMSS LAT LON ORIENT MAJOR MINOR LABEL` |
| `;WHEEL:` | Wheel shape | `@SYM YYMMDD HHMMSS LAT LON RADIUS RANGE LABEL` |

### Temporal Text Annotations

| Prefix | Description | Format |
|--------|-------------|--------|
| `;TIMETEXT:` | Text at specific time | `@SYM YYMMDD HHMMSS LAT LON LABEL` |
| `;PERIODTEXT:` | Text for time period | `@SYM YYMMDD HHMMSS YYMMDD HHMMSS LAT LON LABEL` |

### Dynamic Annotations (Time-Varying Shapes)

Dynamic shapes include a quoted name and timestamp, allowing the same shape to move/resize over time:

| Prefix | Description | Format |
|--------|-------------|--------|
| `;DYNAMIC_RECT:` | Moving rectangle | `@SYM "NAME" YYMMDD HHMMSS.SSS LAT1 LON1 LAT2 LON2 LABEL` |
| `;DYNAMIC_CIRCLE:` | Moving circle | `@SYM "NAME" YYMMDD HHMMSS.SSS LAT LON RADIUS LABEL` |
| `;DYNAMIC_POLY:` | Moving polygon | `@SYM "NAME" YYMMDD HHMMSS.SSS LAT1 LON1 ... LABEL` |

### Sensor and TMA Data

| Prefix | Description | Format |
|--------|-------------|--------|
| `;SENSOR:` | Sensor contact | `YYMMDD HHMMSS TRACKNAME @SYM LAT LON BEARING RANGE TYPE ... LABEL` |
| `;SENSOR2:` | Sensor bearing-only | `YYMMDD HHMMSS.SSS TRACKNAME @SYM NULL BEARING ... LABEL` |
| `;TMA_POS:` | TMA position fix | `YYMMDD HHMMSS TRACKNAME @SYM LAT LON TARGET ORIENT MAJOR MINOR ... LABEL` |
| `;TMA_RB:` | TMA range/bearing | `YYMMDD HHMMSS TRACKNAME @SYM BEARING RANGE TARGET ... LABEL` |

### Other Special Comments

| Prefix | Description | Format |
|--------|-------------|--------|
| `;TRACKSPLIT` | Track segment marker | `YYMMDD HHMMSS.SSS TRACKNAME` |

### Example NARRATIVE Records

From `shapes.rep`:
```
;NARRATIVE:  951212 050200 NEL_STYLE comment 3
;NARRATIVE2: 951212 050500 NEL_STYLE GenComment2 Mk Rge BAAA R121212
```

### Example Shape Records

From `shapes.rep`:
```
;CIRCLE: @D    21.8 0 0 N 21.0 0 0 W 2000 test circle
;CIRCLE: @BA10 21.6 0 0 N 20.8 0 0 W 2000 dotted 1px solid fill
;RECT: @A 21.4 0 0 N 21.5 0 0 W 21.5 0 0 N 21.6 0 0 W test rectangle
;LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W test line
;VECTOR: @C 21.6 12 0 N 21.5 11 0 W 5000 270 test vector
;TEXT: @E 21.7 0 0 N 21.5 0 0 W test text
;TEXT: @C[LAYER=SVG_Annotations,SYMBOL=torpedo] 20.26 0 0 N 18.92 0 0 W torpedo
;POLY: @GA30 21.9 0 0 N 21.5 0 0 W 22 0 0 N 21.8 0 0 W 22.1 0 0 N 21.5 0 0 W test\npoly
;ELLIPSE: @F[LAYER=TUAs] 951212 055200 21.4 0 0 N 21.1 0 0 W 65.0 5000 3000 test ellipse
;TIMETEXT: @C 951212 050200 21.7 0 0 N 21.7 0 0 W test timetext
;PERIODTEXT: @C 951212 050200 951212 060200 21.7 0 0 N 21.2 0 0 W test period 1
;DYNAMIC_RECT: @A "Dynamic A" 951212 051000.000 22 00 0 N 21 00 0 W 21 50 0 N 20 50 0 W dynamic A rect 1
;DYNAMIC_CIRCLE: @A "Dynamic A" 951212 052100.000 21 00 0 N 20 53 0 W 2000 dynamic A circ 12
```

## Proposed Solution

Extend the REP handler to parse all special comment types, producing GeoJSON features that conform to the annotation schemas defined in item 015.

### Implementation Approach

1. **Extend REP parser** to recognise special comment prefixes
2. **Create parser functions** for each special comment type:
   - `_parse_symbol()` → Parse `@X[LAYER=...,SYMBOL=...]` notation
   - `_parse_dms_coord()` → Parse `DD MM SS.S H` format (reuse existing)
   - `_parse_narrative()` → NarrativeFeature (NARRATIVE, NARRATIVE2)
   - `_parse_circle()` → CircleFeature (CIRCLE, DYNAMIC_CIRCLE)
   - `_parse_rect()` → RectangleFeature (RECT, DYNAMIC_RECT)
   - `_parse_line()` → LineFeature
   - `_parse_text()` → TextAnnotationFeature (TEXT, TIMETEXT, PERIODTEXT)
   - `_parse_vector()` → VectorFeature
   - `_parse_poly()` → PolygonFeature (POLY, POLYLINE, DYNAMIC_POLY)
   - `_parse_ellipse()` → EllipseFeature (ELLIPSE, ELLIPSE2)
   - `_parse_wheel()` → WheelFeature
   - `_parse_sensor()` → SensorFeature (SENSOR, SENSOR2)
   - `_parse_tma()` → TMAFeature (TMA_POS, TMA_RB)
3. **Return mixed feature types** from `ParseResult`:
   - Track features (existing)
   - Annotation features (new)
4. **Validate output** against Pydantic models from item 015

### GeoJSON Mapping

| REP Type | GeoJSON Geometry | Notes |
|----------|------------------|-------|
| NARRATIVE, NARRATIVE2 | None (properties only) | Timestamped text, linked to track |
| CIRCLE, DYNAMIC_CIRCLE | Point + radius in properties | Center point with radius |
| RECT, DYNAMIC_RECT | Polygon | Four-corner rectangle |
| LINE | LineString | Two-point line |
| TEXT, TIMETEXT, PERIODTEXT | Point | Position with label (temporal types have time bounds) |
| VECTOR | Point + bearing/range | Origin point with vector components |
| POLY, DYNAMIC_POLY | Polygon | N-vertex polygon |
| POLYLINE | LineString | N-vertex polyline |
| ELLIPSE, ELLIPSE2 | Polygon (approximated) | Center + orientation + axes |
| WHEEL | Point + properties | Center with radius and range |
| SENSOR, SENSOR2 | Point or LineString | Contact position or bearing line |
| TMA_POS, TMA_RB | Point + ellipse properties | TMA solution with uncertainty |
| TRACKSPLIT | None (metadata only) | Track segmentation marker |

## Success Criteria

### Phase 1: Core Annotations (MVP)
- [ ] REP handler recognises all special comment prefixes
- [ ] NARRATIVE and NARRATIVE2 parsed with timestamp, track name, entry type, and text
- [ ] CIRCLE parsed with center (DMS), radius, symbol, and label
- [ ] RECT parsed with two corners (DMS), symbol, and label
- [ ] LINE parsed with two points (DMS), symbol, and label
- [ ] TEXT parsed with position (DMS), symbol, and label
- [ ] VECTOR parsed with origin (DMS), range, bearing, symbol, and label
- [ ] Symbol attributes parsed (`@X`, `@X[LAYER=...]`, `@X[SYMBOL=...]`)
- [ ] All parsed annotations validate against item 015 schemas
- [ ] Existing track parsing unchanged (no regression)
- [ ] Unit tests cover each annotation type (valid and invalid cases)

### Phase 2: Extended Annotations
- [ ] POLY and POLYLINE parsed with N vertices
- [ ] ELLIPSE and ELLIPSE2 parsed with center, orientation, major/minor axes
- [ ] TIMETEXT and PERIODTEXT parsed with temporal bounds
- [ ] WHEEL parsed with center, radius, and range

### Phase 3: Dynamic and Sensor Data
- [ ] DYNAMIC_RECT, DYNAMIC_CIRCLE, DYNAMIC_POLY parsed with name and timestamp
- [ ] SENSOR and SENSOR2 parsed for contact data
- [ ] TMA_POS and TMA_RB parsed for target motion analysis
- [ ] TRACKSPLIT markers captured for track segmentation

## Test Strategy

Testing follows the project's schema test strategy (golden fixtures, round-trip, schema comparison) adapted for REP parsing.

### 1. Fixture Sources

| Fixture | Purpose | Location |
|---------|---------|----------|
| `shapes.rep` | Reference file from upstream Debrief | `services/io/tests/fixtures/valid/` |
| `annotations-minimal.rep` | Minimal valid example of each type | `services/io/tests/fixtures/valid/` |
| `annotations-edge-cases.rep` | Edge cases (empty labels, boundary coords) | `services/io/tests/fixtures/valid/` |
| `annotations-malformed.rep` | Invalid syntax for error handling | `services/io/tests/fixtures/invalid/` |

The upstream `shapes.rep` file should be copied from:
`https://github.com/debrief/debrief/blob/develop/org.mwc.cmap.combined.feature/root_installs/sample_data/shapes.rep`

### 2. Golden Output Tests

For each annotation type, create expected JSON output files that parsed REP lines should produce:

```
services/io/tests/fixtures/golden/
├── narrative-output.json      # Expected output for NARRATIVE lines
├── circle-output.json         # Expected output for CIRCLE lines
├── rect-output.json           # Expected output for RECT lines
├── line-output.json           # etc.
├── text-output.json
├── vector-output.json
├── poly-output.json
├── ellipse-output.json
└── dynamic-shapes-output.json
```

Test pattern:
```python
def test_circle_golden_output():
    """Parsed CIRCLE matches golden fixture."""
    result = handler.parse(CIRCLE_INPUT)
    with open("fixtures/golden/circle-output.json") as f:
        expected = json.load(f)
    assert result.annotations[0].model_dump() == expected
```

### 3. Unit Tests (per parser function)

| Function | Test Cases |
|----------|------------|
| `_parse_symbol()` | Simple (`@A`), with layer (`@C[LAYER=X]`), with symbol (`@C[SYMBOL=Y]`), combined, malformed |
| `_parse_dms_coord()` | All hemispheres (N/S/E/W), zero values, boundary values (±90 lat, ±180 lon), decimal seconds |
| `_parse_narrative()` | NARRATIVE and NARRATIVE2, with/without milliseconds, multi-word track names (quoted) |
| `_parse_circle()` | Basic, with layer attribute, various symbol codes |
| `_parse_rect()` | Two-corner format, label with spaces |
| `_parse_line()` | Two-point format |
| `_parse_text()` | Basic, with LAYER, with SYMBOL, both attributes |
| `_parse_vector()` | Range/bearing values, label extraction |
| `_parse_poly()` | 3 vertices, 4+ vertices, POLY vs POLYLINE distinction |
| `_parse_ellipse()` | ELLIPSE with timestamp, ELLIPSE2 with period |
| `_parse_timetext()` | TIMETEXT single timestamp, PERIODTEXT with range |
| `_parse_dynamic()` | Quoted names, timestamp with milliseconds |

### 4. Integration Tests

Test full file parsing with mixed content:

```python
def test_parse_mixed_content():
    """Parse file with tracks AND annotations."""
    result = handler.parse(Path("fixtures/valid/shapes.rep"))

    # Tracks still parsed correctly
    assert len(result.tracks) > 0

    # Annotations extracted
    assert len(result.annotations) > 0

    # Each annotation type present
    types = {a.properties.kind for a in result.annotations}
    assert "circle" in types
    assert "narrative" in types
    # etc.
```

### 5. Regression Tests

Existing track parsing must produce identical output:

```python
@pytest.mark.parametrize("fixture", ["boat1.rep", "boat2.rep"])
def test_track_parsing_unchanged(fixture):
    """Track parsing regression test."""
    result_new = handler.parse(Path(f"fixtures/valid/{fixture}"))
    result_baseline = load_baseline(f"baselines/{fixture}.json")

    # Track features must match exactly
    assert result_new.tracks == result_baseline.tracks
```

Create baseline files from current parser output before implementing annotation parsing.

### 6. Edge Cases

| Category | Test Cases |
|----------|------------|
| **Timestamps** | `HHMMSS` (no ms), `HHMMSS.SSS` (with ms), `HHMMSS.S` (1 digit) |
| **Labels** | Empty label, label with spaces, label with `\n` escape, label with special chars |
| **Coordinates** | Equator (0°), Prime meridian (0°), Poles (±90°), Date line (±180°) |
| **Symbols** | All documented symbol codes, unknown codes (should preserve raw) |
| **Whitespace** | Multiple spaces between fields, tabs, trailing whitespace |
| **Case** | `;CIRCLE:` vs `;circle:` vs `;Circle:` (case sensitivity) |

### 7. Error Handling Tests

Malformed annotations should produce warnings, not failures:

```python
def test_malformed_circle_warns():
    """Malformed CIRCLE produces warning, continues parsing."""
    content = ";CIRCLE: @A not enough fields"
    result = handler.parse_string(content)

    assert len(result.annotations) == 0  # Not parsed
    assert len(result.warnings) == 1     # Warning recorded
    assert "CIRCLE" in result.warnings[0].message
    assert result.warnings[0].line_number == 1
```

Test cases:
- Missing required fields
- Invalid coordinate values (out of range)
- Malformed symbol syntax
- Truncated lines
- Unknown annotation prefix (should skip silently or warn)

### 8. Schema Validation Tests

All parsed annotations must validate against Item 015 Pydantic models:

```python
from debrief_schemas import CircleAnnotation, NarrativeEntry, ...

def test_circle_validates_against_schema():
    """Parsed CIRCLE validates against Pydantic model."""
    result = handler.parse(CIRCLE_INPUT)
    annotation = result.annotations[0]

    # Should not raise ValidationError
    validated = CircleAnnotation.model_validate(annotation.model_dump())
    assert validated.properties.radius > 0
```

### 9. Round-Trip Tests

Per CLAUDE.md requirement (Python → JSON → TypeScript → JSON → Python):

```python
def test_annotation_round_trip():
    """Annotation survives JSON round-trip."""
    original = handler.parse(CIRCLE_INPUT).annotations[0]

    # Python → JSON
    json_str = original.model_dump_json()

    # JSON → Python (simulating TypeScript → JSON → Python)
    restored = CircleAnnotation.model_validate_json(json_str)

    assert original == restored
```

Full TypeScript round-trip tests require the generated TypeScript interfaces from Item 015.

### 10. Test Coverage Requirements

| Component | Minimum Coverage |
|-----------|------------------|
| Symbol parser | 100% (small, critical) |
| Coordinate parser | 100% (reused, critical) |
| Each annotation parser | 90%+ |
| Error handling paths | 80%+ |
| Integration (full file) | Representative samples |

## Constraints

- **Schema-first**: Must wait for item 015 (annotation schemas) before implementation
- **Offline-capable**: Pure transformation, no network dependencies
- **Provenance**: Each annotation must include source file and line number
- **Error recovery**: Invalid annotations logged as warnings, don't fail entire parse

## Out of Scope

- UI rendering of annotations (frontend responsibility)
- STAC storage strategy for annotations
- Annotation editing/creation (parse only)
- Custom/organisation-specific annotation types
- Symbol color/style decoding (preserve raw symbol codes, decode in UI layer)

## Dependencies

- **Requires**: Item 015 (LinkML schemas for annotation types) — CRITICAL
- **Extends**: Item 002 (debrief-io service)
- **Enables**: Full REP file support in tracer bullet

## Strategic Fit

This enhancement directly supports **Theme 1: Prove the Architecture** by completing REP file support. Annotations are essential for meaningful exercise replay — tracks alone don't tell the operational story.

It also supports **Theme 3: Demonstrate Value for Stakeholder Engagement** by enabling demos that show the full context of naval exercises, not just movement data.

## Technical Notes

### Current Parser Structure

The REP handler uses regex-based line parsing:
```python
# Position pattern (existing)
POSITION_PATTERN = re.compile(r"^\s*(\d{6})\s+...")

# Comment handling (current - skips all)
if line.strip().startswith(";"):
    # TODO: Handle special comments like ;NARRATIVE:, ;CIRCLE:, etc.
    continue
```

### Proposed Extension Point

```python
# Inside parse() method
if line.strip().startswith(";"):
    annotation = self._try_parse_special_comment(line, line_num)
    if annotation:
        annotations.append(annotation)
    continue  # Skip regular comment lines
```

### Coordinate Parsing

The existing `parse_dms_coordinate()` function can be reused for shape coordinates. The DMS format is consistent across all REP record types.

## Interview Summary

This idea file documents an existing backlog item to provide implementation-ready detail. The item was identified during the debrief-io spec work (see `specs/002-debrief-io/research.md`) where the special comment formats were documented but implementation was deferred to keep the tracer bullet scope minimal.
