---
name: resolve-ambiguity
version: 1.0
category: sensor/calibration
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.track_shift.operations.ResolveAmbiguity
---

# Resolve Ambiguity

> Resolve ambiguous bearing measurements (port/starboard ambiguity) using geometric comparison against a target track.

## MCP

**Description**: Resolves port/starboard bearing ambiguity on sensor cuts by comparing both possible bearings against a known or estimated target track. For each ambiguous cut, selects the bearing that geometrically aligns with the target position.

**When to use**: When sensor data has ambiguous bearings (towed array producing both port and starboard solutions) and a target track is available to determine which bearing is correct. Typically used after initial track reconstruction when the analyst wants to clean up ambiguous sensor data.

**Parameters**:
- `features`: FeatureCollection containing one or more SENSOR features with ambiguous cuts, plus one or more TRACK features to use as reference targets

**Returns**: ToolResponse containing mutated sensor features with ambiguity resolved -- each cut's `ambiguous` flag set to false and `resolved_bearing` populated.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`, `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- At least one feature with `properties.kind == "SENSOR"` required
- At least one feature with `properties.kind == "TRACK"` required (the target track)
- Sensor cuts must have `bearing` and `ambiguous_bearing` fields when `ambiguous == true`
- Each cut must have a `time` and `origin` (sensor position at that time)
- Target track must have `positions` with `time` and `coordinates`

**Defaults**:
- If a sensor has no ambiguous cuts, it is returned unchanged

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/sensor/resolved`

**Content Items**: One `MutationResult` per modified sensor feature containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with resolved bearings

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/sensor/resolved"`
- `debrief:sourceFeatures`: `["{sensor_id}", "{target_track_id}"]`
- `debrief:label`: `"Resolved ambiguity for {n} cut(s) on {sensor_name} using target track {target_name}"`

## Algorithm

```pseudocode
FUNCTION resolve_ambiguity(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Separate sensors and tracks
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

    IF tracks IS EMPTY:
        RETURN build_error("No target track features found for ambiguity resolution", "invalid_input", [])
    END IF

    content_items = empty list

    FOR EACH sensor IN sensors:
        // Find the best matching target track for this sensor
        // (exclude the sensor's own host track)
        target = find_best_target_track(sensor, tracks)

        IF target IS NULL:
            // No suitable target; skip this sensor
            CONTINUE
        END IF

        resolved_count = 0

        FOR EACH cut IN sensor.properties.cuts:
            IF cut.ambiguous != true:
                // Already resolved or not ambiguous; skip
                CONTINUE
            END IF

            // Get target position at cut time (interpolate if needed)
            target_pos = interpolate_position(target, cut.time)

            IF target_pos IS NULL:
                // No target data at this time; skip cut
                CONTINUE
            END IF

            // Calculate bearing from sensor origin to target position
            true_bearing = calculate_bearing(cut.origin, target_pos)

            // Compare primary bearing and ambiguous bearing to true bearing
            error_primary = angular_difference(cut.bearing, true_bearing)
            error_ambiguous = angular_difference(cut.ambiguous_bearing, true_bearing)

            // Select bearing with smallest angular error
            IF error_primary <= error_ambiguous:
                cut.resolved_bearing = cut.bearing
            ELSE:
                cut.resolved_bearing = cut.ambiguous_bearing
            END IF

            cut.ambiguous = false
            resolved_count = resolved_count + 1
        END FOR

        // Build content item for this sensor
        item = build_mutation(
            features: [sensor],
            result_subtype: "sensor/resolved",
            source_feature_ids: [sensor.id, target.id],
            label: "Resolved ambiguity for " + resolved_count + " cut(s) on "
                   + sensor.properties.sensor_name + " using target track "
                   + target.properties.platform_name
        )

        content_items.append(item)
    END FOR

    IF content_items IS EMPTY:
        RETURN build_error("No ambiguous sensor data could be resolved", "no_match", [])
    END IF

    RETURN build_response(content_items)
END FUNCTION

FUNCTION find_best_target_track(sensor: SensorFeature, tracks: list) -> TrackFeature:
    // Return the first track that is NOT the sensor's host
    FOR EACH track IN tracks:
        IF track.id != sensor.properties.host_track_id:
            RETURN track
        END IF
    END FOR
    RETURN NULL
END FUNCTION

FUNCTION interpolate_position(track: TrackFeature, time: datetime) -> coordinates:
    positions = track.properties.positions

    // Find bracketing positions
    FOR i FROM 0 TO LENGTH(positions) - 2:
        IF positions[i].time <= time AND positions[i+1].time >= time:
            // Linear interpolation between bracketing positions
            fraction = (time - positions[i].time) / (positions[i+1].time - positions[i].time)
            lon = positions[i].coordinates[0] + fraction * (positions[i+1].coordinates[0] - positions[i].coordinates[0])
            lat = positions[i].coordinates[1] + fraction * (positions[i+1].coordinates[1] - positions[i].coordinates[1])
            RETURN [lon, lat]
        END IF
    END FOR

    // If time matches exactly at boundary
    IF time == positions[0].time:
        RETURN positions[0].coordinates
    END IF
    IF time == positions[LAST].time:
        RETURN positions[LAST].coordinates
    END IF

    RETURN NULL
END FUNCTION

FUNCTION calculate_bearing(from: coordinates, to: coordinates) -> degrees:
    // Standard geodesic initial bearing calculation
    // from = [lon1, lat1], to = [lon2, lat2]
    delta_lon = to[0] - from[0]
    bearing = ATAN2(SIN(delta_lon) * COS(to[1]),
                    COS(from[1]) * SIN(to[1]) - SIN(from[1]) * COS(to[1]) * COS(delta_lon))
    RETURN (bearing_in_degrees + 360) MOD 360
END FUNCTION

FUNCTION angular_difference(a: degrees, b: degrees) -> degrees:
    diff = ABS(a - b) MOD 360
    IF diff > 180:
        diff = 360 - diff
    END IF
    RETURN diff
END FUNCTION
```

### Complexity

- **Time**: O(S * C * P) -- S sensors, C cuts per sensor, P positions per target track (for interpolation)
- **Space**: O(S * C) -- stores modified cuts for all sensors

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features | Return error response: `invalid_input`, "No sensor features found in input" |
| No target track features | Return error response: `invalid_input`, "No target track features found for ambiguity resolution" |
| All cuts already resolved (`ambiguous == false`) | Return sensor unchanged with label indicating 0 cuts resolved |
| Single ambiguous cut | Resolve using geometric comparison; no leg analysis needed |
| Cut time outside target track time range | Skip cut (leave ambiguous), do not extrapolate |
| Multiple sensors in input | Process each sensor independently; match each to best available target |
| Multiple target tracks | Use first non-host track; future versions may support explicit pairing |
| Sensor with no cuts | Return sensor feature unchanged |
| Ambiguous bearing equals primary bearing (degenerate) | Select primary bearing (tie-break to primary) |
| Target track with single position | Use exact match only; no interpolation possible |

## Examples

### Basic Usage

**Input**: `resolve-ambiguity.basic.input.json`
**Output**: `resolve-ambiguity.basic.output.json`

Description: Resolves 5 ambiguous cuts on a towed array sensor using a target track to the northeast. All cuts resolve to the primary bearing (045-053 degrees) since the target is in that direction.

### Edge Case: Single Cut

**Input**: `resolve-ambiguity.edge-1.input.json`
**Output**: `resolve-ambiguity.edge-1.output.json`

Description: Single ambiguous cut resolved against a target track. Demonstrates that even one cut can be resolved geometrically.

### Edge Case: Already Resolved

**Input**: `resolve-ambiguity.edge-2.input.json`
**Output**: `resolve-ambiguity.edge-2.output.json`

Description: All cuts are already resolved (`ambiguous == false`). Sensor returned unchanged with label indicating 0 cuts resolved.

### Complex: Multiple Sensors and Targets

**Input**: `resolve-ambiguity.complex.input.json`
**Output**: `resolve-ambiguity.complex.output.json`

Description: Two sensors (PORT_ARRAY and STBD_ARRAY) with ambiguous cuts, each matched to a different target track. PORT_ARRAY cuts resolve to NE bearings; STBD_ARRAY cuts resolve to W bearings. Demonstrates multi-sensor, multi-target handling and mixed ambiguous/non-ambiguous cuts.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports geometric bearing comparison against target track
- Handles multiple sensors and target tracks
- Preserves non-ambiguous cuts unchanged

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [ambiguity-resolver](./ambiguity-resolver.1.0.md) - More sophisticated leg-based ambiguity resolution using bearing rate analysis

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.track_shift.operations.ResolveAmbiguity`
