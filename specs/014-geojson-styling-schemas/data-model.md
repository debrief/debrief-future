# Data Model: GeoJSON Styling Properties Schemas

**Feature**: 014-geojson-styling-schemas
**Date**: 2026-01-20

## Entity Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         STYLING SCHEMAS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │ PointProperties │    │ LineProperties  │    │PolygonProperties│  │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤  │
│  │ shape: Enum     │    │ stroke: bool    │    │ fill: bool      │  │
│  │ radius: float   │    │ color: CSSColor │    │ fill_color: CSS │  │
│  │ fill: bool      │    │ weight: float   │    │ fill_opacity: f │  │
│  │ fill_color: CSS │    │ opacity: float  │    │ stroke: bool    │  │
│  │ fill_opacity: f │    │ line_cap: Enum  │    │ color: CSSColor │  │
│  │ stroke: bool    │    │ line_join: Enum │    │ weight: float   │  │
│  │ color: CSSColor │    │ dash_array: str │    │ opacity: float  │  │
│  │ weight: float   │    └─────────────────┘    │ line_cap: Enum  │  │
│  │ opacity: float  │                           │ line_join: Enum │  │
│  └─────────────────┘                           │ dash_array: str │  │
│         │                                      └─────────────────┘  │
│         │                      │                        │           │
│         └──────────┬───────────┘                        │           │
│                    │                                    │           │
│              ┌─────▼─────┐                              │           │
│              │TrackStyle │◄─────────────────────────────┘           │
│              ├───────────┤                                          │
│              │ line: ────┼──► LineProperties                        │
│              │ point: ───┼──► PointProperties                       │
│              └───────────┘                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Enums

### PointShapeEnum

Defines valid shapes for point markers.

| Value | Description | Use Case |
|-------|-------------|----------|
| `circle` | Filled/stroked circle | Default marker, contacts |
| `square` | Filled/stroked square | Reference points, waypoints |
| `triangle` | Filled/stroked triangle | Directional indicators |

### LineCapEnum

Defines how line endpoints are rendered (SVG/CSS standard).

| Value | Description |
|-------|-------------|
| `butt` | Flat edge at endpoint |
| `round` | Semicircle at endpoint |
| `square` | Square projection beyond endpoint |

### LineJoinEnum

Defines how line segment joints are rendered (SVG/CSS standard).

| Value | Description |
|-------|-------------|
| `miter` | Sharp corner (default) |
| `round` | Rounded corner |
| `bevel` | Flat corner |

## Entities

### PointProperties

Styling schema for Point and MultiPoint geometries.

| Attribute | Type | Required | Constraints | Default | Description |
|-----------|------|----------|-------------|---------|-------------|
| `shape` | PointShapeEnum | Yes | - | - | Marker shape |
| `radius` | float | Yes | >= 0 | - | Marker radius in pixels |
| `fill` | boolean | No | - | true | Whether to fill the shape |
| `fill_color` | CSSColor | Yes | Pattern match | - | Fill color |
| `fill_opacity` | float | No | 0-1 | 1.0 | Fill transparency |
| `stroke` | boolean | No | - | true | Whether to draw outline |
| `color` | CSSColor | Yes | Pattern match | - | Stroke color |
| `weight` | float | No | >= 0 | 2 | Stroke width in pixels |
| `opacity` | float | No | 0-1 | 1.0 | Stroke transparency |

### LineProperties

Styling schema for LineString and MultiLineString geometries.

| Attribute | Type | Required | Constraints | Default | Description |
|-----------|------|----------|-------------|---------|-------------|
| `stroke` | boolean | No | - | true | Whether to draw the line |
| `color` | CSSColor | Yes | Pattern match | - | Line color |
| `weight` | float | No | >= 0 | 3 | Line width in pixels |
| `opacity` | float | No | 0-1 | 1.0 | Line transparency |
| `line_cap` | LineCapEnum | No | - | "round" | Line endpoint style |
| `line_join` | LineJoinEnum | No | - | "round" | Line join style |
| `dash_array` | string | No | SVG format | null | Dash pattern (e.g., "5, 10") |

### PolygonProperties

Styling schema for Polygon and MultiPolygon geometries.

| Attribute | Type | Required | Constraints | Default | Description |
|-----------|------|----------|-------------|---------|-------------|
| `fill` | boolean | No | - | true | Whether to fill the polygon |
| `fill_color` | CSSColor | Yes | Pattern match | - | Fill color |
| `fill_opacity` | float | No | 0-1 | 0.2 | Fill transparency |
| `stroke` | boolean | No | - | true | Whether to draw border |
| `color` | CSSColor | Yes | Pattern match | - | Border color |
| `weight` | float | No | >= 0 | 3 | Border width in pixels |
| `opacity` | float | No | 0-1 | 1.0 | Border transparency |
| `line_cap` | LineCapEnum | No | - | "round" | Border endpoint style |
| `line_join` | LineJoinEnum | No | - | "round" | Border join style |
| `dash_array` | string | No | SVG format | null | Border dash pattern |

### TrackStyle

Composite styling for TrackFeature, supporting both line path and position markers.

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `line` | LineProperties | Yes | Styling for the track line path |
| `point` | PointProperties | Yes | Styling for position markers |

## Integration with Existing Schemas

### TrackProperties (Modified)

```diff
  TrackProperties:
    attributes:
      kind: TRACK
      platform_id: string (required)
      platform_name: string
      track_type: TrackTypeEnum (required)
      start_time: datetime (required)
      end_time: datetime (required)
      positions: TimestampedPosition[] (required)
      source_file: string
-     color: CSSColor
+     style: TrackStyle (required)
```

### ReferenceLocationProperties (Modified)

```diff
  ReferenceLocationProperties:
    attributes:
      kind: POINT
      name: string (required)
      location_type: LocationTypeEnum (required)
      description: string
      symbol: string
-     color: CSSColor
+     style: PointProperties (required)
      valid_from: datetime
      valid_until: datetime
```

### Annotation Properties (All Modified)

All annotation Properties classes gain a `style` attribute and lose their `color` attribute:

| Annotation Type | Style Type | Notes |
|-----------------|------------|-------|
| NarrativeEntryProperties | PointProperties | For optional display position |
| CircleAnnotationProperties | PolygonProperties | Circle rendered as polygon |
| RectangleAnnotationProperties | PolygonProperties | Rectangle is a polygon |
| LineAnnotationProperties | LineProperties | Line segment |
| TextAnnotationProperties | PointProperties | Text position marker |
| VectorAnnotationProperties | LineProperties | Vector rendered as line |

## Validation Rules

### CSSColor Pattern

Uses existing pattern from common.yaml:
```regex
^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$
```

Valid examples:
- `#F00`, `#FF0000`, `#FF0000FF`
- `red`, `blue`, `transparent`
- `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`
- `hsl(0, 100%, 50%)`, `hsla(0, 100%, 50%, 0.5)`

### Opacity Range

All opacity properties (opacity, fill_opacity) validated:
- Minimum: 0 (fully transparent)
- Maximum: 1 (fully opaque)

### Weight/Radius Non-Negative

- Minimum: 0 (valid for invisible rendering)
- No maximum (renderer handles)

## State Transitions

N/A - Styling schemas are immutable value objects with no state transitions.

## Example JSON

### PointProperties

```json
{
  "shape": "circle",
  "radius": 6,
  "fill": true,
  "fill_color": "#FF5733",
  "fill_opacity": 0.8,
  "stroke": true,
  "color": "#000000",
  "weight": 2,
  "opacity": 1.0
}
```

### LineProperties

```json
{
  "stroke": true,
  "color": "#0066CC",
  "weight": 3,
  "opacity": 1.0,
  "line_cap": "round",
  "line_join": "round",
  "dash_array": null
}
```

### TrackStyle

```json
{
  "line": {
    "stroke": true,
    "color": "#0066CC",
    "weight": 2,
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
```
