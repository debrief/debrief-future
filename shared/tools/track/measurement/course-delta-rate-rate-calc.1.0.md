---
name: course-delta-rate-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.courseDeltaRateRateCalc
---

# Course Delta Rate Rate Calc

> Computes the second derivative of course change over time (course jerk, in deg/s^2).

## MCP

**Description**: Calculates the second derivative of course change (course "jerk") for a track. First computes the average course rate of change between consecutive positions, then applies finite differences to obtain the rate of change of that rate.

**When to use**: When the user needs to analyze course stability, detect erratic steering, quantify maneuvering intensity, or identify transitions between steady-state and active course changes in a vessel track.

**Parameters**:
- `features`: FeatureCollection containing exactly one track with 4+ positions that include course values

**Returns**: ToolResponse containing a measurement feature with time-stamped course delta rate rate values in deg/s^2.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TRACK"` required
- Track must have at least 4 positions (minimum to produce 2 rate-rate values)
- Each position must have `time` (ISO 8601) and `course` (degrees, 0-360) values
- Positions must be sorted in ascending time order
- Consecutive positions must have distinct timestamps (no zero-duration intervals)

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/measurement/course_delta_rate_rate`

**Content Items**: One `AdditionResult` containing a MEASUREMENT feature:
- `type`: "resource"
- `uri`: `feature://measurement-course-delta-rate-rate-{track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized Feature with measurement values

**Feature properties**:
- `kind`: "MEASUREMENT"
- `measurement_type`: "course_delta_rate_rate"
- `source_track_id`: ID of the input track
- `unit`: "deg/s^2"
- `values`: Array of `{time, value}` pairs

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/measurement/course_delta_rate_rate"`
- `debrief:sourceFeatures`: `["{track_id}"]`
- `debrief:label`: `"Course delta rate rate for {platform_name} ({n} values computed)"`

## Algorithm

```pseudocode
FUNCTION course_delta_rate_rate_calc(features: FeatureCollection) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
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

    IF positions IS NULL OR LENGTH(positions) < 4:
        RETURN build_error(
            "Track must have at least 4 positions for rate-rate calculation",
            "invalid_input", [track.id]
        )
    END IF

    // Step 1: Compute course deltas between consecutive positions
    n = LENGTH(positions)
    course_deltas = empty list    // length n-1
    time_deltas = empty list      // length n-1

    FOR i = 0 TO n - 2:
        raw_delta = positions[i + 1].course - positions[i].course

        // Normalize to shortest angular path (-180, +180]
        delta = normalize_angle(raw_delta)

        dt = time_difference_seconds(positions[i].time, positions[i + 1].time)

        IF dt == 0:
            RETURN build_error(
                "Zero time interval between positions " + i + " and " + (i + 1),
                "invalid_input", [track.id]
            )
        END IF

        course_deltas.append(delta)
        time_deltas.append(dt)
    END FOR

    // Step 2: Compute course rate (first derivative, deg/s)
    course_rates = empty list     // length n-1
    FOR i = 0 TO LENGTH(course_deltas) - 1:
        rate = course_deltas[i] / time_deltas[i]
        course_rates.append(rate)
    END FOR

    // Step 3: Compute course rate rate (second derivative, deg/s^2)
    // rate_rate[i] = (course_rates[i+1] - course_rates[i]) / time_deltas[i]
    rate_rate_values = empty list  // length n-2
    FOR i = 0 TO LENGTH(course_rates) - 2:
        delta_rate = course_rates[i + 1] - course_rates[i]
        rate_rate = delta_rate / time_deltas[i]
        rate_rate_values.append({
            time: positions[i + 1].time,
            value: ROUND(rate_rate, 6)
        })
    END FOR

    // Build measurement feature
    measurement_feature = {
        type: "Feature",
        id: "measurement-course-delta-rate-rate-" + track.id,
        geometry: NULL,
        properties: {
            kind: "MEASUREMENT",
            measurement_type: "course_delta_rate_rate",
            source_track_id: track.id,
            unit: "deg/s^2",
            values: rate_rate_values
        }
    }

    // Build addition response
    content_items = build_addition(
        features: [measurement_feature],
        result_subtype: "measurement/course_delta_rate_rate",
        source_feature_ids: [track.id],
        label: "Course delta rate rate for " + track.properties.platform_name
               + " (" + LENGTH(rate_rate_values) + " values computed)"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION normalize_angle(degrees: number) -> number:
    // Normalize angle to range (-180, +180]
    result = degrees MOD 360
    IF result > 180:
        result = result - 360
    ELSE IF result <= -180:
        result = result + 360
    END IF
    RETURN result
END FUNCTION
```

### Complexity

- **Time**: O(n) -- three sequential linear passes over n positions
- **Space**: O(n) -- stores intermediate arrays of deltas, rates, and rate-rate values

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input features required" |
| No track features in input | Return error: `invalid_input`, "No track feature found in input" |
| Track with fewer than 4 positions | Return error: `invalid_input`, "Track must have at least 4 positions" |
| Constant course (no change) | All rate-rate values are 0.0 |
| Course wrapping through 360/0 boundary | Use shortest angular path via normalize_angle (e.g., 350 to 10 = +20, not -340) |
| Minimum 4 positions | Produces exactly 2 rate-rate values |
| Non-uniform time intervals | Each rate-rate uses its corresponding time delta; no assumption of uniform spacing |
| Zero time interval between positions | Return error: `invalid_input`, "Zero time interval between positions" |
| Null course value on a position | Return error: `invalid_input`, "Position missing course value" |
| Single track among mixed features | Process the track, ignore non-track features |

## Examples

### Basic Usage

**Input**: `course-delta-rate-rate-calc.basic.input.json`
**Output**: `course-delta-rate-rate-calc.basic.output.json`

Description: 5 positions at uniform 5-minute intervals with courses 90, 95, 105, 110, 112 degrees. Produces 3 rate-rate values showing initial acceleration, deceleration, and continued deceleration of course change.

### Edge Case 1: Constant Course

**Input**: `course-delta-rate-rate-calc.edge-1.input.json`
**Output**: `course-delta-rate-rate-calc.edge-1.output.json`

Description: 5 positions with identical course of 180 degrees. All rate-rate values are 0.0.

### Edge Case 2: Minimum Positions

**Input**: `course-delta-rate-rate-calc.edge-2.input.json`
**Output**: `course-delta-rate-rate-calc.edge-2.output.json`

Description: Exactly 4 positions (minimum viable input). Produces 2 rate-rate values.

### Complex: Course Wrapping with Non-uniform Intervals

**Input**: `course-delta-rate-rate-calc.complex.input.json`
**Output**: `course-delta-rate-rate-calc.complex.output.json`

Description: 6 positions with course crossing the 360/0 boundary (350 -> 5 -> 20 -> 355 -> 340 -> 330) at uniform 5-minute intervals. Tests angular wrapping in both directions. Produces 4 rate-rate values.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements second derivative of course change via finite differences
- Handles angular wrapping through 360/0 boundary
- Extends courseDeltaAverageCalc parent class pattern

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [speed-rate-rate-calc](./speed-rate-rate-calc.1.0.md) - Second derivative of speed (analogous computation)

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.courseDeltaRateRateCalc`
- Parent class: `Debrief.Tools.Tote.Calculations.courseDeltaAverageCalc`
- Utility: `calculateDeltaRateRate` finite differences method
