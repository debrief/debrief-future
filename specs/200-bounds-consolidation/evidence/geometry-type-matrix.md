# Per-geometry-type assertion matrix (T022)

**Feature**: 200-bounds-consolidation
**Covers**: FR-008, SC-007, contract C6.
**Date**: 2026-04-20
**Git SHA**: `b3d1d99`

---

## Why this matrix exists

FR-008 requires `fitToSelection` to honour every geometry type the
consolidated utility supports. The durable mechanism for that guarantee
is **per-geometry-type unit tests at the utility** — if any geometry
branch is ever dropped from `extractCoordinates`, the corresponding
assertion fails and blocks merge. (SC-007's enforcement property.)

This table summarises the T007 assertion set — each row is a single
test in `shared/utils/tests/bounds.test.ts::describe('per-geometry-type correctness (T007)')`.

## The matrix

| Geometry type | Input fixture (abridged) | Expected bounds `[minLon, minLat, maxLon, maxLat]` | Why this specific fixture |
|---------------|-------------------------|-----------------------------------------------------|---------------------------|
| **Point** | `{ type: 'Point', coordinates: [3, 7] }` | `[3, 7, 3, 7]` | Degenerate bounds for a single coordinate — the minimum possible non-null output. |
| **LineString** | `{ type: 'LineString', coordinates: [[0, 0], [10, 5], [-2, 15]] }` | `[-2, 0, 10, 15]` | Non-monotonic coordinates — forces the min/max reducer to find extremes on non-endpoint vertices. |
| **Polygon** | `{ type: 'Polygon', coordinates: [[[0, 0], [20, 0], [20, 10], [0, 10], [0, 0]]] }` | `[0, 0, 20, 10]` | Closed outer ring — exercises the nested-array branch at depth 3 (rings of points). |
| **MultiPoint** | `{ type: 'MultiPoint', coordinates: [[1, 2], [5, 10], [-3, -4]] }` | `[-3, -4, 5, 10]` | Same coordinate shape as LineString but different geometry type — locks in that the MultiPoint branch dispatch exists. |
| **MultiLineString** | `{ type: 'MultiLineString', coordinates: [[[0, 0], [10, 10]], [[-5, 2], [3, -7]]] }` | `[-5, -7, 10, 10]` | Two disjoint lines — min/max must span across sub-arrays, not just within one. |
| **MultiPolygon** | `{ type: 'MultiPolygon', coordinates: [[[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]], [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]]] }` | `[0, 0, 20, 20]` | Two disjoint polygons — exercises the deepest nesting (depth 4), confirms extremes span across outer-array elements. |

## Assertion locations

All six are in `shared/utils/tests/bounds.test.ts`, in the
`describe('per-geometry-type correctness (T007)', ...)` block. They run
on every `pnpm --filter @debrief/utils test` invocation — which is
part of the CI gate.

## Drift-prevention property

If a future edit to `shared/utils/src/bounds.ts` removes or breaks the
handling for any of these types:

- The matching assertion fails (e.g. the Polygon test would return
  `null` instead of `[0, 0, 20, 10]`).
- CI fails.
- Merge is blocked.

This is the test-level mechanism that backs the constitution's
"no silent failures" requirement (Article I.3) for the bounds utility.

## Link to `fitToSelection`

The `fitToSelection` rewrite (T016) delegates 100% to `calculateBounds`.
That means the same six assertions also cover the behavioural
guarantee that `fitToSelection` honours every supported geometry type
(US4 AS-1 through AS-4) — no separate test infrastructure is needed at
the `mapPanel.ts` layer.

---

*(FR-008, SC-007; C6.)*
