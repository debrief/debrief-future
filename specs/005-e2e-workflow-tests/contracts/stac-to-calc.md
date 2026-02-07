# Contract: debrief-stac -> debrief-calc

## Boundary

**Producer**: `debrief_stac.plot.read_plot()` -> features from FeatureCollection
**Consumer**: `debrief_calc.executor.run(tool_name, context)` via `SelectionContext`

## Data Format

Features stored in a STAC plot's `features.geojson` are read and wrapped in a `SelectionContext` for tool execution.

### Constructing SelectionContext from STAC Features

```python
# Read features from plot
import json

item = read_plot(catalog_path, plot_id)
features_path = Path(catalog_path) / plot_id / "features.geojson"
with open(features_path) as f:
    fc = json.load(f)
features = fc["features"]

# Filter by kind for tool compatibility
tracks = [f for f in features if f.get("properties", {}).get("kind") == "TRACK"]

# Construct context
context = SelectionContext(
    type=ContextType.SINGLE,   # or MULTI for 2+ features
    features=tracks[:1]         # or tracks[:2] for multi-track
)
```

### Fields Required by calc Tools

**track-stats** (SINGLE context, kind="track"):
```python
{
    "type": "Feature",
    "id": str,                          # Referenced in provenance output
    "geometry": {
        "type": "LineString",
        "coordinates": list[list[float]] # [lon, lat] or [lon, lat, elev, time_ms]
    },
    "properties": {
        "kind": str,                    # Must match tool's input_kinds
        "name": str                     # Optional, used in output labels
    }
}
```

**range-bearing** (MULTI context, kinds=["track", "shape"]):
- Requires 2+ features
- Tracks need `properties.times` for time-series output
- Points and polygons also accepted

## Contract Assertions (what e2e tests verify)

1. Features from `read_plot()` FeatureCollection can construct a valid `SelectionContext`
2. `SelectionContext.get_kinds()` returns kinds that match at least one registered tool's `input_kinds`
3. `run(tool_name, context)` returns `ToolResult(success=True)` with valid output features
4. Output features have `properties.provenance` containing:
   - `tool`: matching the tool name
   - `sources`: list with `id` values matching input feature IDs
   - `timestamp`: ISO 8601 datetime
5. Output features can be passed back to `add_features()` for persistence in the same plot

## Error Boundaries

- If feature `kind` doesn't match tool's `input_kinds`, calc raises `KindMismatchError`
- If context type doesn't match tool's `context_type`, calc raises `InvalidContextError`
- Calc errors do not modify the STAC catalog — the plot remains unchanged after a failed `run()`

## Provenance Chain

After the full workflow, a calc output feature stored in stac should have:

```python
feature["properties"]["provenance"] = {
    "tool": "track-stats",
    "version": "1.0.0",
    "timestamp": "2026-02-06T12:00:00Z",
    "sources": [
        {"id": "original-track-uuid", "kind": "TRACK"}
    ],
    "parameters": {"distance_unit": "nm"}
}
```

This links the analysis result back to the parsed track feature, which in turn has `properties.source_file` linking to the original REP file.
