# Data Model: 095 — Polygon and Polyline Drawing

**Date**: 2026-02-14

## Entities

This feature does not introduce new data models — it uses existing schema types to create drawn features. Below are the relevant entities and how they are used.

### PolyAnnotation (existing — from #091-E05)

A GeoJSON Feature representing an arbitrary polygon drawn by the user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON type discriminator |
| `id` | `string` | Yes | Globally unique identifier (UUID) |
| `geometry` | `GeoJSONPolygon` | Yes | Polygon geometry with closed coordinate ring |
| `properties` | `PolyAnnotationProperties` | Yes | Properties bag |

### PolyAnnotationProperties (existing — from #091-E05)

| Field | Type | Required | Default (drawn) | Description |
|-------|------|----------|-----------------|-------------|
| `kind` | `"POLY"` | Yes | `"POLY"` | Feature kind discriminator |
| `vertex_count` | `integer` (>=3) | Yes | calculated | Number of unique vertices (excluding closure) |
| `label` | `string` | No | `"Drawn Polygon"` | User-provided name |
| `symbol` | `string` | No | — | REP color code (not set for drawn features) |
| `style` | `PolygonProperties` | Yes | `DEFAULT_DRAWN_POLYGON_STYLE` | Visual styling |
| `source_file` | `string` | No | — | Provenance (not set for drawn features) |
| `line_number` | `integer` | No | — | Provenance (not set for drawn features) |

### LineAnnotation (existing — from schema)

A GeoJSON Feature representing a polyline drawn by the user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"Feature"` | Yes | GeoJSON type discriminator |
| `id` | `string` | Yes | Globally unique identifier (UUID) |
| `geometry` | `GeoJSONLineString` | Yes | LineString geometry with 2+ coordinate pairs |
| `properties` | `LineAnnotationProperties` | Yes | Properties bag |

### LineAnnotationProperties (existing — from schema)

| Field | Type | Required | Default (drawn) | Description |
|-------|------|----------|-----------------|-------------|
| `kind` | `"LINE"` | Yes | `"LINE"` | Feature kind discriminator |
| `label` | `string` | No | `"Drawn Path"` | User-provided name |
| `symbol` | `string` | No | — | REP color code (not set for drawn features) |
| `style` | `LineProperties` | Yes | `DEFAULT_DRAWN_POLYLINE_STYLE` | Visual styling |
| `source_file` | `string` | No | — | Provenance (not set for drawn features) |
| `line_number` | `integer` | No | — | Provenance (not set for drawn features) |

## Default Styles

### DEFAULT_DRAWN_POLYGON_STYLE (PolygonProperties)

| Property | Value | Rationale |
|----------|-------|-----------|
| `fill` | `true` | Filled area to indicate region |
| `fill_color` | `#FF9800` | Orange — distinct from blue rectangles |
| `fill_opacity` | `0.15` | Low opacity so underlying features visible |
| `stroke` | `true` | Visible border |
| `color` | `#E65100` | Dark orange stroke |
| `weight` | `2` | Consistent with rectangle default |
| `opacity` | `0.8` | Consistent with rectangle default |

### DEFAULT_DRAWN_POLYLINE_STYLE (LineProperties)

| Property | Value | Rationale |
|----------|-------|-----------|
| `stroke` | `true` | Line must be visible |
| `color` | `#00BCD4` | Teal/cyan — distinct from all other drawn shapes |
| `weight` | `3` | Slightly thicker than polygon border for visibility |
| `opacity` | `0.9` | High opacity for clear path visibility |

## Validation Rules

### Polygon Validation

```
Input: GeoJSON Feature with mode='polygon'
Rules:
  1. geometry.type MUST be "Polygon"
  2. coordinates MUST have at least 1 ring
  3. Outer ring MUST have >= 4 coordinate pairs (3 unique + closure)
  4. All coordinates MUST be finite numbers [lon, lat]
```

### Polyline Validation

```
Input: GeoJSON Feature with mode='polyline'
Rules:
  1. geometry.type MUST be "LineString"
  2. coordinates MUST have >= 2 coordinate pairs
  3. All coordinates MUST be finite numbers [lon, lat]
```

## CreateDrawnFeatureOptions Extension

The options interface is extended to support polygon and polyline styling overrides:

| Field | Type | Scope | Description |
|-------|------|-------|-------------|
| `pointStyle` | `Partial<PointProperties>` | point | Override point styling (existing) |
| `rectangleStyle` | `Partial<PolygonProperties>` | rectangle | Override rectangle styling (existing) |
| `polygonStyle` | `Partial<PolygonProperties>` | polygon | Override polygon styling (new) |
| `polylineStyle` | `Partial<LineProperties>` | polyline | Override polyline styling (new) |
| `name` | `string` | point | Custom point name (existing) |
| `label` | `string` | rectangle, polygon, polyline | Custom label (existing, used by new modes) |

## Return Type Extension

`createDrawnFeature()` return type is extended:

```
Before: ReferenceLocation | RectangleAnnotation | null
After:  ReferenceLocation | RectangleAnnotation | PolyAnnotation | LineAnnotation | null
```
