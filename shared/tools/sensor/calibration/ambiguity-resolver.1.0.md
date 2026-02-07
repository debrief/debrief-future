---
name: ambiguity-resolver
version: 1.0
category: sensor/calibration
status: draft
created: 2026-02-07
migrated_from: org.mwc.debrief.track_shift.ambiguity.AmbiguityResolver
---

# Ambiguity Resolver

> Algorithmic resolution of bearing ambiguity using leg-based bearing rate analysis.

## MCP

**Description**: Resolves port/starboard bearing ambiguity by analysing bearing data across ownship legs. For each leg, computes bearing rates for both the primary and ambiguous bearing sequences and selects the one with the more consistent (lower variance) bearing rate. More sophisticated than simple geometric resolve-ambiguity: considers entire legs rather than individual cuts.

**When to use**: When sensor data has ambiguous bearings and ownship leg information is available. Preferred over `resolve-ambiguity` when no target track exists or when leg-based statistical analysis is more appropriate than point-by-point geometric comparison. Best suited for towed array data where bearing rate consistency across a steady-course leg is a reliable discriminator.

**Parameters**:
- `features`: FeatureCollection containing one or more SENSOR features with ambiguous cuts
- `ownship_legs`: Array of ownship leg definitions, each with leg_id, start_time, end_time, course, and speed

**Returns**: ToolResponse containing mutated sensor features with ambiguity resolved per-leg using bearing rate analysis. Each resolved cut is annotated with `resolution_method` and `leg_id`.

## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#SensorFeature`

**Constraints**:
- At least one feature with `properties.kind == "SENSOR"` required
- At least one ownship leg definition required
- Sensor cuts must have `bearing` and `ambiguous_bearing` fields when `ambiguous == true`
- Each cut must have a `time` field
- Each leg requires at least 2 ambiguous cuts to compute bearing rate; legs with fewer are skipped
- Legs must not overlap in time

**Defaults**:
- `ownship_legs`: If not provided, attempt to derive legs from ownship track course changes (future enhancement)

## Outputs

Returns a **ToolResponse** with mutation content items.

**Response Schema**: `specs/041-document-tool-results/data-model.md#MutationResult`

**Result Type**: `mutation/sensor/resolved`

**Content Items**: One `MutationResult` per modified sensor feature containing:
- `type`: "resource"
- `uri`: `feature://{sensor_feature_id}`
- `mimeType`: "application/geo+json"
- `text`: Serialized modified SensorFeature with resolved bearings and `resolution_method` annotations

**Annotations** (on each content item):
- `debrief:resultType`: `"mutation/sensor/resolved"`
- `debrief:sourceFeatures`: `["{sensor_id}"]`
- `debrief:label`: `"Resolved ambiguity for {n} cut(s) on {sensor_name} across {m} leg(s) using bearing rate analysis"`

## Algorithm

```pseudocode
FUNCTION ambiguity_resolver(features: FeatureCollection, ownship_legs: list) -> ToolResponse:
    // Validate inputs
    IF features IS NULL OR features.features IS EMPTY:
        RETURN build_error("Input features required", "invalid_input", [])
    END IF

    IF ownship_legs IS NULL OR ownship_legs IS EMPTY:
        RETURN build_error("Ownship leg definitions required", "invalid_input", [])
    END IF

    // Extract sensor features
    sensors = empty list
    FOR EACH feature IN features.features:
        IF feature.properties.kind == "SENSOR":
            sensors.append(feature)
        END IF
    END FOR

    IF sensors IS EMPTY:
        RETURN build_error("No sensor features found in input", "invalid_input", [])
    END IF

    content_items = empty list

    FOR EACH sensor IN sensors:
        total_resolved = 0
        legs_processed = 0

        FOR EACH leg IN ownship_legs:
            // Collect ambiguous cuts within this leg's time window
            leg_cuts = empty list
            FOR EACH cut IN sensor.properties.cuts:
                IF cut.ambiguous == true
                   AND cut.time >= leg.start_time
                   AND cut.time <= leg.end_time:
                    leg_cuts.append(cut)
                END IF
            END FOR

            // Need at least 2 cuts for bearing rate analysis
            IF LENGTH(leg_cuts) < 2:
                CONTINUE
            END IF

            // Compute bearing rates for primary bearings
            primary_rates = compute_bearing_rates(leg_cuts, "bearing")

            // Compute bearing rates for ambiguous bearings
            ambiguous_rates = compute_bearing_rates(leg_cuts, "ambiguous_bearing")

            // Select the sequence with lower bearing rate variance
            // (consistent bearing rate = correct solution on a steady leg)
            primary_variance = variance(primary_rates)
            ambiguous_variance = variance(ambiguous_rates)

            use_primary = (primary_variance <= ambiguous_variance)

            // Apply resolution to all cuts in this leg
            FOR EACH cut IN leg_cuts:
                IF use_primary:
                    cut.resolved_bearing = cut.bearing
                ELSE:
                    cut.resolved_bearing = cut.ambiguous_bearing
                END IF

                cut.ambiguous = false
                cut.resolution_method = "leg_bearing_rate"
                cut.leg_id = leg.leg_id
                total_resolved = total_resolved + 1
            END FOR

            legs_processed = legs_processed + 1
        END FOR

        // Build label
        IF total_resolved == 0:
            label = build_insufficient_data_label(sensor, ownship_legs)
        ELSE:
            label = "Resolved ambiguity for " + total_resolved + " cut(s) on "
                    + sensor.properties.sensor_name + " across "
                    + legs_processed + " leg(s) using bearing rate analysis"
        END IF

        item = build_mutation(
            features: [sensor],
            result_subtype: "sensor/resolved",
            source_feature_ids: [sensor.id],
            label: label
        )

        content_items.append(item)
    END FOR

    RETURN build_response(content_items)
END FUNCTION

FUNCTION compute_bearing_rates(cuts: list, bearing_field: string) -> list:
    rates = empty list
    FOR i FROM 0 TO LENGTH(cuts) - 2:
        delta_bearing = cuts[i+1][bearing_field] - cuts[i][bearing_field]
        // Normalize to [-180, 180]
        IF delta_bearing > 180:
            delta_bearing = delta_bearing - 360
        ELSE IF delta_bearing < -180:
            delta_bearing = delta_bearing + 360
        END IF

        delta_time = (cuts[i+1].time - cuts[i].time) IN minutes
        IF delta_time > 0:
            rate = delta_bearing / delta_time  // degrees per minute
        ELSE:
            rate = 0
        END IF
        rates.append(rate)
    END FOR
    RETURN rates
END FUNCTION

FUNCTION variance(values: list) -> number:
    IF LENGTH(values) < 2:
        RETURN INFINITY  // Cannot compute variance with < 2 values
    END IF
    mean = SUM(values) / LENGTH(values)
    sum_sq = 0
    FOR EACH v IN values:
        sum_sq = sum_sq + (v - mean) * (v - mean)
    END FOR
    RETURN sum_sq / (LENGTH(values) - 1)
END FUNCTION

FUNCTION build_insufficient_data_label(sensor: SensorFeature, legs: list) -> string:
    // Find the first leg that had insufficient data
    FOR EACH leg IN legs:
        count = count ambiguous cuts in leg time window
        IF count < 2:
            RETURN "Insufficient data for bearing rate analysis on "
                   + sensor.properties.sensor_name + "; leg " + leg.leg_id
                   + " has fewer than 2 cuts, 0 cut(s) resolved"
        END IF
    END FOR
    RETURN "No ambiguous cuts found on " + sensor.properties.sensor_name
           + "; 0 cut(s) resolved across " + LENGTH(legs) + " leg(s)"
END FUNCTION
```

### Complexity

- **Time**: O(S * L * C) -- S sensors, L legs, C cuts per sensor (filtering cuts per leg)
- **Space**: O(C) -- stores bearing rate arrays per leg

## Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Empty input collection | Return error response: `invalid_input`, "Input features required" |
| No sensor features | Return error response: `invalid_input`, "No sensor features found in input" |
| No ownship legs provided | Return error response: `invalid_input`, "Ownship leg definitions required" |
| Leg with only 1 ambiguous cut | Skip leg (cannot compute bearing rate); cut remains ambiguous |
| Leg with 0 ambiguous cuts | Skip leg; no cuts to process |
| All cuts already resolved | Return sensor unchanged; label indicates 0 resolved |
| Equal variance for primary and ambiguous | Tie-break to primary bearings |
| Cuts that fall between legs (gap period) | Cuts not within any leg window remain ambiguous |
| Multiple sensors in input | Process each sensor independently |
| Overlapping legs | Undefined behavior; cuts assigned to first matching leg |
| Very short leg (< 30 seconds) | Still processed if >= 2 cuts; rate may be unreliable |

## Examples

### Basic Usage

**Input**: `ambiguity-resolver.basic.input.json`
**Output**: `ambiguity-resolver.basic.output.json`

Description: Five ambiguous cuts within a single ownship leg. Bearing rate analysis determines that the primary bearings (045-053 degrees) have a more consistent rate than the ambiguous bearings (315-307 degrees). All cuts resolved to primary.

### Edge Case: Single Cut in Leg

**Input**: `ambiguity-resolver.edge-1.input.json`
**Output**: `ambiguity-resolver.edge-1.output.json`

Description: Only one ambiguous cut falls within the leg. Cannot compute bearing rate with fewer than 2 cuts, so the cut remains ambiguous and the label indicates insufficient data.

### Edge Case: No Ambiguous Cuts

**Input**: `ambiguity-resolver.edge-2.input.json`
**Output**: `ambiguity-resolver.edge-2.output.json`

Description: All cuts are already resolved. Sensor returned unchanged with label indicating 0 resolved across 1 leg.

### Complex: Multiple Legs with Different Resolutions

**Input**: `ambiguity-resolver.complex.input.json`
**Output**: `ambiguity-resolver.complex.output.json`

Description: Eight ambiguous cuts spanning two ownship legs. Leg 1 (course 045) resolves cuts to primary bearings (045-053). Leg 2 (course 000) resolves cuts to primary bearings (280-284). Each leg is analysed independently, demonstrating that different legs can have different bearing rate characteristics. Cuts are annotated with their respective `leg_id`.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Supports leg-based bearing rate variance analysis
- Handles multiple legs per sensor
- Annotates resolved cuts with resolution method and leg ID
- Requires minimum 2 cuts per leg for analysis

## References

**ToolResult Architecture**:
- [ToolResult Data Model](../../../../specs/041-document-tool-results/data-model.md) - Response structure, annotations, error handling
- [Python API Contract](../../../../specs/041-document-tool-results/contracts/python-api.md) - `build_mutation()`, `build_response()`, `build_error()`
- [tool-result.yaml](../../../schemas/src/linkml/tool-result.yaml) - LinkML schema for result annotations

**Related Tools**:
- [resolve-ambiguity](./resolve-ambiguity.1.0.md) - Simpler geometric ambiguity resolution using a target track

**Input Schemas**:
- [SensorFeature](../../../schemas/src/linkml/geojson.yaml) - GeoJSON sensor feature definition

**Legacy**:
- Debrief 3.x: `org.mwc.debrief.track_shift.ambiguity.AmbiguityResolver`
