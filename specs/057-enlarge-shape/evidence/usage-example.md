# Usage Example: Scaling Formula Walkthrough

**Feature**: 057-enlarge-shape

## Scenario: Enlarge a Rectangle by Factor 3.0

An analyst has a rectangular exercise area defined by four vertices and wants to triple its size relative to its geometric center.

### Step 1: Input

A rectangle with vertices at:
```
(-1.0, 51.0)  (-0.5, 51.0)
(-1.0, 51.5)  (-0.5, 51.5)
```

GeoJSON ring (counter-clockwise, closed):
```json
[[-1.0, 51.0], [-0.5, 51.0], [-0.5, 51.5], [-1.0, 51.5], [-1.0, 51.0]]
```

### Step 2: Compute Centroid

The default origin is the arithmetic mean of unique vertices (exclude closing vertex):

```
centroid_lon = (-1.0 + -0.5 + -0.5 + -1.0) / 4 = -3.0 / 4 = -0.75
centroid_lat = (51.0 + 51.0 + 51.5 + 51.5) / 4 = 205.0 / 4 = 51.25
```

Centroid: **[-0.75, 51.25]**

### Step 3: Scale Each Vertex

Formula: `new_coord = origin + (vertex - origin) * scale_factor`

| Vertex | lon calc | lat calc | Result |
|--------|----------|----------|--------|
| [-1.0, 51.0] | -0.75 + (-1.0 - -0.75) * 3.0 = -0.75 + (-0.75) = **-1.5** | 51.25 + (51.0 - 51.25) * 3.0 = 51.25 + (-0.75) = **50.5** | [-1.5, 50.5] |
| [-0.5, 51.0] | -0.75 + (-0.5 - -0.75) * 3.0 = -0.75 + (0.75) = **0.0** | 51.25 + (-0.25) * 3.0 = **50.5** | [0.0, 50.5] |
| [-0.5, 51.5] | -0.75 + (0.25) * 3.0 = **0.0** | 51.25 + (0.25) * 3.0 = **52.0** | [0.0, 52.0] |
| [-1.0, 51.5] | -0.75 + (-0.25) * 3.0 = **-1.5** | 51.25 + (0.25) * 3.0 = **52.0** | [-1.5, 52.0] |
| [-1.0, 51.0] | (closing = first) | | [-1.5, 50.5] |

### Step 4: Verify

- Original extent: 0.5° lon x 0.5° lat
- Scaled extent: 1.5° lon x 1.5° lat (exactly 3x in each dimension)
- Centroid of scaled shape: (-1.5+0.0+0.0+-1.5)/4 = -0.75, (50.5+50.5+52.0+52.0)/4 = 51.25
- Centroid unchanged (as expected for centroid-based scaling)

### Step 5: Output

The tool returns a ToolResponse with the scaled feature and provenance:

```json
{
  "annotations": {
    "debrief:resultType": "mutation/shape/scaled",
    "debrief:sourceFeatures": ["rect-001"],
    "debrief:label": "Scaled 1 shape(s) by factor 3.0 from centroid"
  }
}
```

This matches the golden example in `enlarge-shape.basic-polygon.output.json`.
