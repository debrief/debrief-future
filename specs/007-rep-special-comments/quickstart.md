# Quickstart: REP File Special Comments

**Feature**: 007-rep-special-comments | **Date**: 2026-01-21

## Overview

This guide shows how to use the enhanced REP parser to extract annotations from REP files.

## Basic Usage

### Parse a REP File with Annotations

```python
from debrief_io import parse

# Parse a REP file - returns tracks AND annotations
result = parse("path/to/exercise.rep")

# Access track features (existing behavior)
tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]

# Access annotation features (new!)
annotations = [f for f in result.features if f["properties"]["kind"] != "TRACK"]

# Filter by annotation type
narratives = [f for f in result.features if f["properties"]["kind"] == "NARRATIVE"]
circles = [f for f in result.features if f["properties"]["kind"] == "CIRCLE"]
rectangles = [f for f in result.features if f["properties"]["kind"] == "RECTANGLE"]
```

### Check Parse Results

```python
from debrief_io import parse

result = parse("path/to/file.rep")

# Metadata
print(f"Handler: {result.handler}")
print(f"Parse time: {result.parse_time_ms}ms")
print(f"Encoding: {result.encoding}")

# Features
print(f"Total features: {len(result.features)}")
print(f"Tracks: {len([f for f in result.features if f['properties']['kind'] == 'TRACK'])}")
print(f"Annotations: {len([f for f in result.features if f['properties']['kind'] != 'TRACK'])}")

# Errors (fail-fast means this will be empty on success)
if result.warnings:
    for w in result.warnings:
        print(f"Warning: {w.message} (line {w.line_number})")
```

## Annotation Feature Structure

### Narrative Entry

```python
{
    "type": "Feature",
    "id": "uuid-here",
    "geometry": None,  # or Point for display position
    "properties": {
        "kind": "NARRATIVE",
        "time": "1995-12-12T05:02:00Z",
        "text": "POSSUB TRACK 14",
        "track_id": "NELSON",
        "symbol": "C",
        "style": {
            "shape": "circle",
            "radius": 5,
            "fill_color": "#FF0000",
            "color": "#FF0000",
            # ... other PointProperties
        },
        "source_file": "/path/to/file.rep",
        "line_number": 42
    }
}
```

### Circle Annotation

```python
{
    "type": "Feature",
    "id": "uuid-here",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[...], [...], ...]]  # Approximated circle
    },
    "properties": {
        "kind": "CIRCLE",
        "center": [-21.0, 21.8],  # [lon, lat] for reconstruction
        "radius": 2000,  # meters
        "label": "test circle",
        "symbol": "D",
        "style": {
            "fill": True,
            "fill_color": "#FFFF00",
            "fill_opacity": 0.3,
            "stroke": True,
            "color": "#FFFF00",
            "weight": 1,
            # ... other PolygonProperties
        },
        "source_file": "/path/to/file.rep",
        "line_number": 15
    }
}
```

### Rectangle Annotation

```python
{
    "type": "Feature",
    "id": "uuid-here",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[lon1, lat1], [lon2, lat1], [lon2, lat2], [lon1, lat2], [lon1, lat1]]]
    },
    "properties": {
        "kind": "RECTANGLE",
        "label": "test rectangle",
        "symbol": "A",
        "style": {
            "fill": True,
            "fill_color": "#0000FF",
            # ... other PolygonProperties
        },
        "source_file": "/path/to/file.rep",
        "line_number": 1
    }
}
```

### Line Annotation

```python
{
    "type": "Feature",
    "id": "uuid-here",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-21.166667, 20.833333], [-21.166667, 22.0]]
    },
    "properties": {
        "kind": "LINE",
        "label": "test line",
        "symbol": "B",
        "style": {
            "stroke": True,
            "color": "#00FF00",
            "weight": 1,
            # ... other LineProperties
        },
        "source_file": "/path/to/file.rep",
        "line_number": 3
    }
}
```

### Vector Annotation

```python
{
    "type": "Feature",
    "id": "uuid-here",
    "geometry": {
        "type": "LineString",
        "coordinates": [[origin_lon, origin_lat], [endpoint_lon, endpoint_lat]]
    },
    "properties": {
        "kind": "VECTOR",
        "origin": [-21.183333, 21.2],  # [lon, lat]
        "range": 5000,  # meters
        "bearing": 270,  # degrees from north
        "label": "test vector",
        "symbol": "C",
        "style": {
            "stroke": True,
            "color": "#FF0000",
            # ... other LineProperties
        },
        "source_file": "/path/to/file.rep",
        "line_number": 5
    }
}
```

## Error Handling

The parser uses fail-fast error handling. Invalid data raises `ParseError`:

```python
from debrief_io import parse
from debrief_io.exceptions import ParseError

try:
    result = parse("path/to/file.rep")
except ParseError as e:
    print(f"Error: {e}")
    # Example: "Invalid symbol code 'Z' at line 42 in path/to/file.rep. Valid codes are A-Q."
```

### Common Error Cases

| Error | Example Message |
|-------|-----------------|
| Unknown symbol code | `Invalid symbol code 'Z' at line 42. Valid codes are A-Q.` |
| Missing symbol code | `Missing symbol code at line 15. All annotations require a symbol.` |
| Invalid coordinates | `Invalid latitude 95.5 at line 23. Must be between -90 and 90.` |
| Malformed timestamp | `Invalid timestamp '999999 250000' at line 8.` |
| Missing quoted name | `Missing quoted name in DYNAMIC_RECT at line 50.` |

## Symbology Reference

### Color Codes

| Code | Color | CSS |
|------|-------|-----|
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

### Symbol Code Formats

```
@A           - Simple: color A (Blue)
@A@00        - Extended: color A, solid line, hairwidth, no fill
@BA10        - Extended: color B, dotted, 1px, solid fill
@C[LAYER=X]  - With layer attribute
@C[SYMBOL=missile]  - With SVG symbol
@C[LAYER=X,SYMBOL=missile]  - Combined
```

## Integration Example

```python
import json
from debrief_io import parse

# Parse REP file
result = parse("exercise.rep")

# Separate tracks and annotations
tracks = []
annotations = []

for feature in result.features:
    if feature["properties"]["kind"] == "TRACK":
        tracks.append(feature)
    else:
        annotations.append(feature)

# Create FeatureCollection for each
track_collection = {
    "type": "FeatureCollection",
    "features": tracks
}

annotation_collection = {
    "type": "FeatureCollection",
    "features": annotations
}

# Save to files
with open("tracks.geojson", "w") as f:
    json.dump(track_collection, f, indent=2)

with open("annotations.geojson", "w") as f:
    json.dump(annotation_collection, f, indent=2)

print(f"Exported {len(tracks)} tracks and {len(annotations)} annotations")
```
