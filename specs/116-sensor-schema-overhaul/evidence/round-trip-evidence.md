# Round-Trip Evidence: Sensor Schema Overhaul

## Python Round-Trip (Python -> JSON -> Python)

All 4 new sensor fixtures pass Python round-trip tests:

```
shared/schemas/tests/test_roundtrip.py::TestPythonRoundTrip::test_roundtrip_preserves_data[track-feature-sensors-02.json] PASSED
shared/schemas/tests/test_roundtrip.py::TestPythonRoundTrip::test_roundtrip_preserves_data[track-feature-sensors-minimal-01.json] PASSED
shared/schemas/tests/test_roundtrip.py::TestPythonRoundTrip::test_roundtrip_preserves_data[track-feature-sensors-measured-01.json] PASSED
shared/schemas/tests/test_roundtrip.py::TestPythonRoundTrip::test_roundtrip_preserves_data[track-feature-sensors-boundary-01.json] PASSED
```

Backward compatibility confirmed:
```
shared/schemas/tests/test_roundtrip.py::TestPythonRoundTrip::test_roundtrip_preserves_data[track-feature-sensors-01.json] PASSED
```

## TypeScript Round-Trip (JSON -> TS -> JSON)

11 TypeScript round-trip tests pass via vitest:

```
 ✓ tests/ts/test_sensor_roundtrip.test.ts (11 tests) 8ms
   ✓ Sensor TypeScript round-trip
     ✓ comprehensive fixture (sensors-02)
       ✓ preserves SensorData fields through round-trip
       ✓ preserves SensorContact display properties
       ✓ preserves all contacts through round-trip
       ✓ full feature round-trip preserves entire structure
     ✓ minimal fixture (sensors-minimal-01)
       ✓ preserves minimal SensorData
       ✓ preserves minimal SensorContact (time + bearing only)
     ✓ measured positions fixture (sensors-measured-01)
       ✓ preserves measured_positions array
       ✓ preserves MeasuredArrayPosition fields
       ✓ preserves array_centre_mode=MEASURED
     ✓ backward compatibility (sensors-01)
       ✓ existing fixture round-trips without loss
       ✓ existing contacts preserve original fields
```

## Full Pipeline: Python -> JSON -> TypeScript -> JSON -> Python

The comprehensive fixture (`track-feature-sensors-02.json`) exercises all 17 SensorContact fields and all 10 SensorData fields. Both the Python and TypeScript legs of the round-trip pipeline preserve every field with zero data loss.

### Fields Verified

**SensorContact (17 fields)**:
time, bearing, has_bearing, ambiguous_bearing, has_ambiguous, range, frequency, has_frequency, label, comment, color, visible, show_label, line_style, label_location, put_label_at, origin

**SensorData (10 fields)**:
name, base_frequency, offset, array_centre_mode, worm_in_hole, color, visible, line_thickness, contacts, measured_positions

**MeasuredArrayPosition (2 fields)**:
time, location
