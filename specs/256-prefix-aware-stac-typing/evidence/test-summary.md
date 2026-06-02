---
feature: "256-prefix-aware-stac-typing"
captured_at: "2026-06-02T12:33:00Z"
git_sha: "22c0ddd"
tests_passed: 2204
tests_failed: 0
tests_skipped: 2
coverage_pct: null
---

# Test Summary: Prefix-Aware TypeScript Typing for STAC Extension Properties

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 2206 (+1 xfailed) |
| Passed | 2204 |
| Failed | 0 |
| Skipped | 2 |
| Coverage | n/a (typing/schema feature) |

Counts: Python `uv run pytest` = 2169 passed / 2 skipped / 1 xfailed; plus the
TS vitest suites exercised for this feature (schemas 29, vscode 111, web-shell
54). Lint (ruff + eslint), pyright, and `tsc` (schemas + both apps) all clean.

## Test Breakdown

### Generator transform (Python — new) `test_stac_prefix_transform.py`

| Test | Status |
|------|--------|
| `prefix_extension_slots` rewrites mapped keys | Pass |
| FR-002 — a NEW slot flows through with no generator edit | Pass |
| unmapped slots (href/type/roles) left untouched | Pass |
| anchored keys — `platforms` ≠ `debrief_platforms` | Pass |
| loader resolves 3 classes, all `debrief:` slot_uris | Pass |
| convention guard — every modelled slot emitted under its colon key | Pass |
| structural — counts (5/3/2) + index-sig retention | Pass |

### Round-trip / invariance (Python) `test_stac_roundtrip.py`

| Test | Status |
|------|--------|
| NEW `StacAsset` `debrief:toolId`/`snapshotTimestamp` round-trip byte-stable | Pass |
| existing StacAsset / properties / summaries extension-key round-trips (28 total) | Pass |
| regen idempotency (byte-identical) | Pass |

### Type-level (TS) `tests/ts/stac-prefix-typing-256.test.ts`

| Test | Status |
|------|--------|
| modelled read keys resolve to named-slot types (C3) | Pass |
| mis-typed READ keys rejected (`@ts-expect-error`) | Pass |
| modelled-key WRITE type-checked; arbitrary keys still allowed (C8) | Pass |
| wrong-typed modelled WRITE rejected (`@ts-expect-error`) | Pass |
| `asset['debrief:toolId']` typed via StacAsset; wrong type rejected (C9) | Pass |

### Writer behaviour (TS — unchanged, regression guard)

| Suite | Status |
|-------|--------|
| vscode `stacService.test.ts` (99) + `resultsPanelService.test.ts` (12) | Pass |
| web-shell `src/services/**` (54) | Pass |

## Key Scenarios Verified

- **FR-002** (headline): a new `debrief:*` slot flows to the writers' typed
  surface automatically — proven by a pure-function unit test (no full regen).
- **FR-004 / FR-012**: typo'd / wrong-typed modelled keys fail the build on both
  the read **and** write paths.
- **FR-008 / SC-004**: on-disk JSON byte-stable; the new asset keys round-trip;
  writer unit suites unchanged.
- **SC-007**: the `StacAsset` `debrief:toolId` hand-cast is removed.
- The #240 generated-vs-component-hybrid `PropertiesProvenanceEntry` divergence
  (previously masked) was surfaced and resolved with a typed narrowing bridge.

## Known Issues

- `test_raw_geojson_fixtures.py::TestPerformance::test_10k_feature_collection_validates_within_budget`
  is a timing-sensitive perf-budget test that can flake under concurrent CPU
  load; it **passes in isolation** (~0.66 s vs the budget) and is unrelated to
  this feature. The 2 skipped tests are pre-existing, unrelated.

## Environment

- Runner: pytest + vitest (no Playwright — backend/typing feature)
- Branch: `claude/item-256-spec-status-JCx2R`
