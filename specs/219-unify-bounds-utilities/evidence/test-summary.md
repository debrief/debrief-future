---
feature: "219-unify-bounds-utilities"
captured_at: "2026-04-21T17:20:00Z"
git_sha: "f7467d5"
tests_passed: 300
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Unify `shared/components` bounds utilities with `@debrief/utils`

## Results

| Metric | Value |
|--------|-------|
| Total Tests (`@debrief/utils`) | 300 |
| Passed | 300 |
| Failed | 0 |
| Skipped | 0 |
| Test Files | 18 |

`@debrief/components` tests: 1647 passed, 4 skipped (124 test files).

## Test Breakdown

### `shared/utils/tests/bounds.test.ts` — 75 tests

This file grew from the pre-feature state (the original 4-helper test suite, ~26 tests) to 75 tests after absorbing migrations and new fast-path coverage.

| Suite | Tests | Status |
|-------|-------|--------|
| `calculateBounds` — basic cases | 5 | ✓ Pass |
| `calculateBounds` — narrowing gate (T004) | 5 | ✓ Pass |
| `calculateBounds` — null-geometry regression (T005) | 4 | ✓ Pass |
| `calculateBounds` — per-geometry-type (T007) | 6 | ✓ Pass |
| `calculateBounds` — FeatureCollection-shaped input (migrated) | 4 | ✓ Pass |
| `calculateBounds` — pre-computed bbox fast-path (FR-011) | 8 | ✓ Pass |
| `expandBounds` (migrated) | 3 | ✓ Pass |
| `isPointInBounds` (migrated) | 4 | ✓ Pass |
| `mergeBounds` | 4 | ✓ Pass |
| `boundsToLeaflet` | 1 | ✓ Pass |
| `isValidBounds` | 4 | ✓ Pass |
| `viewportToBounds` (migrated from shared/components) | 7 | ✓ Pass |
| `bboxOverlapsViewport` — standard (migrated) | 9 | ✓ Pass |
| `bboxOverlapsViewport` — antimeridian (migrated) | 6 | ✓ Pass |
| `filterBySpatialExtent` (migrated) | 5 | ✓ Pass |

### `shared/utils/tests/bounds.types.test-d.ts` — compile-time type assertions (FR-016)

| Assertion | Status |
|-----------|--------|
| `DebriefFeature[]` assigns to `calculateBounds` parameter | ✓ Pass |
| `SafeFeature[]` assigns | ✓ Pass |
| `GeoJSONFeature[]` assigns (structural minimum) | ✓ Pass |
| `BoundsInputFeature`-literal assigns | ✓ Pass |
| `DebriefFeatureCollection` does NOT assign directly (callers unwrap) | ✓ Pass (`@ts-expect-error`) |

### Assertion delta (SC-003)

| Category | Count |
|----------|-------|
| Pre-feature assertions in `shared/utils/tests/bounds.test.ts` | ~26 |
| Migrated verbatim from `shared/components/src/utils/bounds.test.ts` | ~26 |
| Migrated from `shared/components/src/utils/__tests__/utils.test.ts` | ~11 |
| Net-new fast-path assertions (FR-011) | 8 |
| Net-new type-level assertions (`bounds.types.test-d.ts`) | 5 |
| **Total post-feature** | **75 + 5 type** |
| Net loss | **0** (SC-003 satisfied) |

## Key Scenarios Verified

- **SC-001 / SC-002**: A repo-wide grep for `export function calculateBounds` in TypeScript source returns exactly one match (`shared/utils/src/bounds.ts`). Zero copies elsewhere.
- **SC-003**: Zero net loss of assertions — all migrated tests pass at their new location. Net gain of 13 assertions (8 fast-path + 5 type-level).
- **FR-008 / FR-011**: The fast-path proof test confirms that when a feature carries `bbox = [0, 0, 5, 5]` and inconsistent `geometry.coordinates = [[-100, -100]]`, the result is `[0, 0, 5, 5]` — proving the coordinate walk was skipped.
- **FR-009**: Invalid bboxes (`NaN`, length < 4, `null`, `undefined`) all fall back to coordinate walk without throwing.
- **FR-010**: Common-path regression test confirms no-bbox inputs produce byte-identical output to the pre-change implementation.
- **FR-016**: Compile-time type assertions confirm `DebriefFeature[]`, `SafeFeature[]`, and `GeoJSONFeature[]` all assign to `calculateBounds` without casts.
- **Antimeridian handling**: All 6 antimeridian-crossing edge cases pass, confirming the `bboxOverlapsViewport` behaviour from `shared/components` was preserved exactly.
- **Consumer migration**: `@debrief/components` test suite (1647 tests) passes with all three consumer files (`MapView.tsx`, `LeafletToolbar.tsx`, `useBrowserFilter.ts`) importing from `@debrief/utils`.

## Known Issues

- `apps/vscode` pretest fails due to a pre-existing `@debrief/session-state` unbuilt dependency — unrelated to this feature. This failure existed on `main` before this branch.

## Environment

- Runner: vitest (TypeScript unit tests)
- Branch: `claude/implement-speckit-219-5QAMm`
- Date: 2026-04-21
