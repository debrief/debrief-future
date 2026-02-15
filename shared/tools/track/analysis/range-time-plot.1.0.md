---
name: range-time-plot
version: 1.0
category: track/analysis
status: draft
created: 2026-02-15
migrated_from: N/A (new tool; combines range-calc logic with time-series generation)
---

# Range Time Plot

> Generate a dataset of range versus time between two track features.

## MCP

**Description**: Computes the geodesic distance between two tracks at each time step across their overlapping time period, producing a time-series dataset of range versus time with summary statistics.

**When to use**: When the analyst needs to visualise or analyse how the separation between two vessels changes over time. Useful for identifying CPA (closest point of approach), assessing closing/opening rates, and understanding the spatial relationship between two tracks throughout an engagement.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features
- `units`: Distance units for output — one of `yds`, `km`, `nm`, `m` (default: `yds`)
- `sample_strategy`: How to determine time sample points — one of `union`, `primary`, `secondary` (default: `union`)

**Returns**: ToolResponse containing a JSON artifact with time-series range data, axis metadata, and summary statistics (min, max, mean, std_dev, CPA time).

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly 2 features required, both with `properties.kind == "TRACK"`
- Both tracks must have at least one position with `time` and `coordinates`
- The tracks must have some time overlap (at least one position in the intersection of their time ranges)
- `units` must be one of: `yds`, `km`, `nm`, `m`
- `sample_strategy` must be one of: `union`, `primary`, `secondary`

**Defaults**:
- `units`: `"yds"` (yards)
- `sample_strategy`: `"union"` (sample at every timestamp from either track)

## Outputs

Returns a **ToolResponse** with an artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/dataset/range_time_series`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://range-time-plot/{primary_name}-vs-{secondary_name}-range-time.json`
- `mimeType`: "application/json"
- `text`: Serialized JSON with:
  - `plot_type`: `"range_time"`
  - `title`: `"Range vs Time: {primary_name} to {secondary_name}"`
  - `units`: Distance units used
  - `x_axis`: `{label: "Time", type: "datetime", min, max}`
  - `y_axis`: `{label: "Range ({units})", type: "numeric", min, max}`
  - `series`: Single series with `primary_track_id`, `secondary_track_id`, `primary_name`, `secondary_name`, `color`, `data_points[]` (time/range pairs), and `statistics`
  - `statistics`: `{min_range, max_range, mean_range, std_dev, cpa_time, cpa_range, data_points}`

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/dataset/range_time_series"`
- `debrief:sourceFeatures`: `["{primary_id}", "{secondary_id}"]`
- `debrief:label`: `"Range vs Time: {primary_name} to {secondary_name} ({n} points, CPA {cpa_range} {units} at {cpa_time})"`
- `debrief:href`: `"{primary_name}-vs-{secondary_name}-range-time.json"`

## Algorithm

```pseudocode
FUNCTION range_time_plot(features: FeatureCollection,
                         units: string,
                         sample_strategy: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Filter to track features
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF LENGTH(tracks) < 2:
        RETURN build_error("Two track features required for range-time calculation", "invalid_input", [])
    END IF

    IF LENGTH(tracks) > 2:
        RETURN build_error("Exactly two track features required; received " + LENGTH(tracks), "invalid_input", [])
    END IF

    primary = tracks[0]
    secondary = tracks[1]

    IF units IS NULL:
        units = "yds"
    END IF

    IF units NOT IN ["yds", "km", "nm", "m"]:
        RETURN build_error("Unsupported distance unit: " + units + "; must be one of yds, km, nm, m", "invalid_input", [])
    END IF

    IF sample_strategy IS NULL:
        sample_strategy = "union"
    END IF

    // Determine the overlapping time window
    primary_start = MIN_TIME(primary.properties.positions)
    primary_end = MAX_TIME(primary.properties.positions)
    secondary_start = MIN_TIME(secondary.properties.positions)
    secondary_end = MAX_TIME(secondary.properties.positions)

    overlap_start = MAX(primary_start, secondary_start)
    overlap_end = MIN(primary_end, secondary_end)

    IF overlap_start > overlap_end:
        RETURN build_error(
            "Tracks have no time overlap; primary covers " + primary_start + " to " + primary_end
            + ", secondary covers " + secondary_start + " to " + secondary_end,
            "no_data",
            [primary.id, secondary.id]
        )
    END IF

    // Collect sample times based on strategy
    sample_times = empty sorted set

    IF sample_strategy == "union":
        FOR EACH pos IN primary.properties.positions:
            IF pos.time >= overlap_start AND pos.time <= overlap_end:
                sample_times.add(pos.time)
            END IF
        END FOR
        FOR EACH pos IN secondary.properties.positions:
            IF pos.time >= overlap_start AND pos.time <= overlap_end:
                sample_times.add(pos.time)
            END IF
        END FOR
    ELSE IF sample_strategy == "primary":
        FOR EACH pos IN primary.properties.positions:
            IF pos.time >= overlap_start AND pos.time <= overlap_end:
                sample_times.add(pos.time)
            END IF
        END FOR
    ELSE IF sample_strategy == "secondary":
        FOR EACH pos IN secondary.properties.positions:
            IF pos.time >= overlap_start AND pos.time <= overlap_end:
                sample_times.add(pos.time)
            END IF
        END FOR
    END IF

    IF sample_times IS EMPTY:
        RETURN build_error("No sample times within overlapping period", "no_data", [primary.id, secondary.id])
    END IF

    // Compute range at each sample time
    data_points = empty list
    min_range = INFINITY
    cpa_time = NULL

    FOR EACH t IN sample_times:
        primary_pos = interpolate_position(primary, t)
        secondary_pos = interpolate_position(secondary, t)

        IF primary_pos IS NULL OR secondary_pos IS NULL:
            CONTINUE
        END IF

        range_m = geodesic_distance(primary_pos, secondary_pos)
        range_value = convert_distance(range_m, "m", units)

        data_points.append({
            time: t,
            range: ROUND(range_value, 2)
        })

        IF range_value < min_range:
            min_range = range_value
            cpa_time = t
        END IF
    END FOR

    IF data_points IS EMPTY:
        RETURN build_error("No range data could be computed; check position data", "no_data", [primary.id, secondary.id])
    END IF

    // Compute summary statistics
    ranges = [dp.range FOR dp IN data_points]
    statistics = {
        min_range: ROUND(MIN(ranges), 2),
        max_range: ROUND(MAX(ranges), 2),
        mean_range: ROUND(MEAN(ranges), 2),
        std_dev: ROUND(STD_DEV(ranges), 2),
        cpa_time: cpa_time,
        cpa_range: ROUND(min_range, 2),
        data_points: LENGTH(data_points)
    }

    // Determine axis bounds
    primary_name = primary.properties.platform_name
    secondary_name = secondary.properties.platform_name

    plot_data = {
        plot_type: "range_time",
        title: "Range vs Time: " + primary_name + " to " + secondary_name,
        units: units,
        x_axis: {
            label: "Time",
            type: "datetime",
            min: data_points[0].time,
            max: data_points[LAST].time
        },
        y_axis: {
            label: "Range (" + units + ")",
            type: "numeric",
            min: statistics.min_range,
            max: statistics.max_range
        },
        series: {
            primary_track_id: primary.id,
            secondary_track_id: secondary.id,
            primary_name: primary_name,
            secondary_name: secondary_name,
            color: "#3388ff",
            data_points: data_points,
            statistics: statistics
        }
    }

    href = SLUGIFY(primary_name) + "-vs-" + SLUGIFY(secondary_name) + "-range-time.json"

    label = "Range vs Time: " + primary_name + " to " + secondary_name
            + " (" + LENGTH(data_points) + " points, CPA "
            + ROUND(min_range, 0) + " " + units + " at " + cpa_time + ")"

    content_items = build_artifact(
        data: SERIALIZE(plot_data),
        mime: "application/json",
        result_subtype: "dataset/range_time_series",
        source_feature_ids: [primary.id, secondary.id],
        label: label,
        href: href
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION interpolate_position(track: TrackFeature, time: datetime) -> coordinates:
    positions = track.properties.positions

    // Exact match
    FOR EACH pos IN positions:
        IF pos.time == time:
            RETURN pos.coordinates
        END IF
    END FOR

    // Linear interpolation between bracketing positions
    FOR i FROM 0 TO LENGTH(positions) - 2:
        IF positions[i].time < time AND positions[i+1].time > time:
            fraction = (time - positions[i].time) / (positions[i+1].time - positions[i].time)
            lon = positions[i].coordinates[0] + fraction * (positions[i+1].coordinates[0] - positions[i].coordinates[0])
            lat = positions[i].coordinates[1] + fraction * (positions[i+1].coordinates[1] - positions[i].coordinates[1])
            RETURN [lon, lat]
        END IF
    END FOR

    RETURN NULL  // Time outside track range
END FUNCTION

FUNCTION geodesic_distance(pos1: coordinates, pos2: coordinates) -> meters:
    // Haversine formula for distance between two [lon, lat] points
    R = 6371000  // Earth radius in meters
    lat1 = RADIANS(pos1[1])
    lat2 = RADIANS(pos2[1])
    delta_lat = RADIANS(pos2[1] - pos1[1])
    delta_lon = RADIANS(pos2[0] - pos1[0])

    a = SIN(delta_lat / 2)^2 + COS(lat1) * COS(lat2) * SIN(delta_lon / 2)^2
    c = 2 * ATAN2(SQRT(a), SQRT(1 - a))

    RETURN R * c
END FUNCTION

FUNCTION convert_distance(value_m: float, from: string, to: string) -> float:
    // Convert metres to target unit
    IF to == "m":
        RETURN value_m
    ELSE IF to == "yds":
        RETURN value_m * 1.09361
    ELSE IF to == "km":
        RETURN value_m / 1000.0
    ELSE IF to == "nm":
        RETURN value_m / 1852.0
    END IF
END FUNCTION
```

### Complexity

- **Time**: O(N log N + N * P) -- N is total sample times (sorted), P is positions per track for interpolation
- **Space**: O(N) -- stores one data point per sample time

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required" |
| More than two tracks | Return error: `invalid_input`, "Exactly two track features required" |
| No time overlap between tracks | Return error: `no_data`, "Tracks have no time overlap" with time ranges |
| Tracks at identical positions (range = 0) | Return `0.0` in requested units; CPA is the entire period |
| Very large distances (antipodal) | Haversine handles correctly up to 180 degrees |
| Invalid units parameter | Return error: `invalid_input`, "Unsupported distance unit" |
| Single overlapping time point | Produce dataset with 1 data point; stats have min == max == mean, std_dev == 0 |
| Tracks with different sample rates | `union` strategy captures all timestamps; interpolation fills gaps |
| Position at exact overlap boundary | Included in the sample set |

## Examples

### Basic Usage

**Input**: `range-time-plot.basic.input.json`
**Output**: `range-time-plot.basic.output.json`

Description: Two tracks (OWNSHIP and TARGET) with 5 positions each over 10 minutes. Tracks converge then diverge, showing a clear CPA. Output includes 9 sample points (union of both tracks' timestamps) with range in yards and CPA identification.

### Edge Case: Single Overlap Point

**Input**: `range-time-plot.edge-1.input.json`
**Output**: `range-time-plot.edge-1.output.json`

Description: Two tracks whose time ranges barely overlap at a single timestamp. Produces a dataset with 1 data point. Statistics show std_dev = 0.

### Edge Case: No Time Overlap

**Input**: `range-time-plot.edge-2.input.json`
**Output**: `range-time-plot.edge-2.output.json`

Description: Two tracks with non-overlapping time ranges. Returns an error indicating the tracks have no time overlap, with both tracks' time ranges in the message.

### Complex: Different Sample Rates

**Input**: `range-time-plot.complex.input.json`
**Output**: `range-time-plot.complex.output.json`

Description: Primary track with positions every minute, secondary track with positions every 5 minutes. Using `union` strategy, range is computed at all timestamps from both tracks with interpolation filling the gaps. Demonstrates CPA detection between the denser sample points.

## Changelog

### 1.0 (2026-02-15)
- Initial specification
- Supports four distance units: yards, kilometres, nautical miles, metres
- Three sample strategies: union, primary, secondary
- Uses Haversine great-circle distance formula
- CPA (closest point of approach) detection included in statistics
- Linear interpolation for positions between known fixes

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [range-calc](../measurement/range-calc.1.0.md) - Range at a single time; this tool extends it across a time period
- [show-time-variable-plot](./show-time-variable-plot.1.0.md) - Time-variable plot for single-track properties; this tool specialises in two-track range
- [xy-plot-generator](./xy-plot-generator.1.0.md) - General XY plotting; this tool is a specialised range-time variant with CPA detection
- [generate-sensor-range-plot](../../sensor/analysis/generate-sensor-range-plot.1.0.md) - Similar concept but driven by sensor cuts rather than track positions
- [delta-rate-calc](../measurement/delta-rate-calc.1.0.md) - Rate of change of range (derivative of this tool's output)

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**External**:
- [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) - Great-circle distance calculation
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Time format used on X axis
