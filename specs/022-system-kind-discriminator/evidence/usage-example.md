# Usage Example: SYSTEM State Features

## Python (Pydantic)

```python
from debrief_schemas import SystemState, SystemStateProperties, GeoJSONEmptyPoint

# Create temporal viewport state
temporal_state = SystemState(
    type="Feature",
    id="state.temporal",
    geometry=GeoJSONEmptyPoint(type="Point", coordinates=[]),
    properties=SystemStateProperties(
        kind="SYSTEM",
        state_type="temporal",
        start_time="2024-01-15T09:00:00Z",
        end_time="2024-01-15T17:30:00Z"
    )
)

# Create spatial viewport state
spatial_state = SystemState(
    type="Feature",
    id="state.spatial",
    geometry=GeoJSONEmptyPoint(type="Point", coordinates=[]),
    properties=SystemStateProperties(
        kind="SYSTEM",
        state_type="spatial",
        bbox=[-5.5, 49.5, 1.5, 55.0],
        zoom=8.5,
        center=[-2.0, 52.25]
    )
)

# Create selection state
selection_state = SystemState(
    type="Feature",
    id="state.selection",
    geometry=GeoJSONEmptyPoint(type="Point", coordinates=[]),
    properties=SystemStateProperties(
        kind="SYSTEM",
        state_type="selection",
        selected_ids=["track-001", "track-002", "ref-waypoint-alpha"]
    )
)

# Export to JSON
json_str = temporal_state.model_dump_json(indent=2)
```

## TypeScript

```typescript
import { SystemState } from '@debrief/schemas';

const temporalState: SystemState = {
  type: 'Feature',
  id: 'state.temporal',
  geometry: { type: 'Point', coordinates: [] },
  properties: {
    kind: 'SYSTEM',
    state_type: 'temporal',
    start_time: '2024-01-15T09:00:00Z',
    end_time: '2024-01-15T17:30:00Z'
  }
};
```

## GeoJSON FeatureCollection

SYSTEM features integrate seamlessly with spatial features:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "track-001",
      "geometry": { "type": "LineString", "coordinates": [...] },
      "properties": { "kind": "TRACK", ... }
    },
    {
      "type": "Feature",
      "id": "state.temporal",
      "geometry": { "type": "Point", "coordinates": [] },
      "properties": {
        "kind": "SYSTEM",
        "state_type": "temporal",
        "start_time": "2024-01-15T09:00:00Z",
        "end_time": "2024-01-15T17:30:00Z"
      }
    }
  ]
}
```
