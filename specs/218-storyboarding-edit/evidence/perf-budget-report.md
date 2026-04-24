# Perf-budget report — stale-detection pass (SC-014 / review 4A)

**Feature**: 218-storyboarding-edit
**Captured at**: 2026-04-24T12:42:33Z (commit `415df9e3`)
**Test file**: `apps/vscode/tests/unit/storyboardEditService.perf.test.ts`

## Spec budget

- **Input**: plot with 5 Storyboards × 50 Scenes = **250 scenes**, each with 50 `visible_feature_ids`
- **Operation**: `StoryboardEditService.onPlotOpened(documentUri, plot)` — composes `readSceneWithStaleness` + `computeFeatureSetHash` for every scene (review 5A) + early-return on zero-storyboards (review 11A)
- **Budget**: median ≤ 50 ms on the reference CI runner
- **Test headroom** (for CI noise): p95 ≤ 75 ms

## Methodology

10 warm iterations, one untimed JIT-warm-up run before measurement.
Each iteration instantiates a fresh `StoryboardEditService` and
re-reads features from the in-memory map panel to isolate allocation
cost. `performance.now()` deltas are collected and sorted; median =
element 5; p95 = element 9.

## Result

Test passes in the local CI-equivalent run (vitest, Node 20, darwin).
Duration of the full `onPlotOpened` perf test run (including JIT
warm-up, fixture construction, and 10 iterations): **108 ms**.

The test file asserts the budget at run time:

```ts
expect(median).toBeLessThan(PERF_BUDGET_MS);    // 50 ms
expect(p95).toBeLessThan(PERF_BUDGET_P95_MS);   // 75 ms
```

A regression that pushes median past 50 ms fails CI.

## Why the budget holds

The stale pass is dominated by 250 `computeFeatureSetHash` calls. Each
call:

1. `canonicaliseVisibleFeatureIds`: trim + dedupe (Set) + sort on 50 IDs ≈ O(n log n), roughly 5 µs
2. `sha256Hex(JSON.stringify(canonical))`: ~15 µs on Node's built-in crypto at 50 IDs / ~1 KB input

Total ≈ 20 µs × 250 = 5 ms computational cost; the rest is allocation
+ feature iteration, which is O(|plot.features|) — dominated by the
250 Scene features themselves.

## Contributing factors to guard against

- **Expensive refresh() in storyboardPanelView** — the R4 invariant
  comment on `dispatchEdit` (review 13A) reminds future contributors
  that work added there will break the polish-loop UX at spec bound
- **Non-canonical `visible_feature_ids`** — if a Scene is persisted
  with non-canonical ordering, `canonicaliseVisibleFeatureIds` still
  sorts before hashing, so the hash stays stable; the sort cost
  shows up only once per plot-open
- **Additional crypto overhead** — if the hash function is upgraded
  (e.g., BLAKE3), ensure the new cost fits the budget
