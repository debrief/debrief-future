# Test Summary: Move Shape Tool (056)

## Pytest Results

```
18 passed in 0.37s
```

| Suite | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| TestTranslatePoint | 3 | 0 | 0 |
| TestMoveShapeCircle (US1) | 3 | 0 | 0 |
| TestMoveShapeRectangle (US1) | 1 | 0 | 0 |
| TestMoveShapeVector (US2) | 3 | 0 | 0 |
| TestMoveShapeLine (US2) | 1 | 0 | 0 |
| TestMoveShapeText (US3) | 1 | 0 | 0 |
| TestMoveShapeEdgeCases | 6 | 0 | 0 |
| **Total** | **18** | **0** | **0** |

## Golden I/O Validation

| File | Valid JSON | Structure |
|------|-----------|-----------|
| move-shape.basic-polygon.input.json | Yes | FeatureCollection with CircleAnnotation |
| move-shape.basic-polygon.output.json | Yes | ToolResponse with translated circle |
| move-shape.vector.input.json | Yes | FeatureCollection with VectorAnnotation |
| move-shape.vector.output.json | Yes | ToolResponse with translated vector |

## Spec Section Checklist

| Section | Present |
|---------|---------|
| Front matter (YAML) | Yes |
| MCP | Yes |
| Inputs | Yes |
| Outputs | Yes |
| Algorithm | Yes |
| Edge Cases | Yes |
| Examples | Yes |
| Changelog | Yes |
| References | Yes |

All 9 required sections present (SC-001).

## Key Scenarios Verified

- Great-circle translation (Vincenty formula) for all 5 annotation kinds
- Circle center property updated after translation
- Vector origin updated, range/bearing preserved
- Zero distance returns features unchanged (no-op)
- Empty features raises ValueError
- Non-annotation features skipped silently
- Antimeridian crossing normalises longitude to [-180, 180]
- Negative distance raises ValueError
- Default parameters (direction=90, distance_km=5) applied when not specified
