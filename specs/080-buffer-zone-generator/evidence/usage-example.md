# Usage Example: Buffer Zone Generator (#080)

## Basic Usage — Generate Default Detection Zones

```python
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.sensor.detection.buffer_zone_generator import buffer_zone_generator

# 1. Define a track feature
track = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-4.5, 50.2, 0, 1705305600000],
            [-4.4, 50.3, 0, 1705309200000],
            [-4.3, 50.25, 0, 1705312800000],
        ],
    },
    "properties": {"kind": "TRACK", "name": "HMS Example"},
}

# 2. Create selection context
context = SelectionContext(type=ContextType.SINGLE, features=[track])

# 3. Generate zones with default distances (3nm, 6nm, 12nm)
zones = buffer_zone_generator(context, {})

# 4. Inspect results
for zone in zones:
    props = zone["properties"]
    ring = zone["geometry"]["coordinates"][0]
    print(f"Zone {props['name']}: {props['buffer_distance_nm']}nm, "
          f"{props['detection_likelihood_pct']}% likelihood, "
          f"{len(ring)} vertices")
```

**Output:**
```
Zone 75%: 3.0nm, 75% likelihood, 40 vertices
Zone 50%: 6.0nm, 50% likelihood, 40 vertices
Zone 25%: 12.0nm, 25% likelihood, 40 vertices
```

## Custom Distances

```python
# Override the buffer distances
params = {"distance_1_nm": 2.0, "distance_2_nm": 8.0, "distance_3_nm": 15.0}
zones = buffer_zone_generator(context, params)

for zone in zones:
    props = zone["properties"]
    print(f"Zone {props['name']}: {props['buffer_distance_nm']}nm")
```

**Output:**
```
Zone 75%: 2.0nm
Zone 50%: 8.0nm
Zone 25%: 15.0nm
```

## Swappable Sensor Model

```python
from debrief_calc.tools.sensor.detection.sensor_model import SensorModelZone

class MySensorModel:
    def get_detection_zones(self, track):
        return [
            SensorModelZone(distance_nm=1.0, likelihood_pct=90, name="90%"),
            SensorModelZone(distance_nm=5.0, likelihood_pct=50, name="50%"),
            SensorModelZone(distance_nm=10.0, likelihood_pct=10, name="10%"),
        ]

zones = buffer_zone_generator(context, {}, sensor_model=MySensorModel())
# Produces zones at 1nm, 5nm, 10nm with custom labels
```

## Zone Feature Structure

Each zone is a standard GeoJSON Feature:

```json
{
  "type": "Feature",
  "id": "zone-<uuid>",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[ [lon, lat], ... ]]
  },
  "properties": {
    "kind": "ZONE",
    "name": "75%",
    "detection_likelihood_pct": 75,
    "buffer_distance_nm": 3.0,
    "debrief:resultType": "addition/feature",
    "debrief:sourceFeatures": ["track-001"],
    "debrief:label": "Generated 3 detection zones (75%, 50%, 25%) for track"
  }
}
```
