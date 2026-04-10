---
feature: "116-sensor-schema-overhaul"
captured_at: "2026-04-10T13:33:00Z"
git_sha: "713a58c"
tests_passed: 1533
tests_failed: 0
tests_skipped: 1
coverage_pct: null
---

# Test Summary: Sensor Schema Overhaul

## Results

| Metric | Value |
|--------|-------|
| Total Tests (Python) | 1522 |
| Passed (Python) | 1522 |
| Failed | 0 |
| Skipped | 1 |
| xfailed | 1 |
| Total Tests (TypeScript) | 11 |
| Passed (TypeScript) | 11 |

## Test Breakdown

### Schema Golden Fixtures (test_golden.py)

| Test | Status |
|------|--------|
| 52 valid fixtures pass validation | Pass |
| 36 invalid fixtures correctly rejected | Pass |
| New sensor fixtures (sensors-02, minimal, measured, boundary) | Pass |
| New invalid fixtures (enum, origin, bearing range, negative, over360, origin-length) | Pass |
| Backward compatibility (sensors-01 unchanged) | Pass |

### Schema Round-Trip (test_roundtrip.py)

| Test | Status |
|------|--------|
| Python JSON round-trip for all valid fixtures | Pass |
| Sensor fixtures with new fields survive round-trip | Pass |
| Required fields preserved after round-trip | Pass |

### TypeScript Round-Trip (test_sensor_roundtrip.test.ts)

| Test | Status |
|------|--------|
| Comprehensive fixture (sensors-02) SensorData fields | Pass |
| SensorContact display properties preservation | Pass |
| All contacts preserved through round-trip | Pass |
| Full feature structure round-trip | Pass |
| Minimal fixture (only required fields) | Pass |
| Measured positions array preservation | Pass |
| MeasuredArrayPosition fields (time, location) | Pass |
| array_centre_mode=MEASURED preservation | Pass |
| Backward compatibility (sensors-01) | Pass |

### Sensor Enum Exhaustiveness (test_sensor_enums.py)

| Test | Status |
|------|--------|
| ArrayCentreModeEnum: PLAIN, WORM, MEASURED | Pass |
| LineStyleEnum: SOLID, DASHED, DOT, DASH_DOT | Pass |
| LabelLocationEnum: LEFT, CENTER, RIGHT | Pass |
| LineLabelPositionEnum: START, MIDDLE, END | Pass |
| JSON Schema enum values match expected | Pass |

### Schema Comparison (test_schema_compare.py)

| Test | Status |
|------|--------|
| 4 new enum value consistency in JSON Schema | Pass |
| SensorData all 10 properties present | Pass |
| SensorContact all 17 properties present | Pass |
| MeasuredArrayPosition properties (time, location) | Pass |
| SensorData required fields (name, contacts) | Pass |
| SensorContact required fields (time, bearing) | Pass |
| origin coordinate pair schema (array of 2 numbers) | Pass |
| MeasuredArrayPosition.location schema (array of 2 numbers) | Pass |

### Tool Fixture Validation (test_tool_fixtures.py)

| Test | Status |
|------|--------|
| 62 tool fixtures are valid JSON | Pass |
| All sensor contacts have required fields (time, bearing) | Pass |
| All bearings in [0, 360] range | Pass |

## Key Scenarios Verified

- Full round-trip fidelity: all 17 SensorContact fields and 10 SensorData fields survive Python-JSON-TypeScript-JSON-Python cycle
- Backward compatibility: existing sensor fixtures (sensors-01, sensor-no-bearing) validate unchanged
- Enum validation: invalid enum values correctly rejected, all valid values accepted
- Coordinate pair validation: origin and location fields enforce exactly 2 elements
- Bearing constraints: 0 and 360 are valid boundaries; -1 and 361 correctly rejected
- Boolean presence flag pattern: has_bearing=false with bearing value is valid
- Display property inheritance: null contact color accepted (inherits from parent SensorData)
- MEASURED mode: measured_positions array with MeasuredArrayPosition objects round-trips correctly
- Tool fixtures: 60 of 62 files updated with new fields, all pass validation

## Known Issues

- 1 test skipped (pre-existing, unrelated to this feature)
- 1 xfailed test (pre-existing STAC extension test)

## Environment

- Python runner: pytest 8.x
- TypeScript runner: vitest 1.6.1
- Branch: claude/implement-speckit-116-lXKzl
- Date: 2026-04-10
