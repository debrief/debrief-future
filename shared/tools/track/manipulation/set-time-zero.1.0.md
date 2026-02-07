---
name: set-time-zero
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.FilterOperations.SetTimeZero
---

# Set Time Zero

> Set a reference "time zero" for relative time display on one or more tracks, allowing all times to be shown as offsets from a common reference point.

## MCP

**Description**: Sets a reference timestamp ("time zero") on track features so that all position times can be displayed as relative offsets (e.g., T+300s, T-120s) from that reference point. This is a display-only modification -- the original absolute timestamps are preserved, and a `time_zero` property plus per-position `relative_time_seconds` values are added.

**When to use**: When the user wants to compare tracks using relative time (e.g., "time since event"), synchronize display of tracks that started at different absolute times, or present exercise data relative to a key moment (weapon release, detection, etc.).

**Parameters**:
- `features`: Track features to modify (GeoJSON FeatureCollection containing 1+ TrackFeature objects)
- `time_zero`: ISO 8601 timestamp to use as the reference point for relative time calculation

**Returns**: ToolResponse containing modified track features with `time_zero` property and per-position `relative_time_seconds` offsets added.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- At least one track feature required
- `time_zero` must be a valid ISO 8601 timestamp

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/track/time_referenced`

**Content Items**: One `MutationResult` per modified track feature containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified TrackFeature with `time_zero` and `relative_time_seconds`

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/track/time_referenced"`
- `debrief:sourceFeatures`: `["{original_feature_id}"]`
- `debrief:label`: `"Set time zero to {time_zero} for {n} track(s)"`

## Algorithm

### Overview

For each selected track, store the reference time as a `time_zero` property and compute a `relative_time_seconds` offset for every position. Positive values indicate time after the reference; negative values indicate time before.

### Pseudocode

```pseudocode
FUNCTION set_time_zero(input: FeatureCollection, time_zero: DateTime) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    IF time_zero IS NULL:
        RETURN build_error("time_zero is required", "invalid_input", [])
    END IF

    modified_features = empty list
    source_ids = empty list

    FOR EACH feature IN input.features:
        // Skip non-track features
        IF feature.properties.kind != "TRACK":
            CONTINUE
        END IF

        source_ids.append(feature.id)

        // Set the time_zero reference on the track
        feature.properties.time_zero = time_zero

        // Calculate relative time for each position
        FOR EACH position IN feature.properties.positions:
            offset_seconds = (position.time - time_zero) IN seconds
            position.relative_time_seconds = offset_seconds
        END FOR

        modified_features.append(feature)
    END FOR

    IF modified_features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Build response
    content_items = empty list
    FOR EACH feature IN modified_features:
        item = build_mutation(
            features: [feature],
            result_subtype: "track/time_referenced",
            source_feature_ids: [feature.id],
            label: "Set time zero to " + time_zero + " for " +
                   LENGTH(modified_features) + " track(s)"
        )
        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n * m) where n = number of tracks, m = average positions per track
- **Space**: O(1) additional (modifies features in place, adding one property per position)

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: "No track features found in input" |
| No track features in collection | Return error: "No track features found in input" |
| Non-track features mixed in | Skip non-track features, process only tracks |
| time_zero before all track positions | All `relative_time_seconds` values are positive |
| time_zero after all track positions | All `relative_time_seconds` values are negative |
| time_zero in the middle of a track | Some positions have negative offsets, some positive |
| time_zero exactly matches a position | That position gets `relative_time_seconds: 0` |
| Null time_zero | Return error: "time_zero is required" |
| Track already has time_zero set | Overwrite with new time_zero and recalculate all offsets |
| Single-position track | Valid; that position gets its offset calculated |

## Examples

### Basic Usage

**Input**: `set-time-zero.basic.input.json`
**Output**: `set-time-zero.basic.output.json`

Description: Sets time zero to the track's start time (10:00:00Z). Positions get relative offsets of 0, 300, 600, 900, and 1200 seconds respectively.

### Edge Case: Single Position Track

**Input**: `set-time-zero.edge.input.json`
**Output**: `set-time-zero.edge.output.json`

Description: Sets time zero on a track with only one position. The single position receives a relative offset of 0 seconds.

### Complex: Multiple Tracks with Different Start Times

**Input**: `set-time-zero.complex.input.json`
**Output**: `set-time-zero.complex.output.json`

Description: Sets time zero to 10:05:00Z for three tracks with different start times. Track Alpha (starts 10:00) gets negative offsets for its first position. Track Bravo (starts 09:55) gets negative offsets for its first two positions. Track Charlie (starts 10:10) gets all positive offsets.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Display-only modification (original timestamps preserved)
- Per-position `relative_time_seconds` calculation
- Supports negative offsets for positions before time zero

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`

**Related Tools**:
- [trim-track](./trim-track.1.0.md) - Remove positions outside a time window
- [interpolate-track](./interpolate-track.1.0.md) - Resample positions at regular intervals

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.FilterOperations.SetTimeZero`

**External**:
- Feature 049: Language-neutral tool documentation model
