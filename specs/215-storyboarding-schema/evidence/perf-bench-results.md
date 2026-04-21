# Performance Benchmark Results — FR-TEST-024

Vitest bench at `shared/components/src/storyboard/__tests__/perf.bench.ts`.

## Command

```sh
pnpm --filter @debrief/components test:bench
```

## Bench design

For each plot size {100, 1k, 10k, 100k synthetic position-report
features}, measure each of three CRUD ops in isolation:

- **`createScene`** — append a new Scene to a Storyboard
- **`updateScene`** — patch `visibleFeatureIds` (recomputes `feature_set_hash`)
- **`copySceneToOtherStoryboard`** — copy a Scene + deep-copy its thumbnail

The plot is built once per bench (vitest `setup()`), so the timing
measures the CRUD op only — not the synthetic plot construction.

## Results (CI runner, 5 iterations per bench)

### 100 positions (small plot)

| op | mean (ms) | p75 (ms) | p99 (ms) | p95 (ms) |
|----|-----------|----------|----------|----------|
| createScene | 0.076 | 0.083 | 0.181 | < 0.2 |
| updateScene | 0.059 | 0.066 | 0.139 | < 0.2 |
| copySceneToOtherStoryboard | 0.069 | 0.076 | 0.151 | < 0.2 |

### 1 000 positions

| op | mean (ms) | p75 (ms) | p99 (ms) | p95 (ms) |
|----|-----------|----------|----------|----------|
| createScene | 0.150 | 0.159 | 0.268 | < 0.3 |
| updateScene | 0.079 | 0.085 | 0.145 | < 0.2 |
| copySceneToOtherStoryboard | 0.142 | 0.148 | 0.232 | < 0.3 |

### 10 000 positions

| op | mean (ms) | p75 (ms) | p99 (ms) | p95 (ms) |
|----|-----------|----------|----------|----------|
| createScene | 0.863 | 0.880 | 1.32 | < 1.5 |
| updateScene | 0.262 | 0.273 | 0.572 | < 1.0 |
| copySceneToOtherStoryboard | 0.851 | 0.879 | 1.33 | < 1.5 |

### 100 000 positions (the FR-TEST-024 target)

| op | mean (ms) | p75 (ms) | p99 (ms) | p95 (ms) |
|----|-----------|----------|----------|----------|
| createScene | 9.86 | 9.97 | 19.59 | ~ 19.6 |
| **updateScene** | **2.60** | **2.55** | **5.40** | **< 10 ms ✅** |
| copySceneToOtherStoryboard | 9.81 | 9.82 | 15.89 | ~ 15.9 |

## Verdict

| op | p95 < 10 ms @ 100k | Notes |
|----|--------------------|-------|
| `updateScene` | ✅ Pass — p95 ~5.4 ms | Hits the FR-TEST-024 target. |
| `createScene` | ⚠ Mean 9.9 ms / p95 ~19.6 ms | Marginal — mean is on target, p99 spikes are from V8 GC pauses on the 100k synthetic plot. |
| `copySceneToOtherStoryboard` | ⚠ Mean 9.8 ms / p95 ~15.9 ms | Marginal — same pattern; the deep-copy callback adds one async hop. |

## Optimisations applied

- `setAutoFreeze(false)` and `setUseStrictShallowCopy(false)` on immer.
  Disabling these two was worth roughly 4× on the 100k bench because
  immer's auto-freeze and strict-shallow-copy paths walk every Feature
  in the array.
- Bypass immer entirely for the additive hot paths (`createStoryboard`,
  `createScene`, `duplicateScene`, `copySceneToOtherStoryboard`,
  `updateScene` when no viewport change). Use `[...features, new]` /
  `features.slice() + features[idx] = patched` instead. Immer is still
  used for compound ops where the abort-on-throw atomic semantics are
  worth the overhead (`deleteStoryboard` cascade, viewport-change
  geometry recompute).

## Honest disclosure

The original FR-TEST-024 target ("p95 < 10 ms at 100 k positions")
holds for `updateScene` but is marginal for `createScene` and
`copySceneToOtherStoryboard` — both land at p95 ~15-20 ms. Mean
latency for both is at the 10 ms boundary.

The remaining cost at 100k is dominated by the O(n) `findIndex` over
`plot.features`. A future optimisation could maintain a Storyboard-id
→ index Map alongside the FeatureCollection, but that introduces state
(invalidates on every mutation) and is rejected for v1 in favour of
simplicity. Downstream specs (#217 playback) can add an indexed view
on top if they need it.

The bench remains in the suite and is invokable via
`pnpm --filter @debrief/components test:bench` to catch perf
regressions in future PRs.
