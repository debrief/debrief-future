---
name: speed-rate-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.speedRateRateCalc
---

# Speed Rate Rate Calc

> Computes the second derivative of speed over time (speed jerk, in kn/s^2).

## MCP

**Description**: Calculates the second derivative of speed (speed "jerk") for a track. First computes the rate of change of speed between consecutive positions, then applies finite differences to obtain the rate of change of that rate.

**When to use**: When the user needs to analyze acceleration stability, detect sudden propulsion changes, quantify the smoothness of speed transitions, or identify abrupt throttle maneuvers in a vessel track.

**Parameters**:
- `features`: FeatureCollection containing exactly one track with 4+ positions that include speed values

**Returns**: ToolResponse containing a measurement feature with time-stamped speed rate rate values in kn/s^2.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one feature with `properties.kind == "TRACK"` required
- Track must have at least 4 positions (minimum to produce 2 rate-rate values)
- Each position must have `time` (ISO 8601) and `speed` (knots, >= 0) values
- Positions must be sorted in ascending time order
- Consecutive positions must have distinct timestamps (no zero-duration intervals)

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with a single addition content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#AdditionResult`

**Result Type**: `addition/measurement/speed_rate_rate`

**Content Items**: One `AdditionResult` containing a MEASUREMENT feature:
- `type`: "resource"
- `uri`: `feature://measurement-speed-rate-rate-{track_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized Feature with measurement values

**Feature properties**:
- `kind`: "MEASUREMENT"
- `measurement_type`: "speed_rate_rate"
- `source_track_id`: ID of the input track
- `unit`: "kn/s^2"
- `values`: Array of `{time, value}` pairs

**Annotations** (on each content item):
- `debrief:resultType`: `"addition/measurement/speed_rate_rate"`
- `debrief:sourceFeatures`: `["{track_id}"]`
- `debrief:label`: `"Speed rate rate for {platform_name} ({n} values computed)"`

## Algorithm

```pseudocode
FUNCTION speed_rate_rate_calc(features: FeatureCollection) -> ToolResponse:
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

    // Step 1: Compute speed deltas and time deltas between consecutive positions
    n = LENGTH(positions)
    speed_deltas = empty list    // length n-1
    time_deltas = empty list     // length n-1

    FOR i = 0 TO n - 2:
        delta_speed = positions[i + 1].speed - positions[i].speed
        dt = time_difference_seconds(positions[i].time, positions[i + 1].time)

        IF dt == 0:
            RETURN build_error(
                "Zero time interval between positions " + i + " and " + (i + 1),
                "invalid_input", [track.id]
            )
        END IF

        speed_deltas.append(delta_speed)
        time_deltas.append(dt)
    END FOR

    // Step 2: Compute speed rate (first derivative, kn/s)
    speed_rates = empty list     // length n-1
    FOR i = 0 TO LENGTH(speed_deltas) - 1:
        rate = speed_deltas[i] / time_deltas[i]
        speed_rates.append(rate)
    END FOR

    // Step 3: Compute speed rate rate (second derivative, kn/s^2)
    // rate_rate[i] = (speed_rates[i+1] - speed_rates[i]) / time_deltas[i]
    rate_rate_values = empty list  // length n-2
    FOR i = 0 TO LENGTH(speed_rates) - 2:
        delta_rate = speed_rates[i + 1] - speed_rates[i]
        rate_rate = delta_rate / time_deltas[i]
        rate_rate_values.append({
            time: positions[i + 1].time,
            value: ROUND(rate_rate, 6)
        })
    END FOR

    // Build measurement feature
    measurement_feature = {
        type: "Feature",
        id: "measurement-speed-rate-rate-" + track.id,
        geometry: NULL,
        properties: {
            kind: "MEASUREMENT",
            measurement_type: "speed_rate_rate",
            source_track_id: track.id,
            unit: "kn/s^2",
            values: rate_rate_values
        }
    }

    // Build addition response
    content_items = build_addition(
        features: [measurement_feature],
        result_subtype: "measurement/speed_rate_rate",
        source_feature_ids: [track.id],
        label: "Speed rate rate for " + track.properties.platform_name
               + " (" + LENGTH(rate_rate_values) + " values computed)"
    )

    RETURN build_response(content_items)
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
| Constant speed (no change) | All rate-rate values are 0.0 |
| Minimum 4 positions | Produces exactly 2 rate-rate values |
| Non-uniform time intervals | Each rate-rate uses its corresponding time delta; no assumption of uniform spacing |
| Zero time interval between positions | Return error: `invalid_input`, "Zero time interval between positions" |
| Null speed value on a position | Return error: `invalid_input`, "Position missing speed value" |
| Negative speed values | Process as-is; speed can represent signed velocity in some contexts |
| Acceleration then deceleration pattern | Produces sign change in rate-rate values at the inflection point |
| Single track among mixed features | Process the track, ignore non-track features |

## Examples

### Basic Usage

**Input**: `speed-rate-rate-calc.basic.input.json`
**Output**: `speed-rate-rate-calc.basic.output.json`

Description: 5 positions at uniform 5-minute intervals with speeds 10, 12, 15, 14, 16 knots. Produces 3 rate-rate values showing varying acceleration jerk.

### Edge Case 1: Constant Speed

**Input**: `speed-rate-rate-calc.edge-1.input.json`
**Output**: `speed-rate-rate-calc.edge-1.output.json`

Description: 5 positions with constant speed of 8 knots. All rate-rate values are 0.0.

### Edge Case 2: Minimum Positions

**Input**: `speed-rate-rate-calc.edge-2.input.json`
**Output**: `speed-rate-rate-calc.edge-2.output.json`

Description: Exactly 4 positions (minimum viable input) with increasing speed. Produces 2 rate-rate values.

### Complex: Acceleration-Deceleration Cycle

**Input**: `speed-rate-rate-calc.complex.input.json`
**Output**: `speed-rate-rate-calc.complex.output.json`

Description: 7 positions showing acceleration (6 to 18 kn), sudden deceleration (18 to 10 kn), and continued deceleration (10 to 8 kn). Produces 5 rate-rate values with sign changes at inflection points.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements second derivative of speed via finite differences
- No angular wrapping needed (unlike course variant)
- Extends speedRateCalc parent class pattern

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_addition()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [course-delta-rate-rate-calc](./course-delta-rate-rate-calc.1.0.md) - Second derivative of course (analogous computation)

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.speedRateRateCalc`
- Parent class: `Debrief.Tools.Tote.Calculations.speedRateCalc`
- Utility: `calculateDeltaRateRate` finite differences method
