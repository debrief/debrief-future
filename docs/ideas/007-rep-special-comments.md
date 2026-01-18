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
