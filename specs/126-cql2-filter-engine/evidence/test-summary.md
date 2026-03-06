---
feature: "126-cql2-filter-engine"
captured_at: "2026-03-06T19:01:00Z"
git_sha: "eece9bd"
tests_passed: 74
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: CQL2 Filter Engine

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 74 |
| Passed | 74 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### taxonomy.test.ts (9 tests)

| Test | Status |
|------|--------|
| parseTaxonomy converts raw JSON to VesselTaxonomyNode[] | Pass |
| parseTaxonomy handles empty taxonomy | Pass |
| buildDescendantMap maps leaf node to its own full path | Pass |
| buildDescendantMap maps parent node to self + all descendants | Pass |
| buildDescendantMap maps root node to entire subtree | Pass |
| buildDescendantMap maps warship to all warship descendants | Pass |
| buildDescendantMap returns undefined for unknown node ID | Pass |
| buildDescendantMap handles empty taxonomy | Pass |
| buildDescendantMap handles separate trees independently | Pass |

### matchers.test.ts (31 tests)

| Test | Status |
|------|--------|
| vessel-class: matches exact leaf, parent, grandparent | Pass |
| vessel-class: rejects sibling, unknown, empty array | Pass |
| plot-tag: case-insensitive array contains | Pass |
| feature-tag: case-insensitive matching | Pass |
| author: case-insensitive exact match, rejects partial | Pass |
| duration: <6H, <24H, >10D bucket matching | Pass |
| duration: zero duration for datetime-only items | Pass |
| duration: long duration (14 days) | Pass |
| title: case-insensitive substring, rejects absent | Pass |
| track-name: case-insensitive array contains | Pass |
| nationality: case-insensitive, rejects absent | Pass |
| collection: exact match, case-sensitive, null handling | Pass |

### engine.test.ts (11 tests)

| Test | Status |
|------|--------|
| AND: empty filter returns all items | Pass |
| AND: single predicate filtering | Pass |
| AND: combines multiple predicates | Pass |
| AND: returns empty when no match | Pass |
| AND: hierarchical vessel-class matching | Pass |
| AND: matches() returns boolean | Pass |
| OR: matches items in OR group | Pass |
| OR: AND'd predicates with OR group | Pass |
| OR: single-predicate OR group acts as AND | Pass |
| OR: multiple OR groups (all AND'd) | Pass |
| OR: empty result for no matches | Pass |

### cql2-json.test.ts (11 tests)

| Test | Status |
|------|--------|
| Empty expression → {} | Pass |
| Single scalar predicate → = operator | Pass |
| Array predicate → a_containedBy | Pass |
| Title predicate → LIKE with wildcards | Pass |
| Duration predicate → = operator | Pass |
| AND with multiple predicates | Pass |
| OR group serialisation | Pass |
| Mixed AND + OR serialisation | Pass |
| Single-predicate OR group flattening | Pass |
| All array-valued types map correctly | Pass |
| Collection as scalar equality | Pass |

### integration.test.ts (12 tests)

| Test | Status |
|------|--------|
| Loads 100 mock items from #125 fixtures | Pass |
| Empty filter returns all 100 items | Pass |
| Leaf vessel-class type returns matching items | Pass |
| Parent 'warship' returns superset of 'frigate' | Pass |
| Unknown taxonomy node returns no matches | Pass |
| Filters by GB nationality | Pass |
| Filters by ASW tag | Pass |
| Title substring matches all items ('exercise') | Pass |
| All items match at least one duration bucket | Pass |
| <6H returns fewer items than <24H | Pass |
| Combined AND + OR: nationality AND (frigate OR destroyer) | Pass |
| Items with missing properties handled gracefully | Pass |

## Key Scenarios Verified

- Hierarchical vessel taxonomy expansion: filtering on "warship" returns items with any descendant class (frigate/type23, destroyer/type45, etc.)
- Duration bucket semantics: range-check (<6H means under 6 hours), not mutually exclusive categories
- AND/OR evaluation: top-level predicates AND'd together, OR groups internally OR'd then AND'd with top-level
- CQL2 JSON serialisation: correct operator mapping for all filter types (=, a_containedBy, like)
- Edge cases: empty filters, missing properties, unknown taxonomy paths, zero-duration items, single-predicate OR groups
- Integration with real #125 mock data set (100 STAC items with diverse vessel classes, nationalities, durations)

## Known Issues

- None

## Environment

- Runner: vitest 1.6.1
- Branch: claude/start-speckit-126-g3rEu
- Date: 2026-03-06
