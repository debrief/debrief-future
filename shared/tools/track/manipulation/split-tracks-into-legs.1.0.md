---
name: split-tracks-into-legs
version: 1.0
category: track/manipulation
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.SplitTracksIntoLegs
---

# Split Tracks Into Legs

> Splits a track into separate leg segments by detecting time gaps that exceed a specified threshold.

## MCP

**Description**: Splits a single track into multiple leg segments based on time gaps between consecutive positions. When the time gap between two consecutive fixes exceeds the specified period, a new leg segment begins at that point.

**When to use**: When the user has a track with data gaps (e.g., from intermittent sensor contact) and wants to separate it into distinct continuous legs for individual analysis, or when preparing track data for leg-by-leg tactical reconstruction.

**Parameters**:
- `features`: FeatureCollection containing exactly one track feature to split
- `max_gap_seconds`: Maximum allowable time gap (in seconds) between consecutive positions before a split occurs

**Returns**: ToolResponse containing one or more track segment features, each representing a continuous leg of the original track.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TRACK"` required
- Track must have at least 2 positions
- Positions must be sorted in ascending time order
- `max_gap_seconds` must be a positive number

**Defaults**:
- `max_gap_seconds`: No default; must be specified

## Outputs

Returns a **ToolResponse** with one or more addition content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/track/split_legs`

**Content Items**: One `AdditionResult` per leg segment containing:
- `type`: "resource"
- `uri`: `feature://{track_id}-leg-{n}`
- `mimeType`: "application/geo+json"
- `text`: Serialized TRACK_SEGMENT feature

**Segment Feature properties**:
- `kind`: "TRACK_SEGMENT"
- `platform_id`, `platform_name`, `track_type`: Inherited from parent track
- `parent_track_id`: ID of the original track
- `leg_number`: 1-based leg index
- `start_time`, `end_time`: Time range of this leg
- `positions`: Array of positions belonging to this leg

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/track/split_legs"`
- `debrief:sourceFeatures`: `["{track_id}"]`
- `debrief:label`: `"Leg {n} of {platform_name} ({count} positions, {start} - {end})"`

## Algorithm

```pseudocode
FUNCTION split_tracks_into_legs(features: FeatureCollection, max_gap_seconds: number) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF max_gap_seconds IS NULL OR max_gap_seconds <= 0:
        RETURN build_error("max_gap_seconds must be a positive number", "invalid_input", [])
    END IF

    // Find track feature
    track = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            track = feature
            BREAK
        END IF
    END FOR

    IF track IS NULL:
        RETURN build_error("No track feature found in input", "invalid_input", [])
    END IF

    positions = track.properties.positions

    IF positions IS NULL OR LENGTH(positions) < 2:
        RETURN build_error("Track must have at least 2 positions", "invalid_input", [track.id])
    END IF

    // Detect split points by scanning consecutive position pairs
    legs = empty list of lists
    current_leg = [positions[0]]

    FOR i = 1 TO LENGTH(positions) - 1:
        gap = time_difference_seconds(positions[i - 1].time, positions[i].time)

        IF gap > max_gap_seconds:
            // Time gap exceeds threshold; finalize current leg and start new one
            legs.append(current_leg)
            current_leg = [positions[i]]
        ELSE:
            current_leg.append(positions[i])
        END IF
    END FOR

    // Append final leg
    legs.append(current_leg)

    // Build output features for each leg
    content_items = empty list
    FOR leg_index = 0 TO LENGTH(legs) - 1:
        leg_positions = legs[leg_index]
        leg_number = leg_index + 1
        leg_id = track.id + "-leg-" + leg_number

        // Build geometry: Point if single position, LineString if multiple
        IF LENGTH(leg_positions) == 1:
            geometry = {type: "Point", coordinates: leg_positions[0].coordinates}
        ELSE:
            coords = [pos.coordinates FOR pos IN leg_positions]
            geometry = {type: "LineString", coordinates: coords}
        END IF

        segment_feature = {
            type: "Feature",
            id: leg_id,
            geometry: geometry,
            properties: {
                kind: "TRACK_SEGMENT",
                platform_id: track.properties.platform_id,
                platform_name: track.properties.platform_name,
                track_type: track.properties.track_type,
                parent_track_id: track.id,
                leg_number: leg_number,
                start_time: leg_positions[0].time,
                end_time: leg_positions[LAST].time,
                positions: leg_positions
            }
        }

        item = build_addition(
            features: [segment_feature],
            result_subtype: "track/split_legs",
            source_feature_ids: [track.id],
            label: "Leg " + leg_number + " of " + track.properties.platform_name
                   + " (" + LENGTH(leg_positions) + " positions, "
                   + format_time(leg_positions[0].time) + " - "
                   + format_time(leg_positions[LAST].time) + ")"
        )
        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION
```

### Complexity

- **Time**: O(n) -- single pass over n positions to detect gaps
- **Space**: O(n) -- stores all positions across leg segments (same total as input)

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No track features in input | Return error: `invalid_input`, "No track feature found in input" |
| Track with fewer than 2 positions | Return error: `invalid_input`, "Track must have at least 2 positions" |
| No gaps exceed threshold | Return single leg containing all positions (track unchanged structurally) |
| Every gap exceeds threshold | Return one leg per position (each with a single fix) |
| Exactly equal gap to threshold | Gap equal to `max_gap_seconds` does NOT trigger split (only strictly greater) |
| Single-position legs | Geometry is `Point` instead of `LineString` |
| Zero or negative `max_gap_seconds` | Return error: `invalid_input`, "max_gap_seconds must be a positive number" |
| Non-track features mixed in | Skip non-track features, process only the first track |

## Examples

### Basic Usage

**Input**: `split-tracks-into-legs.basic.input.json`
**Output**: `split-tracks-into-legs.basic.output.json`

Description: 7-position track with a 3h45m gap between positions 4 and 5. With `max_gap_seconds=3600` (1 hour), produces 2 legs: 4 positions and 3 positions.

### Edge Case 1: No Gaps Exceed Threshold

**Input**: `split-tracks-into-legs.edge-1.input.json`
**Output**: `split-tracks-into-legs.edge-1.output.json`

Description: 5-position track with uniform 5-minute intervals. With `max_gap_seconds=600` (10 minutes), no gaps exceed threshold. Returns single leg with all 5 positions.

### Edge Case 2: Every Gap Exceeds Threshold

**Input**: `split-tracks-into-legs.edge-2.input.json`
**Output**: `split-tracks-into-legs.edge-2.output.json`

Description: 3-position track with 4-hour gaps between every position. With `max_gap_seconds=600`, returns 3 single-position legs, each with Point geometry.

### Complex: Multiple Gaps Producing 3+ Legs

**Input**: `split-tracks-into-legs.complex.input.json`
**Output**: `split-tracks-into-legs.complex.output.json`

Description: 9-position track with two large gaps (3h50m and 9h55m), producing 3 legs of 3, 2, and 4 positions respectively, with `max_gap_seconds=1800` (30 minutes).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Splits by time gap detection using `splitTrackAtJumps` pattern
- Preserves parent track metadata on each leg segment
- Handles single-position legs with Point geometry

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-infill-segment](./generate-infill-segment.1.0.md) - Generate interpolated segment between two legs
- [smooth-track-jumps](./smooth-track-jumps.1.0.md) - Smooth position jumps within a segment

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.SplitTracksIntoLegs`
- Utility: `TrackWrapper_Support.splitTrackAtJumps(track, period)`
