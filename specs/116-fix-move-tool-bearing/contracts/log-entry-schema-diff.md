# Contract: LinkML Schema Changes for InputFeatureState

**Feature**: 116-fix-move-tool-bearing
**File**: `shared/schemas/src/linkml/log-entry.yaml`

## New Class: InputFeatureState

Added after the existing `TuneAnnotation` class (line 129).

```yaml
  InputFeatureState:
    description: >-
      Pre-operation state of a feature captured before a coordinate-mutating
      tool executes. Enables correct replay by providing the original geometry
      as the anchor for re-computation with modified parameters.
    attributes:
      feature_id:
        description: ID of the feature whose pre-operation state is captured.
        range: string
        required: true
      geometry:
        description: >-
          Full GeoJSON geometry object (type + coordinates) as it was
          immediately before the operation. Stored as a JSON object.
        range: string
        required: true
        notes: >-
          Typed as string in LinkML but serialized as a JSON object in practice.
          GeoJSON geometry is polymorphic (Point, Polygon, LineString, etc.)
          and LinkML does not have a native geometry type.
      properties:
        description: >-
          Kind-specific spatial properties captured before the operation.
          Excludes provenance (which is append-only). Null if no spatial
          properties need capturing.
        range: string
        required: false
        notes: >-
          Typed as string in LinkML but serialized as a JSON object in practice.
          Contains keys like "center", "origin", "radius_km" etc.
```

## Modified Class: LogEntry

New attribute added after `rationale` (line 69).

```yaml
      input_state:
        description: >-
          Pre-operation feature states for coordinate-mutating tools.
          Captures geometry and spatial properties as they were immediately
          before the operation, enabling correct replay with modified parameters.
          Null for non-mutation tools.
        range: InputFeatureState
        multivalued: true
        inlined_as_list: true
        required: false
```

## Corresponding Python Model Changes

### New Class: InputFeatureState (in `models.py`)

```python
class InputFeatureState(BaseModel):
    """Pre-operation state of a feature before a coordinate-mutating tool executes."""

    feature_id: str = Field(
        ..., alias="featureId", description="ID of the feature"
    )
    geometry: dict[str, Any] = Field(
        ..., description="GeoJSON geometry object (type + coordinates)"
    )
    properties: dict[str, Any] | None = Field(
        default=None, description="Kind-specific spatial properties (excludes provenance)"
    )

    model_config = {"populate_by_name": True}
```

### Modified Class: LogEntry (in `models.py`)

```python
# New field added after `tune`:
input_state: list[InputFeatureState] | None = Field(
    default=None,
    alias="inputState",
    description="Pre-operation feature states for coordinate-mutating tools",
)
```

## Corresponding Python Provenance Changes

### Modified Function: create_log_entry (in `provenance.py`)

New parameter:

```python
def create_log_entry(
    tool_name: str,
    tool_version: str,
    source_features: list[dict[str, Any]],
    parameters: dict[str, Any] | None = None,
    duration_ms: float = 0.0,
    generated: list[str] | None = None,
    generated_result_id: str | None = None,
    timestamp: datetime | None = None,
    activity_id: str | None = None,
    input_state: list[InputFeatureState] | None = None,  # NEW
) -> LogEntry:
```

Passed through to LogEntry constructor:

```python
return LogEntry(
    ...existing fields...,
    inputState=input_state,
)
```

## Corresponding Python Executor Changes

### Modified Function: run (in `executor.py`)

**CRITICAL**: Capture MUST happen BEFORE `_execute_handler()` because mutation tool
handlers (e.g., `move_shape`) mutate `context.features` in-place. Capturing after the
handler would snapshot the already-mutated geometry — the exact opposite of what we need.

This matches the TypeScript pattern in `executeTool.ts:145-162` which captures
`preToolInputState` before calling `calcService.executeTool()`.

```python
# BEFORE _execute_handler — mutation tools mutate context.features in-place
is_mutation = tool.output_kind.startswith("mutation/")

input_state_list: list[InputFeatureState] | None = None
if is_mutation:
    input_state_list = _capture_input_state(context.features)

# Execute the tool handler (may mutate context.features for mutation tools)
output_features = _execute_handler(tool, context, params)

duration_ms = (time.perf_counter() - start_time) * 1000

log_entry = create_log_entry(
    ...existing args...,
    input_state=input_state_list,
)
```

New helper function:

```python
def _capture_input_state(
    features: list[dict[str, Any]],
) -> list[InputFeatureState]:
    """Capture pre-operation geometry and spatial properties from input features."""
    import copy
    states = []
    for feature in features:
        feature_id = str(feature.get("id", "unknown"))
        geometry = copy.deepcopy(feature.get("geometry", {}))
        props = feature.get("properties", {})
        # Exclude provenance (append-only, never restored)
        spatial_props = {
            k: copy.deepcopy(v)
            for k, v in props.items()
            if k != "provenance"
        }
        states.append(InputFeatureState(
            featureId=feature_id,
            geometry=geometry,
            properties=spatial_props if spatial_props else None,
        ))
    return states
```

## Serialisation Example

When serialised to JSON (via `model_dump(mode="json", by_alias=True)`), the inputState field produces:

```json
{
  "inputState": [
    {
      "featureId": "circle-001",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[0.0, 50.0], [0.01, 50.01], [-0.01, 50.01], [0.0, 50.0]]]
      },
      "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0]
      }
    }
  ]
}
```

This matches the existing TypeScript `InputFeatureState` interface exactly.
