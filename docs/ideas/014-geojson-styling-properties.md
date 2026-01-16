# Idea: Add styling properties schemas to GeoJSON features

**ID**: 014
**Category**: Feature
**Status**: Awaiting GitHub issue creation

## Problem

GeoJSON features in Debrief currently have no standardized way to specify visual styling. When displaying tracks, reference points, and areas in the VS Code extension (or other frontends), we need consistent styling information embedded in the feature properties.

## Proposed Solution

Create LinkML style schemas that define styling properties for each geometry type, following Leaflet Path options as the base standard with Debrief-specific extensions.

### Style Schemas to Create

1. **PointProperties** — for Point and MultiPoint geometries
   - Basic shapes: circle, square, triangle (extensible)
   - Color, size, opacity
   - Stroke properties for shape outline
   - *Future*: iconUrl, named symbols, MIL-STD-2525 codes

2. **LineProperties** — for LineString and MultiLineString geometries
   - Stroke color, weight, opacity
   - Dash array patterns
   - Line cap/join styles

3. **PolygonProperties** — for Polygon and MultiPolygon geometries
   - Fill color and opacity
   - Stroke properties (color, weight, opacity, dash)

### Integration with Feature Schemas

Each GeoJSON feature schema (e.g., `ReferencePoint`, `Track`, `Area`) will have a required `style` property in its `properties` object that references the appropriate style schema:

```yaml
# Example: ReferencePoint uses PointProperties
ReferencePoint:
  properties:
    style:
      range: PointProperties
      required: true
```

## Success Criteria

- [ ] LinkML schemas defined for `PointProperties`, `LineProperties`, `PolygonProperties`
- [ ] Style schemas generate valid Pydantic models and JSON Schema
- [ ] Golden fixtures exist for valid/invalid style objects
- [ ] Existing feature schemas updated with required `style` property
- [ ] Round-trip tests pass (Python → JSON → TypeScript → JSON → Python)
- [ ] Documentation explains each property with examples

## Constraints

- Must follow Leaflet Path options naming where applicable (for renderer compatibility)
- Style element is **required** on features (no optional with defaults)
- Multi-geometry variants (MultiPoint, MultiLineString, MultiPolygon) use the same style schema as their base type
- Point symbology limited to basic shapes initially; icons and MIL-STD-2525 are deferred

## Out of Scope

- Icon URL support (deferred)
- Named symbol registry (deferred)
- MIL-STD-2525 military symbology codes (deferred)
- Data-driven styling expressions (Mapbox GL style)
- Theme/stylesheet system
- Animation properties

## Interview Summary

- **Styling standard**: Leaflet Path options + Debrief extensions
- **Geometry coverage**: All 6 types (Point, Line, Polygon + Multi variants) via 3 consolidated schemas
- **Required**: Style element is mandatory on features
- **Point symbology**: Basic shapes only initially; icons/symbols/MIL-STD deferred
