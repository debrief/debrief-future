# Contract: update_temporal_metadata

**Service**: debrief-stac
**Type**: Python function + MCP tool

## Function Signature

```
update_temporal_metadata(catalog_path, plot_id) → TemporalExtent | None
```

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `catalog_path` | path string | Yes | Path to the STAC catalog root directory |
| `plot_id` | string | Yes | ID of the plot to update |

### Return Value

Returns a temporal extent object if tracks with temporal data found, otherwise None.

| Field | Type | Description |
|-------|------|-------------|
| `datetime` | ISO 8601 string | Exercise start time (earliest track timestamp) |
| `start_datetime` | ISO 8601 string | Earliest timestamp across all tracks |
| `end_datetime` | ISO 8601 string | Latest timestamp across all tracks |

### Behaviour

1. Read the plot's `item.json` via existing `read_plot()`
2. Locate the GeoJSON asset (features.geojson) from item assets
3. Load the FeatureCollection
4. Filter features where `properties.kind == "TRACK"`
5. For each track feature, extract `properties.start_time` and `properties.end_time`
6. Compute global min(start_time) and max(end_time)
7. Update `item.json` properties:
   - `datetime` = global min(start_time)
   - `start_datetime` = global min(start_time)
   - `end_datetime` = global max(end_time)
8. Trigger collection extent recalculation
9. Return the computed temporal extent

### Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| No features.geojson asset | Return None, item unchanged |
| No TRACK features | Return None, item unchanged |
| Tracks without start_time/end_time | Skip those tracks |
| All tracks lack temporal data | Return None, item unchanged |
| Single position (start == end) | Set all three fields to same value |

## MCP Tool

```
Tool: update_temporal_metadata
Args: catalog_path (str), plot_id (str)
Returns: {datetime, start_datetime, end_datetime} or {message: "No temporal data found"}
```

Follows existing MCP tool patterns in `mcp_server.py`.
