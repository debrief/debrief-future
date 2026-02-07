# Data Model: Shape Type Annotations

## Overview

This document defines the GeoJSON Feature structures for Phase 2 and Phase 3 annotation shape types. All shapes follow the established pattern from Phase 1 shapes (CIRCLE, RECT, LINE, etc.).

## Base Feature Structure

All annotation features share this structure:

```typescript
interface AnnotationFeature {
  type: "Feature";
  id: string;  // UUID v4
  geometry: Geometry | null;
  properties: {
    kind: string;  // Discriminator: "POLY", "ELLIPSE", etc.
    label?: string;
    symbol?: string;  // Original Debrief symbol code
    style: PointProperties | LineProperties | PolygonProperties;
    source_file: string;
    line_number: number;
    // Shape-specific properties below
  };
}
```

## Phase 2 Shapes

### PolyAnnotation (POLY)

Closed polygon with arbitrary vertices.

```typescript
interface PolyAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];  // Exterior ring, auto-closed
  };
  properties: {
    kind: "POLY";
    label?: string;
    vertex_count: number;
    style: PolygonProperties;
  };
}
```

### PolylineAnnotation (POLYLINE)

Open line with arbitrary vertices.

```typescript
interface PolylineAnnotation extends AnnotationFeature {
  geometry: {
    type: "LineString";
    coordinates: Position[];
  };
  properties: {
    kind: "POLYLINE";
    label?: string;
    vertex_count: number;
    style: LineProperties;
  };
}
```

### EllipseAnnotation (ELLIPSE)

Timed ellipse with rotation.

```typescript
interface EllipseAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];  // 32+ point approximation
  };
  properties: {
    kind: "ELLIPSE";
    center: Position;  // [lon, lat]
    semi_major: number;  // meters
    semi_minor: number;  // meters
    orientation: number;  // degrees, 0=North, clockwise
    timestamp: string;  // ISO 8601
    style: PolygonProperties;
  };
}
```

### Ellipse2Annotation (ELLIPSE2)

Ellipse with time range.

```typescript
interface Ellipse2Annotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];
  };
  properties: {
    kind: "ELLIPSE2";
    center: Position;
    semi_major: number;
    semi_minor: number;
    orientation: number;
    time_start: string;  // ISO 8601
    time_end: string;  // ISO 8601
    style: PolygonProperties;
  };
}
```

### TimeTextAnnotation (TIMETEXT)

Text label at specific time.

```typescript
interface TimeTextAnnotation extends AnnotationFeature {
  geometry: {
    type: "Point";
    coordinates: Position;
  };
  properties: {
    kind: "TIMETEXT";
    text: string;
    timestamp: string;  // ISO 8601
    style: PointProperties;
  };
}
```

### PeriodTextAnnotation (PERIODTEXT)

Text label with time range.

```typescript
interface PeriodTextAnnotation extends AnnotationFeature {
  geometry: {
    type: "Point";
    coordinates: Position;
  };
  properties: {
    kind: "PERIODTEXT";
    text: string;
    time_start: string;  // ISO 8601
    time_end: string;  // ISO 8601
    style: PointProperties;
  };
}
```

### WheelAnnotation (WHEEL)

Annular region (donut shape).

```typescript
interface WheelAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];  // [outer_ring, inner_ring]
  };
  properties: {
    kind: "WHEEL";
    center: Position;
    inner_radius: number;  // meters
    outer_radius: number;  // meters
    style: PolygonProperties;
  };
}
```

## Phase 3 Shapes

### DynamicRectAnnotation (DYNAMIC_RECT)

Time-varying rectangle, grouped by name.

```typescript
interface DynamicRectAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];  // 4 vertices
  };
  properties: {
    kind: "DYNAMIC_RECT";
    group_name: string;
    timestamp: string;  // ISO 8601 with milliseconds
    style: PolygonProperties;
  };
}
```

### DynamicCircleAnnotation (DYNAMIC_CIRCLE)

Time-varying circle, grouped by name.

```typescript
interface DynamicCircleAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];
  };
  properties: {
    kind: "DYNAMIC_CIRCLE";
    group_name: string;
    center: Position;
    radius: number;  // meters
    timestamp: string;
    style: PolygonProperties;
  };
}
```

### DynamicPolyAnnotation (DYNAMIC_POLY)

Time-varying polygon, grouped by name.

```typescript
interface DynamicPolyAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];
  };
  properties: {
    kind: "DYNAMIC_POLY";
    group_name: string;
    vertex_count: number;
    timestamp: string;
    style: PolygonProperties;
  };
}
```

### SensorAnnotation (SENSOR)

Contact detection with bearing/range.

```typescript
interface SensorAnnotation extends AnnotationFeature {
  geometry: {
    type: "LineString";
    coordinates: Position[];  // [observer, contact]
  };
  properties: {
    kind: "SENSOR";
    track_id: string;
    bearing: number;  // degrees
    range: number;  // meters
    sensor_type: string;
    style: LineProperties;
  };
}
```

### Sensor2Annotation (SENSOR2)

Extended sensor format with additional fields.

```typescript
interface Sensor2Annotation extends AnnotationFeature {
  geometry: {
    type: "LineString";
    coordinates: Position[];
  };
  properties: {
    kind: "SENSOR2";
    track_id: string;
    bearing: number;
    range: number;
    frequency?: number;  // nullable
    speed?: number;  // nullable
    depth?: number;  // nullable
    style: LineProperties;
  };
}
```

### TMAPosAnnotation (TMA_POS)

Target motion analysis position fix with uncertainty ellipse.

```typescript
interface TMAPosAnnotation extends AnnotationFeature {
  geometry: {
    type: "Polygon";
    coordinates: Position[][];
  };
  properties: {
    kind: "TMA_POS";
    center: Position;
    semi_major: number;
    semi_minor: number;
    orientation: number;
    timestamp: string;
    course: number;  // degrees
    speed: number;  // knots
    depth: number;  // meters
    style: PolygonProperties;
  };
}
```

### TMARBAnnotation (TMA_RB)

Range/bearing fix from ownship.

```typescript
interface TMARBAnnotation extends AnnotationFeature {
  geometry: {
    type: "LineString";
    coordinates: Position[];  // [ownship, target]
  };
  properties: {
    kind: "TMA_RB";
    timestamp: string;
    bearing: number;
    range: number;
    style: LineProperties;
  };
}
```

### TracksplitAnnotation (TRACKSPLIT)

Track separation marker (metadata only).

```typescript
interface TracksplitAnnotation extends AnnotationFeature {
  geometry: null;
  properties: {
    kind: "TRACKSPLIT";
    track_id: string;
    timestamp: string;
    // No style - not rendered
  };
}
```

## Style Properties

### PolygonProperties

```typescript
interface PolygonProperties {
  fill: boolean;
  fill_color: string;  // CSS color
  fill_opacity: number;  // 0-1
  stroke: boolean;
  color: string;  // Stroke color
  weight: number;  // Stroke width in pixels
  opacity: number;  // Stroke opacity 0-1
  dash_array?: string;  // e.g., "5,5" for dashed
}
```

### LineProperties

```typescript
interface LineProperties {
  stroke: boolean;
  color: string;
  weight: number;
  opacity: number;
  dash_array?: string;
}
```

### PointProperties

```typescript
interface PointProperties {
  shape: "circle" | "square" | "triangle";
  radius: number;  // pixels
  fill: boolean;
  fill_color: string;
  fill_opacity: number;
  stroke: boolean;
  color: string;
  weight: number;
  opacity: number;
  legacy_style?: string;  // Original Debrief symbol name
}
```

## Validation Rules

| Shape | Rule | Error Code |
|-------|------|------------|
| POLY | Minimum 3 vertices | INVALID_COORDINATE |
| POLYLINE | Minimum 2 vertices | INVALID_COORDINATE |
| ELLIPSE | Semi-axes > 0 | INVALID_VALUE |
| WHEEL | outer_radius > inner_radius > 0 | INVALID_VALUE |
| SENSOR | range > 0, bearing 0-360 | INVALID_VALUE |
| All | Valid lat/lon coordinates | INVALID_COORDINATE |
| All | Valid timestamp format | INVALID_TIMESTAMP |

## State Transitions

N/A - These are immutable annotations parsed from REP files. No state transitions.

## Relationships

| Relationship | From | To | Cardinality |
|--------------|------|-----|-------------|
| Grouped by name | DYNAMIC_* | DYNAMIC_* | Many:Many |
| References track | SENSOR | Track | Many:One |
| References track | TRACKSPLIT | Track | Many:One |
| Contains hole | WHEEL.outer | WHEEL.inner | One:One |
