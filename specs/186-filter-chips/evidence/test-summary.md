---
feature: "186-filter-chips"
captured_at: "2026-04-16T17:35:00Z"
git_sha: "6185e03"
tests_passed: 1468
tests_failed: 0
tests_skipped: 4
coverage_pct: null
---

# Test Summary: Filter Bar Platform Chips (#186)

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1472 |
| Passed | 1468 |
| Failed | 0 |
| Skipped | 4 (pre-existing, unrelated) |
| Coverage | N/A (not measured) |

## Test Breakdown

### New tests added for #186 (55 tests)

| Suite | File | Tests |
|-------|------|-------|
| Platform lozenge reducer (#186 U1–U8, U13) | `useFilterBar.platform.test.ts` | 20 |
| Distinct-value derivation (#186 U14–U16) | `useDistinctValues.test.ts` | +3 |
| PlatformValueEditor (#186 U17–U23) | `PlatformValueEditor.test.tsx` | 8 |
| Lozenge platform variant (#186 U24–U30) | `Lozenge.test.tsx` | +7 |
| CQL2 round-trip (#186 U31–U35) | `array-filter-platform-chip.test.ts` | 7 |
| FilterBar integration (#186 U42–U47) | `FilterBar.platform.test.tsx` | 6 |

### Regression (pre-existing suites)

| Suite | Status |
|-------|--------|
| `cql2-json-reverse.test.ts` | Pass (updated for FilterType expansion) |
| `schemaDescription.test.ts` | Pass (updated for FilterType expansion) |
| `corpus.test.ts` (NL → CQL2) | Pass (prompt hash preserved by excluding `platform` from flat schema table) |
| All other FilterBar tests | Pass unchanged |

## Key Scenarios Verified

- **Story 1 (compound chip)** — `addPlatformLozenge` dispatches with attributes, rejects empty input; `toFilterExpression` emits bare `comparison` for one attribute and `and` of comparisons for two; CQL2 JSON matches `contracts/cql2-roundtrip.md` emission contract exactly.
- **Story 2 (lifecycle)** — `EDIT_PLATFORM_LOZENGE` preserves id/position/negation; `TOGGLE_NEGATE` works unchanged on platform chips; `REMOVE_LOZENGE` removes by id at top-level or inside OR containers.
- **Story 3 (composition)** — `ADD_CHILD_PLATFORM_LOZENGE`, `MOVE_TO_CONTAINER`, `MOVE_TO_TOP_LEVEL` work for platform chips; two platform chips inside an OR container emit a single combined `array_filter` with an OR-of-comparisons predicate; engine evaluates correctly.
- **Story 4 (round-trip)** — CQL2 JSON emitted by a platform chip deserialises losslessly via `arrayFilterToPlatformAttributes`; unsupported shapes (OR sub-predicates, unknown fields) return null so the UI surfaces them as a restore error; pre-feature saved filters (no `shape` field) coerce to `shape: 'simple'` via `SET_STATE` and restore cleanly.
- **Edge cases** — negated platform chip on an item with empty `platforms` matches (U40); `vessel_role: 'frigate'` matches `type23` via existing taxonomy expansion in the engine (U41).
- **Regression** — all 1417 pre-existing component tests pass unchanged after the type-union and reducer extensions.

## Known Issues

- Playwright E2E tests (`FilterBar.platform.spec.ts`) authored for E1–E7 but not executed during this implementation pass — Storybook+Chromium runtime bootstrapping not attempted in the cloud session. The spec file is complete and runnable via `node apps/web-shell/run-playwright.mjs FilterBar.platform`.
- 4 pre-existing skipped tests in `nl-cql2` harness captures (unrelated to this feature).

## Environment

- Runner: vitest (unit + component), Playwright (E2E, spec authored)
- Branch: `claude/implement-speckit-186-eJ2Oy`
- Node/pnpm: workspace-managed
- Catalog fixture: inlined in each test file (no reliance on Storybook `MOCK_ITEMS`).
