---
feature: "185-cql2-array-filter"
captured_at: "2026-04-13T22:13:04Z"
git_sha: "560d173"
tests_passed: 32
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: CQL2 `array_filter` Evaluator

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 32 |
| Passed | 32 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### array_filter -- Compound Platform Filtering (US1)

| Test | Status |
|------|--------|
| mixed platforms (GB surface + DE subsurface) with GB+subsurface filter returns no match | Pass |
| single platform (GB subsurface) with GB+subsurface filter returns match | Pass |
| two GB platforms (surface + subsurface) with GB+subsurface filter matches via second element | Pass |
| OR sub-predicate (nationality GB OR US) AND domain subsurface | Pass |
| empty platforms array returns false | Pass |
| null/missing platform fields return false for that element | Pass |
| multiple arrayFilters in one expression are AND'd together | Pass |
| empty arrayFilters field matches all items | Pass |
| undefined arrayFilters matches all items | Pass |
| mixed expression with existing predicates + arrayFilters | Pass |
| comparison is case-insensitive for non-id fields | Pass |
| id field comparison is case-sensitive | Pass |

### array_filter -- Taxonomy Expansion in Compound Predicates (US3)

| Test | Status |
|------|--------|
| GB + vessel_class=frigate matches platform with vessel_class=surface/warship/frigate/type23 | Pass |
| DE + vessel_class=frigate does NOT match GB type23 platform | Pass |
| vessel_class=warship expands to match all warship descendants | Pass |
| vessel_class with unknown taxonomy node returns false | Pass |

### array_filter -- Negated Compound Predicates (US4)

| Test | Status |
|------|--------|
| negated GB+subsurface filter excludes item with British submarine | Pass |
| negated GB+subsurface filter includes item with only surface platforms | Pass |
| negated array_filter with empty platforms returns true | Pass |

### array_filter -- CQL2 JSON Serialization (US2)

| Test | Status |
|------|--------|
| serialize compound AND to CQL2 JSON with correct structure | Pass |
| serialize compound OR to CQL2 JSON | Pass |
| serialize mixed expression (predicates + arrayFilters) | Pass |
| serialize single-child compound reduces to single comparison | Pass |

### array_filter -- CQL2 JSON Deserialization (US2)

| Test | Status |
|------|--------|
| deserialize CQL2 JSON array_filter to ArrayFilterPredicate[] | Pass |
| deserialize nested AND/OR compound predicate | Pass |
| round-trip serialize -> deserialize -> evaluate produces same results | Pass |
| deserialize CQL2 JSON with no array_filter returns empty array | Pass |
| deserialize empty CQL2 JSON returns empty array | Pass |
| deserialize array_filter embedded in AND root | Pass |

### array_filter -- Negated CQL2 Serialization (US4)

| Test | Status |
|------|--------|
| serialization of negated array_filter wraps in NOT operator | Pass |
| deserialization of NOT-wrapped array_filter sets negated=true | Pass |
| negated round-trip preserves evaluation semantics | Pass |

## Backward Compatibility

All 1273 pre-existing tests in @debrief/components continue to pass, confirming zero regressions across 80 test files.

## Key Scenarios Verified

- **Per-element compound matching**: GB+subsurface compound filter rejects items where conditions are met by different platforms (false positive elimination)
- **CQL2 round-trip fidelity**: Serialize -> deserialize -> evaluate produces identical results to direct evaluation
- **Taxonomy expansion inside compounds**: "British frigates" query correctly matches Type 23 and Type 26 through hierarchical vessel_class expansion
- **Negation semantics**: Negated array_filter correctly inverts match (excludes British submarines, includes surface-only)
- **Edge cases**: Empty platforms, missing fields, case-insensitive comparison, case-sensitive ID matching

## Known Issues

- None

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-185-1AmhJ
- Date: 2026-04-13
