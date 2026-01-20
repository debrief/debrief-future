# Test Summary: GeoJSON Styling Properties Schemas

**Date**: 2026-01-20
**Feature**: 014-geojson-styling-schemas

## Test Results

```
======================= 119 passed, 6 warnings =======================
```

### Test Breakdown

| Test File | Tests | Status |
|-----------|-------|--------|
| test_golden.py | 48 | PASSED |
| test_roundtrip.py | 56 | PASSED |
| test_schema_compare.py | 15 | PASSED |

### Golden Fixture Tests (test_golden.py)

- **Valid fixtures**: 24 tests - All passing
- **Invalid fixtures**: 21 tests - All correctly fail validation
- **Fixture consistency**: 3 tests - All passing

### Round-Trip Tests (test_roundtrip.py)

- **Data preservation**: 14 entity types tested
- **Required field preservation**: 14 tests passing
- **Serialization modes**: 28 tests (model_dump_dict, model_dump_json)

### Schema Structure Tests (test_schema_compare.py)

- **Schema existence**: 3 tests
- **Required fields**: 6 tests
- **Enum consistency**: 2 tests

## Warnings

6 warnings related to known LinkML nested array limitation with GeoJSON coordinates:
- circle-annotation-valid-01.json
- line-annotation-valid-01.json
- rectangle-annotation-valid-01.json
- track-feature-valid-01.json
- track-feature-valid-02.json
- vector-annotation-valid-01.json

These warnings are expected and documented - LinkML generates models expecting flat number arrays while proper GeoJSON uses nested coordinate arrays.

## Fixture Coverage

### New Styling Schemas

| Schema | Valid Fixtures | Invalid Fixtures |
|--------|---------------|------------------|
| PointProperties | 4 | 3 |
| LineProperties | 4 | 3 |
| PolygonProperties | 3 | 3 |
| TrackStyle | 2 | 1 |

### Updated Feature Schemas

All feature schemas now require a `style` property:
- TrackFeature: 2 valid fixtures updated
- ReferenceLocation: 2 valid fixtures updated
- NarrativeEntry: 2 valid fixtures updated
- CircleAnnotation: 1 valid fixture updated
- RectangleAnnotation: 1 valid fixture updated
- LineAnnotation: 1 valid fixture updated
- TextAnnotation: 1 valid fixture updated
- VectorAnnotation: 1 valid fixture updated

## Command to Reproduce

```bash
cd shared/schemas
python -m pytest tests/ -v
```
