# Research: [E05] Add POLY FeatureKind for Arbitrary Polygons

**Date**: 2026-02-13

## R1: Existing Annotation Schema Pattern

**Decision**: Follow the established annotation type pattern (Properties class + Feature class) used by CircleAnnotation, RectangleAnnotation, LineAnnotation, TextAnnotation, and VectorAnnotation.

**Rationale**: Every existing annotation type in `annotations.yaml` follows the same two-class structure:
1. `{Type}AnnotationProperties` — with `kind` (equals_string constrained), type-specific fields, `style` (required), optional `label`/`symbol`/`source_file`
2. `{Type}Annotation` — GeoJSON Feature wrapper with `type: "Feature"`, `id`, `geometry`, and `properties`

Deviating from this pattern would break the convention and confuse downstream consumers.

**Alternatives considered**:
- Reuse RectangleAnnotationProperties with a different kind → Rejected: `equals_string: "RECTANGLE"` constraint prevents this; POLY also has `vertex_count` which Rectangle lacks.
- Single generic PolygonAnnotation for both RECTANGLE and POLY → Rejected: would break existing fixtures and the kind discriminator pattern.

## R2: POLY-Specific Properties (vertex_count)

**Decision**: Include `vertex_count` as an integer property in PolyAnnotationProperties, matching the existing `build_polygon()` output.

**Rationale**: The IO service `build_polygon()` function (builders.py:701) already emits `vertex_count` representing the number of unique vertices (excluding ring closure point). This is informational metadata that helps distinguish polygon complexity without inspecting geometry coordinates.

**Alternatives considered**:
- Omit vertex_count → Rejected: would make the generated schema incompatible with existing IO service output.
- Make vertex_count required → Accepted: it's always produced by the parser and useful for validation.

## R3: LINE Kind for Polylines

**Decision**: Confirm that existing LINE kind and LineAnnotation schema support multi-vertex LineString geometry (polylines). Create a test fixture to verify.

**Rationale**: The LineAnnotation schema (`annotations.yaml:202-222`) uses `GeoJSONLineString` geometry with no vertex count constraint. GeoJSON LineString requires minimum 2 positions but allows any number. The existing fixture (`line-annotation-valid-01.json`) only has 2 points, but the schema does not restrict this. A multi-vertex fixture will confirm this empirically.

**Alternatives considered**:
- Add a new POLYLINE kind → Deferred: the IO service `build_polyline()` currently outputs `kind: "POLYLINE"` but this conflicts with the backlog scope. If LINE works for multi-vertex, POLYLINE can be added later only if needed.

## R4: Schema Generation Pipeline

**Decision**: Use the existing `make generate` pipeline in `shared/schemas/Makefile` to regenerate Pydantic, JSON Schema, and TypeScript types after schema changes.

**Rationale**: The pipeline (`python scripts/generate.py --target {pydantic,jsonschema,typescript}`) is proven and handles all three output formats. Test validation uses `make test` (pytest + tsc type checking).

**Alternatives considered**: None — the pipeline is the only supported generation mechanism.

## R5: Test Infrastructure (ENTITY_MAP)

**Decision**: Add `"poly-annotation": PolyAnnotation` to the ENTITY_MAP in `test_golden.py` and import `PolyAnnotation` from `debrief_schemas`. Also add it to the `nested_coord_types` set since PolyAnnotation has Polygon geometry (nested coordinate arrays trigger the known LinkML limitation).

**Rationale**: The fixture test runner discovers fixtures by filename prefix → ENTITY_MAP lookup. Without this mapping, poly-annotation-*.json fixtures would be silently skipped.

**Alternatives considered**: None — this is the established pattern.
