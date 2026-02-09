# Research: Compound Track Model with Embedded Children

**Feature**: 062-missing-feature-kind-enum-values
**Date**: 2026-02-08
**Purpose**: Resolve technical unknowns before implementation planning

## R1: Geometry Union on TrackFeature (LineString | MultiLineString)

**Decision**: Use LinkML `any_of` construct to express the geometry union.

**Rationale**: LinkML supports `any_of` for union types. The codebase already acknowledges this pattern in `geojson.yaml` line 225-227 (`"this would be a union type... LinkML handles this via any_of or abstract geometry class"`). A new `GeoJSONMultiLineString` class will be added alongside the existing `GeoJSONLineString`, and TrackFeature.geometry will use `any_of` to accept either.

**Alternatives considered**:
- Abstract geometry base class — adds unnecessary indirection for only two types
- Runtime-only validation in Pydantic — breaks the schema-first principle (Article II)
- Separate `CompoundTrackFeature` class — violates backward compatibility; existing code expects `TrackFeature`

**Implementation pattern**:
```yaml
TrackFeature:
  attributes:
    geometry:
      description: Track path as LineString (simple) or MultiLineString (compound)
      required: true
      any_of:
        - range: GeoJSONLineString
        - range: GeoJSONMultiLineString
```

## R2: Parallel Array Constraint Enforcement

**Decision**: Document parallel array invariants in schema descriptions. Enforce via Pydantic validators and golden fixture tests. LinkML cannot natively express cross-field cardinality rules.

**Rationale**: The codebase already uses this pattern for `positions` / `position_style_overrides` on TrackProperties — the constraint is documented in the description but enforced in application code. This is consistent and well-understood.

**Constraints to enforce**:
1. `segments.length == geometry.coordinates.length` (when MultiLineString)
2. `segments[i].positions.length == geometry.coordinates[i].length`

**Enforcement approach**:
- LinkML schema: Document in field descriptions
- Pydantic: Add `model_validator(mode='after')` on TrackFeature
- Golden fixtures: Include valid and invalid examples that test boundary cases
- TypeScript: Runtime guard functions (not compile-time)

## R3: Schema Generation Pipeline

**Decision**: Follow existing pipeline — edit LinkML, run `make generate`, run `make test`.

**Rationale**: The pipeline is mature and well-documented:
- Master schema: `shared/schemas/src/linkml/debrief.yaml` (imports 7 modules)
- Generation: `scripts/generate.py` → Pydantic, JSON Schema (per-entity), TypeScript
- Tests: `test_golden.py`, `test_roundtrip.py`, `test_schema_compare.py`, `validate-jsonschema.js`
- CI: `.github/workflows/schema-tests.yml` gates all merges

**New entity schemas to generate**: Per-entity JSON Schema extractions will be needed for any new top-level types. Since we're modifying `TrackFeature` (not adding root-level types), the existing `TrackFeature.schema.json` extraction will capture the changes.

**New golden fixtures needed**:
- `valid/track-feature-compound-01.json` — MultiLineString with mixed segments
- `valid/track-feature-sensors-01.json` — Track with embedded sensors
- `valid/track-feature-tuas-01.json` — Track with embedded TUAs
- `valid/track-feature-full-01.json` — Track with segments, sensors, and TUAs
- `invalid/track-feature-segment-mismatch.json` — Segment count != coordinate count
- `invalid/track-feature-sensor-no-bearing.json` — Sensor contact missing bearing
- `invalid/track-feature-compound-linestring.json` — Segments present with LineString geometry

## R4: Known LinkML Limitation — Nested GeoJSON Coordinates

**Decision**: Accept the existing coordinate validation limitation. Document it and work around it in tests.

**Rationale**: The existing test suite already handles a known LinkML limitation where GeoJSON coordinate arrays (nested `[[lon, lat], ...]`) don't validate cleanly in generated Pydantic models because LinkML generates flat `list[float]` rather than `list[list[float]]`. Both `test_golden.py` and `validate-jsonschema.js` have `is_known_geometry_limitation()` checks for this. MultiLineString coordinates (triply nested) will encounter the same limitation.

**Workaround**: Same as existing — flag these as known limitations in tests, validate coordinate structure in application-layer validators.

## R5: Hierarchical Tool Selection Model

**Decision**: Extend `SelectionRequirement.kind` to accept dot-delimited paths. Implement path-based matching in debrief-calc executor.

**Rationale**: The current tool selection uses flat `input_kinds: list[str]` with simple string equality matching in `executor.py`. The LinkML schema defines a `SelectionRequirement` class (in `tool.yaml`) that is richer but currently unused in Python code. The compound track model requires hierarchical paths because sensors, segments, and TUAs are not root-level features.

**Matching semantics**:
- `"TRACK"` matches any TrackFeature (backward compatible)
- `"TRACK.SENSOR"` matches a TrackFeature that contains sensors
- `"TRACK.SENSOR.CONTACT"` matches a specific contact within a sensor within a track
- `"TRACK.SEGMENT"` matches a TrackFeature with compound segments
- Containment: `"TRACK.SENSOR.CONTACT"` also satisfies a `"TRACK.SENSOR"` requirement

**Phasing**: The hierarchical selection model can be implemented incrementally — the schema changes (embedding sensors/segments/TUAs in TrackProperties) can land first, with the selection model following as a separate task.

## R6: Schema File Organisation

**Decision**: Add new types to existing schema files rather than creating new modules.

**Rationale**: The current schema modules are well-organised by concern:
- `common.yaml` — enums and base types
- `geojson.yaml` — GeoJSON Feature types
- `styling.yaml` — display styling
- `annotations.yaml` — annotation features
- `tool.yaml` — tool metadata

New types fit naturally:
- `SegmentTypeEnum` → `common.yaml` (alongside `FeatureKindEnum`, `TrackTypeEnum`)
- `GeoJSONMultiLineString` → `geojson.yaml` (alongside other geometry types)
- `SegmentMetadata`, `SensorData`, `SensorContact`, `TUAData`, `TUASolution` → `geojson.yaml` (they're TrackFeature children)

If `geojson.yaml` grows too large, split into `geojson.yaml` + `track-children.yaml` imported by `geojson.yaml`. Start without splitting and reassess.

## R7: Conditional Field Validation (TMA-specific properties)

**Decision**: Use LinkML `rules` with `preconditions`/`postconditions` for segment-type-specific validation where possible. Fall back to Pydantic validators for complex cases.

**Rationale**: LinkML supports rules that can express "if segment_type is RELATIVE_TMA, then host_track_id is required". The codebase already uses a simpler version of this in `session-state.yaml`. However, the generated Pydantic code may not perfectly translate complex rules, so golden fixtures are the primary validation mechanism.

**Rules to implement**:
- RELATIVE_TMA segments: `host_track_id` required
- DYNAMIC_INFILL segments: `before_leg` and `after_leg` required
- TUA positioning: either absolute (centre_lat/centre_lon) or relative (bearing/range), not both

## R8: TUA Positioning Modes (Absolute vs Relative)

**Decision**: Model as optional fields on TUASolution with a documented constraint that one mode must be provided. Do not use a discriminator enum.

**Rationale**: Legacy Debrief REP format uses `TMA_POS` for absolute and `TMA_RB` for relative TUAs. Both share the same core properties (time, label, ellipse, kinematics). Using optional fields with a documented constraint is simpler than a discriminated union and matches the REP format's flexibility.

**Alternatives considered**:
- Discriminated union with `positioning_mode` enum — adds complexity without clear benefit
- Separate `AbsoluteTUA` and `RelativeTUA` classes — duplicates most fields
