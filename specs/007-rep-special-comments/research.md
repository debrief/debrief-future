# Research: REP File Special Comments

**Feature**: 007-rep-special-comments | **Date**: 2026-01-21

## Executive Summary

This research documents the technical decisions for extending the `debrief-io` REP parser to handle special comments. Key findings include the complete symbology mapping, annotation format specifications, and integration patterns with existing code.

## Decision 1: Color Code Mapping (A-Q → CSS)

**Decision**: Map REP color codes to CSS color values during parsing.

**Rationale**: The Debrief symbology table defines 17 color codes (A-Q). These must be converted to CSS color strings to populate the required `color` and `fill_color` fields in the styling schemas.

**Mapping Table**:

| Code | Color Name | CSS Value |
|------|------------|-----------|
| A | Blue | `#0000FF` |
| B | Green | `#00FF00` |
| C | Red | `#FF0000` |
| D | Yellow | `#FFFF00` |
| E | Magenta | `#FF00FF` |
| F | Orange | `#FFA500` |
| G | Purple | `#800080` |
| H | Cyan | `#00FFFF` |
| I | Brown | `#A52A2A` |
| J | Light Green | `#90EE90` |
| K | Pink | `#FFC0CB` |
| L | Gold | `#FFD700` |
| M | Light Grey | `#D3D3D3` |
| N | Grey | `#808080` |
| O | Dark Grey | `#A9A9A9` |
| P | White | `#FFFFFF` |
| Q | Black | `#000000` |

**Alternatives Considered**:
- Named CSS colors (e.g., "blue", "red") - rejected for consistency and precision
- RGB tuples - rejected as CSS strings are more portable

## Decision 2: Symbol Code Format Parsing

**Decision**: Support all documented symbol code formats with extended attribute parsing.

**Rationale**: The shapes.rep test fixture demonstrates multiple symbol code formats that must all be supported.

**Formats Supported**:

1. **Simple symbol**: `@A` - color code only
2. **Symbol with line style**: `@A@00` - symbol + line type + thickness + fill
3. **Symbol with extended format**: `@BA10` - alternative encoding
4. **Symbol with layer**: `@B[LAYER=name]`
5. **Symbol with icon**: `@C[SYMBOL=torpedo]`
6. **Combined attributes**: `@C[LAYER=SVG_Annotations,SYMBOL=missile]`
7. **SVG symbols (lowercase)**: `aB[LAYER=name]` - SVG symbol + color

**Extended Format Breakdown** (4-character codes like `@A@00`):
- Position 1: `@` prefix
- Position 2: Color code (A-Q)
- Position 3: Line style (@ = Solid, A = Dotted, B = Dot-dash, C = Short dash, D = Long dash, E = Unconnected)
- Position 4: Thickness (0-5 pixels)
- Position 5: Fill style (0 = none, 1 = solid, 2 = semi-transparent)

**Regex Pattern for Symbol**:
```python
SYMBOL_PATTERN = re.compile(
    r'^'
    r'([a-zA-Z@])([A-Q])'              # Symbol char + color code
    r'(?:([A-E@])(\d)(\d))?'           # Optional: line style + thickness + fill
    r'(?:\[([^\]]+)\])?'               # Optional: [LAYER=x,SYMBOL=y]
    r'$'
)
```

## Decision 3: Legacy Symbol Names

**Decision**: Add optional `legacyStyle` attribute to `PointProperties` to preserve symbol names.

**Rationale**: Symbol names like 'Aircraft', 'Submarine', 'torpedo', 'missile' carry semantic meaning for future icon rendering. These should be preserved without blocking current implementation.

**Implementation**:
- Parse `SYMBOL=name` from attribute brackets
- Store in `legacyStyle` field when present
- Field is optional - absence is not an error

**Known Symbol Names** (from shapes.rep):
- Standard: `anomaly`, `bottomed_mine`, `cleared`, `countermeasure`, `decoy`, `decoy_aw`, `decoy_uw`
- Military: `enemy_subsurface`, `friend_air`, `missile`, `torpedo`
- Markers: `flagged_marker`, `tagged_marker`, `highlights_1`, `highlights_2`
- Mines: `floating_mine`, `mine_like_object`, `moored_mine`
- Vehicles: `uav_1`, `uav_2`, `usv_1`, `usv_2`, `usv_3`, `usv_4`, `usv_5`
- Other: `jammer`, `wreck`, `xxx_contact`

## Decision 4: Annotation Type Patterns

**Decision**: Implement regex patterns for each annotation type based on shapes.rep analysis.

### CIRCLE
```
;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 test circle
;CIRCLE: SYMBOL LAT_DMS LON_DMS RADIUS_M LABEL
```

### RECT
```
;RECT: @A 21.4 0 0 N 21.5 0 0 W 21.5 0 0 N 21.6 0 0 W test rectangle
;RECT: SYMBOL CORNER1_LAT CORNER1_LON CORNER2_LAT CORNER2_LON LABEL
```

### LINE
```
;LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W test line
;LINE: SYMBOL START_LAT START_LON END_LAT END_LON LABEL
```

### VECTOR
```
;VECTOR: @C 21.6 12 0 N 21.5 11 0 W 5000 270 test vector
;VECTOR: SYMBOL ORIGIN_LAT ORIGIN_LON RANGE_M BEARING_DEG LABEL
```

### TEXT
```
;TEXT: @E 21.7 0 0 N 21.5 0 0 W test text
;TEXT: SYMBOL LAT_DMS LON_DMS TEXT
```

### POLY
```
;POLY: @GA30 21.9 0 0 N 21.5 0 0 W 22 0 0 N 21.8 0 0 W 22.1 0 0 N 21.5 0 0 W test\npoly
;POLY: SYMBOL VERTEX1_LAT VERTEX1_LON [VERTEX2...] LABEL
```

### POLYLINE
```
;POLYLINE: @C 21.1 0 0 N 21.5 0 0 W 21.2 0 0 N 21.8 0 0 W 21.3 0 0 N 21.5 0 0 W test\npolyline
;POLYLINE: SYMBOL VERTEX1_LAT VERTEX1_LON [VERTEX2...] LABEL
```

### ELLIPSE
```
;ELLIPSE: @F[LAYER=TUAs] 951212 055200 21.4 0 0 N 21.1 0 0 W 65.0 5000 3000 test ellipse
;ELLIPSE: SYMBOL YYMMDD HHMMSS LAT_DMS LON_DMS ORIENTATION_DEG MAJOR_M MINOR_M LABEL
```

### ELLIPSE2 (with time range)
```
;ELLIPSE2: @G[LAYER=TUAs] 951212 060400 951212 061200 21.9 0 0 N 21.5 0 0 W 85.0 6000 2000 test ellipse 2
;ELLIPSE2: SYMBOL START_DATE START_TIME END_DATE END_TIME LAT LON ORIENTATION MAJOR MINOR LABEL
```

### TIMETEXT
```
;TIMETEXT: @C 951212 050200 21.7 0 0 N 21.7 0 0 W test timetext
;TIMETEXT: SYMBOL YYMMDD HHMMSS LAT_DMS LON_DMS TEXT
```

### PERIODTEXT
```
;PERIODTEXT: @C 951212 050200 951212 060200 21.7 0 0 N 21.2 0 0 W test period 1
;PERIODTEXT: SYMBOL START_DATE START_TIME END_DATE END_TIME LAT LON TEXT
```

### WHEEL
```
;WHEEL: @C 951212 050200 21.3 0 0 N 21.5 0 0 W 200 1500 test wheel
;WHEEL: SYMBOL YYMMDD HHMMSS LAT_DMS LON_DMS INNER_RADIUS OUTER_RADIUS LABEL
```

### NARRATIVE
```
;NARRATIVE: 951212 050200 NEL_STYLE comment text
;NARRATIVE: YYMMDD HHMMSS TRACK_NAME TEXT
```

### NARRATIVE2
```
;NARRATIVE2: 951212 050500 NEL_STYLE GenComment2 Mk Rge BAAA R121212
;NARRATIVE2: YYMMDD HHMMSS TRACK_NAME ENTRY_TYPE TEXT
```

### DYNAMIC_RECT
```
;DYNAMIC_RECT: @A "Dynamic A" 951212 051000.000 22 00 0 N 21 00 0 W 21 50 0 N 20 50 0 W dynamic A rect 1
;DYNAMIC_RECT: SYMBOL "NAME" YYMMDD HHMMSS.SSS CORNER1_LAT CORNER1_LON CORNER2_LAT CORNER2_LON LABEL
```

### DYNAMIC_CIRCLE
```
;DYNAMIC_CIRCLE: @A "Dynamic A" 951212 052100.000 21 00 0 N 20 53 0 W 2000 dynamic A circ 12
;DYNAMIC_CIRCLE: SYMBOL "NAME" YYMMDD HHMMSS.SSS LAT_DMS LON_DMS RADIUS_M LABEL
```

### DYNAMIC_POLY
```
;DYNAMIC_POLY: @A "Dynamic A" 951212 052600.000 20 35 0 N 21 02 0 W 20 35 0 N 20 55 0 W ... label
;DYNAMIC_POLY: SYMBOL "NAME" YYMMDD HHMMSS.SSS VERTICES... LABEL
```

### SENSOR
```
;SENSOR: 951212 051100 "NEL STYLE" @A 22 2 27.78 N 21 1 13.78 W -13.9 12000 Plain Cookie SUBJECT held on Plain Cookie
;SENSOR: YYMMDD HHMMSS "TRACK" SYMBOL LAT LON BEARING RANGE SENSOR_TYPE LABEL
```

### SENSOR2
```
;SENSOR2: 951212 051400.000 NEL_STYLE2 @B NULL 59.3 300.8 49.96 NULL SENSOR Contact_bearings 0414
;SENSOR2: YYMMDD HHMMSS.SSS TRACK SYMBOL FREQ? BEARING? RANGE? SPEED? DEPTH? TYPE LABEL
```

### TMA_POS
```
;TMA_POS: 951212 051200.000 "NEL STYLE" @E 22 12 10.14 N 21 34 27.62 W TARGET 130 800 300 012 4 100 800x300
;TMA_POS: YYMMDD HHMMSS.SSS "TRACK" SYMBOL LAT LON TARGET_NAME ORIENT MAJOR MINOR COURSE SPEED DEPTH LABEL
```

### TMA_RB (Range/Bearing)
```
;TMA_RB: 951212 052200 "NEL STYLE" S@ 124.5 12000 TRACK_061 NULL 050 12.4 100 Trial label
;TMA_RB: YYMMDD HHMMSS "TRACK" SYMBOL BEARING RANGE TARGET_NAME NULL? COURSE SPEED DEPTH LABEL
```

### TRACKSPLIT
```
;TRACKSPLIT 951212 050210.000 NEL_STYLE2
;TRACKSPLIT YYMMDD HHMMSS.SSS TRACK_NAME
```

## Decision 5: DMS Coordinate Parsing

**Decision**: Extract and reuse existing DMS parsing from `rep.py`.

**Rationale**: The existing REP handler already has proven DMS parsing logic. Extract it into a shared module.

**Format**: `DD MM SS.S H` where H is N/S for latitude, E/W for longitude.

**Pattern**:
```python
DMS_PATTERN = re.compile(
    r'(\d+)\s+(\d+)\s+([\d.]+)\s+([NSEW])'
)
```

**Conversion**:
```python
def dms_to_decimal(degrees: int, minutes: int, seconds: float, hemisphere: str) -> float:
    decimal = degrees + minutes / 60 + seconds / 3600
    if hemisphere in ('S', 'W'):
        decimal = -decimal
    return decimal
```

## Decision 6: Timestamp Parsing

**Decision**: Support both YYMMDD HHMMSS and YYMMDD HHMMSS.SSS formats.

**Rationale**: Test fixtures show both formats in use.

**Year Conversion**:
- 50-99 → 1950-1999
- 00-49 → 2000-2049

**Pattern**:
```python
TIMESTAMP_PATTERN = re.compile(
    r'(\d{6})\s+(\d{6}(?:\.\d+)?)'
)
```

## Decision 7: Fail-Fast Error Handling

**Decision**: Raise `ParseError` immediately on invalid data.

**Rationale**: Per clarification session, fail-fast allows analysts to fix source data. Error messages must include filename, line number, and description.

**Error Cases**:
1. Unknown symbol code (not A-Q)
2. Missing symbol code
3. Invalid coordinates (out of range)
4. Malformed timestamp
5. Missing required fields
6. Invalid quoted name in DYNAMIC annotations

**Error Format**:
```
ParseError: Invalid symbol code 'Z' at line 42 in file.rep. Valid codes are A-Q.
```

## Decision 8: Feature Type to Geometry Mapping

**Decision**: Map annotation types to appropriate GeoJSON geometry types.

| Annotation | Geometry | Styling Schema |
|------------|----------|----------------|
| NARRATIVE | Point (optional, can be null) | PointProperties |
| TEXT | Point | PointProperties |
| TIMETEXT | Point | PointProperties |
| PERIODTEXT | Point | PointProperties |
| LINE | LineString | LineProperties |
| VECTOR | LineString | LineProperties |
| POLYLINE | LineString | LineProperties |
| CIRCLE | Polygon (approximated) | PolygonProperties |
| RECT | Polygon | PolygonProperties |
| POLY | Polygon | PolygonProperties |
| ELLIPSE | Polygon (approximated) | PolygonProperties |
| WHEEL | Polygon (annulus, approx) | PolygonProperties |
| DYNAMIC_RECT | Polygon (with time) | PolygonProperties |
| DYNAMIC_CIRCLE | Polygon (with time) | PolygonProperties |
| DYNAMIC_POLY | Polygon (with time) | PolygonProperties |

## Decision 9: Schema Updates Required

**Decision**: Add `legacyStyle` attribute to `PointProperties` in styling.yaml.

**Change**:
```yaml
# In shared/schemas/src/linkml/styling.yaml
PointProperties:
  attributes:
    # ... existing attributes ...
    legacy_style:
      description: Legacy symbol name for future icon rendering (e.g., 'Aircraft', 'torpedo')
      range: string
      # Not required - optional field
```

**Regeneration Required**: After schema change, regenerate:
- Pydantic models
- JSON Schema
- TypeScript types

## Decision 10: Test Fixture Strategy

**Decision**: Use existing shapes.rep and narrative.rep as primary test fixtures.

**Rationale**: These files contain comprehensive examples of all annotation types. Per clarification, REP format is stable/legacy.

**Additional Test Cases Needed**:
- Invalid symbol codes (expect fail-fast)
- Missing symbol codes (expect fail-fast)
- Out-of-range coordinates (expect fail-fast)
- Malformed timestamps (expect fail-fast)
- Missing quoted names in DYNAMIC (expect fail-fast)

## Open Items

None - all technical decisions resolved.

## References

1. Debrief Symbology Reference: https://debrief.github.io/tutorial/reference.html#replay_symbology
2. Existing REP handler: `services/io/src/debrief_io/handlers/rep.py`
3. Annotation schemas: `shared/schemas/src/linkml/annotations.yaml`
4. Styling schemas: `shared/schemas/src/linkml/styling.yaml`
5. Test fixtures: `services/io/tests/fixtures/valid/shapes.rep`
