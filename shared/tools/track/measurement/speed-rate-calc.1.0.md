---
name: speed-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.speedRateCalc
---

# Speed Rate Calculator

> Calculates the rate of change of speed (acceleration/deceleration) for a single track in knots per second.

## MCP

**Description**: Computes the speed or rate of change of speed for a track. In single-point mode, returns the track's speed in knots at the requested time. In multi-point mode, computes finite-difference speed rates between consecutive positions, yielding acceleration in knots per second. Implements the `DeltaRateToteCalculation` pattern from legacy Debrief.

**When to use**: When the user needs to analyze a vessel's acceleration behavior, detect speed changes indicative of maneuvers (sprint-and-drift, slowing to deploy equipment, acceleration to flank speed), or compute acceleration for engagement analysis.

**Parameters**:
- `features`: FeatureCollection containing one track feature
- `time`: ISO 8601 timestamp (used as reference; multi-point mode uses all positions)

**Returns**: ToolResponse containing a measurement Feature with either a single speed value (single-point) or an array of speed rate values (multi-point).

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one track feature required
- Feature must have `properties.kind == "TRACK"`
- Each position must include `speed` (knots, >= 0) and `time` (ISO 8601)
- For rate computation: at least 2 positions with distinct timestamps required

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/measurement/speed_rate`

**Content Items**: One measurement Feature containing:
- `type`: `"resource"`
- `uri`: `feature://{measurement_id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized GeoJSON Feature with measurement properties

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/measurement/speed_rate"`
- `debrief:sourceFeatures`: `["track-id"]`
- `debrief:label`: `"Speed at T: {value} kts"` or `"Speed rate: mean {rate} kts/sec over N positions"`

### Measurement Feature Properties (Single-Point Mode)

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"speed_rate"` |
| `value` | number | Speed in knots |
| `units` | string | `"knots"` |
| `mode` | string | `"single_point"` |
| `time` | string | ISO 8601 timestamp |
| `source_tracks` | array | IDs of source track features |

### Measurement Feature Properties (Multi-Point Mode)

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"speed_rate"` |
| `mode` | string | `"multi_point"` |
| `rates` | array | Array of rate objects (see below) |
| `mean_rate` | number | Mean of all computed rates |
| `units` | string | `"kts/sec"` |
| `time` | string | ISO 8601 reference timestamp |
| `source_tracks` | array | IDs of source track features |

### Rate Object Structure

| Property | Type | Description |
|----------|------|-------------|
| `time_start` | string | Start of interval |
| `time_end` | string | End of interval |
| `speed_start` | number | Speed at start (knots) |
| `speed_end` | number | Speed at end (knots) |
| `rate` | number | (speed_end - speed_start) / dt in kts/sec |
| `units` | string | Always `"kts/sec"` |

## Algorithm

### Overview

The algorithm operates in two modes identical to `course-rate-calc` but operating on speed instead of course. Single-point mode reads speed at the requested time. Multi-point mode applies the `DeltaRateToteCalculation` pattern: finite differences of consecutive speed/time pairs yield instantaneous acceleration values.

### Pseudocode

```pseudocode
FUNCTION speed_rate_calc(input: FeatureCollection, params: SpeedRateParams) -> ToolResponse:
    // Validate inputs
    IF input IS NULL OR input.features IS EMPTY:
        RETURN build_error("Input requires at least one track feature", "invalid_input", [])
    END IF

    track = input.features[0]
    time = params.time

    IF track.properties.kind != "TRACK":
        RETURN build_error("Feature must be a track feature", "invalid_input", [track.id])
    END IF

    positions = track.properties.positions

    IF positions IS EMPTY:
        RETURN build_error("Track has no positions", "invalid_input", [track.id])
    END IF

    // SINGLE-POINT MODE: Track has only one position
    IF LENGTH(positions) == 1:
        pos = positions[0]
        speed = pos.speed  // knots

        measurement = build_measurement_feature(
            id: generate_id("measurement-speed-rate"),
            geometry: Point(pos.coordinates),
            measurement_type: "speed_rate",
            value: speed,
            units: "knots",
            mode: "single_point",
            time: time,
            source_tracks: [track.id]
        )

        content_items = build_artifact(
            data: measurement,
            mime: "application/geo+json",
            result_subtype: "measurement/speed_rate",
            source_feature_ids: [track.id],
            label: "Speed at " + format_time(time) + ": " + ROUND(speed, 1) + " kts (single point, no rate)"
        )

        RETURN build_response(content_items)
    END IF

    // MULTI-POINT MODE: Compute finite differences
    // Step 1: Collect speed measurements at each position
    measures = empty list   // speed values in knots
    times = empty list      // timestamps as epoch seconds

    FOR EACH pos IN positions:
        measures.append(pos.speed)
        times.append(to_epoch_seconds(pos.time))
    END FOR

    // Step 2: Calculate rates using DeltaRateToteCalculation pattern
    rates = calculate_rate(measures, times, positions)

    // Step 3: Compute mean rate
    IF LENGTH(rates) > 0:
        mean_rate = SUM(r.rate FOR r IN rates) / LENGTH(rates)
    ELSE:
        mean_rate = 0.0
    END IF

    // Build measurement feature
    measurement = build_measurement_feature(
        id: generate_id("measurement-speed-rate"),
        geometry: Point(positions[0].coordinates),
        measurement_type: "speed_rate",
        mode: "multi_point",
        rates: rates,
        mean_rate: mean_rate,
        units: "kts/sec",
        time: time,
        source_tracks: [track.id]
    )

    content_items = build_artifact(
        data: measurement,
        mime: "application/geo+json",
        result_subtype: "measurement/speed_rate",
        source_feature_ids: [track.id],
        label: "Speed rate: mean " + ROUND(mean_rate, 4) + " kts/sec over " + LENGTH(positions) + " positions"
    )

    RETURN build_response(content_items)
END FUNCTION

// DeltaRateToteCalculation pattern - shared with course-rate-calc
FUNCTION calculate_rate(measures: list[number], times: list[number], positions: list) -> list[RateObject]:
    rates = empty list

    FOR i FROM 0 TO LENGTH(measures) - 2:
        dt = times[i+1] - times[i]  // time difference in seconds

        IF dt == 0:
            CONTINUE  // skip duplicate timestamps
        END IF

        delta = measures[i+1] - measures[i]
        rate = delta / dt  // kts/sec

        rates.append({
            time_start: positions[i].time,
            time_end: positions[i+1].time,
            speed_start: measures[i],
            speed_end: measures[i+1],
            rate: rate,
            units: "kts/sec"
        })
    END FOR

    RETURN rates
END FUNCTION
```

### Shared Pattern: DeltaRateToteCalculation

The `calculate_rate` function is identical in structure to the one used by `course-rate-calc`. In the legacy codebase, both tools inherit from `DeltaRateToteCalculation` and share the `DeltaRateToteCalcImplementation.calculateRate()` method. The only difference is the measure extracted from each position:

| Tool | Measure | Units |
|------|---------|-------|
| `course-rate-calc` | `position.course` | degrees -> deg/sec |
| `speed-rate-calc` | `position.speed` | knots -> kts/sec |

### Complexity

- **Time**: O(n) where n is the number of positions in the track
- **Space**: O(n) for storing n-1 rate values

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input requires at least one track feature" |
| Non-track feature | Return error: `invalid_input`, "Feature must be a track feature" |
| Track with no positions | Return error: `invalid_input`, "Track has no positions" |
| Single position only | Single-point mode: return speed value, no rate |
| Two positions same timestamp | Skip the duplicate; if no valid intervals remain, return single-point |
| Constant speed (no acceleration) | All rates = 0.0 kts/sec |
| Zero speed throughout | All rates = 0.0 kts/sec, speed = 0.0 kts |
| Negative rate (deceleration) | Report negative rate values (valid deceleration) |
| Very high acceleration | Report computed value; no clamping |
| Missing speed property on position | Return error: `invalid_input`, "Position missing speed property" |
| Speed value is negative | Return error: `invalid_input`, "Speed cannot be negative" |

## Examples

### Basic Usage (Single Point)

**Input**: `speed-rate-calc.basic.input.json`
**Output**: `speed-rate-calc.basic.output.json`

Description: Single-position ownship track at T10:30 with speed 12.0 knots. Returns the speed value directly with no rate computation.

### Edge Case: Stationary Track

**Input**: `speed-rate-calc.edge.input.json`
**Output**: `speed-rate-calc.edge.output.json`

Description: Stationary buoy with zero speed at all three positions. Multi-point mode computes rates of 0.0 kts/sec for all intervals, confirming no acceleration.

### Complex: Constant Acceleration Over 3 Positions

**Input**: `speed-rate-calc.complex.input.json`
**Output**: `speed-rate-calc.complex.output.json`

Description: Track "HMS Sprinter" accelerating from 10 to 15 to 20 knots at 5-minute intervals (T10:30, T10:35, T10:40). Both intervals yield 0.0167 kts/sec (approximately 1 knot per minute), indicating steady acceleration.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements DeltaRateToteCalculation pattern for finite differences
- Supports single-point (speed only) and multi-point (rate computation) modes

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [course-rate-calc](./course-rate-calc.1.0.md) - Rate of change of course (same DeltaRate pattern)
- [bearing-rate-calc](./bearing-rate-calc.1.0.md) - Rate of change of bearing (analytical method)

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.speedRateCalc` (implements `DeltaRateToteCalculation`)
- Pattern: `Debrief.Tools.Tote.Calculations.DeltaRateToteCalcImplementation.calculateRate()`
