---
name: merge-tracks
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.MergeTracks
---

# Merge Tracks

> Combine two or more track features into a single track, with support for standard, in-place, and TMA conversion merge modes.

## MCP

**Description**: Merges multiple track features into a single combined track. Supports three merge modes: standard (creates a new track), in-place (merges into the first track preserving its identity), and convert-TMA (converts TMA segments to regular track segments).

**When to use**: When the user wants to combine separate track segments that represent the same vessel into a single continuous track, rejoin tracks that were split during data import, or convert TMA contact solutions into track data.

**Parameters**:
- `features`: Track features to merge (GeoJSON FeatureCollection containing 2+ TrackFeature objects)
- `merge_mode`: One of `"standard"`, `"in_place"`, or `"convert_tma"` (default: `"standard"`)

**Returns**: ToolResponse containing the merged track feature with all positions combined and sorted by time.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least 2 track features required
- Features must have `properties.kind == "TRACK"`
- For `convert_tma` mode, at least one feature must have `track_type == "TMA"`

**Defaults**:
- `merge_mode`: `"standard"`

## Outputs

Returns a **ToolResponse** with addition or mutation content items depending on merge mode.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**:
- Standard mode: `addition/track/merged` (new track created)
- In-place mode: `mutation/track/merged` (first track modified)
- Convert TMA mode: `mutation/track/merged` (TMA converted to track)

**Content Items**: One content item for the merged track containing:
- `type`: "resource"
- `uri`: `feature://{feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized merged TrackFeature

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/track/merged"` or `"mutation/track/merged"`
- `debrief:sourceFeatures`: `["{source_feature_ids}"]` (all input track IDs)
- `debrief:label`: `"Merged {n} tracks into {target_id} ({total} positions)"`

## Algorithm

### Overview

Collect all positions from input tracks, sort them chronologically, and combine them into a single track. The merge mode determines whether a new track is created or an existing one is modified.

### Pseudocode

```pseudocode
FUNCTION merge_tracks(input: FeatureCollection, merge_mode: String) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Collect track features only
    tracks = empty list
    source_ids = empty list
    FOR EACH feature IN input.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
            source_ids.append(feature.id)
        END IF
    END FOR

    IF LENGTH(tracks) < 2:
        RETURN build_error(
            "Merge requires at least 2 track features; only " + LENGTH(tracks) + " provided",
            "invalid_input",
            source_ids
        )
    END IF

    // Set default merge mode
    IF merge_mode IS NULL:
        merge_mode = "standard"
    END IF

    // Collect all positions from all tracks, sorted by time
    all_positions = empty list
    FOR EACH track IN tracks:
        FOR EACH position IN track.properties.positions:
            all_positions.append(position)
        END FOR
    END FOR

    // Sort positions chronologically
    SORT all_positions BY position.time ASCENDING

    // Remove duplicate timestamps (keep first occurrence)
    deduplicated = empty list
    seen_times = empty set
    FOR EACH position IN all_positions:
        IF position.time NOT IN seen_times:
            deduplicated.append(position)
            seen_times.add(position.time)
        END IF
    END FOR
    all_positions = deduplicated

    // Build merged track based on mode
    IF merge_mode == "standard":
        merged = create_new_track(tracks, all_positions, source_ids)
        result_type = "addition"
    ELSE IF merge_mode == "in_place":
        merged = merge_into_first(tracks[0], all_positions)
        result_type = "mutation"
    ELSE IF merge_mode == "convert_tma":
        merged = convert_tma_track(tracks, all_positions)
        result_type = "mutation"
    ELSE:
        RETURN build_error("Unknown merge_mode: " + merge_mode, "invalid_input", source_ids)
    END IF

    // Build geometry from positions
    merged.geometry.coordinates = empty list
    FOR EACH position IN all_positions:
        merged.geometry.coordinates.append(position.coordinates)
    END FOR

    // Update time bounds
    merged.properties.start_time = all_positions[0].time
    merged.properties.end_time = all_positions[LAST].time

    // Build response
    IF result_type == "addition":
        content_items = build_addition(
            features: [merged],
            result_subtype: "track/merged",
            source_feature_ids: source_ids,
            label: "Merged " + LENGTH(tracks) + " tracks into " + merged.id +
                   " (" + LENGTH(all_positions) + " positions)"
        )
    ELSE:
        content_items = build_mutation(
            features: [merged],
            result_subtype: "track/merged",
            source_feature_ids: source_ids,
            label: "Merged " + LENGTH(tracks) + " tracks in-place into " + merged.id +
                   " (" + LENGTH(all_positions) + " positions)"
        )
    END IF

    RETURN build_response(content_items)
END FUNCTION

FUNCTION create_new_track(tracks: List, positions: List, source_ids: List) -> TrackFeature:
    merged = new TrackFeature()
    merged.id = generate_id("track-merged")
    merged.properties.kind = "TRACK"
    merged.properties.platform_id = tracks[0].properties.platform_id
    merged.properties.platform_name = "Merged track"
    merged.properties.track_type = tracks[0].properties.track_type
    merged.properties.positions = positions
    merged.properties.style = clone(tracks[0].properties.style)
    RETURN merged
END FUNCTION

FUNCTION merge_into_first(first_track: TrackFeature, positions: List) -> TrackFeature:
    // Preserve the first track's identity and style
    first_track.properties.positions = positions
    RETURN first_track
END FUNCTION

FUNCTION convert_tma_track(tracks: List, positions: List) -> TrackFeature:
    // Find the TMA track and convert it to a regular track segment
    target = tracks[0]
    target.properties.track_type = "SURFACE"
    target.properties.positions = positions
    RETURN target
END FUNCTION
```

### Complexity

- **Time**: O(n log n) where n = total positions across all tracks (dominated by sort)
- **Space**: O(n) for the combined position list

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Fewer than 2 track features | Return error: "Merge requires at least 2 track features" |
| Empty feature collection | Return error: "No track features found in input" |
| Tracks with overlapping time periods | Positions are time-sorted; duplicates at identical timestamps are deduplicated |
| Tracks with gaps between them | Positions are combined with the time gap preserved |
| Non-track features in collection | Skipped; only track features are merged |
| Unknown merge_mode value | Return error: "Unknown merge_mode" |
| Tracks with different platform_ids | Standard mode uses first track's platform_id; in-place preserves first track |
| Tracks with different styles | Standard mode uses first track's style; in-place preserves first track's style |
| Single position per track | Merge produces track with 2 positions (one from each) |
| TMA conversion with no TMA tracks | Proceed as standard merge with track_type set to SURFACE |

## Examples

### Basic Usage

**Input**: `merge-tracks.basic.input.json`
**Output**: `merge-tracks.basic.output.json`

Description: Merges two non-overlapping track segments (3 positions + 2 positions) into a new combined track with 5 positions using standard merge mode.

### Edge Case: Single Track

**Input**: `merge-tracks.edge.input.json`
**Output**: `merge-tracks.edge.output.json`

Description: Demonstrates error handling when only one track is provided but merge requires at least two.

### Complex: Three Tracks In-Place Merge

**Input**: `merge-tracks.complex.input.json`
**Output**: `merge-tracks.complex.output.json`

Description: Merges three track segments in-place into the first track, preserving its ID and style. The resulting track has 6 positions spanning the combined time range.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Three merge modes: standard, in-place, convert TMA
- Chronological sorting and timestamp deduplication

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_addition()`, `build_response()`, `build_error()`

**Related Tools**:
- [trim-track](./trim-track.1.0.md) - Remove positions outside a time window
- [interpolate-track](./interpolate-track.1.0.md) - Resample positions at regular intervals

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.MergeTracks`

**External**:
- Feature 049: Language-neutral tool documentation model
