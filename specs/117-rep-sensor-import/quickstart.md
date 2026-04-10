# Quickstart: REP Sensor Import (#117)

## What This Feature Does

Parses `;SENSOR:`, `;SENSOR2:`, `;SENSOR3:`, and `;SENSORARC` lines from REP files and embeds the parsed sensor contacts into the parent TrackFeature's `properties.sensors[]` array. Previously, sensor lines were treated as standalone GeoJSON features; now they flow through the embedded sensor schema pipeline.

## Example REP Input

```
;; Track positions
951212 050000.000 NELSON @C 22 02 27.78 N 021 01 13.78 W 270.0 12.0 0.0
951212 051000.000 NELSON @C 22 02 30.00 N 021 01 20.00 W 275.0 11.5 0.0
;; SENSOR v1 with explicit location
;SENSOR: 951212 050200 "NELSON" @A 22 02 28.00 N 021 01 14.00 W 045.3 5000 TOWED_ARRAY Contact alpha
;; SENSOR v1 with NULL location (derived from track)
;SENSOR: 951212 050400 "NELSON" @A NULL 090.0 3000 TOWED_ARRAY Contact bravo
;; SENSOR2 with ambiguous bearing and frequency
;SENSOR2: 951212 050600.000 NELSON @A NULL 120.5 2500 240.5 169.4 NULL TOWED_ARRAY Contact charlie
;; SENSOR3 with accuracy fields (discarded)
;SENSOR3: 951212 050800.000 NELSON @A NULL 135.0 2000 250.0 170.0 5.0 2.0 NULL TOWED_ARRAY Contact delta
```

## Expected Output

After parsing, the NELSON TrackFeature contains:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "LineString",
    "coordinates": [[-21.0205, 22.0410], [-21.0222, 22.0416]]
  },
  "properties": {
    "kind": "TRACK",
    "platform_id": "NELSON",
    "sensors": [
      {
        "name": "TOWED_ARRAY",
        "color": "#0000FF",
        "contacts": [
          {
            "time": "1995-12-12T05:02:00+00:00",
            "bearing": 45.3,
            "has_bearing": true,
            "range": 4572.0,
            "origin": [-21.0205, 22.0411],
            "label": "Contact alpha"
          },
          {
            "time": "1995-12-12T05:04:00+00:00",
            "bearing": 90.0,
            "has_bearing": true,
            "range": 2743.2,
            "origin": null,
            "label": "Contact bravo"
          },
          {
            "time": "1995-12-12T05:06:00+00:00",
            "bearing": 120.5,
            "has_bearing": true,
            "range": 2286.0,
            "ambiguous_bearing": 240.5,
            "has_ambiguous": true,
            "frequency": 169.4,
            "has_frequency": true,
            "label": "Contact charlie"
          },
          {
            "time": "1995-12-12T05:08:00+00:00",
            "bearing": 135.0,
            "has_bearing": true,
            "range": 1828.8,
            "ambiguous_bearing": 250.0,
            "has_ambiguous": true,
            "frequency": 170.0,
            "has_frequency": true,
            "label": "Contact delta"
          }
        ]
      }
    ]
  }
}
```

## How to Test

### Unit tests (Python)

```bash
cd services/io
uv run pytest tests/test_sensor_parser.py -v
```

### Integration test with full REP parse

```bash
cd services/io
uv run pytest tests/test_rep_handler.py -k "sensor" -v
```

### Manual verification

```python
from debrief_io.handlers.rep import REPHandler

handler = REPHandler()
with open("test_data/sensor_sample.rep") as f:
    result = handler.parse(f.read(), "sensor_sample.rep")

# Check no standalone sensor features
sensor_features = [f for f in result.features if f["properties"].get("kind") in ("SENSOR", "SENSOR_CONTACT", "SENSOR2")]
assert len(sensor_features) == 0, f"Found {len(sensor_features)} standalone sensor features"

# Check pending sensor data
assert "NELSON" in result.pending_sensor_data
sensors = result.pending_sensor_data["NELSON"]
assert len(sensors) == 1  # One sensor: TOWED_ARRAY
assert sensors[0]["name"] == "TOWED_ARRAY"
assert len(sensors[0]["contacts"]) == 4
```

## Key Conversion Reference

| Source Value | Stored Value | Rule |
|-------------|-------------|------|
| Range: `5000` (yards) | `4572.0` (metres) | Multiply by 0.9144 |
| Bearing: `NULL` | `bearing=0`, `has_bearing=false` | Sentinel |
| Bearing: `NAN` | `bearing=0`, `has_bearing=false` | Sentinel |
| Bearing: `0.0` | `bearing=0.0`, `has_bearing=true` | Valid bearing |
| Frequency: `NULL` | `frequency=null`, `has_frequency=false` | Absent |
| Symbol: `@C` | `color="#FF0000"` | Red via symbology table |
| Location: `NULL` | `origin=null` | Derived from track at render time |
| Location: DMS coords | `origin=[lon, lat]` | Explicit sensor position |
