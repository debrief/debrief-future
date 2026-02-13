# Data Model: Add MultiPoint and MultiPolygon Feature Schemas

**Feature**: 081-add-multi-feature-styling
**Date**: 2026-02-13

## New Geometry Classes

### GeoJSONMultiPoint

A GeoJSON MultiPoint geometry representing multiple discrete geographic positions.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | Yes | equals `"MultiPoint"` | Geometry type discriminator |
| `coordinates` | float[] | Yes | multivalued | Array of [longitude, latitude] pairs (RFC 7946) |

**Notes**: Coordinates modelled as flat `float[]` due to LinkML limitation with nested arrays. Actual GeoJSON structure is `[[lon1, lat1], [lon2, lat2], ...]`. Validation of nesting handled by golden fixtures and Pydantic.

### GeoJSONMultiPolygon

A GeoJSON MultiPolygon geometry representing multiple polygonal regions.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | Yes | equals `"MultiPolygon"` | Geometry type discriminator |
| `coordinates` | float[] | Yes | multivalued | Array of polygon coordinate arrays (RFC 7946) |

**Notes**: Actual GeoJSON structure is `[[[[lon, lat], ...]], [[[lon, lat], ...]]]` — array of polygons, each an array of linear rings. Same LinkML flat-array limitation applies.

## New Enum Values

### FeatureKindEnum (additions to existing enum in common.yaml)

| Value | Description |
|-------|-------------|
| `MULTI_POINT` | Multi-point tool result (MultiPoint geometry) |
| `MULTI_POLYGON` | Multi-polygon tool result (MultiPolygon geometry) |

## New Feature Types

### MultiPointFeatureProperties

Properties for a MultiPointFeature, representing tool results that produce discrete point sets.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `kind` | FeatureKindEnum | Yes | equals `"MULTI_POINT"` | Feature type discriminator |
| `label` | string | Yes | | Human-readable result label |
| `style` | PointProperties | Yes | | Point styling for all positions |
| `source_tool` | string | No | | Name of calculation tool that produced this result |
| `source_features` | string[] | No | multivalued | IDs of input features used to generate this result |
| `description` | string | No | | Additional description or notes |

### MultiPointFeature

GeoJSON Feature for multi-point tool results.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | Yes | equals `"Feature"` | GeoJSON type discriminator |
| `id` | string | Yes | | Unique identifier (UUID recommended) |
| `geometry` | GeoJSONMultiPoint | Yes | | MultiPoint geometry |
| `properties` | MultiPointFeatureProperties | Yes | | Feature properties and styling |
| `bbox` | float[4] | No | min 4, max 4 | Bounding box [minLon, minLat, maxLon, maxLat] |

### MultiPolygonFeatureProperties

Properties for a MultiPolygonFeature, representing tool results that produce polygonal region sets.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `kind` | FeatureKindEnum | Yes | equals `"MULTI_POLYGON"` | Feature type discriminator |
| `label` | string | Yes | | Human-readable result label |
| `style` | PolygonProperties | Yes | | Polygon styling for all regions |
| `source_tool` | string | No | | Name of calculation tool that produced this result |
| `source_features` | string[] | No | multivalued | IDs of input features used to generate this result |
| `description` | string | No | | Additional description or notes |

### MultiPolygonFeature

GeoJSON Feature for multi-polygon tool results.

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `type` | string | Yes | equals `"Feature"` | GeoJSON type discriminator |
| `id` | string | Yes | | Unique identifier (UUID recommended) |
| `geometry` | GeoJSONMultiPolygon | Yes | | MultiPolygon geometry |
| `properties` | MultiPolygonFeatureProperties | Yes | | Feature properties and styling |
| `bbox` | float[4] | No | min 4, max 4 | Bounding box [minLon, minLat, maxLon, maxLat] |

## Existing Types (Reused, No Changes)

### PointProperties (from styling.yaml)

Already documents: "Styling schema for Point and MultiPoint geometries." Used as-is for MultiPointFeature.

### PolygonProperties (from styling.yaml)

Already documents: "Styling schema for Polygon and MultiPolygon geometries." Used as-is for MultiPolygonFeature.

## Entity Relationships

```
FeatureKindEnum
  ├── MULTI_POINT ──────► MultiPointFeatureProperties.kind
  └── MULTI_POLYGON ────► MultiPolygonFeatureProperties.kind

MultiPointFeature
  ├── geometry ──────────► GeoJSONMultiPoint
  └── properties ────────► MultiPointFeatureProperties
                             └── style ──► PointProperties (existing)

MultiPolygonFeature
  ├── geometry ──────────► GeoJSONMultiPolygon
  └── properties ────────► MultiPolygonFeatureProperties
                             └── style ──► PolygonProperties (existing)
```

## Validation Rules

1. **GeoJSONMultiPoint.type** must be exactly `"MultiPoint"` (enforced by `equals_string`)
2. **GeoJSONMultiPolygon.type** must be exactly `"MultiPolygon"` (enforced by `equals_string`)
3. **MultiPointFeatureProperties.kind** must be exactly `"MULTI_POINT"` (enforced by `equals_string`)
4. **MultiPolygonFeatureProperties.kind** must be exactly `"MULTI_POLYGON"` (enforced by `equals_string`)
5. **style** fields are required on both property types — features without styling are rejected
6. **label** is required — all tool results must be human-identifiable
7. **Coordinate nesting** validated via golden fixtures (not LinkML constraints)
