# Quickstart: GeoJSON Styling Properties

## Overview

This guide shows how to use the Debrief styling schemas to add consistent visual styling to GeoJSON features.

## Styling Schema Types

| Schema | Use For | Geometry Types |
|--------|---------|----------------|
| `PointProperties` | Markers, symbols | Point, MultiPoint |
| `LineProperties` | Paths, lines | LineString, MultiLineString |
| `PolygonProperties` | Areas, regions | Polygon, MultiPolygon |
| `TrackStyle` | Vessel tracks | LineString (composite: line + markers) |

## Basic Usage

### Styling a Reference Point

```json
{
  "type": "Feature",
  "id": "waypoint-001",
  "geometry": {
    "type": "Point",
    "coordinates": [-4.1234, 50.5678]
  },
  "properties": {
    "kind": "POINT",
    "name": "Alpha Waypoint",
    "location_type": "WAYPOINT",
    "style": {
      "shape": "circle",
      "radius": 8,
      "fill": true,
      "fill_color": "#FF5733",
      "fill_opacity": 0.8,
      "stroke": true,
      "color": "#000000",
      "weight": 2,
      "opacity": 1.0
    }
  }
}
```

### Styling a Track

Tracks have composite styling for both the line path and position markers:

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-4.1, 50.5], [-4.2, 50.6], [-4.3, 50.7]]
  },
  "properties": {
    "kind": "TRACK",
    "platform_id": "HMS-EXAMPLE",
    "track_type": "OWNSHIP",
    "start_time": "2026-01-20T09:00:00Z",
    "end_time": "2026-01-20T12:00:00Z",
    "positions": [...],
    "style": {
      "line": {
        "stroke": true,
        "color": "#0066CC",
        "weight": 3,
        "opacity": 1.0,
        "line_cap": "round",
        "line_join": "round",
        "dash_array": null
      },
      "point": {
        "shape": "circle",
        "radius": 4,
        "fill": true,
        "fill_color": "#0066CC",
        "fill_opacity": 1.0,
        "stroke": true,
        "color": "#FFFFFF",
        "weight": 1,
        "opacity": 1.0
      }
    }
  }
}
```

### Styling a Circle Annotation

```json
{
  "type": "Feature",
  "id": "circle-001",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[...]]
  },
  "properties": {
    "kind": "CIRCLE",
    "center": [-4.1234, 50.5678],
    "radius": 5000,
    "label": "Exercise Area",
    "style": {
      "fill": true,
      "fill_color": "#FFCC00",
      "fill_opacity": 0.3,
      "stroke": true,
      "color": "#FF9900",
      "weight": 2,
      "opacity": 1.0,
      "line_cap": "round",
      "line_join": "round",
      "dash_array": "10, 5"
    }
  }
}
```

## Property Reference

### Common Properties

| Property | Type | Description |
|----------|------|-------------|
| `stroke` | boolean | Enable/disable outline |
| `color` | CSSColor | Outline color |
| `weight` | float | Outline width (px) |
| `opacity` | float | Outline transparency (0-1) |
| `fill` | boolean | Enable/disable fill |
| `fill_color` | CSSColor | Fill color |
| `fill_opacity` | float | Fill transparency (0-1) |

### Line-Specific Properties

| Property | Type | Values |
|----------|------|--------|
| `line_cap` | enum | `butt`, `round`, `square` |
| `line_join` | enum | `miter`, `round`, `bevel` |
| `dash_array` | string | SVG pattern, e.g., `"5, 10"` |

### Point-Specific Properties

| Property | Type | Values |
|----------|------|--------|
| `shape` | enum | `circle`, `square`, `triangle` |
| `radius` | float | Size in pixels |

## Color Formats

All color properties accept CSS color strings:

```json
"#F00"                  // 3-digit hex
"#FF0000"               // 6-digit hex
"#FF0000FF"             // 8-digit hex (with alpha)
"red"                   // Named color
"rgb(255, 0, 0)"        // RGB
"rgba(255, 0, 0, 0.5)"  // RGBA
"hsl(0, 100%, 50%)"     // HSL
"hsla(0, 100%, 50%, 0.5)" // HSLA
```

## Validation

### Python (Pydantic)

```python
from debrief_schemas import PointProperties, LineProperties, TrackStyle

# Valid styling
point_style = PointProperties(
    shape="circle",
    radius=6,
    fill=True,
    fill_color="#FF5733",
    fill_opacity=0.8,
    stroke=True,
    color="#000000",
    weight=2,
    opacity=1.0
)

# Invalid: opacity out of range
try:
    bad_style = LineProperties(
        color="#0066CC",
        opacity=1.5  # ValidationError: opacity must be <= 1
    )
except ValidationError as e:
    print(e)
```

### TypeScript (JSON Schema)

```typescript
import Ajv from 'ajv';
import pointSchema from './PointProperties.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(pointSchema);

const style = {
  shape: 'circle',
  radius: 6,
  fill_color: '#FF5733',
  color: '#000000'
};

if (validate(style)) {
  console.log('Valid styling');
} else {
  console.log('Invalid:', validate.errors);
}
```

## Feature-to-Style Mapping

| Feature Type | Style Property | Style Schema |
|--------------|----------------|--------------|
| TrackFeature | `style` | TrackStyle |
| ReferenceLocation | `style` | PointProperties |
| NarrativeEntry | `style` | PointProperties |
| CircleAnnotation | `style` | PolygonProperties |
| RectangleAnnotation | `style` | PolygonProperties |
| LineAnnotation | `style` | LineProperties |
| TextAnnotation | `style` | PointProperties |
| VectorAnnotation | `style` | LineProperties |

## Next Steps

1. See `data-model.md` for full schema definitions
2. See `research.md` for design decisions and rationale
3. Check `shared/schemas/src/fixtures/` for more examples
