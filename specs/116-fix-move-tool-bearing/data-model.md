# Data Model: PROV Log Input Snapshot for Mutation Replay

**Feature**: 116-fix-move-tool-bearing
**Date**: 2026-03-01

## Entity: InputFeatureState

Captures the pre-operation geometry and spatially-relevant properties of a feature immediately before a coordinate-mutating tool executes. Stored within the LogEntry on the output feature's provenance array.

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `featureId` | `string` | Yes | ID of the feature whose state is captured |
| `geometry` | `GeoJSON Geometry (dict)` | Yes | Full geometry object (`type` + `coordinates`) as it was before the operation |
| `properties` | `dict<string, any> | null` | No | Kind-specific spatial properties (e.g., `center`, `origin`). Excludes `provenance`. Null if no spatial properties needed. |

### Relationships

```
LogEntry 1 ──── 0..* InputFeatureState
   │                    │
   │ (stored in         │ (captures pre-tool
   │  feature.          │  geometry for the
   │  properties.       │  feature identified
   │  provenance[])     │  by featureId)
   │                    │
   ▼                    ▼
GeoJSON Feature    GeoJSON Feature
(output)           (input — same feature for mutations)
```

### Validation Rules

1. `featureId` MUST be a non-empty string matching an existing feature ID
2. `geometry` MUST be a valid GeoJSON geometry object with `type` and `coordinates`
3. `properties` MUST NOT contain a `provenance` key (provenance is append-only, never captured in snapshots)
4. For mutation tools (`output_kind.startswith("mutation/")`), `inputState` SHOULD be populated
5. For non-mutation tools, `inputState` MUST be null

### State Transitions

InputFeatureState is **immutable after creation**. It follows this lifecycle:

```
Tool Execution:
  1. [No inputState] → Tool is non-mutation → [No inputState]
  2. [No inputState] → Tool is mutation → [inputState captured with pre-tool geometry]

Replay/Tune:
  3. [inputState exists] → tuneEntry() reads it → features restored to snapshot → replay executes
  4. [inputState exists] → replay completes → NEW inputState captured from restored geometry
```

## Extended Entity: LogEntry

The existing LogEntry class gains one new optional field.

### New Field

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `inputState` | `InputFeatureState[]` | No | `null` | Pre-operation feature states for coordinate-mutating tools. Null for non-mutation tools. |

### Example: LogEntry with InputFeatureState

```json
{
  "activityId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "timestamp": "2026-03-01T10:30:00Z",
  "wasGeneratedBy": {
    "tool": "move-shape",
    "toolVersion": "1.0.0",
    "parameters": {
      "direction": { "value": 90, "default": true, "tunable": true },
      "distance_km": { "value": 5, "default": true, "tunable": true }
    }
  },
  "used": ["circle-001"],
  "generated": ["circle-001"],
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
        "radius_km": 1.0
      }
    }
  ]
}
```

### Example: LogEntry without InputFeatureState (non-mutation tool)

```json
{
  "activityId": "f1e2d3c4-b5a6-4789-0123-456789abcdef",
  "timestamp": "2026-03-01T10:35:00Z",
  "wasGeneratedBy": {
    "tool": "set-track-color",
    "toolVersion": "1.0.0",
    "parameters": {
      "color": { "value": "RED", "default": false, "tunable": true }
    }
  },
  "used": ["track-001"],
  "generated": ["track-001"],
  "executionDuration": "PT0.003S",
  "generatedResultId": null,
  "tune": null,
  "inputState": null
}
```

## Affected Feature Kinds

The following annotation kinds are handled by `move-shape` and will have inputState captured:

| Kind | Geometry Type | Spatial Properties Captured |
|------|--------------|----------------------------|
| CIRCLE | Polygon | `center` (coordinate pair) |
| RECTANGLE | Polygon | (none beyond geometry) |
| LINE | LineString | (none beyond geometry) |
| TEXT | Point | (none beyond geometry) |
| VECTOR | LineString | `origin` (coordinate pair) |

Future mutation tools (rotate-shape, scale-shape, etc.) will follow the same convention.
