---
name: generate-sensor-range-plot
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.ContextOperations.GenerateSensorRangePlot
---

# Generate Sensor Range Plot

> Generate a range-over-time plot from sensor bearing data, ownship track, and target track.

## MCP

**Description**: Generates a time-series of calculated ranges from sensor bearing data combined with ownship and target track positions. At each sensor cut time, finds ownship and target positions (interpolating if necessary) and computes the geodesic distance between them, producing a range plot dataset.

**When to use**: When the analyst wants to visualise how the range between ownship and a target changes over time, based on sensor observations. Useful for verifying track solutions, identifying CPA, or comparing sensor data quality across different sensors.

**Parameters**:
- `features`: FeatureCollection containing one or more SENSOR features, the ownship TRACK, and one or more target TRACKs

**Returns**: ToolResponse containing one or more artifact content items with time-series range data in JSON format, including summary statistics (min, max, mean range).

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`, `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `properties.kind == "SENSOR"` required
- At least one feature with `properties.kind == "TRACK"` required (ownship, identified as sensor's `host_track_id`)
- At least one additional TRACK feature required (target)
- Sensor cuts must have `time` and `origin` fields
- Track positions must have `time` and `coordinates`

**Defaults**:
- If multiple target tracks are present and multiple sensors, the tool pairs each sensor with the closest-bearing target track

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/analysis/sensor_range_plot`

**Content Items**: One `ArtifactResult` per sensor-target pair containing:
- `type`: "resource"
- `uri`: `artifact://generate-sensor-range-plot/{sensor_name}-range-plot.json`
- `mimeType`: "application/json"
- `text`: Serialized JSON with title, time_series array, and statistics

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/analysis/sensor_range_plot"`
- `debrief:sourceFeatures`: `["{sensor_id}", "{ownship_id}", "{target_id}"]`
- `debrief:label`: `"Generated range plot for {sensor_name}: {n} data points, range {min}-{max}m"`
- `debrief:href`: `"{sensor_name}-range-plot.json"`

## Algorithm

```pseudocode
FUNCTION generate_sensor_range_plot(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Separate feature types
    sensors = empty list
    tracks = empty list

    FOR EACH feature IN features.features:
        IF feature.properties.kind == "SENSOR":
            sensors.append(feature)
        ELSE IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF sensors IS EMPTY:
        RETURN build_error("No sensor features found in input", "invalid_input", [])
    END IF

    IF LENGTH(tracks) < 2:
        RETURN build_error("Both ownship and target tracks required", "invalid_input", [])
    END IF

    content_items = empty list

    FOR EACH sensor IN sensors:
        // Identify ownship track
        ownship = NULL
        FOR EACH track IN tracks:
            IF track.id == sensor.properties.host_track_id:
                ownship = track
                BREAK
            END IF
        END FOR

        IF ownship IS NULL:
            // Use first track as ownship fallback
            ownship = tracks[0]
        END IF

        // Identify target tracks (all non-ownship tracks)
        targets = empty list
        FOR EACH track IN tracks:
            IF track.id != ownship.id:
                targets.append(track)
            END IF
        END FOR

        FOR EACH target IN targets:
            time_series = empty list

            FOR EACH cut IN sensor.properties.cuts:
                // Get ownship position at cut time
                own_pos = interpolate_position(ownship, cut.time)

                // Get target position at cut time
                tgt_pos = interpolate_position(target, cut.time)

                IF own_pos IS NULL OR tgt_pos IS NULL:
                    // Cannot compute range if either position is missing
                    CONTINUE
                END IF

                // Calculate geodesic range
                range_m = geodesic_distance(own_pos, tgt_pos)

                time_series.append({
                    time: cut.time,
                    range_m: ROUND(range_m, 1),
                    bearing: cut.bearing,
                    ownship_position: own_pos,
                    target_position: tgt_pos
                })
            END FOR

            IF time_series IS EMPTY:
                CONTINUE
            END IF

            // Compute statistics
            ranges = [entry.range_m FOR entry IN time_series]
            stats = {
                min_range_m: MIN(ranges),
                max_range_m: MAX(ranges),
                mean_range_m: ROUND(MEAN(ranges), 1),
                data_points: LENGTH(time_series)
            }

            // Build plot data object
            plot_data = {
                title: "Sensor Range Plot: " + sensor.properties.sensor_name
                       + " vs " + target.properties.platform_name,
                sensor_name: sensor.properties.sensor_name,
                ownship: ownship.properties.platform_name,
                target: target.properties.platform_name,
                time_series: time_series,
                statistics: stats
            }

            href = sensor.properties.sensor_name + "-"
                   + target.properties.platform_name + "-range-plot.json"

            label = "Generated range plot for " + sensor.properties.sensor_name
                    + " vs " + target.properties.platform_name + ": "
                    + stats.data_points + " data points, range "
                    + ROUND(stats.min_range_m) + "-" + ROUND(stats.max_range_m) + "m"

            item = build_artifact(
                data: SERIALIZE(plot_data),
                mime: "application/json",
                result_subtype: "analysis/sensor_range_plot",
                source_feature_ids: [sensor.id, ownship.id, target.id],
                label: label,
                href: href
            )

            content_items.append(item)
        END FOR
    END FOR

    IF content_items IS EMPTY:
        RETURN build_error("No range data could be computed; check time overlap between sensor and tracks", "no_data", [])
    END IF

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
```

### Complexity

- **Time**: O(S * T * C * P) -- S sensors, T targets, C cuts per sensor, P positions for interpolation
- **Space**: O(C) -- stores one time-series entry per cut

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features | Return error response: `invalid_input`, "No sensor features found in input" |
| Only one track (no target) | Return error response: `invalid_input`, "Both ownship and target tracks required" |
| Single sensor cut | Produce range plot with one data point |
| Sensor cut time outside target track range | Skip that cut; do not extrapolate |
| Sensor cut time between target positions | Interpolate target position linearly |
| No time overlap between sensor and target | Return error: `no_data`, no range data could be computed |
| Multiple sensors and multiple targets | Produce one range plot per sensor-target pair |
| Sensor host_track_id not matching any track | Fall back to first track as ownship |
| Co-located ownship and target (range ~ 0) | Return range of 0.0 meters |

## Examples

### Basic Usage

**Input**: `generate-sensor-range-plot.basic.input.json`
**Output**: `generate-sensor-range-plot.basic.output.json`

Description: Five sensor cuts on TOWED_ARRAY with ownship and target tracks. Produces a range plot with 5 data points showing decreasing range as tracks converge.

### Edge Case: Single Cut

**Input**: `generate-sensor-range-plot.edge-1.input.json`
**Output**: `generate-sensor-range-plot.edge-1.output.json`

Description: Single sensor cut produces a range plot with exactly one data point. Statistics show min/max/mean all equal.

### Edge Case: Sparse Target Positions

**Input**: `generate-sensor-range-plot.edge-2.input.json`
**Output**: `generate-sensor-range-plot.edge-2.output.json`

Description: Sensor cuts at minute intervals but target track has positions only at 0, 2, and 4 minutes. Target positions are interpolated for intermediate sensor cut times. Only 3 cuts have matching sensor times.

### Complex: Multiple Sensors and Targets

**Input**: `generate-sensor-range-plot.complex.input.json`
**Output**: `generate-sensor-range-plot.complex.output.json`

Description: Two sensors (PORT_ARRAY, STBD_ARRAY) and two targets (NorthEast, West). Produces two range plots: PORT_ARRAY vs Target NorthEast (decreasing range) and STBD_ARRAY vs Target West (increasing range as vessels diverge).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports multiple sensors and target tracks
- Includes linear interpolation for target positions
- Produces JSON artifact with time-series and summary statistics

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-new-sensor-contact](./generate-new-sensor-contact.1.0.md) - Create manual sensor contacts
- [doppler-curve](./doppler-curve.1.0.md) - Doppler frequency analysis

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.ContextOperations.GenerateSensorRangePlot`
