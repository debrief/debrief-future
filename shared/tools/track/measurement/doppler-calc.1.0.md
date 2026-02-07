---
name: doppler-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.dopplerCalc
---

# Doppler Calc

> Calculate the Doppler frequency shift between two tracks at the current time.

## MCP

**Description**: Calculates the predicted Doppler frequency shift observed by the primary track (receiver) due to the motion of the secondary track (source). Uses the standard acoustic Doppler formula with configurable base frequency and speed of sound.

**When to use**: When the user needs to predict the Doppler-shifted frequency that would be observed between two moving vessels. Used in sonar analysis and frequency matching.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (primary = receiver, secondary = source)
- `time`: ISO 8601 timestamp at which to evaluate
- `fNought`: Base (transmitted) frequency in Hz (default: `150.0`)
- `speedOfSound`: Speed of sound in water in knots (default: `3032.0`)

**Returns**: A scalar measurement of the predicted received frequency in Hz.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "track"`
- Both tracks must have positions with `speed` and `course` at the specified time
- `fNought` must be positive
- `speedOfSound` must be positive

**Defaults**:
- `fNought`: `150.0` Hz
- `speedOfSound`: `3032.0` knots (approximately 1560 m/s in seawater)

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/doppler`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-doppler-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with predicted frequency

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/doppler"`
- `debrief:sourceFeatures`: `["track-001", "track-002"]`
- `debrief:label`: `"Calculated Doppler frequency: {value} Hz"`

## Algorithm

```pseudocode
FUNCTION doppler_calc(input: FeatureCollection, time: Timestamp,
                      fNought: float, speedOfSound: float) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF LENGTH(input.features) < 2:
        RETURN build_error("Two track features required for Doppler calculation", "invalid_input", [])
    END IF

    primary = input.features[0]    // receiver (ownship)
    secondary = input.features[1]  // source (target)

    // Get positions at the specified time
    rx_pos = get_position_at_time(primary, time)
    tx_pos = get_position_at_time(secondary, time)

    IF rx_pos IS NULL OR tx_pos IS NULL:
        RETURN build_error("No position available at specified time", "invalid_input", [])
    END IF

    // Extract speed and course
    rx_speed = rx_pos.speed   // knots
    rx_course = TO_RADIANS(rx_pos.course)  // convert degrees to radians
    tx_speed = tx_pos.speed   // knots
    tx_course = TO_RADIANS(tx_pos.course)  // convert degrees to radians

    // Calculate bearing from receiver to source
    bearing = calculate_initial_bearing(rx_pos.coordinates, tx_pos.coordinates)

    // Calculate predicted frequency using Doppler formula
    // Legacy: FrequencyCalcs.getPredictedFreq(fNought, C, rxSpeed, rxCourse, txSpeed, txCourse, bearing)
    predicted_freq = get_predicted_freq(fNought, speedOfSound,
                                         rx_speed, rx_course,
                                         tx_speed, tx_course, bearing)

    // Build artifact response
    content_items = build_artifact(
        data: {
            measurement_type: "doppler",
            value: ROUND(predicted_freq, 2),
            units: "Hz",
            time: time,
            primary_track: primary.id,
            secondary_track: secondary.id,
            fNought: fNought,
            speedOfSound: speedOfSound,
            bearing: TO_DEGREES(bearing),
            primary_position: rx_pos.coordinates,
            secondary_position: tx_pos.coordinates
        },
        mime: "application/geo+json",
        result_subtype: "measurement/doppler",
        source_feature_ids: [primary.id, secondary.id],
        label: "Calculated Doppler frequency: " + ROUND(predicted_freq, 2) + " Hz"
    )

    RETURN build_response(content_items)
END FUNCTION

FUNCTION get_predicted_freq(fNought: float, C: float,
                            rxSpeed: float, rxCourse: float,
                            txSpeed: float, txCourse: float,
                            bearing: float) -> float:
    // Doppler frequency prediction
    // bearing = bearing from receiver to source (radians)
    // C = speed of sound in knots

    // Component of receiver velocity toward source (along bearing line)
    v_rx = rxSpeed * COS(bearing - rxCourse)

    // Reciprocal bearing (source to receiver)
    reciprocal = bearing + PI
    IF reciprocal > 2 * PI:
        reciprocal = reciprocal - 2 * PI
    END IF

    // Component of source velocity toward receiver
    v_tx = txSpeed * COS(reciprocal - txCourse)

    // Standard Doppler formula:
    // f_received = f_0 * (C + v_receiver_toward) / (C - v_source_toward)
    predicted = fNought * (C + v_rx) / (C - v_tx)

    RETURN predicted
END FUNCTION
```

### Complexity

- **Time**: O(1) -- single Doppler calculation
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required for Doppler calculation" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Speed or course is null | Return error: `invalid_input`, "Speed and course data required for Doppler calculation" |
| Both tracks stationary (speed = 0) | Return fNought (no Doppler shift) |
| fNought is zero or negative | Return error: `invalid_input`, "Base frequency must be positive" |
| speedOfSound is zero or negative | Return error: `invalid_input`, "Speed of sound must be positive" |
| Source speed approaches speed of sound | Formula still valid but result may be extreme |

## Examples

### Basic Example

**Input**: `doppler-calc.basic.input.json`
**Output**: `doppler-calc.basic.output.json`

Description: Calculates Doppler shift between OWNSHIP (12 kts, course 045) and TARGET (8 kts, course 180) at bearing 32.8 degrees. With fNought=150 Hz and C=3032 kts, returns approximately 150.92 Hz (slight upshift due to closing geometry).

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Uses standard acoustic Doppler formula
- Default constants: fNought=150 Hz, C=3032 kts

## References

**Related Tools**:
- [bearing-calc](./bearing-calc.1.0.md) -- bearing used internally by Doppler
- [range-calc](./range-calc.1.0.md) -- range between tracks
- [speed-calc](./speed-calc.1.0.md) -- speed of individual track

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.dopplerCalc`
- Debrief 3.x: `MWC.Algorithms.FrequencyCalcs.getPredictedFreq`
