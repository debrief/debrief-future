# Data Model: Generate Reference Points Tool

**Feature**: 078-generate-reference-points
**Date**: 2026-02-13

## Entities

### ReferencePointSet (Output Feature)

A single GeoJSON MultiPoint Feature containing all generated reference coordinates, with a parallel `pointMetadata` array for per-point information.

```
Feature {
  type: "Feature"
  id: string                    // Deterministic: "ref-{pattern}"
  geometry: {
    type: "MultiPoint"
    coordinates: [              // Array of [lon, lat] pairs
      [lon0, lat0],
      [lon1, lat1],
      ...
    ]
  }
  properties: {
    kind: "POINT"               // FeatureKind enum
    locationType: "REFERENCE"   // LocationTypeEnum
    name: string                // Set name, e.g., "Reference Points (grid 3x4)"
    style: {                    // PointProperties — default style for all points
      shape: "square"           // PointShapeEnum
      color: "#666666"          // Default fill color
      radius: 5                 // Marker radius
    }
    pointMetadata: [            // Parallel to coordinates array
      {
        index: 0                // 0-based ordinal
        name: "Ref 1"           // Human-readable label
        // Downstream tools (#081) extend with:
        // zone: "inner" | "mid" | "outer" | null
        // color: "#ff0000"     // Per-point color override
      },
      {
        index: 1
        name: "Ref 2"
      },
      ...
    ]
  }
}
```

### PointMetadataEntry

A single entry in the `pointMetadata` array, indexed parallel to the MultiPoint coordinates.

```
PointMetadataEntry {
  index: integer              // 0-based, matches coordinates[index]
  name: string                // Human-readable label, e.g., "Ref 1"
  // Extension fields (added by downstream tools, not by this tool):
  // zone: string | null      // Buffer zone classification (#081)
  // color: string | null     // Per-point color override (#081)
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

## Schema Changes

The `ReferenceLocation` class in `geojson.yaml` requires two updates:

1. **Geometry**: Allow `MultiPoint` in addition to `Point` (via `any_of` or union type)
2. **Properties**: Add optional `pointMetadata` attribute to `ReferenceLocationProperties`

```yaml
# geojson.yaml additions
ReferenceLocationProperties:
  attributes:
    # ... existing attributes ...
    point_metadata:
      description: Per-point metadata array, parallel to MultiPoint coordinates
      multivalued: true
      range: PointMetadataEntry
      required: false

PointMetadataEntry:
  description: Metadata for a single point within a MultiPoint reference set
  attributes:
    index:
      description: 0-based ordinal matching coordinates array position
      range: integer
      required: true
    name:
      description: Human-readable point label
      range: string
      required: true
```

This is a non-breaking schema extension under Article XIV (Pre-Release Freedom).

## Relationships

```
ToolParameters ──[produces]──> FeatureCollection with single MultiPoint Feature
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
                        (mutates pointMetadata entries
                         to add zone + color fields)
                                    │
                              [consumed by]
                                    │
                                    v
                        Zone Histogram Generator (#082)
                        (counts entries per zone)
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
| V-009 | pointMetadata | Length must equal coordinates array length |
| V-010 | pointMetadata[i].index | Must equal i (parallel indexing) |

## Result Type

```
Type Path: addition/reference/generated_points

Annotations:
  debrief:resultType:      "addition/reference/generated_points"
  debrief:sourceFeatures:  []  (no input features)
  debrief:label:           "Generated {N} reference points ({pattern}) in [{W},{S},{E},{N}]"
```
