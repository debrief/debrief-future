# Usage Example: Creating a Tool Specification

**Feature**: 049-tool-documentation-model
**Date**: 2026-02-05

This document demonstrates the workflow for creating a new tool specification using the tool documentation model.

## Scenario

A developer needs to create a specification for a new tool called `smooth-track` that applies a smoothing algorithm to track data.

## Step 1: Copy Template

```bash
cp shared/tools/TEMPLATE.md shared/tools/track/transform/smooth-track.1.0.md
```

## Step 2: Fill Metadata

```yaml
---
name: smooth-track
version: 1.0
category: track/transform
status: draft
---
```

## Step 3: Write MCP Section

```markdown
## MCP

**Description**: Applies a smoothing algorithm to reduce noise in track position data while preserving the overall trajectory.

**When to use**: When track data contains GPS jitter, sensor noise, or other artifacts that make the track appear jagged. Smoothing improves visual clarity without significantly altering the track's path.

**Parameters**:
- `features`: Track features to smooth (GeoJSON FeatureCollection)
- `window_size`: Number of positions to include in smoothing window (default: 5)
- `method`: Smoothing algorithm: "moving_average" or "kalman" (default: "moving_average")

**Returns**: Smoothed track features with reduced positional noise.
```

## Step 4: Define Inputs/Outputs

```markdown
## Inputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Constraints**:
- Features must have `properties.kind == "TRACK"`
- Track must have at least 3 positions
- Window size must be odd and >= 3

**Defaults**:
- `window_size`: 5
- `method`: "moving_average"

## Outputs

**Schema**: `shared/schemas/src/linkml/geojson.yaml#TrackFeature`

**Result Type**: `mutation/track/smoothed`

**Annotations**:
- `sourceFeatures`: IDs of input track features
- `label`: "Smoothed {n} track(s) with {method} (window={window_size})"
```

## Step 5: Write Algorithm

```pseudocode
FUNCTION smooth_track(features: FeatureCollection, window_size: int, method: string) -> FeatureCollection:
    // Validate inputs
    IF window_size < 3 OR window_size MOD 2 == 0:
        RAISE ValidationError("window_size must be odd and >= 3")
    END IF

    result = empty FeatureCollection
    half_window = window_size / 2  // integer division

    FOR EACH feature IN features.features:
        IF feature.properties.kind != "TRACK":
            result.features.append(feature)
            CONTINUE
        END IF

        smoothed_positions = empty array

        FOR i FROM 0 TO LENGTH(feature.properties.positions) - 1:
            // Determine window bounds
            start = MAX(0, i - half_window)
            end = MIN(LENGTH(feature.properties.positions), i + half_window + 1)

            IF method == "moving_average":
                smoothed_pos = average_position(feature.properties.positions[start:end])
            ELSE IF method == "kalman":
                smoothed_pos = kalman_filter(feature.properties.positions[start:end])
            END IF

            smoothed_positions.append(smoothed_pos)
        END FOR

        feature.properties.positions = smoothed_positions
        feature.geometry.coordinates = extract_coordinates(smoothed_positions)
        result.features.append(feature)
    END FOR

    RETURN result
END FUNCTION
```

## Step 6: Document Edge Cases

| Scenario | Expected Behavior |
|----------|------------------|
| Track with < 3 positions | Return unchanged (can't smooth) |
| Window larger than track | Use track length as effective window |
| Mixed feature types | Pass non-tracks through unchanged |

## Step 7: Create Golden Example

Create `smooth-track.basic.input.json`:
```json
{
  "features": {
    "type": "FeatureCollection",
    "features": [...]
  },
  "window_size": 3,
  "method": "moving_average"
}
```

Create `smooth-track.basic.output.json`:
```json
{
  "type": "FeatureCollection",
  "features": [...]
}
```

## Step 8: Link Implementation

```python
from debrief_tools import tool_spec

@tool_spec("track/transform/smooth-track.1.0")
def smooth_track(features, window_size=5, method="moving_average"):
    """Apply smoothing to track position data."""
    # Implementation here
    pass
```

## Verification Checklist

After completing the spec:

- [ ] All 9 sections present (Metadata, MCP, Inputs, Outputs, Algorithm, Edge Cases, Examples, Changelog, References)
- [ ] Filename follows pattern: `[tool-name].[major].[minor].md`
- [ ] Metadata YAML is valid
- [ ] Algorithm is unambiguous pseudocode
- [ ] At least one golden example pair
- [ ] Schema references point to existing schemas
- [ ] Related tools cross-linked in References

## Result

The spec is now ready for independent implementation in Python or TypeScript. The `@tool_spec` decorator validates that the spec exists, and the golden examples provide test cases for verifying implementation correctness.
