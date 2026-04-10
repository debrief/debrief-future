# Quickstart: Sensor Schema Overhaul (#116)

**Date**: 2026-04-10
**Feature**: 116-sensor-schema-overhaul

## What This Feature Does

Redesigns the SensorContact and SensorData schemas in LinkML to fully capture the legacy Debrief sensor data model. Adds display properties (color, visibility, line style, label placement), array centre modes (PLAIN, WORM, MEASURED), measured array positions, and boolean presence flags. Updates all 9 sensor tool spec fixtures to match.

## Key Files to Modify

### Schema (source of truth)

| File | Change |
|------|--------|
| `shared/schemas/src/linkml/common.yaml` | Add 4 new enums: ArrayCentreModeEnum, LineStyleEnum, LabelLocationEnum, LineLabelPositionEnum |
| `shared/schemas/src/linkml/geojson.yaml` | Expand SensorContact (9 new fields), SensorData (4 new fields), add MeasuredArrayPosition class |

### Generated (auto-generated, do not hand-edit)

| File | How to Regenerate |
|------|-------------------|
| `shared/schemas/src/generated/python/debrief_schemas/__init__.py` | `cd shared/schemas && uv run python scripts/generate.py` |
| `shared/schemas/src/generated/typescript/types.ts` | Same command |
| `shared/schemas/src/generated/json-schema/*.json` | Same command |

### Fixtures

| File | Change |
|------|--------|
| `shared/schemas/src/fixtures/valid/track-feature-sensors-01.json` | Verify still validates (backward compat) |
| `shared/schemas/src/fixtures/valid/track-feature-sensors-02.json` | NEW — comprehensive fixture with all new fields |
| `shared/schemas/src/fixtures/valid/track-feature-sensors-measured-01.json` | NEW — MEASURED mode with measured_positions |
| `shared/schemas/src/fixtures/valid/track-feature-sensors-minimal-01.json` | NEW — minimal required fields only |
| `shared/schemas/src/fixtures/invalid/track-feature-sensor-invalid-enum.json` | NEW — invalid enum value |
| `shared/schemas/src/fixtures/invalid/track-feature-sensor-invalid-origin.json` | NEW — origin with wrong cardinality |
| `shared/schemas/src/fixtures/invalid/track-feature-sensor-bearing-range.json` | NEW — bearing out of range |
| `shared/tools/sensor/**/*.json` | Update 62 tool fixture files to include new fields where relevant |

### Tests

| File | Change |
|------|--------|
| `shared/schemas/tests/test_golden.py` | No change needed — auto-discovers fixtures |
| `shared/schemas/tests/test_roundtrip.py` | No change needed — auto-discovers fixtures |

## Development Workflow

```bash
# 1. Edit LinkML schemas
#    - Add enums to common.yaml
#    - Add fields/classes to geojson.yaml

# 2. Regenerate all derived schemas
cd shared/schemas && uv run python scripts/generate.py

# 3. Create golden fixtures
#    - Add valid fixtures to fixtures/valid/
#    - Add invalid fixtures to fixtures/invalid/

# 4. Run schema tests
uv run pytest shared/schemas/tests/

# 5. Update tool spec fixtures
#    - Edit JSON files under shared/tools/sensor/

# 6. Run full verification
task verify
```

## Patterns to Follow

### Adding an enum (in common.yaml)

```yaml
enums:
  LineStyleEnum:
    description: Visual style for bearing lines
    permissible_values:
      SOLID:
        description: Continuous line
      DASHED:
        description: Evenly spaced dashes
```

### Adding an optional field to SensorContact (in geojson.yaml)

```yaml
  SensorContact:
    attributes:
      # ... existing fields ...
      color:
        description: Contact color override (CSS hex string, null inherits from sensor)
      visible:
        description: Contact visibility
        range: boolean
```

### Adding a coordinate pair field

```yaml
      origin:
        description: Explicit sensor location as [longitude, latitude]
        range: float
        multivalued: true
        minimum_cardinality: 2
        maximum_cardinality: 2
```

### Adding a nested class array (measured_positions)

```yaml
  SensorData:
    attributes:
      measured_positions:
        description: Actual array positions for MEASURED mode
        range: MeasuredArrayPosition
        multivalued: true
        inlined_as_list: true
```

## Verification Checklist

- [ ] `uv run pytest shared/schemas/tests/` passes
- [ ] Existing `track-feature-sensors-01.json` still validates
- [ ] New valid fixtures validate
- [ ] New invalid fixtures fail validation with expected errors
- [ ] Round-trip test passes for comprehensive fixture
- [ ] Generated Pydantic model has all new fields
- [ ] Generated TypeScript interface has all new fields
- [ ] `task verify` passes (full CI equivalent)
