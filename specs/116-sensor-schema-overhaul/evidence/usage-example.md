# Usage Example: Sensor Schema Overhaul

## Creating a SensorData with all new fields (Python)

```python
from debrief_schemas import SensorContact, SensorData, MeasuredArrayPosition

# Create contacts with display properties
contact1 = SensorContact(
    time="2026-01-09T10:00:00Z",
    bearing=45.0,
    has_bearing=True,
    range=5000.0,
    frequency=152.3,
    has_frequency=True,
    ambiguous_bearing=225.0,
    has_ambiguous=True,
    label="C1",
    comment="Initial contact",
    color="#FF0000",
    visible=True,
    show_label=True,
    line_style="SOLID",
    label_location="LEFT",
    put_label_at="MIDDLE",
    origin=[-5.0, 50.0],
)

contact2 = SensorContact(
    time="2026-01-09T10:15:00Z",
    bearing=47.2,
    has_bearing=True,
    # No color -> inherits from parent SensorData
    visible=False,  # Hidden contact
    line_style="DASHED",
)

# Create sensor with array centre mode and measured positions
sensor = SensorData(
    name="TOWED_ARRAY",
    base_frequency=150.0,
    offset=200.0,
    array_centre_mode="MEASURED",
    worm_in_hole=False,
    color="#0066CC",
    visible=True,
    line_thickness=2,
    contacts=[contact1, contact2],
    measured_positions=[
        MeasuredArrayPosition(
            time="2026-01-09T10:00:00Z",
            location=[-5.001, 49.998],
        ),
        MeasuredArrayPosition(
            time="2026-01-09T10:15:00Z",
            location=[-4.951, 50.048],
        ),
    ],
)

# Serialize to JSON
json_str = sensor.model_dump_json(indent=2)
print(json_str)
```

## Minimal SensorData (only required fields)

```python
minimal_sensor = SensorData(
    name="HULL_SONAR",
    contacts=[
        SensorContact(time="2026-01-09T10:00:00Z", bearing=120.0),
    ],
)
```

## Embedding in a TrackFeature (JSON)

```json
{
  "type": "Feature",
  "id": "track-001",
  "geometry": {"type": "LineString", "coordinates": [[-5.0, 50.0], [-4.9, 50.1]]},
  "properties": {
    "kind": "TRACK",
    "platform_id": "HMS-EXAMPLE",
    "track_type": "OWNSHIP",
    "sensors": [
      {
        "name": "TOWED_ARRAY",
        "array_centre_mode": "PLAIN",
        "color": "#0066CC",
        "visible": true,
        "contacts": [
          {
            "time": "2026-01-09T10:00:00Z",
            "bearing": 45.0,
            "has_bearing": true,
            "visible": true,
            "line_style": "SOLID"
          }
        ]
      }
    ]
  }
}
```
