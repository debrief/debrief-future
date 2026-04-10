# Schema Contract: Sensor Schema Overhaul (#116)

This feature defines data schemas, not service APIs. The "contract" is the schema itself — the shapes that all producers and consumers of sensor data must conform to.

## Contract: SensorContact Shape

All components producing or consuming SensorContact data MUST conform to the LinkML-generated schema. The canonical shapes are defined in:

- **Source**: `shared/schemas/src/linkml/geojson.yaml` → `SensorContact` class
- **Python**: `debrief_schemas.SensorContact` (Pydantic model)
- **TypeScript**: `SensorContact` interface in `@debrief/schemas`
- **JSON Schema**: `shared/schemas/src/generated/json-schema/SensorContact.json`

### Required Fields

```json
{
  "time": "2026-01-09T10:00:00Z",
  "bearing": 45.0
}
```

### Full Shape (all optional fields shown)

```json
{
  "time": "2026-01-09T10:00:00Z",
  "bearing": 45.0,
  "has_bearing": true,
  "ambiguous_bearing": 225.0,
  "has_ambiguous": true,
  "range": 5000.0,
  "frequency": 152.3,
  "has_frequency": true,
  "label": "C1",
  "comment": "Initial contact",
  "color": "#FF0000",
  "visible": true,
  "show_label": false,
  "line_style": "SOLID",
  "label_location": "LEFT",
  "put_label_at": "MIDDLE",
  "origin": [-5.0, 50.0]
}
```

## Contract: SensorData Shape

### Required Fields

```json
{
  "name": "TOWED_ARRAY",
  "contacts": []
}
```

### Full Shape (all optional fields shown)

```json
{
  "name": "TOWED_ARRAY",
  "base_frequency": 150.0,
  "offset": 200.0,
  "array_centre_mode": "PLAIN",
  "worm_in_hole": false,
  "color": "#0066CC",
  "visible": true,
  "line_thickness": 2,
  "contacts": [],
  "measured_positions": [
    {
      "time": "2026-01-09T10:00:00Z",
      "latitude": 50.0,
      "longitude": -5.0
    }
  ]
}
```

## Contract: Enum Values

| Enum | Values |
|------|--------|
| ArrayCentreModeEnum | PLAIN, WORM, MEASURED |
| LineStyleEnum | SOLID, DASHED, DOT, DASH_DOT |
| LabelLocationEnum | LEFT, CENTER, RIGHT |
| LineLabelPositionEnum | START, MIDDLE, END |

## Backward Compatibility

Existing data with only the pre-overhaul fields (time, bearing, range, frequency, ambiguous_bearing, label, comment for contacts; name, base_frequency, offset, worm_in_hole, contacts for sensors) MUST continue to validate without modification.
