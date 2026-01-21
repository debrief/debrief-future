# Data Model: REP File Special Comments

**Feature**: 007-rep-special-comments | **Date**: 2026-01-21

## Overview

This document defines the internal data structures for parsing REP file special comments. The parser produces GeoJSON features conforming to the annotation schemas in `shared/schemas/src/linkml/annotations.yaml`.

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REP File Parsing                            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ParsedSymbol                                 │
│  ─────────────────────────────────────────────────────────────────  │
│  color_code: str          # A-Q                                     │
│  symbol_char: str | None  # Internal symbol (A-Z) or SVG (a-z)     │
│  line_style: str | None   # @=solid, A=dotted, B=dot-dash, etc.    │
│  thickness: int | None    # 0-5 pixels                              │
│  fill_style: int | None   # 0=none, 1=solid, 2=semi-transparent    │
│  layer: str | None        # LAYER attribute from [...]              │
│  legacy_style: str | None # SYMBOL attribute (e.g., 'missile')     │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │PointProperties│  │LineProperties│  │PolygonProperties│
         │  (Styling)    │  │  (Styling)   │  │   (Styling)   │
         └──────────────┘  └──────────────┘  └──────────────┘
                    │              │              │
                    ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Annotation Features                             │
│  ─────────────────────────────────────────────────────────────────  │
│  NarrativeEntry    │ CircleAnnotation  │ RectangleAnnotation       │
│  TextAnnotation    │ LineAnnotation    │ VectorAnnotation          │
│  (+ temporal variants: TimeText, PeriodText, Ellipse, etc.)        │
└─────────────────────────────────────────────────────────────────────┘
```

## Intermediate Parsing Entities

### ParsedSymbol

Parsed representation of the symbol code from REP format.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `color_code` | `str` | Yes | Color code (A-Q) |
| `symbol_char` | `str \| None` | No | Internal (A-Z) or SVG (a-z) symbol character |
| `line_style` | `str \| None` | No | Line style: @/A/B/C/D/E |
| `thickness` | `int \| None` | No | Thickness in pixels (0-5) |
| `fill_style` | `int \| None` | No | Fill: 0=none, 1=solid, 2=semi |
| `layer` | `str \| None` | No | Layer name from [LAYER=...] |
| `legacy_style` | `str \| None` | No | Symbol name from [SYMBOL=...] |

**Validation Rules**:
- `color_code` must be A-Q (fail-fast if not)
- `thickness` must be 0-5 if present
- `fill_style` must be 0-2 if present

### ParsedCoordinate

Parsed DMS coordinate.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `degrees` | `int` | Yes | Degrees (0-90 for lat, 0-180 for lon) |
| `minutes` | `int` | Yes | Minutes (0-59) |
| `seconds` | `float` | Yes | Seconds (0-59.999...) |
| `hemisphere` | `str` | Yes | N/S for lat, E/W for lon |

**Derived**:
- `decimal` → computed from DMS

### ParsedTimestamp

Parsed REP timestamp.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `date_str` | `str` | Yes | YYMMDD format |
| `time_str` | `str` | Yes | HHMMSS or HHMMSS.SSS format |

**Derived**:
- `datetime` → Python datetime (UTC)
- `iso_string` → ISO8601 format string

### ParsedAnnotation (Base)

Common fields for all parsed annotations.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `annotation_type` | `str` | Yes | CIRCLE, RECT, LINE, etc. |
| `symbol` | `ParsedSymbol` | Yes | Parsed symbol data |
| `label` | `str \| None` | No | Text label |
| `line_number` | `int` | Yes | Source file line number |

## Annotation-Specific Entities

### ParsedCircle

| Field | Type | Description |
|-------|------|-------------|
| `center_lat` | `ParsedCoordinate` | Center latitude |
| `center_lon` | `ParsedCoordinate` | Center longitude |
| `radius_meters` | `float` | Radius in meters |

### ParsedRect

| Field | Type | Description |
|-------|------|-------------|
| `corner1_lat` | `ParsedCoordinate` | First corner latitude |
| `corner1_lon` | `ParsedCoordinate` | First corner longitude |
| `corner2_lat` | `ParsedCoordinate` | Second corner latitude |
| `corner2_lon` | `ParsedCoordinate` | Second corner longitude |

### ParsedLine

| Field | Type | Description |
|-------|------|-------------|
| `start_lat` | `ParsedCoordinate` | Start latitude |
| `start_lon` | `ParsedCoordinate` | Start longitude |
| `end_lat` | `ParsedCoordinate` | End latitude |
| `end_lon` | `ParsedCoordinate` | End longitude |

### ParsedVector

| Field | Type | Description |
|-------|------|-------------|
| `origin_lat` | `ParsedCoordinate` | Origin latitude |
| `origin_lon` | `ParsedCoordinate` | Origin longitude |
| `range_meters` | `float` | Length in meters |
| `bearing_degrees` | `float` | Bearing from north (0-360) |

### ParsedText

| Field | Type | Description |
|-------|------|-------------|
| `lat` | `ParsedCoordinate` | Position latitude |
| `lon` | `ParsedCoordinate` | Position longitude |
| `text` | `str` | Text content |

### ParsedPoly / ParsedPolyline

| Field | Type | Description |
|-------|------|-------------|
| `vertices` | `list[tuple[ParsedCoordinate, ParsedCoordinate]]` | List of (lat, lon) pairs |
| `closed` | `bool` | True for POLY, False for POLYLINE |

### ParsedEllipse

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `ParsedTimestamp` | Time of ellipse |
| `center_lat` | `ParsedCoordinate` | Center latitude |
| `center_lon` | `ParsedCoordinate` | Center longitude |
| `orientation_deg` | `float` | Orientation from north |
| `major_meters` | `float` | Major axis in meters |
| `minor_meters` | `float` | Minor axis in meters |

### ParsedNarrative

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `ParsedTimestamp` | Narrative time |
| `track_name` | `str` | Associated track |
| `text` | `str` | Narrative content |
| `entry_type` | `str \| None` | For NARRATIVE2, the entry type |

### ParsedDynamic (Base for DYNAMIC_*)

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Quoted name identifying the dynamic shape |
| `timestamp` | `ParsedTimestamp` | Time of this position |

### ParsedSensor

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `ParsedTimestamp` | Detection time |
| `track_name` | `str` | Ownship/sensor platform |
| `lat` | `ParsedCoordinate \| None` | Contact position (optional) |
| `lon` | `ParsedCoordinate \| None` | Contact position (optional) |
| `bearing` | `float \| None` | Bearing to contact |
| `range_meters` | `float \| None` | Range to contact |
| `sensor_type` | `str` | Type of sensor |

### ParsedTMA

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | `ParsedTimestamp` | Solution time |
| `track_name` | `str` | Ownship track |
| `target_name` | `str` | Target track name |
| `lat` | `ParsedCoordinate` | Solution position latitude |
| `lon` | `ParsedCoordinate` | Solution position longitude |
| `orientation_deg` | `float` | Ellipse orientation |
| `major_meters` | `float` | Major axis |
| `minor_meters` | `float` | Minor axis |
| `course` | `float \| None` | Target course |
| `speed` | `float \| None` | Target speed |
| `depth` | `float \| None` | Target depth |

## Output Feature Types

### GeoJSON Feature Structure

All annotations produce GeoJSON Features with this structure:

```python
{
    "type": "Feature",
    "id": str,  # UUID
    "geometry": {
        "type": "Point" | "LineString" | "Polygon",
        "coordinates": [...]
    },
    "properties": {
        "kind": str,  # NARRATIVE, CIRCLE, RECT, etc.
        "style": {...},  # PointProperties, LineProperties, or PolygonProperties
        "source_file": str,
        "line_number": int,
        # ... type-specific properties
    }
}
```

### Kind to Geometry Mapping

| Kind | Geometry Type | Style Type |
|------|---------------|------------|
| `NARRATIVE` | Point (or null) | PointProperties |
| `TEXT` | Point | PointProperties |
| `TIMETEXT` | Point | PointProperties |
| `PERIODTEXT` | Point | PointProperties |
| `CIRCLE` | Polygon | PolygonProperties |
| `RECTANGLE` | Polygon | PolygonProperties |
| `LINE` | LineString | LineProperties |
| `VECTOR` | LineString | LineProperties |
| `POLYLINE` | LineString | LineProperties |
| `POLYGON` | Polygon | PolygonProperties |
| `ELLIPSE` | Polygon | PolygonProperties |
| `WHEEL` | Polygon | PolygonProperties |
| `SENSOR` | Point | PointProperties |
| `TMA` | Polygon | PolygonProperties |

## Styling Property Generation

### Color Code to CSS

```python
COLOR_MAP = {
    'A': '#0000FF',  # Blue
    'B': '#00FF00',  # Green
    'C': '#FF0000',  # Red
    'D': '#FFFF00',  # Yellow
    'E': '#FF00FF',  # Magenta
    'F': '#FFA500',  # Orange
    'G': '#800080',  # Purple
    'H': '#00FFFF',  # Cyan
    'I': '#A52A2A',  # Brown
    'J': '#90EE90',  # Light Green
    'K': '#FFC0CB',  # Pink
    'L': '#FFD700',  # Gold
    'M': '#D3D3D3',  # Light Grey
    'N': '#808080',  # Grey
    'O': '#A9A9A9',  # Dark Grey
    'P': '#FFFFFF',  # White
    'Q': '#000000',  # Black
}
```

### Default Styling Values

When not specified in the symbol code:

| Property | Default |
|----------|---------|
| `shape` | `circle` |
| `radius` | `5` |
| `fill` | `true` |
| `fill_opacity` | `0.3` |
| `stroke` | `true` |
| `weight` | `1` |
| `opacity` | `1.0` |
| `line_cap` | `round` |
| `line_join` | `round` |

### Line Style to dash_array

```python
LINE_STYLE_MAP = {
    '@': None,           # Solid
    'A': '2, 4',         # Dotted
    'B': '4, 2, 2, 2',   # Dot-dash
    'C': '4, 4',         # Short dashes
    'D': '8, 4',         # Long dashes
    'E': '0, 8',         # Unconnected (gaps only)
}
```

### Fill Style to fill_opacity

```python
FILL_STYLE_MAP = {
    0: 0.0,   # No fill
    1: 1.0,   # Solid fill
    2: 0.5,   # Semi-transparent
}
```

## State Transitions

Annotations are stateless - they are parsed once and converted to GeoJSON features. No lifecycle management required.

## Validation Rules

### Coordinate Validation
- Latitude: -90.0 ≤ value ≤ 90.0
- Longitude: -180.0 ≤ value ≤ 180.0
- Fail-fast if out of range

### Symbol Validation
- Color code must be A-Q
- Fail-fast if unknown code

### Required Field Validation
- All annotations must have a symbol code
- All spatial annotations must have valid coordinates
- Fail-fast on missing required fields
