# Usage Example: InputState Capture on Move-Shape

## Executing move-shape and inspecting inputState

```python
import copy
from debrief_calc.executor import run
from debrief_calc.models import ContextType, SelectionContext

# A circle annotation at [0, 50]
circle = {
    "type": "Feature",
    "id": "circle-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [0.008993, 50.0],
                [0.0, 50.008993],
                [-0.008993, 50.0],
                [0.0, 49.991007],
                [0.008993, 50.0],
            ]
        ],
    },
    "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0],
        "radius": 1000,
    },
}

# Move the circle East by 5 km
context = SelectionContext(type=ContextType.SINGLE, features=[copy.deepcopy(circle)])
result = run("move-shape", context, params={"direction": 90, "distance_km": 5})

# Inspect the output
output = result.features[0]
prov_entry = output["properties"]["provenance"][0]

print("Output center:", output["properties"]["center"])
# Output center: [0.069939..., 50.0]  (moved East)

print("InputState stored:", prov_entry["inputState"] is not None)
# InputState stored: True

input_state = prov_entry["inputState"][0]
print("Stored featureId:", input_state["featureId"])
# Stored featureId: circle-001

print("Stored original center:", input_state["properties"]["center"])
# Stored original center: [0.0, 50.0]  (pre-move position)

print("Stored geometry type:", input_state["geometry"]["type"])
# Stored geometry type: Polygon
```

## Replaying with a different bearing

When the TypeScript session-state layer replays this entry with a modified bearing
(e.g., 0 instead of 90), it reads `inputState[0].geometry` and
`inputState[0].properties` to restore the feature to its pre-move state, then
re-executes with the new parameter. The result is computed from the **original**
position, not the current moved position.

```
Original position: [0.0, 50.0]
Move East 5 km:    [0.07, 50.0]  (current position)

Replay with bearing=0 (North):
  -> Reads inputState: center=[0.0, 50.0]
  -> Restores feature to [0.0, 50.0]
  -> Applies bearing=0, distance=5km
  -> Result: [0.0, 50.045]  (5 km North of ORIGINAL, not of current)
```

## Non-mutation tools

Non-mutation tools (e.g., `track-stats`) automatically get `inputState: null`:

```python
track = {
    "type": "Feature",
    "id": "track-001",
    "properties": {"kind": "TRACK"},
    "geometry": {"type": "LineString", "coordinates": [[-4.5, 50.2], [-4.4, 50.3]]},
}
context = SelectionContext(type=ContextType.SINGLE, features=[track])
result = run("track-stats", context)

entry = result.features[0]["properties"]["provenance"][0]
print("inputState:", entry["inputState"])
# inputState: None
```
