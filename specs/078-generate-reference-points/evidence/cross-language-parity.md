# Cross-Language Parity: Generate Reference Points

**Date**: 2026-02-13

## Method

Both Python and TypeScript implementations were invoked with identical inputs (the golden example parameters). Outputs were compared coordinate-by-coordinate.

## Grid Parity (seed-independent)

**Input**: `pattern="grid"`, `bounds=[-5, 49, 1, 52]`, `rows=3`, `cols=4`

| Coordinate | Python | TypeScript | Match |
|-----------|--------|------------|-------|
| [0] | [-5.0, 49.0] | [-5.0, 49.0] | EXACT |
| [1] | [-3.0, 49.0] | [-3.0, 49.0] | EXACT |
| [2] | [-1.0, 49.0] | [-1.0, 49.0] | EXACT |
| [3] | [1.0, 49.0] | [1.0, 49.0] | EXACT |
| [4] | [-5.0, 50.5] | [-5.0, 50.5] | EXACT |
| [5] | [-3.0, 50.5] | [-3.0, 50.5] | EXACT |
| [6] | [-1.0, 50.5] | [-1.0, 50.5] | EXACT |
| [7] | [1.0, 50.5] | [1.0, 50.5] | EXACT |
| [8] | [-5.0, 52.0] | [-5.0, 52.0] | EXACT |
| [9] | [-3.0, 52.0] | [-3.0, 52.0] | EXACT |
| [10] | [-1.0, 52.0] | [-1.0, 52.0] | EXACT |
| [11] | [1.0, 52.0] | [1.0, 52.0] | EXACT |

**Result**: 12/12 coordinates match exactly

## Scatter Parity (seed=42, LCG PRNG)

**Input**: `pattern="scatter"`, `bounds=[-5, 49, 1, 52]`, `count=20`, `seed=42`

Both implementations use identical LCG constants:
- Multiplier: 1664525
- Increment: 1013904223
- Modulus: 2^32 (4294967296)

**Result**: 20/20 coordinates match within 1e-6 tolerance (floating-point arithmetic differences)

## Verification Method

- Python: `TestCrossLanguageParity` in `test_generation.py` (2 tests)
- TypeScript: `Cross-Language Parity` in `generateReferencePoints.test.ts` (2 tests)
- Both suites compare against the same golden output files
