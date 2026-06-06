---
feature: 234-storyboard-edit-polish-followup
captured_at: 2026-04-27T17:17:00Z
git_sha: 047ef69
---

# Perf Budget — `composeSceneEditViewModels` (FR-030)

## Setup

- **Function under test:** `composeSceneEditViewModels` (public API per `shared/components/src/panels/StoryboardPanel/CONTRACTS.md`).
- **Fixture:** 5 × 50 scenes in memory (250 scenes total). The active storyboard holds 50 scenes; the inactive 4 × 50 scenes are allocated alongside to validate the FR-008 active-only invariant — a regression that walked all 250 would surface as a perf cliff.
- **Iterations:** 100 timed runs, single untimed JIT warm-up.
- **Methodology:** `performance.now()` deltas; median + p95 reported.
- **Budgets:** ≤ 50 ms median (hard, local); ≤ 60 ms median (CI soft, 20 % tolerance). Per FR-030 + research R5 + CONTRACTS.md.

## Measured (clean run, 2026-04-27 @ 047ef69)

```
[perf-budget-234] composeSceneEditViewModels: median=0.017ms p95=0.032ms budget=50ms (local hard)
```

| Statistic | Value |
|-----------|-------|
| Median | **0.017 ms** (~ 3000× headroom vs the 50 ms hard budget) |
| p95 | 0.032 ms |
| Budget (hard / soft) | 50 ms / 60 ms |
| Margin | > 99.9 % under budget |

The median is well under the budget, indicating the active-only invariant holds and the composer is tight on the per-Scene cost.

## Test file

`shared/components/src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts`

Run:

```sh
cd shared/components && pnpm exec vitest run src/panels/StoryboardPanel/__tests__/composeSceneEditViewModels.perf.test.ts
```

## Failure-loud guarantee (FR-032)

The test's failure message is intentionally self-diagnosing. When the median exceeds the budget, the assertion message includes:

- the measured median and p95 (so the regressor sees the magnitude immediately),
- the budget cited (hard or CI soft),
- a pointer to `CONTRACTS.md` (so the next reader finds the public-API contract before reading the function body),
- a note on re-baselining conditions (re-baseline only when CONTRACTS.md "Re-baselining conditions" applies — never silently relax).

The format is verifiable by inspecting the `failureMessage` template in the test source.

## Re-baselining

Per CONTRACTS.md "Re-baselining conditions", the budget may be relaxed only when:

1. A new `SceneEditViewModel` field requires non-trivial composition (the new median MUST still be ≤ 50 ms; if not, the addition is a perf regression).
2. The reducer state shape changes such that the composer must consult an additional inbound source.
3. The fixture scale changes (e.g., spec-scale active storyboard moves beyond 50 Scenes) — the budget MUST then be expressed as a per-Scene cost and re-derived.

Any re-baseline MUST land alongside an entry in `shared/components/CHANGELOG.md` and an update to `CONTRACTS.md`.

## References

- spec.md FR-030, FR-031, FR-032, FR-046
- research.md R5, R13
- data-model.md §5
- `shared/components/src/panels/StoryboardPanel/CONTRACTS.md`
- `shared/components/CHANGELOG.md` ("Unreleased — Public API")
- Parent invariant FR-008 from `specs/230-storyboard-edit-wiring/spec.md`
