---
feature: "125-stac-extension-mock-data"
captured_at: "2026-03-06T12:00:00Z"
git_sha: "caf2570"
tests_passed: 209
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: STAC Extension Spec + Mock Data Fixtures

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 209 |
| Passed | 209 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A (schema fixtures, not service code) |

## Test Breakdown

### Golden Fixture Tests (test_golden.py — 189 existing)

| Test | Status |
|------|--------|
| Valid fixture validation (46 fixtures) | Pass |
| Invalid fixture validation (46 fixtures) | Pass |
| Round-trip serialisation (46 pairs) | Pass |
| Schema comparison (51 checks) | Pass |

### STAC Extension Tests (test_stac_extension.py — 20 new)

| Test | Status |
|------|--------|
| Valid extension fixtures pass (3 fixtures) | Pass |
| Invalid extension fixtures fail (2 fixtures) | Pass |
| Uppercase vessel path rejected | Pass |
| Non-alpha-2 nationality rejected | Pass |
| Exercise fixture count = 100 | Pass |
| All 100 fixtures validate against Pydantic model | Pass |
| Vessel class diversity (>= 5 distinct) | Pass |
| Nationality diversity (>= 6, all alpha-2) | Pass |
| Geographic distribution (>= 4 regions) | Pass |
| All 5 duration buckets represented | Pass |
| Filter selectivity (3-80% per categorical value) | Pass |
| Edge case: >= 3 zero-track items | Pass |
| Edge case: >= 3 dense-track items (5+) | Pass |
| Edge case: >= 3 single-timestamp items | Pass |
| Round-trip: full properties | Pass |
| Round-trip: empty defaults | Pass |
| Round-trip: from fixture file | Pass |

## Key Scenarios Verified

- Schema enforcement: LinkML-generated Pydantic model correctly validates vessel class paths (lowercase slash-separated, 1-4 segments) and nationality codes (ISO alpha-2 `^[A-Z]{2}$`)
- Distribution realism: 100 fixtures span 5+ vessel classes, 6+ nationalities, 4+ geographic regions, all 5 duration buckets
- Edge case coverage: empty plots (0 tracks), dense plots (5+ tracks), single-timestamp items (no start/end datetime)
- Round-trip fidelity: Pydantic model serialises to JSON and deserialises back with zero data loss
- No regressions: all 189 existing schema tests continue to pass after adding the new LinkML module

## Known Issues

- 23 warnings from existing GeoJSON coordinate nested array limitation (pre-existing, unrelated to this feature)

## Environment

- Runner: pytest 9.0.2
- Branch: 125-stac-extension-mock-data
- Date: 2026-03-06
