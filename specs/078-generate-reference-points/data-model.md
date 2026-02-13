# Data Model: Generate Reference Points Tool

**Feature**: 078-generate-reference-points
**Date**: 2026-02-13

## Entities

### ReferencePoint (Output Feature)

A GeoJSON Point Feature representing a generated reference location.

```
Feature {
  type: "Feature"
  id: string                    // Deterministic: "ref-{pattern}-{index}"
  geometry: {
    type: "Point"
    coordinates: [lon, lat]     // WGS84 decimal degrees
  }
  properties: {
    kind: "POINT"               // FeatureKind enum
    locationType: "REFERENCE"   // LocationTypeEnum
    name: string                // Human-readable label, e.g., "Reference Point 1"
    pointShape: "square"        // PointShapeEnum default for reference points
    index: integer              // 0-based ordinal position in generation sequence
  }
}
```

### ToolParameters (Input)

Parameters accepted by the generate-reference-points tool.

```
GenerateReferencePointsParams {
  pattern: "grid" | "scatter"           // Required — generation pattern
  bounds: [west, south, east, north]    // Required — WGS84 bounding box
  rows: integer >= 1                    // Required for grid pattern
  cols: integer >= 1                    // Required for grid pattern
  count: integer >= 1                   // Required for scatter pattern
  seed: integer | null                  // Optional for scatter pattern
}
```

### BoundingBox (Value Object)

Four-element array defining the generation area.

```
BoundingBox = [west, south, east, north]

Constraints:
  west:  -180 <= west  <= 180   (longitude)
  south: -90  <= south <= 90    (latitude)
  east:  -180 <= east  <= 180   (longitude)
  north: -90  <= north <= 90    (latitude)
  south < north                 (required)
  west != east AND south != north  (positive area)
  west > east is valid          (antimeridian crossing)
```

## Relationships

```
ToolParameters ──[produces]──> FeatureCollection of ReferencePoint
                                    │
                              [persisted as]
                                    │
                                    v
                              STAC Item Asset (GeoJSON file)
                                    │
                              [consumed by]
                                    │
                                    v
                        Point-in-Zone Classifier (#081)
                                    │
                              [consumed by]
                                    │
                                    v
                        Zone Histogram Generator (#082)
```

## Validation Rules

| Rule | Field | Constraint |
|------|-------|------------|
| V-001 | pattern | Must be "grid" or "scatter" |
| V-002 | bounds | Must be 4-element array of numbers |
| V-003 | bounds[1] (south) | Must be < bounds[3] (north) |
| V-004 | bounds | Must have positive area (west != east, south != north) |
| V-005 | rows | Required when pattern="grid", must be >= 1 |
| V-006 | cols | Required when pattern="grid", must be >= 1 |
| V-007 | count | Required when pattern="scatter", must be >= 1 |
| V-008 | seed | Optional; when present, must be integer |

## Result Type

```
Type Path: addition/reference/generated_points

Annotations:
  debrief:resultType:      "addition/reference/generated_points"
  debrief:sourceFeatures:  []  (no input features)
  debrief:label:           "Generated {N} reference points ({pattern}) in [{W},{S},{E},{N}]"
```
