---
name: generate-tuas-solution
version: 1.0
category: track/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.core.actions.GenerateTUASSolution
---

# Generate TUAS Solution

> Generate a Target Under Active Sonar (TUAS) solution track from ownship positions and passive sensor bearing contacts.

## MCP

**Description**: Generates a TUAS (Target Under Active Sonar) solution by computing a best-fit target track from passive sensor bearing observations and an initial range estimate. Produces a new track feature representing the estimated target course, speed, and trajectory over the observation period.

**When to use**: When the user has an ownship track with a passive towed-array sensor providing bearing-only contacts to a target, and wants to generate a target motion analysis (TMA) solution for the target. Requires an initial range estimate and an aimpoint time to seed the solution.

**Parameters**:
- `features`: FeatureCollection containing the ownship track (with `is_ownship=true`) and the passive sensor feature (with bearing contacts)
- `range_estimate_nm`: Initial range estimate in nautical miles from ownship to target at the aimpoint time
- `aimpoint_time`: ISO 8601 timestamp at which the range estimate applies; must fall within the sensor contact time range

**Returns**: ToolResponse containing a new GeoJSON Feature of kind `TUAS_SOLUTION` with estimated target positions, course, speed, range, bearing residuals, and RMS bearing error.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`, `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- Exactly one feature with `is_ownship == true` and `kind == "TRACK"` required
- At least one feature with `kind == "SENSOR"` whose `host_track_id` matches the ownship track ID
- Sensor must have at least 3 bearing contacts (minimum for solution convergence)
- Each sensor contact must have `time`, `bearing`, and `origin` properties
- `aimpoint_time` must fall within the sensor contact time range (inclusive)
- `range_estimate_nm` must be a positive number

**Defaults**:
- None; all parameters are required

## Outputs

Returns a **ToolResponse** with an addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/analysis/tuas_solution`

**Content Items**: One `AdditionResult` containing:
- `type`: "resource"
- `uri`: `feature://{solution-id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized GeoJSON Feature with kind `TUAS_SOLUTION`, including:
  - LineString geometry of estimated target positions
  - `estimated_course`, `estimated_speed`, `estimated_range_nm`
  - `aimpoint_position` (coordinates at aimpoint time)
  - `positions` array with time, coordinates, course, speed per fix
  - `bearing_residuals` array (observed minus predicted bearing per contact)
  - `rms_bearing_error` (root-mean-square of residuals in degrees)
  - `style` with dashed purple line (`#CC00FF`, dashArray `8,4`)

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/analysis/tuas_solution"`
- `debrief:sourceFeatures`: IDs of ownship track and sensor feature
- `debrief:label`: `"Generated TUAS solution (course={c}, speed={s} kts, range={r}nm, RMS error={e} deg)"` or with leg count for multi-leg ownship: `"Generated TUAS solution across {n} ownship legs (course=..., speed=..., range=..., RMS error=...)"`

## Algorithm

```pseudocode
FUNCTION generate_tuas_solution(features: FeatureCollection,
                                 range_estimate_nm: float,
                                 aimpoint_time: string) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    // Identify ownship track and sensor
    ownship = NULL
    sensor = NULL

    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK" AND feature.properties.is_ownship == true:
            ownship = feature
        END IF
        IF feature.properties.kind == "SENSOR":
            sensor = feature
        END IF
    END FOR

    IF ownship IS NULL:
        RETURN build_error("No ownship track found (is_ownship=true required)", "invalid_input", [])
    END IF

    IF sensor IS NULL:
        RETURN build_error("No sensor feature found", "invalid_input", [])
    END IF

    // Validate sensor contacts
    contacts = sensor.properties.contacts
    IF contacts IS EMPTY OR LENGTH(contacts) < 3:
        RETURN build_error(
            "Sensor has no bearing contacts; TUAS solution requires at least 3 bearings",
            "insufficient_data",
            [sensor.id]
        )
    END IF

    // Validate aimpoint time is within sensor data range
    first_time = contacts[0].time
    last_time = contacts[LENGTH(contacts) - 1].time

    IF aimpoint_time < first_time OR aimpoint_time > last_time:
        RETURN build_error(
            "Aimpoint time " + aimpoint_time + " is outside the sensor data time range (" + first_time + " - " + last_time + ")",
            "invalid_input",
            [ownship.id, sensor.id]
        )
    END IF

    source_ids = [ownship.id, sensor.id]

    // Detect ownship legs (segments of constant course)
    ownship_legs = detect_legs(ownship.properties.positions)

    // Find the aimpoint contact: the bearing observation closest to aimpoint_time
    aimpoint_contact = find_contact_at_time(contacts, aimpoint_time)

    // Compute initial target position at aimpoint_time
    // Project from aimpoint origin along bearing at range_estimate_nm
    aimpoint_position = project_position(
        aimpoint_contact.origin,
        aimpoint_contact.bearing,
        range_estimate_nm
    )

    // Solve for target course and speed using least-squares bearing fit
    // Iterate candidate (course, speed) combinations
    // For each candidate, project target positions at each contact time
    // Compute predicted bearings from ownship positions to projected target positions
    // Minimize sum of squared bearing residuals
    best_course = NULL
    best_speed = NULL
    best_residuals = NULL
    min_rms = INFINITY

    FOR course_candidate FROM 0 TO 359 STEP course_step:
        FOR speed_candidate FROM min_speed TO max_speed STEP speed_step:
            residuals = empty list

            FOR EACH contact IN contacts:
                // Time offset from aimpoint
                dt = time_difference_seconds(contact.time, aimpoint_time)

                // Projected target position at contact.time
                target_pos = advance_position(aimpoint_position, course_candidate, speed_candidate, dt)

                // Predicted bearing from contact.origin to target_pos
                predicted_bearing = compute_bearing(contact.origin, target_pos)

                // Residual = observed - predicted
                residual = normalize_angle(contact.bearing - predicted_bearing)
                residuals.append(residual)
            END FOR

            rms = sqrt(sum_of_squares(residuals) / LENGTH(residuals))

            IF rms < min_rms:
                min_rms = rms
                best_course = course_candidate
                best_speed = speed_candidate
                best_residuals = residuals
            END IF
        END FOR
    END FOR

    // Refine solution with finer grid or gradient descent around best candidate
    // (Implementation detail: may use Nelder-Mead, gradient descent, or fine-grid search)

    // Generate solution track positions
    solution_positions = empty list
    solution_coordinates = empty list

    FOR EACH contact IN contacts:
        dt = time_difference_seconds(contact.time, aimpoint_time)
        target_pos = advance_position(aimpoint_position, best_course, best_speed, dt)

        solution_positions.append({
            time: contact.time,
            coordinates: target_pos,
            course: best_course,
            speed: best_speed
        })
        solution_coordinates.append(target_pos)
    END FOR

    // Compute estimated range at aimpoint
    estimated_range = distance_nm(aimpoint_contact.origin, aimpoint_position)

    // Build TUAS solution feature
    solution_feature = {
        type: "Feature",
        id: generate_solution_id(),
        geometry: {type: "LineString", coordinates: solution_coordinates},
        properties: {
            kind: "TUAS_SOLUTION",
            platform_id: "TUAS-TARGET",
            platform_name: "TUAS Solution",
            host_track_id: ownship.id,
            sensor_id: sensor.id,
            start_time: contacts[0].time,
            end_time: contacts[LENGTH(contacts) - 1].time,
            aimpoint_time: aimpoint_time,
            estimated_course: ROUND(best_course, 1),
            estimated_speed: ROUND(best_speed, 1),
            estimated_range_nm: ROUND(estimated_range, 1),
            aimpoint_position: aimpoint_position,
            positions: solution_positions,
            bearing_residuals: best_residuals,
            rms_bearing_error: ROUND(min_rms, 3),
            style: {line: {stroke: true, color: "#CC00FF", weight: 2, opacity: 0.8, dashArray: "8,4"}}
        }
    }

    // Include ownship_legs_used if ownship executed manoeuvres
    IF LENGTH(ownship_legs) > 1:
        solution_feature.properties.ownship_legs_used = LENGTH(ownship_legs)
    END IF

    // Build label
    label = "Generated TUAS solution"
    IF LENGTH(ownship_legs) > 1:
        label = label + " across " + LENGTH(ownship_legs) + " ownship legs"
    END IF
    label = label + " (course=" + best_course + ", speed=" + best_speed + " kts, range=" + estimated_range + "nm, RMS error=" + min_rms + " deg)"

    content_items = build_addition(
        features: [solution_feature],
        result_subtype: "analysis/tuas_solution",
        source_feature_ids: source_ids,
        label: label
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION detect_legs(positions: list) -> list:
    // Group consecutive positions with the same course into legs
    legs = empty list
    current_leg = [positions[0]]

    FOR i FROM 1 TO LENGTH(positions) - 1:
        IF positions[i].course != positions[i - 1].course:
            legs.append(current_leg)
            current_leg = [positions[i]]
        ELSE:
            current_leg.append(positions[i])
        END IF
    END FOR

    legs.append(current_leg)
    RETURN legs
END FUNCTION

FUNCTION project_position(origin: coordinates, bearing_deg: float, range_nm: float) -> coordinates:
    // Convert bearing and range to lat/lon offset from origin
    // Uses great-circle projection (simplified for short distances)
    range_deg = range_nm / 60.0
    lat = origin[1] + range_deg * cos(radians(bearing_deg))
    lon = origin[0] + range_deg * sin(radians(bearing_deg)) / cos(radians(origin[1]))
    RETURN [ROUND(lon, 3), ROUND(lat, 3)]
END FUNCTION

FUNCTION advance_position(start: coordinates, course_deg: float, speed_kts: float, dt_seconds: float) -> coordinates:
    // Advance position along course at speed for dt seconds
    distance_nm = speed_kts * (dt_seconds / 3600.0)
    RETURN project_position(start, course_deg, distance_nm)
END FUNCTION

FUNCTION compute_bearing(from: coordinates, to: coordinates) -> float:
    // Compute bearing in degrees from 'from' to 'to'
    // Returns value in range [0, 360)
    dlat = to[1] - from[1]
    dlon = to[0] - from[0]
    bearing = degrees(atan2(dlon * cos(radians(from[1])), dlat))
    RETURN normalize_to_360(bearing)
END FUNCTION

FUNCTION normalize_angle(angle: float) -> float:
    // Normalize angle to range [-180, 180]
    WHILE angle > 180: angle = angle - 360
    WHILE angle < -180: angle = angle + 360
    RETURN angle
END FUNCTION
```

### Complexity

- **Time**: O(C * S * n) -- C course candidates, S speed candidates, n bearing contacts per evaluation; refinement adds a constant factor
- **Space**: O(n) -- stores positions and residuals for n contacts

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No ownship track (missing `is_ownship=true`) | Return error: `invalid_input`, "No ownship track found" |
| No sensor feature | Return error: `invalid_input`, "No sensor feature found" |
| Sensor with zero contacts | Return error: `insufficient_data`, "Sensor has no bearing contacts; TUAS solution requires at least 3 bearings" |
| Fewer than 3 bearing contacts | Return error: `insufficient_data`, "TUAS solution requires at least 3 bearings" |
| Aimpoint time outside sensor time range | Return error: `invalid_input`, "Aimpoint time {t} is outside the sensor data time range ({start} - {end})" |
| Ownship with course manoeuvre (multi-leg) | Solution includes `ownship_legs_used` count and label mentions legs |
| Very poor bearing fit (high RMS) | Still returns solution but with high `rms_bearing_error` value; caller may choose to reject |
| Single ownship leg (constant course) | Solution does not include `ownship_legs_used` property |

## Examples

### Basic Usage

**Input**: `generate-tuas-solution.basic.input.json`
**Output**: `generate-tuas-solution.basic.output.json`

Description: Generates a TUAS solution from 6 ownship positions and 6 passive bearing contacts with a range estimate of 5.0 nm and aimpoint at 10:02:00Z. Produces a target track on course 180.0 at 8.2 kts with RMS error 0.095 deg.

### Complex: Ownship with Manoeuvre

**Input**: `generate-tuas-solution.complex.input.json`
**Output**: `generate-tuas-solution.complex.output.json`

Description: Generates a TUAS solution using 15 positions where the ownship executes a course change (45 to 90 deg), resulting in 2 ownship legs. The multi-leg geometry improves bearing spread for the solution.

### Edge Case: Empty Sensor Contacts

**Input**: `generate-tuas-solution.edge-1.input.json`
**Output**: `generate-tuas-solution.edge-1.output.json`

Description: Sensor has no contacts. Returns an error with category `insufficient_data` indicating at least 3 bearings are required.

### Edge Case: Aimpoint Outside Time Range

**Input**: `generate-tuas-solution.edge-2.input.json`
**Output**: `generate-tuas-solution.edge-2.output.json`

Description: The aimpoint time (10:30:00Z) falls outside the sensor contact time range (10:00:00Z - 10:02:00Z). Returns an error with category `invalid_input`.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports bearing-only passive TMA via least-squares bearing fit
- Detects ownship legs for multi-leg solutions
- Produces TUAS_SOLUTION feature with bearing residuals and RMS error
- Styled with dashed purple line for display distinction

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [xy-plot-generator](./xy-plot-generator.1.0.md) - Can plot bearing residuals over time for solution quality assessment
- [show-time-variable-plot](./show-time-variable-plot.1.0.md) - Can visualize course/speed time series from the solution track

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition (ownship)
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition (bearing contacts)

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.core.actions.GenerateTUASSolution`

**External**:
- [Target Motion Analysis](https://en.wikipedia.org/wiki/Target_motion_analysis) - Background on bearing-only TMA techniques
