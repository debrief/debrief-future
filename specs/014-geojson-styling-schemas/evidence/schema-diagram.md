# Schema Diagram: GeoJSON Styling Properties

## Entity Relationship Diagram

```
                         STYLING SCHEMAS
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐ │
│  │ PointProperties │    │ LineProperties  │    │PolygonProperties│ │
│  ├─────────────────┤    ├─────────────────┤    ├─────────────────┤ │
│  │ shape: Enum     │    │ stroke: bool    │    │ fill: bool      │ │
│  │ radius: float   │    │ color: CSSColor │    │ fill_color: CSS │ │
│  │ fill: bool      │    │ weight: float   │    │ fill_opacity: f │ │
│  │ fill_color: CSS │    │ opacity: float  │    │ stroke: bool    │ │
│  │ fill_opacity: f │    │ line_cap: Enum  │    │ color: CSSColor │ │
│  │ stroke: bool    │    │ line_join: Enum │    │ weight: float   │ │
│  │ color: CSSColor │    │ dash_array: str │    │ opacity: float  │ │
│  │ weight: float   │    └─────────────────┘    │ line_cap: Enum  │ │
│  │ opacity: float  │                           │ line_join: Enum │ │
│  └─────────────────┘                           │ dash_array: str │ │
│         │                      │               └─────────────────┘ │
│         │                      │                        │          │
│         └──────────┬───────────┘                        │          │
│                    │                                    │          │
│              ┌─────▼─────┐                              │          │
│              │TrackStyle │◄─────────────────────────────┘          │
│              ├───────────┤                                         │
│              │ line: ────┼──► LineProperties                       │
│              │ point: ───┼──► PointProperties                      │
│              └───────────┘                                         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Feature-to-Style Mapping

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FEATURE SCHEMAS                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  TrackFeature ──────────────────────► TrackStyle (composite)       │
│                                                                     │
│  ReferenceLocation ────────────────► PointProperties               │
│                                                                     │
│  NarrativeEntry ───────────────────► PointProperties               │
│                                                                     │
│  CircleAnnotation ─────────────────► PolygonProperties             │
│                                                                     │
│  RectangleAnnotation ──────────────► PolygonProperties             │
│                                                                     │
│  LineAnnotation ───────────────────► LineProperties                │
│                                                                     │
│  TextAnnotation ───────────────────► PointProperties               │
│                                                                     │
│  VectorAnnotation ─────────────────► LineProperties                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Enum Values

### PointShapeEnum
```
circle  │  square  │  triangle
```

### LineCapEnum
```
butt  │  round  │  square
```

### LineJoinEnum
```
miter  │  round  │  bevel
```

## Type Constraints

| Property | Type | Constraints |
|----------|------|-------------|
| shape | PointShapeEnum | Required, enum values |
| radius | float | >= 0 |
| fill | boolean | Optional, default true |
| fill_color | CSSColor | Required, pattern match |
| fill_opacity | float | 0-1 |
| stroke | boolean | Optional, default true |
| color | CSSColor | Required, pattern match |
| weight | float | >= 0 |
| opacity | float | 0-1 |
| line_cap | LineCapEnum | Optional |
| line_join | LineJoinEnum | Optional |
| dash_array | string | SVG pattern or null |

## CSSColor Pattern

```regex
^(#[0-9A-Fa-f]{3,8}|[a-zA-Z]+|rgb\(.+\)|rgba\(.+\)|hsl\(.+\)|hsla\(.+\))$
```

Valid examples:
- `#F00`, `#FF0000`, `#FF0000FF` (hex)
- `red`, `blue`, `transparent` (named)
- `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)` (rgb/rgba)
- `hsl(0, 100%, 50%)`, `hsla(0, 100%, 50%, 0.5)` (hsl/hsla)
