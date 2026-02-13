# Test Summary: Generate Reference Points

**Date**: 2026-02-13
**Feature**: 078-generate-reference-points

## Python (pytest)

**Total**: 28 passed, 0 failed, 0 skipped

| Suite | Tests | Status |
|-------|-------|--------|
| TestGridBasic | 6 | PASS |
| TestGridEdgeCases | 7 | PASS |
| TestScatterBasic | 6 | PASS |
| TestScatterEdgeCases | 4 | PASS |
| TestDownstreamCompatibility | 3 | PASS |
| TestCrossLanguageParity | 2 | PASS |

### Key Scenarios Verified

- 3x4 grid produces 12 coordinates at correct positions
- 1x1 grid returns centre point of bounding box
- 5x5 grid has 25 coordinates at even intervals
- Feature properties (kind=POINT, locationType=REFERENCE, style)
- pointMetadata parallel to coordinates with correct index/name
- Zero-area bounds, negative rows/cols, south>north: all raise ValueError
- Scatter count=20 with seed=42: reproducible output
- Different seeds produce different coordinates
- All scatter points within bounding box
- Antimeridian crossing (west > east) normalises longitudes to [-180, 180]
- Grid and scatter golden examples match exactly
- Cross-language parity verified against golden output

## TypeScript (vitest)

**Total**: 25 passed, 0 failed

| Suite | Tests | Status |
|-------|-------|--------|
| Grid Pattern | 6 | PASS |
| Grid Edge Cases | 7 | PASS |
| Scatter Pattern | 6 | PASS |
| Scatter Edge Cases | 4 | PASS |
| Cross-Language Parity | 2 | PASS |

### Cross-Language Parity

Both Python and TypeScript produce identical output for the same inputs:
- Grid golden example: 12 coordinates match exactly
- Scatter golden example (seed=42): 20 coordinates match within 1e-6 tolerance
- LCG PRNG constants are identical: multiplier=1664525, increment=1013904223, mod=2^32

## Regression Tests

All existing tests continue to pass:
- Python: 359 passed, 1 skipped (full test suite)
- TypeScript: 290 passed (full test suite, 2 pre-existing file failures unrelated to this feature)
