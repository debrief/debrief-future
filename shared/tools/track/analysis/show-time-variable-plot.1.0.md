---
name: show-time-variable-plot
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.ShowTimeVariablePlot3
---

# Show Time Variable Plot

> Display a time-series plot of a single kinematic or tote variable for one or more tracks.

## MCP

**Description**: Generates a time-variable plot artifact showing how a selected variable (speed, course, bearing, range, depth, frequency) changes over time for one or more tracks. Extracts time-series data from track positions and computes per-series statistics (min, max, mean, standard deviation).

**When to use**: When the user wants to visualize how a single track variable changes over time, compare that variable across multiple tracks, or inspect tote calculations (bearing, range) between track pairs over a time period. Differs from xy-plot-generator in that it always uses time as the X axis and focuses on a single configurable Y variable with per-track statistics.

**Parameters**:
- `features`: FeatureCollection containing one or more track features to plot
- `variable`: The variable to plot on the Y axis -- one of `speed`, `course`, `bearing`, `range`, `depth`, `frequency`
- `title`: Optional title for the plot (defaults to `"{Variable} vs Time"`)

**Returns**: ToolResponse containing a JSON artifact with plot metadata, per-track data series, and per-series descriptive statistics.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `kind == "TRACK"` required
- Track positions must contain the requested variable as a property
- Valid variables: `speed`, `course`, `bearing`, `range`, `depth`, `frequency`

**Defaults**:
- `title`: `"{Variable} vs Time"` if not specified (where Variable is the capitalized variable name)

## Outputs

Returns a **ToolResponse** with an artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/analysis/time_variable_plot`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://time-variable-plot-{id}`
- `mimeType`: "application/json"
- `text`: Serialized plot data structure with:
  - `plot_type`: `"time_variable"`
  - `title`: Plot title string
  - `variable`: The variable being plotted
  - `x_axis`: `{label, type: "datetime", min, max}`
  - `y_axis`: `{label, type: "numeric", min, max}`
  - `series[]`: Per-track series, each with `track_id`, `platform_name`, `color`, `data_points[]` (time/value pairs), and `statistics` (`min`, `max`, `mean`, `std_dev`)

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/analysis/time_variable_plot"`
- `debrief:sourceFeatures`: IDs of all tracks included in the plot
- `debrief:label`: `"{Variable} vs Time plot for {platform_name} ({n} data points)"` (single track) or `"{Variable} vs Time plot for {n} tracks ({names}) - {m} data points each"` (multiple tracks)
- `debrief:href`: `"plots/time-variable-plot-{id}.json"`

## Algorithm

```pseudocode
FUNCTION show_time_variable_plot(features: FeatureCollection,
                                  variable: string,
                                  title: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF variable IS NULL OR variable NOT IN VALID_VARIABLES:
        RETURN build_error(
            "Variable must be one of: speed, course, bearing, range, depth, frequency",
            "invalid_input",
            []
        )
    END IF

    IF title IS NULL:
        title = CAPITALIZE(variable) + " vs Time"
    END IF

    // Filter to track features only
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF tracks IS EMPTY:
        RETURN build_error("No track features found in input", "invalid_input", [])
    END IF

    // Check that the requested variable exists in at least one track
    variable_found = false
    source_ids = empty list
    affected_ids = empty list

    FOR EACH track IN tracks:
        source_ids.append(track.id)
        FOR EACH position IN track.properties.positions:
            IF has_property(position, variable):
                variable_found = true
            END IF
        END FOR
        IF NOT variable_found:
            affected_ids.append(track.id)
        END IF
    END FOR

    IF NOT variable_found:
        // Determine which variables ARE available
        available = detect_available_variables(tracks)
        RETURN build_error(
            "Variable '" + variable + "' is not available in any of the selected track positions",
            "invalid_input",
            affected_ids
        )
    END IF

    // Extract data series per track
    series_list = empty list
    global_y_min = INFINITY
    global_y_max = -INFINITY
    global_time_min = NULL
    global_time_max = NULL
    color_index = 0

    FOR EACH track IN tracks:
        data_points = empty list

        FOR EACH position IN track.properties.positions:
            value = get_property(position, variable)
            IF value IS NOT NULL:
                data_points.append({time: position.time, value: value})

                // Update global axis bounds
                IF value < global_y_min: global_y_min = value
                IF value > global_y_max: global_y_max = value
            END IF

            // Update global time bounds
            IF global_time_min IS NULL OR position.time < global_time_min:
                global_time_min = position.time
            END IF
            IF global_time_max IS NULL OR position.time > global_time_max:
                global_time_max = position.time
            END IF
        END FOR

        IF data_points IS NOT EMPTY:
            // Compute descriptive statistics for this series
            values = extract_values(data_points)
            stats = {
                min: MIN(values),
                max: MAX(values),
                mean: ROUND(MEAN(values), 2),
                std_dev: ROUND(STD_DEV(values), 2)
            }

            series_list.append({
                track_id: track.id,
                platform_name: track.properties.platform_name,
                color: assign_color(color_index),
                data_points: data_points,
                statistics: stats
            })
            color_index = color_index + 1
        END IF
    END FOR

    IF series_list IS EMPTY:
        RETURN build_error("No data found for variable '" + variable + "'", "invalid_input", source_ids)
    END IF

    // Determine Y axis label and bounds
    y_label = CAPITALIZE(variable) + " (" + unit_for(variable) + ")"

    // For course, use fixed 0-360 range
    IF variable == "course":
        global_y_min = 0.0
        global_y_max = 360.0
    END IF

    // Build plot data structure
    plot_data = {
        plot_type: "time_variable",
        title: title,
        variable: variable,
        x_axis: {
            label: "Time",
            type: "datetime",
            min: global_time_min,
            max: global_time_max
        },
        y_axis: {
            label: y_label,
            type: "numeric",
            min: global_y_min,
            max: global_y_max
        },
        series: series_list
    }

    // Build label
    IF LENGTH(series_list) == 1:
        total_points = LENGTH(series_list[0].data_points)
        label_suffix = ""
        IF total_points == 1:
            label_suffix = " - single position track"
        END IF
        label = title + " plot for " + series_list[0].platform_name + " (" + total_points + " data point" + plural(total_points) + label_suffix + ")"
    ELSE:
        names = join_names(series_list)
        points_desc = LENGTH(series_list[0].data_points) + " data points each"
        label = title + " plot for " + LENGTH(series_list) + " tracks (" + names + ") - " + points_desc
    END IF

    plot_id = generate_plot_id(series_list)
    href = "plots/time-variable-plot-" + plot_id + ".json"

    content_items = build_artifact(
        data: SERIALIZE(plot_data),
        mime: "application/json",
        result_subtype: "analysis/time_variable_plot",
        source_feature_ids: source_ids,
        label: label,
        href: href
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION unit_for(variable: string) -> string:
    IF variable == "speed": RETURN "kts"
    IF variable == "course": RETURN "deg"
    IF variable == "bearing": RETURN "deg"
    IF variable == "range": RETURN "m"
    IF variable == "depth": RETURN "m"
    IF variable == "frequency": RETURN "Hz"
    RETURN ""
END FUNCTION

FUNCTION assign_color(index: int) -> string:
    // Predefined color palette for multi-track plots
    COLORS = ["#3388ff", "#FF0000", "#00FF00", "#FF8800", "#8800FF", "#00FFFF"]
    RETURN COLORS[index MOD LENGTH(COLORS)]
END FUNCTION

CONSTANT VALID_VARIABLES = ["speed", "course", "bearing", "range", "depth", "frequency"]
```

### Complexity

- **Time**: O(t * p) -- iterates over t tracks with p positions each; statistics computation is O(p) per track
- **Space**: O(t * p) -- stores all extracted data points and statistics

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No track features (only sensors) | Return error: `invalid_input`, "No track features found in input" |
| Requested variable missing from all positions | Return error: `invalid_input`, "Variable '{v}' is not available in any of the selected track positions"; include list of available variables |
| Single-position track | Produce plot with 1 data point; statistics have `min == max == mean` and `std_dev == 0.0` |
| Multiple tracks with different time ranges | X axis spans the full union of all time ranges |
| Course variable | Y axis uses fixed bounds 0.0 to 360.0 regardless of actual data range |
| Variable present in some positions but not others | Skip positions without the variable; include only valid data points |
| Invalid variable name | Return error: `invalid_input`, "Variable must be one of: speed, course, bearing, range, depth, frequency" |

## Examples

### Basic Usage

**Input**: `show-time-variable-plot.basic.input.json`
**Output**: `show-time-variable-plot.basic.output.json`

Description: Generates a speed vs time plot for a single surface track with 6 positions. Output includes per-series statistics (min=10, max=12, mean=11.33, std_dev=0.75).

### Complex: Multi-Track Course Comparison

**Input**: `show-time-variable-plot.complex.input.json`
**Output**: `show-time-variable-plot.complex.output.json`

Description: Generates a course vs time plot comparing two tracks (ownship with manoeuvres, target with constant course 180). Each track gets a distinct color and independent statistics.

### Edge Case: Single Position Track

**Input**: `show-time-variable-plot.edge-1.input.json`
**Output**: `show-time-variable-plot.edge-1.output.json`

Description: Track has only one position. Plot is produced with a single data point. Statistics show `std_dev=0.0` and `min == max == mean`.

### Edge Case: Missing Variable

**Input**: `show-time-variable-plot.edge-2.input.json`
**Output**: `show-time-variable-plot.edge-2.output.json`

Description: Positions do not contain a `depth` property. Returns an error indicating the variable is not available and listing the variables that are present.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports 6 variables: speed, course, bearing, range, depth, frequency
- Produces per-series descriptive statistics (min, max, mean, std_dev)
- Multi-track support with automatic color assignment
- Course variable uses fixed 0-360 Y axis range

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [xy-plot-generator](./xy-plot-generator.1.0.md) - More general XY plotting with configurable X and Y axes; this tool is a specialised time-axis variant with statistics
- [zig-detector](./zig-detector.1.0.md) - Course change detection that complements course-time plots

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.ShowTimeVariablePlot3`

**External**:
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Time format used on X axis
