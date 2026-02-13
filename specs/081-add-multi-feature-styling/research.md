# Research: Add MultiPoint and MultiPolygon Feature Schemas

**Feature**: 081-add-multi-feature-styling
**Date**: 2026-02-13

## R1: GeoJSON Multi-Geometry Coordinate Structures

**Decision**: Follow RFC 7946 coordinate structures exactly.

**Rationale**: GeoJSON RFC 7946 defines unambiguous coordinate structures for all geometry types. The project already follows this for Point, LineString, Polygon, and MultiLineString.

**Coordinate structures**:
- **MultiPoint**: `[[lon1, lat1], [lon2, lat2], ...]` — array of positions
- **MultiPolygon**: `[[[[lon, lat], ...]], [[[lon, lat], ...]]]` — array of polygon coordinate arrays, each of which is an array of linear rings

**Alternatives considered**:
- Custom coordinate structures: Rejected — would break GeoJSON compliance and interoperability.

## R2: LinkML Coordinate Modelling Limitation

**Decision**: Accept the existing LinkML flat-array limitation for coordinate fields; use `range: float, multivalued: true` as with existing geometry classes.

**Rationale**: LinkML cannot natively express nested arrays (arrays of arrays). The project has an established workaround: coordinates are declared as `range: float, multivalued: true`, and proper nested-array validation is handled by Pydantic validators and golden fixtures. This pattern is already used for GeoJSONLineString, GeoJSONPolygon, and GeoJSONMultiLineString. The `is_known_geometry_limitation()` function in test_golden.py handles the resulting validation warnings.

**Impact**: New MultiPoint and MultiPolygon geometry types will need to be added to the `nested_coord_types` set in `test_golden.py:is_known_geometry_limitation()`.

**Alternatives considered**:
- Custom LinkML types with nested array support: Not available in LinkML 1.7.
- Stringified coordinates: Rejected — loses type safety and complicates validation.

## R3: FeatureKindEnum Values for New Types

**Decision**: Add `MULTI_POINT` and `MULTI_POLYGON` as new FeatureKindEnum values.

**Rationale**: Each existing feature type has a distinct FeatureKindEnum value (TRACK, POINT, CIRCLE, RECTANGLE, LINE, TEXT, VECTOR, SYSTEM, NARRATIVE). The new multi-geometry feature types need their own discriminator values for:
- Feature type identification in FeatureCollections
- Selection and filtering logic
- Tool result type annotation
- Rendering pipeline dispatch

Feature 062 (compound track model) took a different approach — embedding sub-types within TrackFeature with no new enum values. That approach made sense for compound tracks (which are structurally part of a track). MultiPoint and MultiPolygon are independent tool result types and warrant their own enum values.

**Alternatives considered**:
- `TOOL_RESULT` as a generic kind: Rejected — too coarse; different geometry types need different rendering and selection behaviour.
- Reusing `POINT`/`CIRCLE`: Rejected — these have different semantics (single reference location vs. multi-point tool result; circle annotation vs. multi-polygon result).

## R4: Feature Type Design Pattern

**Decision**: Follow the established Properties + Feature class pattern used by all existing feature types.

**Rationale**: Every feature type in the schema follows this pattern:
1. `XxxProperties` class with `kind` discriminator, domain fields, and `style`
2. `XxxFeature` class with `type: "Feature"`, `id`, `geometry`, `properties`, optional `bbox`

This pattern is used by TrackFeature, ReferenceLocation, CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, VectorAnnotation, NarrativeEntry, and SystemState.

**New types will follow this pattern**:
- `MultiPointFeatureProperties` + `MultiPointFeature`
- `MultiPolygonFeatureProperties` + `MultiPolygonFeature`

**Alternatives considered**:
- Generic `ToolResultFeature` with union geometry: Rejected — the spec requires distinct styling (PointProperties vs PolygonProperties), making a single type with conditional styling overly complex.

## R5: Schema File Organisation

**Decision**: Add new geometry classes to `geojson.yaml` and new FeatureKindEnum values to `common.yaml`. Create new feature types in `geojson.yaml` alongside existing feature types.

**Rationale**: Feature 062's research (R6) decided: "Add new types to existing files (common.yaml, geojson.yaml) not new modules." The geometry classes belong in `geojson.yaml` where all other geometry classes live. The feature types also belong there as they are core GeoJSON Features, not annotations (which live in `annotations.yaml`).

**Alternatives considered**:
- New `multi-features.yaml` module: Rejected — fragments the schema unnecessarily; existing files are well-structured.
- Adding to `annotations.yaml`: Rejected — these are tool result features, not annotation types.

## R6: Generation Pipeline Updates

**Decision**: Update `generate.py` to extract per-entity JSON Schemas for the new feature types, and add TypeScript union patches for any `any_of` geometry fields.

**Rationale**: The generation pipeline has three areas that need updates:
1. **Per-entity JSON Schema extraction** (generate.py lines 101-115): Add `MultiPointFeature` and `MultiPolygonFeature` to the `entity_types` list.
2. **TypeScript union patching** (generate.py lines 158-162): If any new feature's geometry field uses `any_of`, add a corresponding string-replace patch. For these features, geometry is a single type (not a union), so this may not be needed.
3. **Pydantic generation**: No changes needed — gen-pydantic handles all classes automatically.

**Alternatives considered**: None — the pipeline is well-established and only requires list additions.

## R7: Test Infrastructure Updates

**Decision**: Update test_golden.py ENTITY_MAP, test_schema_compare.py enum assertions, and add new entities to the nested_coord_types set.

**Updates required**:
1. **test_golden.py**:
   - Add `MultiPointFeature` and `MultiPolygonFeature` imports
   - Add entries to ENTITY_MAP: `"multi-point-feature": MultiPointFeature`, `"multi-polygon-feature": MultiPolygonFeature`
   - Add both types to `nested_coord_types` in `is_known_geometry_limitation()`
2. **test_schema_compare.py**:
   - Update FeatureKindEnum expected values to include `MULTI_POINT`, `MULTI_POLYGON`
3. **test_roundtrip.py**:
   - New feature types with nested coordinates will NOT be added to roundtrip tests (same limitation as TrackFeature)
   - Properties-only roundtrip tests could be added but are not required (existing PointProperties and PolygonProperties tests already cover styling)

**Alternatives considered**: None — follows established patterns.

## R8: Provenance Fields

**Decision**: Include `source_tool` and `source_features` fields on properties for provenance tracking.

**Rationale**: The Constitution (Article III) requires "provenance always — every transformation MUST record lineage." The `ToolResultAnnotations` schema already defines `sourceFeatures` and `resultType` for MCP tool results. The feature properties should carry similar provenance:
- `source_tool`: Name/ID of the calculation tool that produced the result
- `source_features`: IDs of input features used (consistent with `ToolResultAnnotations.sourceFeatures`)

These fields make the Feature self-documenting — a user can always trace back to what created it.

**Alternatives considered**:
- Relying solely on ToolResultAnnotations: Rejected — annotations are MCP-layer metadata; the Feature itself should carry provenance for long-term storage in STAC catalogs.
- Full provenance record (tool version, parameters, timestamps): Deferred — can be added later; source_tool and source_features cover the essential lineage.
