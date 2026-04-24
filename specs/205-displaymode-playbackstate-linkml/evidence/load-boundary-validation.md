# Load-boundary validation evidence (Feature 205 / FR-023a)

**Generated**: 2026-04-21T20:48:27Z
**Git SHA**: 1a74e103

## Test transcript

Ran `pnpm --filter @debrief/session-state exec vitest run tests/unit/persistence.test.ts -t 'temporal enum validation'`:

```

[7m[1m[36m RUN [39m[22m[27m [36mv1.6.1[39m [90mC:/git/debrief-future/services/session-state[39m

 [32m✓[39m tests/unit/persistence.test.ts [2m ([22m[2m22 tests[22m [2m|[22m [33m18 skipped[39m[2m)[22m[90m 8[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m4 passed[39m[22m[2m | [22m[33m18 skipped[39m[90m (22)[39m
[2m   Start at [22m 21:48:26
[2m   Duration [22m 1.03s[2m (transform 249ms, setup 0ms, collect 591ms, tests 8ms, environment 0ms, prepare 161ms)[22m

```

## Summary

All 4 new load-boundary cases pass:

1. Legacy displayMode `'snailTrail'` → `{ success: false, error: 'Invalid temporal.displayMode...' }`
2. Legacy displayMode `'normal'` → `{ success: false, error: 'Invalid temporal.displayMode...' }`
3. Typo playbackState `'palying'` → `{ success: false, error: 'Invalid temporal.playbackState...' }`
4. Every canonical permissible-value combination (3 × 2 = 6 payloads) → `{ success: true, error: undefined }`

Assertions are on `result.success` + `result.error` shape only — no `rejects.toThrow` (R2-3A compliance).
The `LoadResult` return-pattern is preserved (R2-1A compliance); no `SessionLoadError` class introduced.
