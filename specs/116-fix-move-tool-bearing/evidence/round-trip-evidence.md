# Round-Trip Evidence: LogEntry with InputState

## Python LogEntry -> JSON -> Python

Verified by `TestLogEntryRoundTrip` in `services/calc/tests/test_provenance.py`.

### Test: round_trip_preserves_input_state

```python
# 1. Create InputFeatureState
state = InputFeatureState(
    featureId="circle-001",
    geometry={
        "type": "Polygon",
        "coordinates": [[[0.0, 50.0], [0.01, 50.01], [-0.01, 50.01], [0.0, 50.0]]],
    },
    properties={"kind": "CIRCLE", "center": [0.0, 50.0], "radius": 1000.0},
)

# 2. Create LogEntry with inputState
original = create_log_entry(
    tool_name="move-shape",
    tool_version="1.0.0",
    source_features=[{"id": "circle-001", "properties": {"kind": "CIRCLE"}, "geometry": None}],
    duration_ms=12.0,
    input_state=[state],
    activity_id="test-round-trip",
)

# 3. Serialize to JSON dict (camelCase)
json_data = original.model_dump(mode="json", by_alias=True)
```

### Serialized JSON (camelCase)

```json
{
  "activityId": "test-round-trip",
  "timestamp": "2026-03-01T...",
  "wasGeneratedBy": {
    "tool": "move-shape",
    "toolVersion": "1.0.0",
    "parameters": {}
  },
  "used": ["circle-001"],
  "generated": [],
  "executionDuration": "PT0.012S",
  "generatedResultId": null,
  "tune": null,
  "inputState": [
    {
      "featureId": "circle-001",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[0.0, 50.0], [0.01, 50.01], [-0.01, 50.01], [0.0, 50.0]]]
      },
      "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0],
        "radius": 1000.0
      }
    }
  ]
}
```

### Deserialized back to Python

```python
# 4. Deserialize back
restored = LogEntry.model_validate(json_data)

# 5. Verify all fields preserved
assert restored.input_state is not None
assert len(restored.input_state) == 1
assert restored.input_state[0].feature_id == "circle-001"
assert restored.input_state[0].geometry["type"] == "Polygon"
assert restored.input_state[0].geometry["coordinates"] == state.geometry["coordinates"]
assert restored.input_state[0].properties == state.properties
```

### Result: PASS

All fields survive the round-trip. The `inputState` array, nested `geometry` object, and `properties` dict are all preserved exactly.

### Test: round_trip_preserves_null_input_state

```python
# LogEntry without inputState
original = create_log_entry(tool_name="track-stats", ...)
json_data = original.model_dump(mode="json", by_alias=True)
restored = LogEntry.model_validate(json_data)
assert restored.input_state is None
```

### Result: PASS

Null inputState is preserved through the round-trip.
