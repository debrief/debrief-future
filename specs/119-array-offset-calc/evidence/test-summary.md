---
feature: "119-array-offset-calc"
captured_at: "2026-04-14T17:06:10Z"
git_sha: "3d42aa0"
tests_passed: 1389
tests_failed: 0
tests_skipped: 0
coverage_pct: 73
---

# Test Summary: Array Offset Calculations (119)

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 1389 |
| Passed | 1389 |
| Failed | 0 |
| Skipped | 0 |
| Python module coverage | 73% (array_offset.py) |

> Test totals cover the full project suites exercised while validating feature
> 119: **1349** `@debrief/components` vitest tests + **40** calc pytest tests
> directly targeting the array-offset module.  A broader `uv run pytest
> services/calc/` run reports **560 passed** and is included in the CI gate.

## Test Breakdown

### TypeScript — `shared/components/src/MapView/__tests__/array-offset.test.ts` (39 tests)

| Suite | Test | Status |
|-------|------|--------|
| haversineDistanceMetres | zero distance, 1° lat at equator, antimeridian, equator → pole, symmetry (5) | Pass |
| golden fixture | 7 contract cases present + tolerance declared (2) | Pass |
| computeArrayCentre (dispatcher) | null offset / zero offset / null mode / PLAIN dispatch / WORM dispatch / null course fallback / unknown mode (7) | Pass |
| computePlainOffset | Case 1 eastward, Case 2 northward, Case 7 zero offset, course 360° = 0°, negative course (5) | Pass |
| backtrackAlongTrack | Case 3 straight, Case 4 through turn, track-exhausted fallback, single-position, before-range fallback (5) | Pass |
| interpolateMeasuredPosition | Case 5 midpoint, exact boundary, before range → null, after range → null, empty → null, unordered input sorted, Case 6 PLAIN fallback (7) | Pass |
| golden fixture cases (TS) | each of the 7 contract cases within tolerance (7) | Pass |
| performance | 1000 contacts computed within the 1-second budget (1) | Pass |

### TypeScript — `sensor-utils.test.ts` integration (5 new tests)

| Test | Status |
|------|--------|
| origin at host position when mode unset | Pass |
| PLAIN mode shifts origin backward along course | Pass |
| WORM differs from PLAIN when vessel turned (FR-005) | Pass |
| larger offset ⇒ further origin (FR-006) | Pass |
| explicit `contact.origin` still overrides offset | Pass |

### Python — `services/calc/tests/tools/sensor/test_array_offset.py` (32 tests)

| Class | Tests | Status |
|-------|-------|--------|
| `TestHaversineDistanceMetres` | 5 | Pass |
| `TestComputePlainOffset` | 5 | Pass |
| `TestBacktrackAlongTrack` | 6 | Pass |
| `TestInterpolateMeasuredPosition` | 7 | Pass |
| `TestComputeArrayCentre` | 7 | Pass |
| `TestGoldenFixture` | 2 | Pass |

### Python — `services/calc/tests/tools/sensor/test_array_offset_parity.py` (8 tests)

| Test | Status |
|------|--------|
| `case-1-plain-eastward` parity | Pass |
| `case-2-plain-northward` parity | Pass |
| `case-3-worm-straight` parity | Pass |
| `case-4-worm-through-turn` parity | Pass |
| `case-5-measured-midpoint` parity | Pass |
| `case-6-measured-fallback-plain` parity | Pass |
| `case-7-zero-offset` parity | Pass |
| sanity: fixture exposes 7 cases | Pass |

## Key Scenarios Verified

- **PLAIN straight-line backtrack (US1, FR-001, FR-007)** — vessel at (0°, 50°N) heading 090°, 500m offset → origin ~500m west; golden tolerance 1m.
- **WORM through a 90° turn (US2, FR-002)** — backtrack 2km from a post-turn position traces onto the pre-turn leg (tolerance 5m accounts for accumulated rounding on multi-segment walks).
- **WORM track exhaustion (FR-008)** — offsets that exceed available track length clamp the array centre to the earliest fix rather than extrapolating.
- **MEASURED fallback to PLAIN (US3, FR-004)** — contacts whose timestamps fall before the measured range fall back to `compute_plain_offset` using the host heading.
- **Unordered measured input** — algorithm sorts by timestamp before the bracket search.
- **Mode invalidation (US4, FR-005/FR-006)** — switching between PLAIN and WORM, or from 500m → 1000m offset, produces materially different origins (verified via `prepareSensorContacts` integration).
- **Explicit override precedence** — `contact.origin` bypasses every offset computation (backward compatibility).
- **Performance (SC-004)** — 1000 contacts recalculated through the full WORM pipeline in well under 1s.

## Cross-language parity

All 7 contract cases reproduce the shared golden fixture
(`shared/schemas/src/fixtures/valid/array-offset-golden-01.json`) in
both TypeScript and Python within the declared tolerance. See
[`golden-parity.md`](./golden-parity.md) for the per-case table.

## Known Issues

- None.

## Environment

- Runner: vitest 1.6.x + pytest 9.0.x
- Branch: `claude/implement-backlog-119-uSlQ7`
- Node: via pnpm workspace
- Python: 3.11.15 (uv-managed venv)
- Date: 2026-04-14
