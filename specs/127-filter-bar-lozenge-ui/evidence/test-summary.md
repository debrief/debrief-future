---
feature: "127-filter-bar-lozenge-ui"
captured_at: "2026-03-06T21:30:00Z"
git_sha: "fe17667"
tests_passed: 64
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Filter Bar with Lozenge UI and AND/OR Logic

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 64 |
| Passed | 64 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### useFilterBar (18 tests)

| Test | Status |
|------|--------|
| starts with empty state | Pass |
| produces empty expression for empty state | Pass |
| adds a lozenge to the bar | Pass |
| generates unique IDs for each lozenge | Pass |
| removes a top-level lozenge | Pass |
| removes a lozenge from inside an OR container | Pass |
| updates a top-level lozenge value | Pass |
| updates a lozenge inside an OR container | Pass |
| adds an empty OR container | Pass |
| removes an OR container | Pass |
| adds a child lozenge to an OR container | Pass |
| moves a top-level lozenge into an OR container | Pass |
| moves a lozenge from OR container to top level | Pass |
| converts empty state to empty expression | Pass |
| converts top-level lozenges to predicates | Pass |
| converts OR container to OR group | Pass |
| skips empty OR containers (review decision #4) | Pass |
| produces AND + OR expression for mixed state | Pass |

### useDistinctValues (10 tests)

| Test | Status |
|------|--------|
| returns empty arrays for empty items | Pass |
| extracts and deduplicates nationalities | Pass |
| sorts values alphabetically | Pass |
| handles null/empty author fields | Pass |
| extracts flat array values from nested arrays | Pass |
| extracts vessel classes | Pass |
| returns empty arrays for free-text types | Pass |
| extracts collections | Pass |
| extracts track names | Pass |
| extracts feature tags | Pass |

### taxonomyAdapter (4 tests)

| Test | Status |
|------|--------|
| converts a simple tree | Pass |
| converts nested children | Pass |
| handles empty tree | Pass |
| leaf nodes have no submenu | Pass |

### Lozenge (5 tests)

| Test | Status |
|------|--------|
| renders type label and value | Pass |
| clicking body fires onEdit | Pass |
| clicking remove fires onRemove | Pass |
| remove click does not trigger edit | Pass |
| has draggable attributes | Pass |

### ValueEditor (9 tests)

| Test | Status |
|------|--------|
| flat-dropdown renders with available values | Pass |
| flat-dropdown fires onSelect with value | Pass |
| flat-dropdown shows empty message | Pass |
| bucket renders fixed duration options | Pass |
| bucket fires onSelect with bucket value | Pass |
| free-text renders text input for title | Pass |
| free-text renders for plot-contents | Pass |
| free-text fires onSelect on Enter key | Pass |
| hierarchical renders CascadingMenu | Pass |

### OrContainer (6 tests)

| Test | Status |
|------|--------|
| renders child lozenges | Pass |
| renders OR label | Pass |
| mini (+) button opens type dropdown | Pass |
| fires onAddChildType when type selected | Pass |
| remove button fires onRemove | Pass |
| renders with droppable attributes | Pass |

### FilterBar Integration (12 tests)

| Test | Status |
|------|--------|
| renders empty state with hint text | Pass |
| renders add button | Pass |
| opens filter type dropdown on (+) click | Pass |
| shows all 10 filter types in dropdown | Pass |
| shows value editor after selecting filter type | Pass |
| adds lozenge after selecting value | Pass |
| calls onFilteredItems with filtered results | Pass |
| removes lozenge on remove button click | Pass |
| hint text disappears when filter is added | Pass |
| opens editor when lozenge body is clicked | Pass |
| calls onFilteredItems with intersection | Pass |
| creates an OR container via (+) menu | Pass |

## Key Scenarios Verified

- **Add/Remove flow**: Click (+), select type, select value, lozenge appears; click remove, lozenge disappears
- **Edit flow**: Click lozenge body opens ValueEditor popover for inline value editing
- **AND logic**: Multiple top-level lozenges produce intersection filtering
- **OR groups**: OR containers created via (+) menu, accept child lozenges
- **All input methods**: Hierarchical (CascadingMenu), flat-dropdown, bucket, free-text all dispatch correctly
- **State management**: useReducer-based state transitions for all CRUD operations plus container moves
- **toFilterExpression**: Empty containers skipped, mixed AND/OR correctly structured
- **Taxonomy adapter**: VesselTaxonomyNode tree maps to CascadingMenuItem tree
- **Distinct values**: Deduplication, sorting, null handling for all dropdown filter types

## Known Issues

- None

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-127-QN85C
- Date: 2026-03-06
