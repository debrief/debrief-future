# Data Model: [E05] Add POLY FeatureKind for Arbitrary Polygons

**Date**: 2026-02-13

## Entities

### FeatureKindEnum (modified)

Add new permissible value:

| Value | Description | Geometry Type |
|-------|-------------|---------------|
| POLY | Arbitrary polygon annotation (Polygon geometry) | Polygon |

Existing values unchanged. Total enum values after change: 12 (was 11).

### PolyAnnotationProperties (new)

Properties for an arbitrary user-defined polygon.

| Field | Type | Required | Constraint | Description |
|-------|------|----------|------------|-------------|
| kind | FeatureKindEnum | Yes | equals_string: "POLY" | Discriminator |
| vertex_count | integer | Yes | minimum_value: 3 | Number of unique vertices (excluding ring closure) |
| label | string | No | — | Annotation label text |
| symbol | string | No | — | Display symbol code from REP file |
| style | PolygonProperties | Yes | — | Polygon styling (fill, stroke, colors) |
| source_file | string | No | — | Original source file path (provenance) |
| line_number | integer | No | — | Source line number (provenance) |

### PolyAnnotation (new)

GeoJSON Feature for arbitrary polygon annotations.

| Field | Type | Required | Constraint | Description |
|-------|------|----------|------------|-------------|
| type | string | Yes | equals_string: "Feature" | GeoJSON type |
| id | string | Yes | — | Unique identifier |
| geometry | GeoJSONPolygon | Yes | — | Polygon geometry (closed ring) |
| properties | PolyAnnotationProperties | Yes | — | Polygon metadata |

## Relationships

```
FeatureKindEnum.POLY ──discriminates──> PolyAnnotationProperties.kind
PolyAnnotationProperties.style ──references──> PolygonProperties (from styling.yaml)
PolyAnnotation.geometry ──references──> GeoJSONPolygon (from geojson.yaml)
PolyAnnotation.properties ──contains──> PolyAnnotationProperties
```

## Validation Rules

1. `kind` must be exactly `"POLY"` (enforced by equals_string)
2. `vertex_count` must be >= 3 (minimum for valid polygon)
3. `style` must be a valid PolygonProperties object (fill, stroke, colors)
4. `geometry.coordinates` must be a valid Polygon ring (closed, >= 4 positions including closure)
5. All existing annotation types remain unchanged — additive-only change
