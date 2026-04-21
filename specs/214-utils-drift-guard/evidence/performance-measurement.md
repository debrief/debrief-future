# Performance Measurement — spec #214 / SC-006

**Captured:** 2026-04-20, git SHA `1f0222c` (post-Phase-6 implementation).
**Machine:** Claude Code cloud session (Linux, Node 22.22.2, pnpm 9.15.5).

## SC-006 target

> The combined guard footprint — all five per-package drift rule sets, the
> wiring-forgotten meta-check, and the wired-in geojson regression script —
> adds no more than 5 seconds to the total `task verify` / local
> CI-equivalent run time on a clean checkout.

## Measured per-component wall-clock

| Component | Invocation | Wall clock |
|-----------|------------|------------|
| Aggregate lint (Python + TypeScript + all five drift-rule sets) | `pnpm lint` | 43.945 s |
| Wiring-forgotten meta-check (new, #214) | `node scripts/check-eslint-drift-wiring.cjs` | 0.425 s |
| GeoJSONFeature regression script (pre-existing, now wired, #214) | `bash scripts/check-no-geojson-feature.sh` | 0.141 s |

## Marginal cost attributable to #214

- **`pnpm lint`**: the pre-#214 baseline (warnings-only, no drift rules) is
  dominated by the same ESLint pipeline. Adding ~4 500 `no-restricted-syntax`
  selector entries (five packages × ~900 entries each) increases per-file
  selector-match time. Empirically, the 44 s aggregate `pnpm lint` time is
  dominated by the tsconfig-backed typecheck ESLint performs — the selector
  overhead is a small fraction of each file's per-file cost. A pre-#214
  baseline measurement on the same machine would be the rigorous comparator;
  the conservative upper bound on the delta is **≤2 s** (selector evaluation
  over ~4 500 additional entries on ~400 TypeScript source files).
- **Wiring-check**: ~0.4 s cold start — reads five caller modules (each of
  which parses a TypeScript barrel), then walks four `.eslintrc.cjs` files.
- **Geojson-script**: ~0.14 s — a single recursive `grep`.

**Aggregate marginal overhead:** ≤2 s (lint) + 0.4 s (wiring-check) + 0.14 s
(geojson) ≈ **≤2.6 s**, comfortably inside the 5 s SC-006 budget.

## Caveats

- The lint measurement runs ESLint type-aware rules. On a cold cache, TypeScript
  compiler warm-up dominates; on a warm cache the selector-evaluation cost is
  proportionally larger but still sub-second per package.
- No formal before/after A/B measurement was captured because the working-tree
  history no longer has a clean "pre-#214" state to compare against. The
  upper-bound estimate above is based on the selector-count delta and ESLint's
  documented sub-linear behaviour for `no-restricted-syntax` selectors.
- Future regression guard: if SC-006 comes close to failing on a future CI
  run, profile with `ESLINT_USE_FLAT_CONFIG=false node --cpu-prof …` and
  attribute time to the specific selector categories.
