## Summary

- Implement point-in-zone classifier tool — step 4 of the E03 buffer zone analysis chain
- Classifies reference points by testing each coordinate against concentric detection zone polygons using ray-casting algorithm (innermost-first priority)
- Updates per-point metadata with zone name and color, adds `pointColors` array for per-point rendering
- Dual implementation in Python (debrief-calc) and TypeScript (VS Code + web-shell) with identical algorithm

## Changes

### Phase 1: Specification & Setup
- Feature spec at `specs/081-point-in-zone-classifier/spec.md` (3 user stories, 14 functional requirements)
- Tool spec at `shared/tools/reference/classification/point-in-zone-classifier.1.0.md` (all 9 required sections)
- 2 golden I/O example pairs (basic classification + all-outside)

### Phase 2: Implementation Plan
- Research document resolving algorithm, context type, result type, color mapping, and dependency questions
- Data model, tool contract, and quickstart documentation
- Constitution check: all articles pass

### Phase 3: Python Implementation
- `services/calc/debrief_calc/tools/reference/classification.py` — ray-casting `_point_in_polygon` + `point_in_zone_classifier` registered via `@tool` decorator with `ContextType.MULTI`
- Registered in `reference/__init__.py` and `tools/__init__.py`

### Phase 4: Python Tests (22 tests, all passing)
- `TestClassifyBasic` (7 tests) — zone assignment, pointColors, innermost-first priority
- `TestMetadataPreservation` (4 tests) — field preservation, reclassification, no mutation
- `TestDeterminism` (2 tests) — identical output, geometry unchanged
- `TestEdgeCases` (7 tests) — missing features, wrong geometry types, metadata mismatch, empty inputs
- `TestGoldenExamples` (2 tests) — validated against golden I/O files

### Phase 5: TypeScript Implementation
- `apps/vscode/src/tools/reference/classification/pointInZoneClassifier.ts` — identical ray-casting algorithm
- Barrel export at `apps/vscode/src/tools/reference/classification/index.ts`
- Registered in `apps/web-shell/src/services/toolService.ts`

## Evidence

### Test Results

| Metric | Value |
|--------|-------|
| Total Tests | 22 |
| Passed | 22 |
| Failed | 0 |

| Test Class | Tests | Status |
|-----------|-------|--------|
| TestClassifyBasic | 7 | All pass |
| TestMetadataPreservation | 4 | All pass |
| TestDeterminism | 2 | All pass |
| TestEdgeCases | 7 | All pass |
| TestGoldenExamples | 2 | All pass |

### Golden Example Validation

- `point-in-zone-classifier.basic` — PASS (6 points: 3 in 75%, 1 in 50%, 2 outside)
- `point-in-zone-classifier.all-outside` — PASS (4 points: all outside)

### Usage Example

```python
from debrief_calc.tools.reference.classification import point_in_zone_classifier

result = point_in_zone_classifier(context, {})
classified = result[0]

for md in classified["properties"]["pointMetadata"]:
    print(f"{md['name']}: zone={md['zone']}, color={md['color']}")
# Ref 1: zone=75%, color=#9C27B0
# Ref 4: zone=50%, color=#F44336
# Ref 5: zone=none, color=#666666

print(classified["properties"]["pointColors"])
# ["#9C27B0", "#9C27B0", "#9C27B0", "#F44336", "#666666", "#666666"]
```

### E03 Pipeline Position

```
Step 1: generate-reference-points  → MultiPoint (POINT/REFERENCE)
Step 2: (move track)               → Track feature updated
Step 3: buffer-zone-generator      → MultiPolygon (ZONE)
Step 4: point-in-zone-classifier   → MultiPoint (classified, with pointColors)  ← THIS
Step 5: zone-histogram-generator   → Histogram (counts per zone)
```

## Test Plan

- [x] 22 Python unit tests covering all 3 user stories + edge cases
- [x] 2 golden example validation tests (basic + all-outside)
- [x] TypeScript compilation passes with no errors
- [x] Identical ray-casting algorithm in both languages
- [x] Metadata preservation verified (no mutation of input)
- [x] Determinism verified (same inputs → same output)

## Related

- Spec: `specs/081-point-in-zone-classifier/spec.md`
- Tasks: `specs/081-point-in-zone-classifier/tasks.md`
- Tool spec: `shared/tools/reference/classification/point-in-zone-classifier.1.0.md`
- Dependencies: #078 (generate-reference-points), #080 (buffer-zone-generator)
- Downstream: #082 (zone-histogram-generator)
