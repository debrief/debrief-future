# Usage Examples: GeoJSON Styling Properties

## Python (Pydantic)

### Validating a TrackStyle

```python
from debrief_schemas import TrackStyle, LineProperties, PointProperties

# Create a complete TrackStyle
track_style = TrackStyle(
    line=LineProperties(
        stroke=True,
        color="#0066CC",
        weight=2,
        opacity=1.0,
        line_cap="round",
        line_join="round",
        dash_array=None
    ),
    point=PointProperties(
        shape="circle",
        radius=4,
        fill=True,
        fill_color="#0066CC",
        fill_opacity=1.0,
        stroke=True,
        color="#FFFFFF",
        weight=1,
        opacity=1.0
    )
)

# Serialize to JSON
json_str = track_style.model_dump_json()
print(json_str)
```

### Validating Invalid Data

```python
from pydantic import ValidationError
from debrief_schemas import LineProperties

try:
    # Invalid: opacity > 1.0
    bad_style = LineProperties(
        color="#0066CC",
        opacity=1.5  # ValidationError!
    )
except ValidationError as e:
    print("Validation errors:", e.errors())
    # Output: opacity must be <= 1.0
```

### Creating a Styled TrackFeature

```python
from debrief_schemas import TrackFeature, TrackProperties, TrackStyle

feature = TrackFeature(
    type="Feature",
    id="track-001",
    geometry={
        "type": "LineString",
        "coordinates": [[-5.0, 50.0], [-4.9, 50.1]]
    },
    properties=TrackProperties(
        kind="TRACK",
        platform_id="HMS-EXAMPLE",
        track_type="OWNSHIP",
        start_time="2026-01-20T10:00:00Z",
        end_time="2026-01-20T12:00:00Z",
        positions=[
            {"time": "2026-01-20T10:00:00Z", "coordinates": [-5.0, 50.0]},
            {"time": "2026-01-20T12:00:00Z", "coordinates": [-4.9, 50.1]}
        ],
        style={
            "line": {
                "stroke": True,
                "color": "#0066CC",
                "weight": 2,
                "opacity": 1.0,
                "line_cap": "round",
                "line_join": "round"
            },
            "point": {
                "shape": "circle",
                "radius": 4,
                "fill": True,
                "fill_color": "#0066CC",
                "fill_opacity": 1.0,
                "stroke": True,
                "color": "#FFFFFF",
                "weight": 1,
                "opacity": 1.0
            }
        }
    )
)
```

## TypeScript (JSON Schema Validation)

### Using AJV

```typescript
import Ajv from 'ajv';
import trackStyleSchema from './generated/json-schema/TrackStyle.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(trackStyleSchema);

const style = {
  line: {
    stroke: true,
    color: '#0066CC',
    weight: 2,
    opacity: 1.0,
    line_cap: 'round',
    line_join: 'round',
    dash_array: null
  },
  point: {
    shape: 'circle',
    radius: 4,
    fill: true,
    fill_color: '#0066CC',
    fill_opacity: 1.0,
    stroke: true,
    color: '#FFFFFF',
    weight: 1,
    opacity: 1.0
  }
};

if (validate(style)) {
  console.log('Valid TrackStyle');
} else {
  console.log('Invalid:', validate.errors);
}
```

## Tactical Styling Examples

### Hostile Contact (Red Dashed)

```json
{
  "line": {
    "stroke": true,
    "color": "#FF0000",
    "weight": 3,
    "opacity": 0.9,
    "line_cap": "butt",
    "line_join": "miter",
    "dash_array": "10, 5"
  },
  "point": {
    "shape": "triangle",
    "radius": 6,
    "fill": true,
    "fill_color": "#FF0000",
    "fill_opacity": 1.0,
    "stroke": true,
    "color": "#FFFFFF",
    "weight": 1,
    "opacity": 1.0
  }
}
```

### Friendly Unit (Blue Solid)

```json
{
  "line": {
    "stroke": true,
    "color": "#0066CC",
    "weight": 2,
    "opacity": 1.0,
    "line_cap": "round",
    "line_join": "round",
    "dash_array": null
  },
  "point": {
    "shape": "circle",
    "radius": 4,
    "fill": true,
    "fill_color": "#0066CC",
    "fill_opacity": 1.0,
    "stroke": true,
    "color": "#FFFFFF",
    "weight": 1,
    "opacity": 1.0
  }
}
```
