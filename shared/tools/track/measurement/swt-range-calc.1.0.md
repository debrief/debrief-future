---
name: swt-range-calc
version: 1.0
category: track/measurement
status: draft
created: 2026-02-07
migrated_from: org.mwc.cmap.tote.calculations.SWTRangeCalc
---

# SWT Range Calc

> Calculate range between two tracks using SWT preferences integration.

## MCP

**Description**: Calculates the geodesic distance between two track positions at a given time, using distance units from the SWT/Eclipse preferences system. Functionally identical to range-calc but sources its unit preference from the SWT preferences store rather than a direct parameter. In the migrated system, this is equivalent to range-calc with preferences-driven defaults.

**When to use**: When range calculation is triggered from the SWT-based tote panel where unit preferences are stored in the Eclipse preferences system. In Future Debrief, this tool exists for migration completeness; prefer `range-calc` for new implementations.

**Parameters**:
- `features`: FeatureCollection containing exactly two track features (primary and secondary)
- `time`: ISO 8601 timestamp at which to evaluate positions
- `units`: Distance units for output -- one of `yds`, `km`, `nm`, `m` (default: from preferences, fallback `yds`)

**Returns**: A scalar measurement of the range between the two tracks in the specified units.

## Inputs

**Schema**: `shared/schemas/geojson/FeatureCollection.schema.json`

**Constraints**:
- Exactly 2 features required, both with `debrief:kind = "track"`
- Both tracks must have a position at or interpolatable to the specified time

**Defaults**:
- `units`: Read from user preferences; fallback `"yds"` if not set

## Outputs

Returns a **ToolResponse** with a single artifact content item.

**Response Schema**: `specs/041-document-tool-results/data-model.md#ToolResponse`

**Result Type**: `artifact/measurement/range`

**Content Items**: One measurement result containing:
- `type`: `"resource"`
- `uri`: `feature://measurement-swt-range-{id}`
- `mimeType`: `"application/geo+json"`
- `text`: Serialized measurement Feature with value and units

**Annotations**:
- `debrief:resultType`: `"artifact/measurement/range"`
- `debrief:sourceFeatures`: `["track-001", "track-002"]`
- `debrief:label`: `"Calculated range: {value} {units}"`

## Algorithm

```pseudocode
FUNCTION swt_range_calc(input: FeatureCollection, time: Timestamp, units: string) -> ToolResponse:
    // Resolve units from preferences if not explicitly provided
    IF units IS NULL OR units IS EMPTY:
        units = get_preference("distance_units", "yds")
    END IF

    // Delegate to the standard range calculation
    // The algorithm is identical to range-calc
    RETURN range_calc(input, time, units)
END FUNCTION

// NOTE: The full algorithm is documented in range-calc.1.0.md
// This tool differs only in how the units parameter is resolved:
// - range-calc: units passed as explicit parameter
// - swt-range-calc: units read from SWT/Eclipse preferences store
//
// In Future Debrief, both tools use the same preferences mechanism
// (debrief-config service), making them functionally identical.
```

### Complexity

- **Time**: O(1) -- delegates to range-calc (single distance calculation)
- **Space**: O(1) -- constant memory

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Empty input collection | Return error: `invalid_input`, "Input features required" |
| Only one track provided | Return error: `invalid_input`, "Two track features required" |
| No position at specified time | Return error: `invalid_input`, "No position available at specified time" |
| Units preference not set | Default to `"yds"` |
| Invalid units in preferences | Default to `"yds"` |
| Same behavior as range-calc in all other cases | Identical to range-calc edge cases |

## Examples

### Basic Example

**Input**: `swt-range-calc.basic.input.json`
**Output**: `swt-range-calc.basic.output.json`

Description: Calculates range between OWNSHIP and TARGET, identical result to range-calc. Returns approximately 7230 yards. The only difference is the unit preference source.

## Changelog

### 1.0 (2026-02-07)
- Initial migration from Legacy Debrief
- Functionally equivalent to range-calc with preferences-driven units
- Retained for migration completeness

## References

**Related Tools**:
- [range-calc](./range-calc.1.0.md) -- preferred range calculation tool (identical algorithm)
- [bearing-calc](./bearing-calc.1.0.md) -- bearing between two tracks

**Schemas**:
- `shared/schemas/geojson/FeatureCollection.schema.json`

**Legacy**:
- Debrief 3.x: `org.mwc.cmap.tote.calculations.SWTRangeCalc`
- Debrief 3.x: `Debrief.Tools.Tote.Calculations.rangeCalc` (underlying algorithm)
