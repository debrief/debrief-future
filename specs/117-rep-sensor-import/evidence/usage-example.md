# Usage Example: REP Sensor Import

## Parsing a REP file with sensor lines

```python
from debrief_io.handlers.rep import REPHandler

# REP file content with track positions and sensor data
content = """
951212 050000.000 NELSON   @C   22 11 10.63 N 21 41 52.37 W 269.7   2.0      0
951212 050100.000 NELSON   @C   22 11 10.58 N 21 42  2.98 W 269.7   2.0      0

;SENSOR: 951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 045.0 5000 TOWED_ARRAY first_contact
;SENSOR: 951212 050100.000 NELSON @C NULL 050.0 5500 TOWED_ARRAY second_contact
;SENSOR2: 951212 050200.000 NELSON @A NULL 032.8 12000 240.5 169.4 NULL SONAR_2 ambiguous_contact
;SENSORARC 951212 050000.000 951212 050500.000 NELSON 270 90 0 5000
""".strip()

handler = REPHandler()
result = handler.parse(content, "example.rep")

# Track features are still produced
track_features = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
print(f"Tracks: {len(track_features)}")
# -> Tracks: 1

# Sensor data is in pending_sensor_data (not standalone features)
print(f"Tracks with sensor data: {list(result.pending_sensor_data.keys())}")
# -> Tracks with sensor data: ['NELSON']

# Access sensor data for NELSON
sensors = result.pending_sensor_data["NELSON"]
for sensor in sensors:
    print(f"  Sensor: {sensor['name']}, contacts: {len(sensor['contacts'])}")
    if "color" in sensor:
        print(f"    Color: {sensor['color']}")
    for contact in sensor["contacts"]:
        print(f"    - {contact['time']}: bearing={contact['bearing']}", end="")
        if contact.get("has_bearing") is False:
            print(" (no bearing)", end="")
        if "origin" in contact:
            print(f", origin={contact['origin']}", end="")
        if "ambiguous_bearing" in contact:
            print(f", ambig={contact['ambiguous_bearing']}", end="")
        if "frequency" in contact:
            print(f", freq={contact['frequency']}", end="")
        print()

# SENSORARC produces standalone DynamicTrackCoverage features
coverage = [f for f in result.features if f["properties"]["kind"] == "DYNAMIC_TRACK_COVERAGE"]
print(f"\nCoverage annotations: {len(coverage)}")
for cov in coverage:
    props = cov["properties"]
    print(f"  Track: {props['track_id']}, "
          f"arc: {props['left_bearing']}-{props['right_bearing']} deg, "
          f"range: {props['inner_range']}-{props['outer_range']} m")

# No standalone SENSOR features exist
standalone_sensors = [f for f in result.features if f["properties"]["kind"] in ("SENSOR", "SENSOR_CONTACT")]
assert len(standalone_sensors) == 0
print("\nNo standalone sensor features (all embedded in pending_sensor_data)")
```

## Expected output

```
Tracks: 1
Tracks with sensor data: ['NELSON']
  Sensor: TOWED_ARRAY, contacts: 2
    Color: #FF0000
    - 1995-12-12T05:00:00+00:00: bearing=45.0, origin=[-21.697881..., 22.186286...]
    - 1995-12-12T05:01:00+00:00: bearing=50.0
  Sensor: SONAR_2, contacts: 1
    Color: #0000FF
    - 1995-12-12T05:02:00+00:00: bearing=32.8, ambig=240.5, freq=169.4

Coverage annotations: 1
  Track: NELSON, arc: 270.0-90.0 deg, range: 0.0-5000.0 m

No standalone sensor features (all embedded in pending_sensor_data)
```
