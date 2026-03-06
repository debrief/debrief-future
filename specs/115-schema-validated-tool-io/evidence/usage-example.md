# Usage Example: Schema-Validated GeoJSON

## validate_feature() catches invalid data

```python
from debrief_schemas.validation import validate_feature, SchemaValidationError

# A valid ReferenceLocation feature
valid_feature = {
    "type": "Feature",
    "id": "ref-001",
    "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
    "properties": {
        "kind": "POINT",
        "name": "Alpha Point",
        "location_type": "REFERENCE",
        "style": {
            "shape": "square",
            "color": "#666666",
            "radius": 5,
            "fill": True,
            "fill_color": "#666666",
            "fill_opacity": 0.8,
            "stroke": True,
            "weight": 1,
            "opacity": 1.0,
        },
    },
}

# This passes validation at any boundary
validate_feature(valid_feature, "tool_output")
# No exception — feature is valid


# Now introduce a field-name mismatch (simulating a stale tool)
bad_feature = {
    "type": "Feature",
    "id": "ref-002",
    "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
    "properties": {
        "kind": "POINT",
        "display_name": "Beta Point",  # Wrong! Schema expects 'name'
        "location_type": "REFERENCE",
        "style": {
            "shape": "square",
            "color": "#666666",
            "radius": 5,
            "fill": True,
            "fill_color": "#666666",
        },
    },
}

try:
    validate_feature(bad_feature, "tool_output")
except SchemaValidationError as e:
    print(e)
    # SchemaValidationError at tool_output: Feature 'ref-002' (POINT)
    #   - properties.name: Field required
    #   - properties.display_name: Extra inputs are not permitted
```

## resolve_enum_values() for single source of truth

```python
from debrief_schemas.validation import resolve_enum_values

# Get valid marker symbols from schema
symbols = resolve_enum_values("MarkerSymbol")
print(symbols)
# {'circle', 'square', 'triangle', 'diamond', 'cross'}

# Get valid reference point patterns
patterns = resolve_enum_values("ReferencePointPattern")
print(patterns)
# {'grid', 'scatter'}

# Unknown enum returns None
unknown = resolve_enum_values("NotARealEnum")
print(unknown)
# None
```

## Tool execution with schema validation

```python
from debrief_calc.executor import run
from debrief_calc.models import SelectionContext, ContextType

# Create a context with a track feature
context = SelectionContext(
    type=ContextType.MULTI,
    features=[{
        "type": "Feature",
        "id": "track-001",
        "geometry": {"type": "LineString", "coordinates": [[-5, 50], [-4, 51]]},
        "properties": {
            "kind": "TRACK",
            "platform_id": "PLT-001",
            "platform_name": "HMS Victory",
            "track_type": "OWNSHIP",
            "start_time": "2024-06-15T08:00:00Z",
            "end_time": "2024-06-15T20:00:00Z",
            "positions": [],
            "style": {
                "line": {"color": "#1565c0"},
                "point": {
                    "shape": "circle",
                    "radius": 4,
                    "fill": True,
                    "fill_color": "#1565c0",
                    "color": "#1565c0",
                },
            },
            "default_position_style": {
                "show_symbol": False,
                "symbol": "circle",
                "show_label": False,
            },
        },
    }],
)

# Run a styling tool — schema validates input AND output
result = run("apply-symbol-style", context, {"symbol": "diamond", "radius": 6})
print(f"Success: {result.success}, Features: {len(result.features)}")
# Success: True, Features: 1
# Input features validated at tool_input boundary
# Output features validated at tool_output boundary
```
