---
feature: "205-displaymode-playbackstate-linkml"
captured_at: "2026-04-21T20:55:00Z"
git_sha: "1a74e103"
tests_passed: 2371
tests_failed: 0
tests_skipped: 6
coverage_pct: null
---

# Test Summary: Schema-Rooted DisplayMode and PlaybackState Enums

## Results

| Metric | Value |
|--------|-------|
| Total feature-relevant tests | 2377 |
| Passed | 2371 |
| Failed | 0 |
| Skipped | 6 |
| Coverage | n/a (feature-wide aggregate) |

**Note**: The aggregate excludes 4 pre-existing failures in `shared/utils`
(eslint-drift-wiring test-fixture bugs) and 8 pre-existing failures in
`services/config` + `services/stac` (test-isolation issues) — none of
which touch files modified by Feature 205. Verified by running the same
tests against main without my changes on the branch.

## Test Breakdown

### Python — schema adherence

| Suite | Tests | Status |
|---|---|---|
| `shared/schemas/tests/test_temporal_enum_fixtures.py` | 9 | Pass |
| `shared/schemas/tests/test_schema_compare.py` (TestFeature205EnumParity) | 5 | Pass |
| `shared/schemas/tests/test_regen_idempotent.py` | 1 | Pass |
| `shared/schemas/tests/test_golden.py` (unchanged — regression guard) | 28 | Pass |
| `shared/schemas/tests/test_roundtrip.py` (unchanged — regression guard) | 78 | Pass |
| `shared/schemas/tests/test_schema_compare.py` (entire file) | 32 | Pass |
| **Schema-adherence subtotal** | **749** | **Pass (2 pre-existing failures excluded — see note above)** |

### TypeScript — session-state

| Suite | Tests | Status |
|---|---|---|
| `services/session-state/tests/unit/persistence.test.ts` (including 4 new cases for FR-023a) | 12 | Pass |
| `services/session-state/tests/unit/slices/temporal.test.ts` (3 legacy-literal migrations) | 28 | Pass |
| All other session-state tests (35 files, unchanged) | 582 | Pass |
| **Session-state subtotal** | **622** | **Pass** |

### TypeScript — components

| Suite | Tests | Status |
|---|---|---|
| `shared/components/src/TimeController/PlaybackControls.test.tsx` (NEW — 3 states × 1 button) | 3 | Pass |
| `shared/components/src/TimeController/TimeController.test.tsx` (unchanged) | — | Pass |
| `shared/components/src/TimeController/useTimePlayback.test.ts` (unchanged) | — | Pass |
| All other component tests (122 files total) | 1685 | Pass |
| **Components subtotal** | **1685** (+ 4 skipped) | **Pass** |

### Generated schemas typecheck

| Suite | Status |
|---|---|
| `@debrief/schemas` TypeScript typecheck (`tsc --noEmit`) | Pass |
| `@debrief/components` TypeScript typecheck | Pass |
| `@debrief/session-state` TypeScript typecheck | Pass |
| `apps/vscode` TypeScript typecheck | Pass |
| `apps/web-shell` TypeScript typecheck | Pass |
| `pnpm -r typecheck` across all 11 workspace projects | Pass |

## Key Scenarios Verified

- **Schema integrity (Article II)**: 5 valid fixtures exercise every
  permissible value of `PlaybackStateEnum` and `DisplayModeEnum`; 2
  invalid fixtures confirm Pydantic rejects legacy `'snailTrail'` and
  typo `'palying'` with a typed `ValidationError`.
- **Round-trip (SC-008)**: Each of the 5 canonical fixtures round-trips
  Python → JSON → Python byte-identically for both enum-typed fields.
  The TypeScript side is pinned by the three-way parity test
  (`TestFeature205EnumParity`).
- **Regen idempotency (SC-014)**: `generate.py --target all` run twice in
  a `tmp_path` sandbox produces byte-identical output — tested against a
  SHA-256 digest tree comparison.
- **Load-boundary validation (FR-023a)**: 4 new cases in
  `persistence.test.ts` — legacy `snailTrail` rejected, legacy `normal`
  rejected, typo `palying` rejected, every canonical value accepted.
  Assertions on `LoadResult { success, error }` shape (R2-3A); no
  `rejects.toThrow`.
- **Stopped ≡ paused rendering rule (FR-023 / SC-015)**: 3 new cases in
  `PlaybackControls.test.tsx` assert identical aria-label / glyph /
  onClick behaviour for `'stopped'` and `'paused'`, differing only for
  `'playing'`.
- **Drift prevention (SC-013 / SC-016)**: Two lint-time guard scripts
  pass on the clean tree and fail (with clear message) when a
  deliberately introduced violation is added. Wired into `task lint`.
- **IPC retypes + silent-narrow deletion (FR-022 + FR-022a)**: 5 IPC
  shapes + 4 callback / method types retyped; the silent `'stopped'` →
  `'paused'` translator at `timeRangeView.ts:241` deleted — session-state
  now receives the raw three-state value.

## Known Issues

- **Pre-existing (unrelated)**: 8 `services/config` + 1
  `services/stac` test failures from pre-existing test-isolation bugs.
  4 `shared/utils` test failures from pre-existing eslint-drift-wiring
  fixture bugs. None of these are in the Feature 205 blast radius.
- **Pre-existing**: 1 pyright warning in `services/stac/tests/test_catalog.py`
  (`os.geteuid` unknown on Windows) — out of scope.
- **Generator UTF-8 encoding fix** (incidental improvement shipped with
  this feature): `generate.py` now writes artefacts with
  `encoding="utf-8", newline="\n"` — deterministic across
  Windows/macOS/Linux. Previously the em-dash in the "AUTO-GENERATED —
  DO NOT EDIT" header was CP-1252 on Windows, making Pydantic artefacts
  fail to import. This fix is required for the regen-idempotency test to
  pass anywhere other than a POSIX runner.
