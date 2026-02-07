---
name: inflection-point-detector
version: 1.0
category: sensor/analysis
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.track_shift.freq.InflectionPointDetector
---

# Inflection Point Detector

> Detect inflection points in Doppler frequency residual data for CPA (Closest Point of Approach) estimation.

## MCP

**Description**: Analyses frequency residual data over time to detect zero-crossings in the first derivative -- these inflection points indicate moments when the Doppler shift changes sign, corresponding to Closest Point of Approach (CPA) between ownship and target. Returns detected CPA times with confidence measures and filters out noise-induced false crossings.

**When to use**: After computing Doppler curves or frequency residuals, when the analyst needs to identify CPA times. Particularly useful in target motion analysis (TMA) to pinpoint when a target was closest, to validate track solutions, or to segment a multi-leg engagement into approach and recession phases.

**Parameters**:
- `features`: FeatureCollection containing one or more FREQUENCY_RESIDUALS features with time-series residual data
- `min_confidence`: Minimum confidence threshold (0.0-1.0) for reporting inflection points; lower-confidence points are filtered but reported separately

**Returns**: ToolResponse containing an artifact with detected inflection points, their confidence scores, and CPA candidacy flags.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#FrequencyResidualFeature`

**Constraints**:
- At least one feature with `properties.kind == "FREQUENCY_RESIDUALS"` required
- Feature must have `residuals` array with at least 3 entries (minimum for first-derivative analysis)
- Each residual must have `time` and `residual_hz` fields
- Residuals must be sorted by time in ascending order
- `min_confidence` must be between 0.0 and 1.0

**Defaults**:
- `min_confidence`: 0.5

## Outputs

Returns a **ToolResponse** with artifact content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ArtifactResult`

**Result Type**: `artifact/analysis/inflection_points`

**Content Items**: One `ArtifactResult` per input residual feature containing:
- `type`: "resource"
- `uri`: `artifact://inflection-point-detector/{sensor_name}-inflections.json`
- `mimeType`: "application/json"
- `text`: Serialized JSON with inflection points, filtered points, and summary statistics

**Annotations** (on each content item):
- `debrief:resultType`: `"artifact/analysis/inflection_points"`
- `debrief:sourceFeatures`: `["{residual_feature_id}"]`
- `debrief:label`: `"Detected {n} inflection point(s) in {sensor_name} frequency residuals; {m} CPA candidate(s)"`
- `debrief:href`: `"{sensor_name}-inflections.json"`

## Algorithm

```pseudocode
FUNCTION inflection_point_detector(features: FeatureCollection,
                                    min_confidence: number) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF min_confidence IS NULL:
        min_confidence = 0.5
    END IF

    IF min_confidence < 0.0 OR min_confidence > 1.0:
        RETURN build_error("min_confidence must be between 0.0 and 1.0", "invalid_input", [])
    END IF

    // Extract frequency residual features
    residual_features = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "FREQUENCY_RESIDUALS":
            residual_features.append(feature)
        END IF
    END FOR

    IF residual_features IS EMPTY:
        RETURN build_error("No frequency residual features found in input", "invalid_input", [])
    END IF

    content_items = empty list

    FOR EACH res_feature IN residual_features:
        residuals = res_feature.properties.residuals

        IF LENGTH(residuals) < 3:
            RETURN build_error("At least 3 residual data points required for inflection analysis",
                             "invalid_input", [res_feature.id])
        END IF

        // Ensure sorted by time
        residuals = SORT(residuals, BY time ASC)

        // Step 1: Find all zero-crossings in the residual data
        all_crossings = empty list

        FOR i FROM 0 TO LENGTH(residuals) - 2:
            r_a = residuals[i].residual_hz
            r_b = residuals[i+1].residual_hz

            // Check for zero-crossing
            IF (r_a > 0 AND r_b < 0) OR (r_a < 0 AND r_b > 0):
                // Interpolate exact crossing time
                fraction = ABS(r_a) / (ABS(r_a) + ABS(r_b))
                crossing_time = residuals[i].time + fraction
                                * (residuals[i+1].time - residuals[i].time)

                // Determine direction
                IF r_a > 0 AND r_b < 0:
                    direction = "positive_to_negative"
                ELSE:
                    direction = "negative_to_positive"
                END IF

                // Compute surrounding rate (Hz per minute)
                delta_time_min = (residuals[i+1].time - residuals[i].time) IN minutes
                IF delta_time_min > 0:
                    rate = (r_b - r_a) / delta_time_min
                ELSE:
                    rate = 0
                END IF

                // Compute confidence score
                confidence = compute_crossing_confidence(residuals, i)

                crossing = {
                    time: crossing_time,
                    interpolated_residual_hz: 0.0,
                    type: "zero_crossing",
                    direction: direction,
                    confidence: ROUND(confidence, 2),
                    estimated_cpa: (direction == "positive_to_negative"),
                    surrounding_rate_hz_per_min: ROUND(rate, 3),
                    before_index: i,
                    after_index: i + 1
                }

                all_crossings.append(crossing)
            END IF
        END FOR

        // Step 2: Separate into accepted and filtered based on confidence
        accepted = empty list
        filtered = empty list

        cpa_label_counter = 0
        FOR EACH crossing IN all_crossings:
            IF crossing.confidence >= min_confidence:
                IF crossing.estimated_cpa:
                    cpa_label_counter = cpa_label_counter + 1
                    crossing.label = "CPA-" + cpa_label_counter
                END IF
                accepted.append(crossing)
            ELSE:
                crossing.note = "Filtered: confidence " + crossing.confidence
                                + " below threshold " + min_confidence
                                + " (noise-induced oscillation)"
                filtered.append(crossing)
            END IF
        END FOR

        // Step 3: Build summary
        cpa_count = COUNT(c FOR c IN accepted WHERE c.estimated_cpa == true)

        summary = {
            total_inflection_points: LENGTH(accepted),
            cpa_candidates: cpa_count,
            analysis_window: {
                start: residuals[0].time,
                end: residuals[LAST].time,
                duration_minutes: (residuals[LAST].time - residuals[0].time) IN minutes
            },
            data_points: LENGTH(residuals)
        }

        IF LENGTH(filtered) > 0:
            summary.filtered_count = LENGTH(filtered)
            summary.note = LENGTH(filtered) + " low-confidence zero-crossings filtered (likely noise)"
        END IF

        IF LENGTH(accepted) == 0 AND LENGTH(filtered) == 0:
            // Determine nature of data
            IF is_monotonic(residuals):
                summary.note = "Monotonically " + monotonic_direction(residuals)
                               + " residuals; no zero-crossings detected"
            ELSE:
                summary.note = "No zero-crossings detected in residual data"
            END IF
        END IF

        IF LENGTH(accepted) > 2:
            summary.note = "Multiple CPA detections suggest target manoeuvring or multiple passes"
        END IF

        // Build result object
        result_data = {
            title: "Inflection Points: " + res_feature.properties.sensor_name,
            sensor_name: res_feature.properties.sensor_name,
            source_frequency_hz: res_feature.properties.source_frequency_hz,
            min_confidence: min_confidence,
            inflection_points: accepted,
            summary: summary
        }

        IF LENGTH(filtered) > 0:
            result_data.filtered_inflection_points = filtered
        END IF

        // Build label
        label = "Detected " + LENGTH(accepted) + " inflection point(s) in "
                + res_feature.properties.sensor_name + " frequency residuals; "
                + cpa_count + " CPA candidate(s)"

        IF LENGTH(filtered) > 0:
            label = label + " (" + LENGTH(filtered) + " noise-induced crossings filtered)"
        END IF

        IF LENGTH(accepted) == 0:
            label = "Detected 0 inflection point(s) in "
                    + res_feature.properties.sensor_name
                    + " frequency residuals; monotonic data, no CPA candidates"
        END IF

        item = build_artifact(
            data: SERIALIZE(result_data),
            mime: "application/json",
            result_subtype: "analysis/inflection_points",
            source_feature_ids: [res_feature.id],
            label: label,
            href: res_feature.properties.sensor_name + "-inflections.json"
        )

        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION

FUNCTION compute_crossing_confidence(residuals: list, crossing_index: number) -> number:
    // Confidence is based on:
    // 1. Magnitude of surrounding residuals (larger = more confident)
    // 2. Consistency of trend before and after crossing
    // 3. Distance from neighbouring crossings (farther = more confident)

    i = crossing_index
    r_before = residuals[i].residual_hz
    r_after = residuals[i+1].residual_hz

    // Factor 1: Magnitude -- larger residuals on either side = real crossing
    magnitude = (ABS(r_before) + ABS(r_after)) / 2
    // Normalize: 0.05 Hz or more gives high confidence
    magnitude_score = MIN(magnitude / 0.05, 1.0)

    // Factor 2: Trend consistency
    // Check if 2 points before crossing are consistently same-sign as r_before
    trend_score = 1.0
    IF i >= 2:
        IF SIGN(residuals[i-1].residual_hz) == SIGN(r_before)
           AND SIGN(residuals[i-2].residual_hz) == SIGN(r_before):
            trend_score = 1.0
        ELSE:
            trend_score = 0.5
        END IF
    ELSE:
        trend_score = 0.7  // Not enough history
    END IF

    // Check if 2 points after crossing are consistently same-sign as r_after
    IF i + 3 < LENGTH(residuals):
        IF SIGN(residuals[i+2].residual_hz) == SIGN(r_after)
           AND SIGN(residuals[i+3].residual_hz) == SIGN(r_after):
            trend_score = trend_score * 1.0
        ELSE:
            trend_score = trend_score * 0.5
        END IF
    ELSE:
        trend_score = trend_score * 0.8  // Not enough future data
    END IF

    // Combined score
    confidence = 0.6 * magnitude_score + 0.4 * trend_score

    RETURN CLAMP(confidence, 0.0, 1.0)
END FUNCTION

FUNCTION is_monotonic(residuals: list) -> boolean:
    IF LENGTH(residuals) < 2:
        RETURN true
    END IF
    increasing = true
    decreasing = true
    FOR i FROM 0 TO LENGTH(residuals) - 2:
        IF residuals[i+1].residual_hz < residuals[i].residual_hz:
            increasing = false
        END IF
        IF residuals[i+1].residual_hz > residuals[i].residual_hz:
            decreasing = false
        END IF
    END FOR
    RETURN increasing OR decreasing
END FUNCTION

FUNCTION monotonic_direction(residuals: list) -> string:
    IF residuals[LAST].residual_hz > residuals[0].residual_hz:
        RETURN "increasing"
    ELSE:
        RETURN "decreasing"
    END IF
END FUNCTION
```

### Complexity

- **Time**: O(N) -- single pass through N residual data points for zero-crossing detection; confidence computation is O(1) per crossing
- **Space**: O(K) -- K detected crossings (typically K << N)

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response: `invalid_input`, "Input features required" |
| No frequency residual features | Return error response: `invalid_input`, "No frequency residual features found" |
| Fewer than 3 residual points | Return error response: `invalid_input`, "At least 3 residual data points required" |
| Monotonically increasing/decreasing residuals | Return empty inflection_points array with explanatory note |
| All residuals are zero | Return empty inflection_points (no crossings); note "constant zero residuals" |
| Single zero-crossing (standard CPA) | Return one inflection point with high confidence |
| Multiple zero-crossings (target manoeuvring) | Return multiple inflection points; note suggests manoeuvring |
| Noisy data with spurious crossings | Filter low-confidence crossings below `min_confidence` threshold; report them in `filtered_inflection_points` |
| min_confidence = 0.0 | Accept all crossings regardless of confidence |
| min_confidence = 1.0 | Only report crossings with perfect confidence (rarely any) |
| Residuals not sorted by time | Sort before processing |
| Negative-to-positive crossing | Reported but `estimated_cpa` set to false (CPA is positive-to-negative transition) |

## Examples

### Basic Usage

**Input**: `inflection-point-detector.basic.input.json`
**Output**: `inflection-point-detector.basic.output.json`

Description: Eight frequency residual points transitioning from positive to negative. One clear zero-crossing detected between T+03:00 and T+04:00, indicating CPA at approximately T+03:24. High confidence (0.92) due to consistent trend on both sides.

### Edge Case: Monotonic Data (No Inflection)

**Input**: `inflection-point-detector.edge-1.input.json`
**Output**: `inflection-point-detector.edge-1.output.json`

Description: Six residual points that are all positive and monotonically decreasing. No zero-crossing exists, so no inflection points are detected. Summary notes that data is monotonically decreasing.

### Edge Case: Noisy Data with Filtering

**Input**: `inflection-point-detector.edge-2.input.json`
**Output**: `inflection-point-detector.edge-2.output.json`

Description: Seven residual points with noise-induced oscillations near zero. One genuine high-confidence zero-crossing at T+01:58 (positive-to-negative, confidence 0.85) is accepted. Two low-confidence crossings (noise-induced) at T+02:20 and T+03:38 are filtered out because they fall below the 0.7 confidence threshold. Filtered points are reported separately for analyst review.

### Complex: Multiple CPA Detections

**Input**: `inflection-point-detector.complex.input.json`
**Output**: `inflection-point-detector.complex.output.json`

Description: Sixteen residual points spanning 30 minutes with three zero-crossings. The frequency residual oscillates through three phases (approach-CPA-recession, repeated), indicating the target manoeuvred or made multiple passes. Three CPA candidates detected at T+06:15, T+17:30, and T+27:30, all with confidence above 0.88. Summary notes multiple CPA detections suggest target manoeuvring.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Implements zero-crossing detection in frequency residual data
- Confidence scoring based on magnitude and trend consistency
- Configurable minimum confidence threshold for noise filtering
- Reports filtered (low-confidence) crossings separately
- Labels CPA candidates with sequential identifiers

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_artifact()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [doppler-curve](./doppler-curve.1.0.md) - Generate predicted Doppler curves (produces input data for this tool)
- [generate-sensor-range-plot](./generate-sensor-range-plot.1.0.md) - Range vs time analysis

**Input Schemas**:
- [FrequencyResidualFeature](../../../schemas/src/linkml/geojson.yaml) - Frequency residual data structure

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.track_shift.freq.InflectionPointDetector`

**External**:
- [Closest Point of Approach](https://en.wikipedia.org/wiki/Closest_point_of_approach) - CPA definition and relevance to maritime analysis
