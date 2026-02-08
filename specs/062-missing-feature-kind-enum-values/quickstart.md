# Quickstart: Compound Track Model Implementation

**Feature**: 062-missing-feature-kind-enum-values
**Date**: 2026-02-08

## Prerequisites

- Python 3.11+ with uv
- Node.js 18+ with pnpm
- Working `shared/schemas/` workspace (run `uv sync` from repo root)

## Implementation Order

### Step 1: Write golden fixtures FIRST (test-driven)

Create new fixtures in `shared/schemas/src/fixtures/` before touching any schema files:

```bash
# Valid fixtures
valid/track-feature-compound-01.json    # MultiLineString + mixed segments
valid/track-feature-sensors-01.json     # Track with embedded sensors
valid/track-feature-tuas-01.json        # Track with embedded TUAs
valid/track-feature-full-01.json        # All children combined

# Invalid fixtures
invalid/track-feature-segment-mismatch.json     # segments.length != coordinates.length
invalid/track-feature-sensor-no-bearing.json    # contact missing required bearing
invalid/track-feature-segments-linestring.json  # segments array with LineString geometry
```

### Step 2: Add SegmentTypeEnum to common.yaml

```bash
# Edit shared/schemas/src/linkml/common.yaml
# Add SegmentTypeEnum alongside existing enums
```

### Step 3: Add new classes to geojson.yaml

Add in this order (each depends on the previous):
1. `GeoJSONMultiLineString` (geometry type)
2. `SensorContact` (leaf type)
3. `SensorData` (contains SensorContact)
4. `TUASolution` (leaf type)
5. `TUAData` (contains TUASolution)
6. `SegmentMetadata` (uses SegmentTypeEnum, TimestampedPosition)
7. Modify `TrackFeature.geometry` to use `any_of`
8. Modify `TrackProperties` to add `segments`, `sensors`, `tuas`

### Step 4: Regenerate and test

```bash
cd shared/schemas

# Regenerate all derived schemas
make generate

# Run all tests
make test

# Or individually:
uv run pytest tests/test_golden.py -v
uv run pytest tests/test_roundtrip.py -v
uv run pytest tests/test_schema_compare.py -v
pnpm exec node tests/validate-jsonschema.js
pnpm exec tsc --noEmit --project src/generated/typescript/tsconfig.json
```

### Step 5: Update test infrastructure

- `test_golden.py`: Update model mapping to handle new fixture prefixes
- `test_schema_compare.py`: Add `SegmentTypeEnum` value assertions
- `test_roundtrip.py`: Add compound track round-trip if coordinate limitation allows

## Key Patterns to Follow

### Union geometry (any_of)

```yaml
# In TrackFeature:
geometry:
  required: true
  any_of:
    - range: GeoJSONLineString
    - range: GeoJSONMultiLineString
```

### Embedded child arrays

```yaml
# In TrackProperties:
sensors:
  range: SensorData
  multivalued: true
  inlined_as_list: true  # Ensures array serialisation in JSON
```

### Conditional requirements (rules)

```yaml
# In SegmentMetadata:
rules:
  - preconditions:
      slot_conditions:
        segment_type:
          equals_string: "RELATIVE_TMA"
    postconditions:
      slot_conditions:
        host_track_id:
          required: true
```

## Verification Checklist

- [ ] All existing fixtures still pass (`make test` green)
- [ ] New valid fixtures pass Pydantic validation
- [ ] New invalid fixtures are correctly rejected
- [ ] Generated TypeScript compiles (`tsc --noEmit`)
- [ ] Generated JSON Schema validates via AJV
- [ ] Simple TrackFeature (LineString) still works unchanged
- [ ] Compound TrackFeature (MultiLineString) validates with segments
- [ ] SensorData with contacts validates
- [ ] TUAData with solutions validates
