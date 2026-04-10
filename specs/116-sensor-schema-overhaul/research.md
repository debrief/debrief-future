# Research: Sensor Schema Overhaul (#116)

**Date**: 2026-04-10
**Feature**: 116-sensor-schema-overhaul
**Spec**: [spec.md](spec.md)

## R1: LinkML Enum Definition Pattern

**Decision**: Use `permissible_values` syntax in `common.yaml`, consistent with existing enums.

**Rationale**: The project already defines 10+ enums in `shared/schemas/src/linkml/common.yaml` (FeatureKindEnum, TrackTypeEnum, PointShapeEnum, etc.) using the standard LinkML `permissible_values` pattern. Following this pattern ensures:
- Consistent generation across Pydantic, JSON Schema, and TypeScript
- No post-processing required in `generate.py`
- Automatic integration with fixture validation tests

**Alternatives considered**:
- Defining enums inline in `geojson.yaml` — rejected because all existing enums live in `common.yaml`
- Using string constraints instead of enums — rejected because enums provide compile-time safety and better error messages

**Syntax**:
```yaml
enums:
  ArrayCentreModeEnum:
    description: Array centre calculation mode
    permissible_values:
      PLAIN:
        description: Simple backtrack along vessel heading
      WORM:
        description: Follow vessel track path backwards
      MEASURED:
        description: Use actual measured array positions
```

## R2: Coordinate Pair Pattern for SensorContact.origin

**Decision**: Use `range: float, multivalued: true, minimum_cardinality: 2, maximum_cardinality: 2` pattern.

**Rationale**: This is the established pattern used by CircleAnnotation.center and VectorAnnotation.origin in `annotations.yaml` (lines 89-95, 260-267). It generates:
- **Pydantic**: `list[float]` with validation for exactly 2 elements
- **JSON Schema**: Array with `minItems: 2, maxItems: 2`
- **TypeScript**: `number[]`
- **Fixtures**: `[-5.0, 50.0]` format (longitude, latitude)

No post-processing in `generate.py` is needed — the existing post-processor only handles GeoJSON geometry coordinates (nested arrays), not simple coordinate pairs.

**Alternatives considered**:
- Separate `origin_lon` / `origin_lat` float fields — rejected because it breaks the [lon, lat] convention used everywhere else and complicates serialization
- A named `Position` class with lat/lon attributes — rejected because the existing codebase uses array notation for all coordinates, and introducing a different pattern creates inconsistency

## R3: New Field Impact on Schema Generation Pipeline

**Decision**: All new fields are safe for the existing pipeline with no post-processing changes required.

**Rationale**: Analysis of `shared/schemas/scripts/generate.py` shows post-processing handles only:
1. GeoJSON geometry coordinates (nested array depth changes) — not applicable
2. Nullable array items (`position_style_overrides`) — not applicable
3. Optional list fields with min_length constraints — only applicable if we add required multivalued fields
4. `dict[str, Any]` → `dict[str, object]` in boilerplate — not applicable

New fields fall into safe categories:
- Optional booleans (`has_bearing`, `visible`, `show_label`) → no issues
- Optional enums (`line_style`, `array_centre_mode`) → no issues
- Optional floats/integers (`line_thickness`) → no issues
- Optional coordinate pair (`origin`) → follows existing pattern
- Optional multivalued class range (`measured_positions`) → uses `inlined_as_list: true` like `contacts`

## R4: Round-Trip Test Integration Strategy

**Decision**: Add new fixtures to `shared/schemas/src/fixtures/valid/` and they will be automatically discovered by existing test infrastructure.

**Rationale**: The test infrastructure in `test_roundtrip.py` uses:
- `ROUNDTRIP_ENTITY_MAP` to map fixture filename prefixes to Pydantic model classes
- Automatic discovery of all files in `fixtures/valid/` directory
- `track-feature-*` prefix maps to `TrackFeature` model

Adding `track-feature-sensors-02.json` (with all new fields) will be auto-discovered. The existing `track-feature-sensors-01.json` must continue to validate (backward compatibility). Invalid fixtures in `fixtures/invalid/` are auto-discovered by `test_golden.py`.

## R5: Tool Spec Fixture Structure

**Decision**: Update tool fixtures conservatively — add new fields only where they affect tool behavior, keep existing structure intact.

**Rationale**: Research reveals the tool fixtures use a standalone `SENSOR` feature kind with either `cuts` or `contacts` arrays, which is a tool-specific input contract separate from the core schema's embedded `SensorData`. The 62 fixture files across 3 categories use varying field subsets:

| Pattern | Tools Using It | Current Fields |
|---------|---------------|----------------|
| TRACK-only | doppler-curve, inflection-point-detector, generate-sensor-range-plot | positions with course/speed |
| SENSOR with `cuts` | ambiguity-resolver, resolve-ambiguity | time, bearing, ambiguous_bearing, origin |
| SENSOR with `contacts` | merge-contacts, generate-new-sensor-contact, delete-ambiguous-bearings, insert-sensor-arc | id, time, bearing, frequency |

Update strategy:
- TRACK-only fixtures: Add `sensors[]` array where the tool consumes sensor data from the parent track
- SENSOR fixtures: Add `has_bearing`, `visible` where tool behavior depends on display flags
- All outputs: Ensure returned contacts include new optional fields where the tool sets them

**Alternatives considered**:
- Full rewrite of all fixtures to match embedded SensorData pattern — rejected because tools define their own input contracts and the standalone SENSOR feature is a valid tool input pattern
- No fixture updates — rejected because outdated fixtures give tool implementers the wrong schema contract

## R6: Downstream Consumer Impact Assessment

**Decision**: All changes are additive (new optional fields only) — zero breaking changes to existing consumers.

**Rationale**: Analysis of downstream consumers:

| Consumer | File | Impact |
|----------|------|--------|
| FeatureList.flattenFeatures | `shared/components/src/FeatureList/flattenFeatures.ts` | No impact — accesses `name`, `contacts`, `bearing`, `time` only |
| FeatureList.stories | `shared/components/src/FeatureList/FeatureList.stories.tsx` | No impact — test fixtures use subset of fields |
| DSF handler | `services/io/src/debrief_io/handlers/dsf.py` | No impact — constructs dicts with current fields |
| DPF handler | `services/io/src/debrief_io/handlers/dpf.py` | No impact — constructs dicts with bearing from track |
| Import catalog | `services/io/src/debrief_io/import_catalog.py` | No impact — merge logic uses `name` and `contacts` keys |

All new fields are optional with sensible defaults, so existing code continues to work unchanged. TypeScript consumers will see new optional properties in their interface but won't need to handle them until Phase 3 (rendering).

## R7: Enum Placement Decision

**Decision**: Place new enums in `common.yaml` alongside existing enums.

**Rationale**: All project enums live in `common.yaml` (lines 23-252). The new enums (ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum) are not sensor-specific — LineStyleEnum and LabelLocationEnum could apply to other annotation types in the future. Centralizing them maintains the single-enum-file convention.

**Alternatives considered**:
- Defining enums in `geojson.yaml` next to SensorContact — rejected because it breaks the convention and creates a second enum location
- Creating a new `sensor.yaml` schema file — rejected because the sensor entities are part of the GeoJSON feature model, not a separate concern
