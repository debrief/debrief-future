# Usage Example: REP File Special Comments

This document demonstrates how to parse REP files containing annotations using the debrief-io library.

## Basic Usage

```python
from debrief_io import parse_rep

# Parse a REP file with both tracks and annotations
result = parse_rep("track_with_annotations.rep")

# Result contains tracks AND annotations as GeoJSON features
print(f"Total features: {len(result.features)}")

# Separate tracks from annotations
tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
annotations = [f for f in result.features if f["properties"]["kind"] != "TRACK"]

print(f"Tracks: {len(tracks)}")
print(f"Annotations: {len(annotations)}")
```

## Sample REP File with Annotations

```rep
;NARRATIVE: 951212 050200 NELSON POSSUB TRACK 14
;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 search area
;RECT: @A 21.4 0 0 N 21.5 0 0 W 21.5 0 0 N 21.6 0 0 W boundary
;LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W reference line
;VECTOR: @C 21.6 12 0 N 21.5 11 0 W 5000 270 test vector
;TEXT: @E 21.7 0 0 N 21.5 0 0 W waypoint alpha

951212 050200.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 050300.000 NELSON @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
```

## Processing Annotations by Type

```python
from debrief_io import parse_rep

result = parse_rep("mixed_content.rep")

# Group annotations by kind
by_kind = {}
for feature in result.features:
    kind = feature["properties"]["kind"]
    if kind not in by_kind:
        by_kind[kind] = []
    by_kind[kind].append(feature)

# Process each type
for kind, features in by_kind.items():
    print(f"\n{kind}: {len(features)} features")

    if kind == "TRACK":
        for track in features:
            props = track["properties"]
            print(f"  - {props['platform_id']}: {props['start_time']} to {props['end_time']}")

    elif kind == "NARRATIVE":
        for narrative in features:
            props = narrative["properties"]
            print(f"  - [{props['time']}] {props['track_id']}: {props['text']}")

    elif kind == "CIRCLE":
        for circle in features:
            props = circle["properties"]
            print(f"  - {props['label']}: radius={props['radius']}m at {props['center']}")

    elif kind in ("RECTANGLE", "LINE"):
        for shape in features:
            props = shape["properties"]
            print(f"  - {props.get('label', 'unlabeled')}: {shape['geometry']['type']}")
```

## Annotation GeoJSON Output Format

### NARRATIVE
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": null,
  "properties": {
    "kind": "NARRATIVE",
    "time": "1995-12-12T05:02:00+00:00",
    "text": "POSSUB TRACK 14",
    "track_id": "NELSON",
    "source_file": "track.rep",
    "line_number": 1
  }
}
```

### CIRCLE
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...32 points approximating circle...]]
  },
  "properties": {
    "kind": "CIRCLE",
    "center": [-21.0, 21.8],
    "radius": 2000,
    "label": "search area",
    "symbol": "D",
    "style": {
      "fill": true,
      "fill_color": "#FFFF00",
      "fill_opacity": 0.3,
      "stroke": true,
      "color": "#FFFF00",
      "weight": 1,
      "opacity": 1.0
    },
    "source_file": "track.rep",
    "line_number": 2
  }
}
```

### RECT
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon1, lat1], [lon2, lat1], [lon2, lat2], [lon1, lat2], [lon1, lat1]]]
  },
  "properties": {
    "kind": "RECTANGLE",
    "label": "boundary",
    "symbol": "A",
    "style": {...},
    "source_file": "track.rep",
    "line_number": 3
  }
}
```

### LINE
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": {
    "type": "LineString",
    "coordinates": [[start_lon, start_lat], [end_lon, end_lat]]
  },
  "properties": {
    "kind": "LINE",
    "label": "reference line",
    "symbol": "B",
    "style": {...},
    "source_file": "track.rep",
    "line_number": 4
  }
}
```

### VECTOR
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": {
    "type": "LineString",
    "coordinates": [[origin_lon, origin_lat], [computed_end_lon, computed_end_lat]]
  },
  "properties": {
    "kind": "VECTOR",
    "origin": [origin_lon, origin_lat],
    "range": 5000,
    "bearing": 270,
    "label": "test vector",
    "symbol": "C",
    "style": {...},
    "source_file": "track.rep",
    "line_number": 5
  }
}
```

### TEXT
```json
{
  "type": "Feature",
  "id": "uuid-goes-here",
  "geometry": {
    "type": "Point",
    "coordinates": [lon, lat]
  },
  "properties": {
    "kind": "TEXT",
    "text": "waypoint alpha",
    "symbol": "E",
    "style": {...},
    "source_file": "track.rep",
    "line_number": 6
  }
}
```

## Error Handling

```python
from debrief_io import parse_rep
from debrief_io.exceptions import AnnotationParseError

try:
    result = parse_rep("malformed.rep")
except AnnotationParseError as e:
    print(f"Parse error at line {e.line_number}: {e.message}")
    print(f"Annotation type: {e.annotation_type}")
    print(f"Error code: {e.code}")
```

## Symbol Codes

The library supports all standard REP symbol formats:

| Format | Example | Description |
|--------|---------|-------------|
| Simple | `@A` | Color code only (A=Red) |
| Extended | `@BA10` | Color + line style + thickness + fill |
| With attributes | `@A[LAYER=x,SYMBOL=y]` | Color with layer/icon attributes |
| SVG-style | `aB` | Lowercase prefix for SVG icons |
| Digit-prefix | `0B[LAYER=Buoys]` | Digit prefix for buoy types |

## Symbol Color Codes

| Code | Color | CSS |
|------|-------|-----|
| A | Red | #FF0000 |
| B | Orange | #FF7F00 |
| C | Yellow | #FFFF00 |
| D | Lime | #7FFF00 |
| E | Green | #00FF00 |
| F | Spring Green | #00FF7F |
| G | Cyan | #00FFFF |
| H | Azure | #007FFF |
| I | Blue | #0000FF |
| J | Violet | #7F00FF |
| K | Magenta | #FF00FF |
| L | Rose | #FF007F |
| M | White | #FFFFFF |
| N | Light Gray | #C0C0C0 |
| O | Gray | #808080 |
| P | Dark Gray | #404040 |
| Q | Black | #000000 |
