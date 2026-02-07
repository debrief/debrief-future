---
name: generate-track-from-active-cuts
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.actions.GenerateTrackFromActiveCuts
---

# Generate Track from Active Cuts

> Generate a full track by plotting positions from active sensor contacts with bearing and range data.

## MCP

**Description**: Generates a target track by computing target positions from active sensor contacts that include both bearing and range data. For each contact, the target position is calculated by applying the bearing and range offset from the sensor origin (ownship position). Course and speed are then derived between successive positions.

**When to use**: When the user has an ownship track with active sonar contacts (each providing both bearing and range) and wants to produce a derived target track. This is used for active sonar scenarios where range information is available, unlike passive-only TMA which relies on bearing cuts alone.

**Parameters**:
- `features`: FeatureCollection containing an ownship track and a sensor feature with active contacts (bearing + range)

**Returns**: ToolResponse containing one TRACK feature with positions derived from the active sensor cuts.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`, `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `kind == "TRACK"` required (ownship)
- Exactly one feature with `kind == "SENSOR"` required, with `sensor_type` indicating active capability
- Each sensor contact must have `time`, `bearing`, `range_nm`, and `origin` properties
- Contacts without `range_nm` are invalid for this tool (passive-only cuts are rejected)

**Defaults**:
- None; all inputs are required

## Outputs

Returns a **ToolResponse** with one addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/track/from_cuts`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://{generated-track-id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized TRACK GeoJSON Feature with derived positions

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/track/from_cuts"`
- `debrief:sourceFeatures`: IDs of both the ownship track and the sensor feature
- `debrief:label`: `"Generated track from {n} active sensor cuts"`

## Algorithm

```pseudocode
FUNCTION generate_track_from_active_cuts(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Find ownship track and sensor
    ownship = NULL
    sensor = NULL
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            ownship = feature
        ELSE IF feature.properties.kind == "SENSOR":
            sensor = feature
        END IF
    END FOR

    IF ownship IS NULL:
        RETURN build_error("No ownship track found in input features", "invalid_input", [])
    END IF

    IF sensor IS NULL OR sensor.properties.contacts IS EMPTY:
        RETURN build_error("No sensor contacts found in input features", "invalid_input", [])
    END IF

    // Validate that contacts have range data (active cuts requirement)
    contacts = sensor.properties.contacts
    contacts_missing_range = 0
    FOR EACH contact IN contacts:
        IF contact.range_nm IS NULL:
            contacts_missing_range = contacts_missing_range + 1
        END IF
    END FOR

    IF contacts_missing_range > 0:
        RETURN build_error(
            "Sensor contacts must include range data (active cuts). Passive-only contacts found without range_nm values.",
            "invalid_input",
            [sensor.id]
        )
    END IF

    // Generate target positions from each active cut
    n_cuts = LENGTH(contacts)
    target_positions = empty list
    target_coordinates = empty list

    FOR EACH i, contact IN ENUMERATE(contacts):
        // Calculate target position from origin + bearing + range
        target_coords = offset_position(
            contact.origin,
            contact.bearing,
            contact.range_nm
        )

        // Derive course and speed from successive positions
        derived_course = NULL
        derived_speed = NULL

        IF i > 0:
            prev_coords = target_coordinates[i - 1]
            prev_time = contacts[i - 1].time

            derived_course = ROUND(bearing_from(prev_coords, target_coords), 1)
            distance_nm = distance_between(prev_coords, target_coords)
            delta_hours = HOURS_BETWEEN(prev_time, contact.time)

            IF delta_hours > 0:
                derived_speed = ROUND(distance_nm / delta_hours, 1)
            END IF
        END IF

        target_positions.append({
            time: contact.time,
            coordinates: target_coords,
            course: derived_course,
            speed: derived_speed
        })
        target_coordinates.append(target_coords)
    END FOR

    // Detect temporal gaps between cuts
    has_gaps = false
    gap_intervals = empty list
    EXPECTED_INTERVAL_FACTOR = 2.0

    IF n_cuts >= 3:
        // Calculate median interval
        intervals = empty list
        FOR EACH i IN RANGE(1, n_cuts):
            intervals.append(SECONDS_BETWEEN(contacts[i-1].time, contacts[i].time))
        END FOR
        median_interval = MEDIAN(intervals)

        FOR EACH i IN RANGE(1, n_cuts):
            interval = SECONDS_BETWEEN(contacts[i-1].time, contacts[i].time)
            IF interval > median_interval * EXPECTED_INTERVAL_FACTOR:
                has_gaps = true
                gap_intervals.append({
                    start: contacts[i-1].time,
                    end: contacts[i].time,
                    duration_seconds: interval
                })
            END IF
        END FOR
    ELSE IF n_cuts == 2:
        // With only 2 cuts, check if interval exceeds expected 60-second rate
        interval = SECONDS_BETWEEN(contacts[0].time, contacts[1].time)
        IF interval > 60 * EXPECTED_INTERVAL_FACTOR:
            has_gaps = true
            gap_intervals.append({
                start: contacts[0].time,
                end: contacts[1].time,
                duration_seconds: interval
            })
        END IF
    END IF

    // Calculate average course and speed (excluding first position which has nulls)
    IF n_cuts > 1:
        sum_course = 0
        sum_speed = 0
        count = 0
        FOR EACH pos IN target_positions:
            IF pos.course IS NOT NULL:
                sum_course = sum_course + pos.course
                sum_speed = sum_speed + pos.speed
                count = count + 1
            END IF
        END FOR
        IF count > 0:
            avg_course = ROUND(sum_course / count, 1)
            avg_speed = ROUND(sum_speed / count, 2)
        END IF
    END IF

    // Build track feature properties
    track_properties = {
        kind: "TRACK",
        platform_id: "FROM-ACTIVE-CUTS",
        platform_name: "Track from active cuts",
        track_type: "SURFACE",
        source_sensor_id: sensor.id,
        source_ownship_id: ownship.id,
        start_time: contacts[0].time,
        end_time: contacts[n_cuts - 1].time,
        positions: target_positions,
        style: {
            line: {stroke: true, color: "#FF3300", weight: 2, opacity: 0.8}
        }
    }

    // Add temporal gap metadata if applicable
    IF has_gaps:
        track_properties.has_temporal_gaps = true
        track_properties.gap_intervals = gap_intervals
    END IF

    // Add derived averages for complex scenarios
    IF n_cuts > 1 AND avg_course IS NOT NULL:
        track_properties.derived_avg_course = avg_course
        track_properties.derived_avg_speed = avg_speed
    END IF

    // Build the Track Feature
    track_id = "track-from-active-" + DERIVE_SUFFIX(sensor.id)
    track_feature = {
        type: "Feature",
        id: track_id,
        geometry: {type: "LineString", coordinates: target_coordinates},
        properties: track_properties
    }

    // Build label
    label = "Generated track from " + n_cuts + " active sensor cuts"
    IF has_gaps:
        label = label + " (" + LENGTH(gap_intervals) + " temporal gap detected)"
    ELSE IF n_cuts > 1 AND avg_course IS NOT NULL:
        label = label + " (avg course=" + avg_course + ", avg speed=" + avg_speed + " kts)"
    END IF

    content_items = build_addition(
        features: [track_feature],
        result_subtype: "track/from_cuts",
        source_feature_ids: [ownship.id, sensor.id],
        label: label
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION offset_position(origin: [lon, lat], bearing_deg: float, distance_nm: float) -> [lon, lat]:
    // Calculate new position from origin along bearing at given distance
    // Uses great-circle offset with R = 3440.065 nm
    RETURN [new_lon, new_lat]
END FUNCTION

FUNCTION bearing_from(origin: [lon, lat], target: [lon, lat]) -> float:
    // Calculate bearing from origin to target using great-circle formula
    RETURN bearing_degrees  // 0-360
END FUNCTION

FUNCTION distance_between(a: [lon, lat], b: [lon, lat]) -> float:
    // Calculate great-circle distance in nautical miles
    RETURN distance_nm
END FUNCTION
```

### Complexity

- **Time**: O(n) -- iterates over n active sensor contacts, plus O(n) for gap detection
- **Space**: O(n) -- stores one derived position per contact

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error response: `invalid_input`, "Input features required" |
| No ownship track in input | Return error response: `invalid_input`, "No ownship track found" |
| No sensor contacts | Return error response: `invalid_input`, "No sensor contacts found" |
| Passive-only contacts (no `range_nm`) | Return error response: `invalid_input`, "Sensor contacts must include range data (active cuts)" with count of missing contacts |
| Temporal gaps between sensor cuts | Produce track with `has_temporal_gaps = true` and `gap_intervals` array listing each gap |
| First position in track | Course and speed are null (no previous position to derive from) |
| Single active cut | Produce track with one position (course and speed both null) |

## Examples

### Basic Usage

**Input**: `generate-track-from-active-cuts.basic.input.json`
**Output**: `generate-track-from-active-cuts.basic.output.json`

Description: Generates a 5-position track from 5 active sonar contacts, each with bearing and range. The first position has null course/speed; subsequent positions derive these from position deltas.

### Complex: Ownship Manoeuvre with Dense Cuts

**Input**: `generate-track-from-active-cuts.complex.input.json`
**Output**: `generate-track-from-active-cuts.complex.output.json`

Description: Generates a 10-position track from 10 active contacts where the ownship performs a course change mid-track. The output includes `derived_avg_course` (182.7) and `derived_avg_speed` (7.96 kts).

### Edge Case: Passive Sensor (No Range Data)

**Input**: `generate-track-from-active-cuts.edge-1.input.json`
**Output**: `generate-track-from-active-cuts.edge-1.output.json`

Description: Rejects a passive towed array sensor without range data, returning an `invalid_input` error specifying that active cuts with `range_nm` are required.

### Edge Case: Temporal Gaps in Cuts

**Input**: `generate-track-from-active-cuts.edge-2.input.json`
**Output**: `generate-track-from-active-cuts.edge-2.output.json`

Description: Produces a 2-position track from active contacts with a 2-minute gap (missing the 10:01 contact). The output flags `has_temporal_gaps = true` and includes the gap interval details.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Generates track positions from active sensor bearing+range contacts
- Derives course and speed between successive positions
- Detects and reports temporal gaps in contact data
- Validates that contacts contain range data (rejects passive-only)

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [generate-tma-segment-from-cuts](./generate-tma-segment-from-cuts.1.0.md) - Generates TMA segments from passive bearing cuts (no range)
- [generate-tma-from-ownship](./generate-tma-from-ownship.1.0.md) - Generates TMA from ownship with range/bearing offset

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.GenerateTrackFromActiveCuts`
