---
name: course-rate-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: Debrief.Tools.Tote.Calculations.courseRateCalc
---

# Course Rate Calculator

> Calculates the rate of change of course (turn rate) for a single track in degrees per second.

## MCP

**Description**: Computes the course (heading) or rate of change of course for a track. In single-point mode, returns the track's course in degrees at the requested time. In multi-point mode, computes finite-difference course rates between consecutive positions, yielding turn rate in degrees per second. Implements the `DeltaRateToteCalculation` pattern from legacy Debrief.

**When to use**: When the user needs to analyze a vessel's turning behavior, detect course maneuvers, or compute turn rate for engagement analysis. Useful for identifying zig-zag patterns, steady turns, or course changes that indicate evasive action.

**Parameters**:
- `features`: FeatureCollection containing one track feature
- `time`: ISO 8601 timestamp (used as reference; multi-point mode uses all positions)

**Returns**: ToolResponse containing a measurement Feature with either a single course value (single-point) or an array of course rate values (multi-point).

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly one track feature required
- Feature must have `properties.kind == "TRACK"`
- Each position must include `course` (degrees, 0-360) and `time` (ISO 8601)
- For rate computation: at least 2 positions with distinct timestamps required

**Defaults**:
- None (all parameters required)

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/measurement/course_rate`

**Content Items**: One measurement Feature containing:
- `type`: `"resource"`
- `uri`: `feature://{measurement_id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized GeoJSON Feature with measurement properties

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/measurement/course_rate"`
- `debrief:sourceFeatures`: `["track-id"]`
- `debrief:label`: `"Course at T: {value} deg"` or `"Course rate: mean {rate} deg/sec over N positions"`

### Measurement Feature Properties (Single-Point Mode)

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"course_rate"` |
| `value` | number | Course in degrees (0-360) |
| `units` | string | `"degrees"` |
| `mode` | string | `"single_point"` |
| `time` | string | ISO 8601 timestamp |
| `source_tracks` | array | IDs of source track features |

### Measurement Feature Properties (Multi-Point Mode)

| Property | Type | Description |
|----------|------|-------------|
| `kind` | string | Always `"MEASUREMENT"` |
| `measurement_type` | string | Always `"course_rate"` |
| `mode` | string | `"multi_point"` |
| `rates` | array | Array of rate objects (see below) |
| `mean_rate` | number | Mean of all computed rates |
| `units` | string | `"deg/sec"` |
| `time` | string | ISO 8601 reference timestamp |
| `source_tracks` | array | IDs of source track features |

### Rate Object Structure

| Property | Type | Description |
|----------|------|-------------|
| `time_start` | string | Start of interval |
| `time_end` | string | End of interval |
| `course_start` | number | Course at start (degrees) |
| `course_end` | number | Course at end (degrees) |
| `rate` | number | (course_end - course_start) / dt in deg/sec |
| `units` | string | Always `"deg/sec"` |

## Algorithm

### Overview

The algorithm operates in two modes. Single-point mode simply reads and normalizes the course at the requested time. Multi-point mode collects course values at all track positions, then applies the `DeltaRateToteCalculation` pattern: computing finite differences of consecutive course/time pairs to yield instantaneous turn rates.

### Pseudocode

```pseudocode
FUNCTION course_rate_calc(input: FeatureCollection, params: CourseRateParams) -> ToolResponse:
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
        course_deg = normalize_course(RADIANS_TO_DEGREES(pos.course))
        // Normalize to 0-360
        WHILE course_deg < 0:
            course_deg = course_deg + 360
        END WHILE
        WHILE course_deg >= 360:
            course_deg = course_deg - 360
        END WHILE

        measurement = build_measurement_feature(
            id: generate_id("measurement-course-rate"),
            geometry: Point(pos.coordinates),
            measurement_type: "course_rate",
            value: course_deg,
            units: "degrees",
            mode: "single_point",
            time: time,
            source_tracks: [track.id]
        )

        content_items = build_artifact(
            data: measurement,
            mime: "application/geo+json",
            result_subtype: "measurement/course_rate",
            source_feature_ids: [track.id],
            label: "Course at " + format_time(time) + ": " + ROUND(course_deg, 1) + " deg (single point, no rate)"
        )

        RETURN build_response(content_items)
    END IF

    // MULTI-POINT MODE: Compute finite differences
    // Step 1: Collect course measurements at each position
    measures = empty list   // course values in degrees
    times = empty list      // timestamps as epoch seconds

    FOR EACH pos IN positions:
        course_deg = pos.course
        // Normalize to 0-360
        WHILE course_deg < 0:
            course_deg = course_deg + 360
        END WHILE
        WHILE course_deg >= 360:
            course_deg = course_deg - 360
        END WHILE

        measures.append(course_deg)
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
        id: generate_id("measurement-course-rate"),
        geometry: Point(positions[0].coordinates),
        measurement_type: "course_rate",
        mode: "multi_point",
        rates: rates,
        mean_rate: mean_rate,
        units: "deg/sec",
        time: time,
        source_tracks: [track.id]
    )

    content_items = build_artifact(
        data: measurement,
        mime: "application/geo+json",
        result_subtype: "measurement/course_rate",
        source_feature_ids: [track.id],
        label: "Course rate: mean " + ROUND(mean_rate, 4) + " deg/sec over " + LENGTH(positions) + " positions"
    )

    RETURN build_response(content_items)
END FUNCTION

// DeltaRateToteCalculation pattern - shared with speed-rate-calc
FUNCTION calculate_rate(measures: list[number], times: list[number], positions: list) -> list[RateObject]:
    rates = empty list

    FOR i FROM 0 TO LENGTH(measures) - 2:
        dt = times[i+1] - times[i]  // time difference in seconds

        IF dt == 0:
            CONTINUE  // skip duplicate timestamps
        END IF

        delta = measures[i+1] - measures[i]
        rate = delta / dt  // deg/sec (or kts/sec for speed)

        rates.append({
            time_start: positions[i].time,
            time_end: positions[i+1].time,
            course_start: measures[i],
            course_end: measures[i+1],
            rate: rate,
            units: "deg/sec"
        })
    END FOR

    RETURN rates
END FUNCTION
```

### Complexity

- **Time**: O(n) where n is the number of positions in the track
- **Space**: O(n) for storing n-1 rate values

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty feature collection | Return error: `invalid_input`, "Input requires at least one track feature" |
| Non-track feature | Return error: `invalid_input`, "Feature must be a track feature" |
| Track with no positions | Return error: `invalid_input`, "Track has no positions" |
| Single position only | Single-point mode: return course value, no rate |
| Two positions same timestamp | Skip the duplicate; if no valid intervals remain, return single-point |
| Course wrapping 359 -> 1 | Finite difference yields small positive delta (not -358) - requires unwrapping |
| Course wrapping 1 -> 359 | Finite difference yields small negative delta (not +358) - requires unwrapping |
| Constant course (no turn) | All rates = 0.0 deg/sec |
| Very high turn rate (>10 deg/sec) | Report computed value; no clamping |
| Missing course property on position | Return error: `invalid_input`, "Position missing course property" |

## Examples

### Basic Usage (Single Point)

**Input**: `course-rate-calc.basic.input.json`
**Output**: `course-rate-calc.basic.output.json`

Description: Single-position ownship track at T10:30 with course 045 degrees. Returns the course value directly with no rate computation.

### Edge Case: Empty Input

**Input**: `course-rate-calc.edge.input.json`
**Output**: `course-rate-calc.edge.output.json`

Description: Empty feature collection produces an error response.

### Complex: Steady Turn Over 3 Positions

**Input**: `course-rate-calc.complex.input.json`
**Output**: `course-rate-calc.complex.output.json`

Description: Track "HMS Turner" with courses 0, 30, 60 degrees at 5-minute intervals (T10:30, T10:35, T10:40). Both intervals yield 0.1 deg/sec, indicating a steady starboard turn of 6 degrees per minute.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements DeltaRateToteCalculation pattern for finite differences
- Supports single-point (course only) and multi-point (rate computation) modes

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [speed-rate-calc](./speed-rate-calc.1.0.md) - Rate of change of speed (same DeltaRate pattern)
- [rel-bearing-calc](./rel-bearing-calc.1.0.md) - Uses course as input

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.courseRateCalc` (implements `DeltaRateToteCalculation`)
- Pattern: `Debrief.Tools.Tote.Calculations.DeltaRateToteCalcImplementation.calculateRate()`
