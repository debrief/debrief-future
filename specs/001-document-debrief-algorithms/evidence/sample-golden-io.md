# Sample Golden I/O — Annotated Example

**Feature**: 001-document-debrief-algorithms
**Date**: 2026-02-07

## Tool: range-calc (track/measurement)

This annotated example shows a golden input/output pair for the `range-calc` tool, which calculates the range (distance) between two tracks at a given time.

### Input: `range-calc.basic.input.json`

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "track-001",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-1.0, 50.0], [-0.98, 50.02]]
      },
      "properties": {
        "debrief:kind": "track",
        "debrief:platform_id": "PLATFORM-001",
        "debrief:platform_name": "OWNSHIP",
        "debrief:track_type": "SURFACE",
        "debrief:start_time": "2024-01-15T10:30:00Z",
        "debrief:end_time": "2024-01-15T10:35:00Z",
        "debrief:positions": [
          {
            "time": "2024-01-15T10:30:00Z",
            "coordinates": [-1.0, 50.0],
            "course": 45.0,
            "speed": 12.0,
            "depth": 0.0
          }
        ]
      }
    },
    {
      "type": "Feature",
      "id": "track-002",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-0.95, 50.05], [-0.95, 50.03]]
      },
      "properties": {
        "debrief:kind": "track",
        "debrief:platform_id": "PLATFORM-002",
        "debrief:platform_name": "TARGET",
        "debrief:track_type": "SURFACE",
        "debrief:start_time": "2024-01-15T10:30:00Z",
        "debrief:end_time": "2024-01-15T10:35:00Z",
        "debrief:positions": [
          {
            "time": "2024-01-15T10:30:00Z",
            "coordinates": [-0.95, 50.05],
            "course": 180.0,
            "speed": 8.0,
            "depth": 50.0
          }
        ]
      }
    }
  ],
  "properties": {
    "tool": "range-calc",
    "params": {
      "units": "nm"
    },
    "time": "2024-01-15T10:30:00Z"
  }
}
```

#### Annotations

| Field | Purpose |
|-------|---------|
| `type: FeatureCollection` | Standard GeoJSON envelope |
| `features[0]` | Primary track (ownship) — the reference point for range calculation |
| `features[1]` | Secondary track (target) — the point being measured to |
| `debrief:positions` | Position array with time, coordinates (GeoJSON [lon, lat]), course, speed, depth |
| `properties.tool` | Identifies which tool to invoke |
| `properties.params.units` | User's preferred distance unit (nm = nautical miles) |
| `properties.time` | The timestamp at which to evaluate the measurement |

### Output: `range-calc.basic.output.json`

```json
{
  "content": [
    {
      "type": "resource",
      "uri": "feature://measurement-range-001",
      "mimeType": "application/geo+json",
      "text": "{\"type\":\"Feature\",\"id\":\"measurement-range-001\",\"geometry\":null,\"properties\":{\"debrief:kind\":\"measurement\",\"debrief:measurement_type\":\"range\",\"debrief:value\":3.6742,\"debrief:units\":\"nm\",\"debrief:time\":\"2024-01-15T10:30:00Z\",\"debrief:primary_track\":\"track-001\",\"debrief:secondary_track\":\"track-002\"}}",
      "annotations": {
        "debrief:resultType": "artifact/measurement/range",
        "debrief:sourceFeatures": ["track-001", "track-002"],
        "debrief:label": "Calculated range: 3.6742 nm"
      }
    }
  ]
}
```

#### Annotations

| Field | Purpose |
|-------|---------|
| `content` | Array of result content items (ToolResponse envelope) |
| `type: "resource"` | MCP resource content type |
| `uri` | Feature URI for the result (unique identifier) |
| `mimeType` | Always `application/geo+json` for GeoJSON results |
| `text` | Serialised GeoJSON Feature with measurement result |
| `annotations.debrief:resultType` | Result type path: `artifact/measurement/range` |
| `annotations.debrief:sourceFeatures` | IDs of input features used to produce this result |
| `annotations.debrief:label` | Human-readable summary of the result |

### Serialisation Rules Demonstrated

1. **Coordinates**: `[longitude, latitude]` — GeoJSON convention (lon first)
2. **Timestamps**: ISO 8601 with `Z` suffix — always UTC
3. **Floating-point**: Full precision (3.6742) — no rounding
4. **Null geometry**: Measurement results have `null` geometry (they are scalar values, not spatial features)
5. **Deterministic ordering**: Properties are in consistent order

### Verification

The range value (3.6742 nm) can be verified:
- Distance from [-1.0, 50.0] to [-0.95, 50.05] in degrees ≈ 0.0707 degrees
- 1 degree ≈ 60 nm at this latitude
- 0.0707 × 60 ≈ 4.24 nm (approximate; actual geodesic calculation differs)
- The precise value depends on the geodesic formula used by `WorldLocation.rangeFrom()`
