---
name: doppler-curve
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.track_shift.freq.DopplerCurve
---

# Doppler Curve

> Calculate predicted Doppler frequency curve for target motion analysis from ownship and target tracks.

## MCP

**Description**: Calculates the predicted Doppler frequency shift over time for a source frequency, given ownship and target tracks. For each time step, computes the radial velocity along the line of bearing between ownship and target, then applies the Doppler formula to predict the observed frequency. Produces a time-series suitable for overlay on measured frequency data.

**When to use**: When the analyst wants to predict what Doppler frequency shift should be observed given known or estimated ownship and target tracks. Used in target motion analysis (TMA) to compare predicted Doppler curves against observed frequency data, helping validate track solutions or identify CPA (Closest Point of Approach).

**Parameters**:
- `features`: FeatureCollection containing ownship TRACK and target TRACK features
- `source_frequency_hz`: The source frequency in Hertz emitted by the target
- `speed_of_sound_kts`: Speed of sound in water in knots (default: 3032 kts)

**Returns**: ToolResponse containing an artifact with time-series Doppler frequency predictions in JSON format.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Exactly two features with `properties.kind == "TRACK"` required (ownship and target)
- Both tracks must have `positions` arrays with `time`, `coordinates`, `course`, and `speed`
- `source_frequency_hz` must be a positive number
- Track positions must overlap in time for at least one time step

**Defaults**:
- `speed_of_sound_kts`: 3032 (standard underwater speed of sound)

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/analysis/doppler_curve`

**Content Items**: One `ArtifactResult` containing:
- `type`: "resource"
- `uri`: `artifact://doppler-curve/{ownship_name}-{target_name}-doppler.json`
- `mimeType`: "application/json"
- `text`: Serialized JSON with title, parameters, time_series, and statistics

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/analysis/doppler_curve"`
- `debrief:sourceFeatures`: `["{ownship_id}", "{target_id}"]`
- `debrief:label`: `"Doppler curve for {ownship} vs {target}: {n} points, f_source={freq}Hz, shift {description}"`
- `debrief:href`: `"{ownship_name}-{target_name}-doppler.json"`

## Algorithm

```pseudocode
FUNCTION doppler_curve(features: FeatureCollection, source_frequency_hz: number,
                       speed_of_sound_kts: number) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF source_frequency_hz IS NULL OR source_frequency_hz <= 0:
        RETURN build_error("source_frequency_hz must be a positive number", "invalid_input", [])
    END IF

    // Default speed of sound
    IF speed_of_sound_kts IS NULL OR speed_of_sound_kts <= 0:
        speed_of_sound_kts = 3032
    END IF

    // Extract tracks
    tracks = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "TRACK":
            tracks.append(feature)
        END IF
    END FOR

    IF LENGTH(tracks) < 2:
        RETURN build_error("Two track features required (ownship and target)", "invalid_input", [])
    END IF

    ownship = tracks[0]
    target = tracks[1]

    // Build unified time steps from both tracks
    time_steps = merge_time_steps(ownship.properties.positions, target.properties.positions)

    IF time_steps IS EMPTY:
        RETURN build_error("No overlapping time steps between tracks", "no_data", [])
    END IF

    C = speed_of_sound_kts  // Speed of sound

    time_series = empty list

    FOR EACH time IN time_steps:
        // Get positions at this time (interpolate if needed)
        own_pos = interpolate_position(ownship, time)
        tgt_pos = interpolate_position(target, time)

        IF own_pos IS NULL OR tgt_pos IS NULL:
            CONTINUE
        END IF

        // Get velocities at this time
        own_vel = interpolate_velocity(ownship, time)  // {course_deg, speed_kts}
        tgt_vel = interpolate_velocity(target, time)

        // Calculate bearing from ownship to target
        bearing = calculate_bearing(own_pos, tgt_pos)
        range_m = geodesic_distance(own_pos, tgt_pos)

        // Calculate radial velocity components along line of bearing
        // Positive = opening (moving apart), Negative = closing (approaching)
        bearing_rad = RADIANS(bearing)

        // Ownship radial velocity (component along bearing TO target)
        own_course_rad = RADIANS(own_vel.course_deg)
        v_receiver = own_vel.speed_kts * COS(own_course_rad - bearing_rad)

        // Target radial velocity (component along bearing FROM ownship)
        tgt_course_rad = RADIANS(tgt_vel.course_deg)
        // Target velocity component toward ownship (reverse bearing)
        reverse_bearing_rad = RADIANS((bearing + 180) MOD 360)
        v_source = tgt_vel.speed_kts * COS(tgt_course_rad - reverse_bearing_rad)

        // Doppler formula: f_observed = f_source * (C + v_receiver) / (C + v_source)
        // Sign convention: positive velocity = moving AWAY from source/receiver
        // So approaching = negative v_source = higher denominator = lower frequency
        // We want: closing velocity yields higher frequency
        // Radial velocity: negative = closing
        radial_velocity = v_source - v_receiver  // positive = opening

        f_observed = source_frequency_hz * (C + v_receiver) / (C + v_source)

        time_series.append({
            time: time,
            predicted_frequency_hz: ROUND(f_observed, 3),
            radial_velocity_kts: ROUND(radial_velocity, 2),
            range_m: ROUND(range_m, 1),
            bearing_deg: ROUND(bearing, 1)
        })
    END FOR

    IF time_series IS EMPTY:
        RETURN build_error("No Doppler data could be computed", "no_data", [])
    END IF

    // Compute statistics
    frequencies = [entry.predicted_frequency_hz FOR entry IN time_series]
    stats = {
        min_frequency_hz: MIN(frequencies),
        max_frequency_hz: MAX(frequencies),
        frequency_shift_hz: ROUND(MAX(frequencies) - source_frequency_hz, 3),
        data_points: LENGTH(time_series)
    }

    // Optionally estimate CPA from frequency data
    // CPA occurs where Doppler shift crosses zero (frequency = source frequency)
    cpa_estimate = estimate_cpa_from_doppler(time_series, source_frequency_hz)
    IF cpa_estimate IS NOT NULL:
        stats.cpa_estimate = cpa_estimate
    END IF

    plot_data = {
        title: "Doppler Curve: " + ownship.properties.platform_name
               + " vs " + target.properties.platform_name,
        source_frequency_hz: source_frequency_hz,
        speed_of_sound_kts: speed_of_sound_kts,
        ownship: ownship.properties.platform_name,
        target: target.properties.platform_name,
        time_series: time_series,
        statistics: stats
    }

    href = ownship.properties.platform_name + "-"
           + target.properties.platform_name + "-doppler.json"

    // Build shift description for label
    shift_desc = describe_shift(time_series, source_frequency_hz)

    item = build_artifact(
        data: SERIALIZE(plot_data),
        mime: "application/json",
        result_subtype: "analysis/doppler_curve",
        source_feature_ids: [ownship.id, target.id],
        label: "Doppler curve for " + ownship.properties.platform_name
               + " vs " + target.properties.platform_name + ": "
               + stats.data_points + " points, f_source="
               + source_frequency_hz + "Hz, " + shift_desc,
        href: href
    )

    RETURN build_response([item])
END FUNCTION

FUNCTION merge_time_steps(positions_a: list, positions_b: list) -> list:
    // Collect all unique times from both position arrays
    // that fall within the overlap period
    start = MAX(positions_a[0].time, positions_b[0].time)
    end_time = MIN(positions_a[LAST].time, positions_b[LAST].time)

    IF start > end_time:
        RETURN empty list  // No overlap
    END IF

    times = empty sorted set
    FOR EACH pos IN positions_a:
        IF pos.time >= start AND pos.time <= end_time:
            times.add(pos.time)
        END IF
    END FOR
    FOR EACH pos IN positions_b:
        IF pos.time >= start AND pos.time <= end_time:
            times.add(pos.time)
        END IF
    END FOR

    RETURN SORTED(times)
END FUNCTION

FUNCTION interpolate_velocity(track: TrackFeature, time: datetime) -> velocity:
    positions = track.properties.positions

    FOR EACH pos IN positions:
        IF pos.time == time:
            RETURN {course_deg: pos.course, speed_kts: pos.speed}
        END IF
    END FOR

    // Linear interpolation of course and speed
    FOR i FROM 0 TO LENGTH(positions) - 2:
        IF positions[i].time < time AND positions[i+1].time > time:
            fraction = (time - positions[i].time) / (positions[i+1].time - positions[i].time)
            course = interpolate_angle(positions[i].course, positions[i+1].course, fraction)
            speed = positions[i].speed + fraction * (positions[i+1].speed - positions[i].speed)
            RETURN {course_deg: course, speed_kts: speed}
        END IF
    END FOR

    RETURN NULL
END FUNCTION

FUNCTION estimate_cpa_from_doppler(time_series: list, f_source: number) -> object:
    // Look for zero-crossing in (predicted_freq - f_source)
    FOR i FROM 0 TO LENGTH(time_series) - 2:
        shift_a = time_series[i].predicted_frequency_hz - f_source
        shift_b = time_series[i+1].predicted_frequency_hz - f_source

        IF (shift_a > 0 AND shift_b < 0) OR (shift_a < 0 AND shift_b > 0):
            // Zero-crossing found -- interpolate time
            fraction = ABS(shift_a) / (ABS(shift_a) + ABS(shift_b))
            cpa_time = time_series[i].time + fraction * (time_series[i+1].time - time_series[i].time)
            cpa_range = time_series[i].range_m + fraction * (time_series[i+1].range_m - time_series[i].range_m)
            RETURN {
                time: cpa_time,
                range_m: ROUND(cpa_range, 1),
                note: "Estimated from Doppler zero-crossing"
            }
        END IF
    END FOR
    RETURN NULL
END FUNCTION

FUNCTION describe_shift(time_series: list, f_source: number) -> string:
    min_shift = MIN(entry.predicted_frequency_hz - f_source FOR entry IN time_series)
    max_shift = MAX(entry.predicted_frequency_hz - f_source FOR entry IN time_series)

    IF ABS(min_shift) < 0.001 AND ABS(max_shift) < 0.001:
        RETURN "zero Doppler shift (parallel tracks)"
    ELSE:
        RETURN "shift " + FORMAT_SIGN(min_shift) + " to " + FORMAT_SIGN(max_shift) + "Hz"
    END IF
END FUNCTION
```

### Complexity

- **Time**: O(T * P) -- T time steps, P positions per track (for interpolation)
- **Space**: O(T) -- stores one entry per time step

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response: `invalid_input`, "Input features required" |
| Fewer than two tracks | Return error response: `invalid_input`, "Two track features required" |
| Non-positive source frequency | Return error response: `invalid_input`, "source_frequency_hz must be a positive number" |
| Tracks with no time overlap | Return error response: `no_data`, "No overlapping time steps" |
| Single time step | Produce curve with one data point; no CPA estimate possible |
| Parallel tracks (zero radial velocity) | All predicted frequencies equal source frequency; zero Doppler shift |
| Head-on approach (maximum closing velocity) | Maximum positive frequency shift |
| Receding tracks (opening velocity) | Negative frequency shift (frequency lower than source) |
| Crossing scenario (approach then recede) | Frequency transitions from above to below source; CPA estimated at zero-crossing |
| Speed of sound not provided | Use default 3032 kts |
| Very high speed (approaching speed of sound) | Formula still valid; extreme Doppler shifts expected |

## Examples

### Basic Usage

**Input**: `doppler-curve.basic.input.json`
**Output**: `doppler-curve.basic.output.json`

Description: Ownship heading NE at 12 kts, target heading NNE at 10 kts. Both closing; predicted frequencies above source frequency with decreasing shift as approach angle changes. Five data points produced.

### Edge Case: Parallel Tracks (Zero Doppler)

**Input**: `doppler-curve.edge-1.input.json`
**Output**: `doppler-curve.edge-1.output.json`

Description: Ownship and target both heading east at 10 kts on parallel tracks. Zero radial velocity at all time steps; predicted frequency equals source frequency throughout.

### Edge Case: Single Time Step

**Input**: `doppler-curve.edge-2.input.json`
**Output**: `doppler-curve.edge-2.output.json`

Description: Both tracks have only one position at the same time. Single Doppler prediction point computed from instantaneous velocities. No CPA estimate possible with single point.

### Complex: Crossing Scenario

**Input**: `doppler-curve.complex.input.json`
**Output**: `doppler-curve.complex.output.json`

Description: Ownship heading east at 10 kts, target heading south at 8 kts on a crossing path. Frequency transitions from above source (closing phase) to below source (opening phase) as target crosses ahead. CPA estimated from Doppler zero-crossing. Eight data points spanning the full crossing engagement.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements standard Doppler formula: f_observed = f_source * (C + v_receiver) / (C + v_source)
- Default speed of sound: 3032 kts
- Includes CPA estimation from Doppler zero-crossing
- Supports position and velocity interpolation between track fixes

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [inflection-point-detector](./inflection-point-detector.1.0.md) - Detect inflection points in Doppler data for CPA estimation
- [generate-sensor-range-plot](./generate-sensor-range-plot.1.0.md) - Generate range vs time plots from sensor data

**Input Schemas**:
- [TrackFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON track feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.track_shift.freq.DopplerCurve`

**External**:
- [Doppler Effect](https://en.wikipedia.org/wiki/Doppler_effect) - Acoustic Doppler effect theory
