# Data Model: Move Shape Tool Spec

**Feature**: 056-move-shape | **Date**: 2026-02-10

## Entities

### Translation Parameters (Tool Input)

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `features` | `FeatureCollection` | Yes | — | Must contain at least one annotation feature |
| `direction` | `float` | No | `90` | Compass bearing in degrees, range [0, 360) |
| `distance_km` | `float` | No | `5` | Translation distance in kilometres, must be >= 0 |

### Annotation Feature (Input/Output)

Annotation features are GeoJSON Features with a `kind` property matching one of the supported annotation kinds. Each kind has specific geometry and properties:

| Kind | Geometry Type | Extra Properties | Properties to Update |
|------|---------------|------------------|---------------------|
| `CIRCLE` | `Polygon` | `center: [lon, lat]`, `radius: float` | `center` (translate), geometry vertices (translate) |
| `RECTANGLE` | `Polygon` | — | Geometry vertices (translate) |
| `LINE` | `LineString` | — | Geometry coordinates (translate) |
| `TEXT` | `Point` | `text: string` | Geometry coordinate (translate) |
| `VECTOR` | `LineString` | `origin: [lon, lat]`, `range: float`, `bearing: float` | `origin` (translate), geometry coordinates (translate). `range` and `bearing` preserved. |

### Destination Point (Intermediate Computation)

| Field | Type | Description |
|-------|------|-------------|
| `lat1` | `float` | Start latitude in radians |
| `lon1` | `float` | Start longitude in radians |
| `bearing` | `float` | Compass bearing in radians |
| `distance` | `float` | Distance in km |
| `R` | `float` | Earth radius = 6371.0 km |
| `lat2` | `float` | Destination latitude in radians |
| `lon2` | `float` | Destination longitude in radians |

### ToolResponse (Output)

| Field | Type | Description |
|-------|------|-------------|
| `content` | `ContentItem[]` | One item per translated annotation feature |

### ContentItem (Output)

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"resource"` | MCP content type |
| `uri` | `string` | `feature://{feature_id}` |
| `mimeType` | `"application/geo+json"` | GeoJSON MIME type |
| `text` | `string` | Serialised translated Feature |
| `annotations.debrief:resultType` | `string` | `mutation/shape/translated` |
| `annotations.debrief:sourceFeatures` | `string[]` | Input feature IDs |
| `annotations.debrief:label` | `string` | e.g., "Translated 3 shape(s) 5 km bearing 090°" |

## Relationships

```
FeatureCollection ─── 1:N ───► Annotation Feature
                                    │
                    (filtered by kind ∈ {CIRCLE, RECTANGLE, LINE, TEXT, VECTOR})
                                    │
                                    ▼
                            Translation Parameters
                            (direction, distance_km)
                                    │
                      ┌─────────────┼─────────────┐
                      ▼             ▼             ▼
               translate_point  translate_point  translate_point
               (each vertex)   (properties)    (each coord)
                      │             │             │
                      └─────────────┼─────────────┘
                                    ▼
                          Translated Feature
                                    │
                                    ▼
                              ContentItem
                          (in ToolResponse)
```

## State Transitions

This tool has no persistent state. It is a pure transformation:

```
Input FeatureCollection + Parameters → Translated FeatureCollection (wrapped in ToolResponse)
```

No STAC catalog writes. No session state changes. The caller (frontend or log service) is responsible for applying the mutation.

## Validation Rules

1. `features` must be a valid GeoJSON FeatureCollection
2. `features.features` must not be empty
3. `direction` must be in range [0, 360); values >= 360 should be normalised (mod 360)
4. `distance_km` must be >= 0; negative values are invalid
5. At least one feature must have an annotation `kind`; if none, return error
6. Each annotation feature must have a valid `id` property
7. CircleAnnotation must have `center` property as [lon, lat] array
8. VectorAnnotation must have `origin`, `range`, and `bearing` properties
