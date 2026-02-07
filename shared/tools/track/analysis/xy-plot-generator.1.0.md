---
name: xy-plot-generator
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.cmap.xyplot.XYPlotGeneratorButtons
---

# XY Plot Generator

> Generate XY analysis plots from track or sensor time-series data.

## MCP

**Description**: Generates XY analysis plots from track positions or sensor contact data. Extracts time-series data for configurable X and Y axis variables (e.g., speed-time, bearing-time, range-time, course-time) and produces a structured plot data artifact.

**When to use**: When the user wants to create a time-series chart of track kinematics (speed, course, depth) or sensor measurements (bearing, range, frequency), or needs to visualize how a variable changes over time for one or more tracks or sensors.

**Parameters**:
- `features`: FeatureCollection containing tracks and/or sensors to plot
- `plot_type`: Type of plot -- one of `speed_time`, `course_time`, `bearing_time`, `range_time`, `depth_time`, `frequency_time`
- `x_variable`: Variable for the X axis (typically `time`)
- `y_variable`: Variable for the Y axis (e.g., `speed`, `course`, `bearing`, `range`, `depth`, `frequency`)
- `source_type`: Data source -- `track` (default) or `sensor`

**Returns**: ToolResponse containing a JSON artifact with plot metadata and data series.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`, `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- At least one feature with `kind == "TRACK"` or `kind == "SENSOR"` required
- For track source: positions must have the requested y_variable property
- For sensor source: contacts must have the requested y_variable property
- Valid plot types: `speed_time`, `course_time`, `bearing_time`, `range_time`, `depth_time`, `frequency_time`

**Defaults**:
- `x_variable`: `"time"` if not specified
- `source_type`: `"track"` if not specified

## Outputs

Returns a **ToolResponse** with an artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/analysis/xy_plot`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://xy-plot-generator/{name}-{y_variable}-{x_variable}.json`
- `mimeType`: "application/json"
- `text`: Serialized plot data structure with axes metadata and data series

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/analysis/xy_plot"`
- `debrief:sourceFeatures`: IDs of tracks or sensors used
- `debrief:label`: `"Generated {y_variable} vs {x_variable} plot for {n} {source}(s) with {m} data points"`
- `debrief:href`: `"{name}-{y_variable}-{x_variable}.json"`

## Algorithm

```pseudocode
FUNCTION xy_plot_generator(features: FeatureCollection, plot_type: string,
                           x_variable: string, y_variable: string,
                           source_type: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF plot_type IS NULL OR plot_type NOT IN VALID_PLOT_TYPES:
        RETURN build_error("plot_type must be one of: speed_time, course_time, bearing_time, range_time, depth_time, frequency_time", "invalid_input", [])
    END IF

    IF x_variable IS NULL:
        x_variable = "time"
    END IF

    IF source_type IS NULL:
        source_type = "track"
    END IF

    series_list = empty list
    source_ids = empty list
    total_points = 0

    IF source_type == "track":
        // Extract data from track positions
        FOR EACH feature IN features.features:
            IF feature.properties.kind != "TRACK":
                CONTINUE
            END IF

            source_ids.append(feature.id)
            data_points = empty list

            FOR EACH position IN feature.properties.positions:
                x_value = extract_variable(position, x_variable)
                y_value = extract_variable(position, y_variable)

                IF y_value IS NOT NULL:
                    data_points.append({x: x_value, y: y_value})
                END IF
            END FOR

            IF data_points IS NOT EMPTY:
                series_list.append({
                    track_id: feature.id,
                    track_name: feature.properties.platform_name,
                    data_points: data_points
                })
                total_points = total_points + LENGTH(data_points)
            END IF
        END FOR

    ELSE IF source_type == "sensor":
        // Extract data from sensor contacts
        FOR EACH feature IN features.features:
            IF feature.properties.kind != "SENSOR":
                CONTINUE
            END IF

            source_ids.append(feature.id)
            data_points = empty list

            FOR EACH contact IN feature.properties.contacts:
                x_value = extract_variable(contact, x_variable)
                y_value = extract_variable(contact, y_variable)

                IF y_value IS NOT NULL:
                    data_points.append({x: x_value, y: y_value})
                END IF
            END FOR

            IF data_points IS NOT EMPTY:
                series_list.append({
                    sensor_id: feature.id,
                    sensor_name: feature.properties.sensor_name,
                    data_points: data_points
                })
                total_points = total_points + LENGTH(data_points)
            END IF
        END FOR
    END IF

    IF series_list IS EMPTY:
        RETURN build_error("No data found for the requested plot variables", "invalid_input", source_ids)
    END IF

    // Build plot data structure
    plot_name = derive_plot_name(features, source_type)
    plot_data = {
        plot_type: plot_type,
        title: CAPITALIZE(y_variable) + " vs " + CAPITALIZE(x_variable) + " - " + plot_name,
        x_axis: {label: CAPITALIZE(x_variable), variable: x_variable, unit: unit_for(x_variable)},
        y_axis: {label: CAPITALIZE(y_variable), variable: y_variable, unit: unit_for(y_variable)},
        series: series_list
    }

    href = SLUGIFY(plot_name) + "-" + y_variable + "-" + x_variable + ".json"

    content_items = build_artifact(
        data: SERIALIZE(plot_data),
        mime: "application/json",
        result_subtype: "analysis/xy_plot",
        source_feature_ids: source_ids,
        label: "Generated " + y_variable + " vs " + x_variable + " plot for " + LENGTH(series_list) + " " + source_type + "(s) with " + total_points + " data points",
        href: href
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION extract_variable(record: object, variable: string) -> any:
    IF variable == "time": RETURN record.time
    IF variable == "speed": RETURN record.speed
    IF variable == "course": RETURN record.course
    IF variable == "depth": RETURN record.depth
    IF variable == "bearing": RETURN record.bearing
    IF variable == "range": RETURN record.range
    IF variable == "frequency": RETURN record.frequency
    RETURN NULL
END FUNCTION

FUNCTION unit_for(variable: string) -> string:
    IF variable == "time": RETURN "ISO8601"
    IF variable == "speed": RETURN "kts"
    IF variable == "course": RETURN "degrees"
    IF variable == "depth": RETURN "metres"
    IF variable == "bearing": RETURN "degrees"
    IF variable == "range": RETURN "metres"
    IF variable == "frequency": RETURN "Hz"
    RETURN ""
END FUNCTION

CONSTANT VALID_PLOT_TYPES = ["speed_time", "course_time", "bearing_time", "range_time", "depth_time", "frequency_time"]
```

### Complexity

- **Time**: O(n * m) -- iterates over n features with m positions/contacts each
- **Space**: O(n * m) -- stores all extracted data points

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No matching features for source_type | Return error response: `invalid_input`, "No data found for the requested plot variables" |
| Position missing requested y_variable | Skip that position, do not include null data points |
| All positions missing y_variable | Return error response: no data found |
| Single position in track | Produce plot with single data point |
| Invalid plot_type | Return error response listing valid plot types |
| Mixed track and sensor features | Process only features matching source_type, skip others |
| Multiple tracks | Generate one series per track in the output |
| Sensor contacts without range (for range_time) | Skip contacts without range, produce partial series |

## Examples

### Basic Usage

**Input**: `xy-plot-generator.basic.input.json`
**Output**: `xy-plot-generator.basic.output.json`

Description: Generates a speed vs time plot for a single surface track with 3 positions.

### Edge Case: Single Position

**Input**: `xy-plot-generator.edge.input.json`
**Output**: `xy-plot-generator.edge.output.json`

Description: Generates a course vs time plot for a track with only one position, producing a single-point series.

### Complex: Sensor Range-Time with Multiple Features

**Input**: `xy-plot-generator.complex.input.json`
**Output**: `xy-plot-generator.complex.output.json`

Description: Generates a range vs time plot from a sensor's contact data, ignoring track features in the input when source_type is "sensor".

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports 6 plot types: speed_time, course_time, bearing_time, range_time, depth_time, frequency_time
- Supports both track and sensor data sources
- Produces structured JSON plot data artifact

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [set-track-color](../styling/set-track-color.1.0.md) - Visual styling for tracks in plot

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.cmap.xyplot.XYPlotGeneratorButtons`

**External**:
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) - Time format used on X axis
