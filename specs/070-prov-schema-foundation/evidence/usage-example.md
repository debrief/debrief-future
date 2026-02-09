# Usage Example: PROV Schema Foundation (#070)

## Creating a Log Entry and Attaching to a Feature

```python
from debrief_calc.provenance import create_log_entry, attach_log_entry
from debrief_calc.models import ParameterValue

# Source features (from user selection)
source_features = [
    {"id": "track-alpha", "properties": {"kind": "TRACK"}, "geometry": {...}},
    {"id": "track-bravo", "properties": {"kind": "TRACK"}, "geometry": {...}},
]

# Create a PROV-aligned log entry
entry = create_log_entry(
    tool_name="calculate-range",
    tool_version="1.2.0",
    source_features=source_features,
    parameters={
        "interval": ParameterValue(value=60, default=True, tunable=True),
        "unit": ParameterValue(value="nm", default=False, tunable=True),
    },
    duration_ms=300.0,
    generated=["range-result-001"],
)

# Attach to output features (shared activity ID across multi-feature ops)
output_feature = {"type": "Feature", "properties": {"kind": "track/range"}, "geometry": None}
attach_log_entry(output_feature, entry)

# Result: feature.properties.provenance is now an array:
# [
#   {
#     "activityId": "550e8400-...",
#     "timestamp": "2026-01-15T10:30:00Z",
#     "wasGeneratedBy": {
#       "tool": "calculate-range",
#       "toolVersion": "1.2.0",
#       "parameters": {
#         "interval": {"value": 60, "default": true, "tunable": true},
#         "unit": {"value": "nm", "default": false, "tunable": true}
#       }
#     },
#     "used": ["track-alpha", "track-bravo"],
#     "generated": ["range-result-001"],
#     "executionDuration": "PT0.3S",
#     "generatedResultId": null,
#     "tune": null
#   }
# ]
```

## Expanded ToolResult

```python
from debrief_calc.models import ToolResult, ModifiedFeature, PropertyDelta, CreatedAsset, ParameterValue

result = ToolResult(
    tool="set-track-color",
    success=True,
    features=[{"type": "Feature", "properties": {}, "geometry": None}],
    duration_ms=42.5,
    tool_version="1.2.0",
    modified_features=[
        ModifiedFeature(
            feature_id="track-001",
            changed_properties={"color": PropertyDelta(previous_value="blue", new_value="red")},
        )
    ],
    parameters={"color": ParameterValue(value="#FF0000", default=False, tunable=False)},
)
# All new fields are optional — existing tools continue to work without them
```

## System Record

```python
from debrief_calc.models import SystemRecordProperties, SnapshotLinks, SnapshotRef

# Create a system record feature
system_record = {
    "type": "Feature",
    "id": "state.system",
    "properties": SystemRecordProperties(
        snapshot_links=SnapshotLinks(
            prev=SnapshotRef(asset="./snapshots/plot_v2.geojson", prov_entry_count=5),
        ),
    ).model_dump(mode="json", by_alias=True),
    "geometry": {"type": "Point", "coordinates": []},
}
```
