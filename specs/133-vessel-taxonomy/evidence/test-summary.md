---
feature: "133-vessel-taxonomy"
captured_at: "2026-03-07T18:00:00Z"
git_sha: "381da7a"
tests_passed: 944
tests_failed: 0
tests_skipped: 0
coverage_pct: null
---

# Test Summary: Vessel Taxonomy and Hierarchical Filtering

## Results

| Metric | Value |
|--------|-------|
| Total Tests | 944 |
| Passed | 944 |
| Failed | 0 |
| Skipped | 0 |
| Coverage | N/A |

## Test Breakdown

### Filter Engine — taxonomy.test.ts (19 tests)

| Test | Status |
|------|--------|
| parseTaxonomy — converts raw JSON to VesselTaxonomyNode[] | Pass |
| parseTaxonomy — handles empty taxonomy | Pass |
| buildDescendantMap — maps leaf node to its own full path | Pass |
| buildDescendantMap — maps parent node to self + all descendants | Pass |
| buildDescendantMap — maps root node to entire subtree | Pass |
| buildDescendantMap — maps warship to all warship descendants | Pass |
| buildDescendantMap — returns undefined for unknown node ID | Pass |
| buildDescendantMap — handles empty taxonomy | Pass |
| buildDescendantMap — handles separate trees independently | Pass |
| buildTaxonomyLabelMap — maps full paths to labels | Pass |
| buildTaxonomyLabelMap — handles ambiguous node IDs via full paths | Pass |
| buildTaxonomyLabelMap — handles empty taxonomy | Pass |
| buildTaxonomyLabelMap — includes all nodes in a deep tree | Pass |
| resolveTaxonomyLabel — resolves known path to label | Pass |
| resolveTaxonomyLabel — returns raw value for unknown path | Pass |
| resolveTaxonomyLabel — resolves branch node path | Pass |
| resolveTaxonomyLabel — resolves root node path | Pass |
| extensibility (US4) — new vessel type appears without code changes | Pass |
| extensibility (US4) — new branch node works without code changes | Pass |

### CascadingMenu — filterCascadingItems.test.ts (10 tests)

| Test | Status |
|------|--------|
| returns full tree when query is empty | Pass |
| returns full tree when query is whitespace | Pass |
| filters by case-insensitive substring match | Pass |
| preserves ancestor chain for matching leaf nodes | Pass |
| returns empty array when no matches | Pass |
| matches across different branches | Pass |
| matches leaf from a different branch | Pass |
| handles special characters safely (no regex) | Pass |
| handles empty items array | Pass |
| includes branch node that matches even if children do not | Pass |

### CascadingMenu — SearchableCascadingMenu.test.tsx (9 tests)

| Test | Status |
|------|--------|
| renders search input when searchable is true | Pass |
| does not render search input when searchable is false | Pass |
| shows all items when search is empty | Pass |
| filters items by search query | Pass |
| shows no-matches message when nothing matches | Pass |
| uses custom searchPlaceholder | Pass |
| fires onSelect when item is clicked | Pass |
| fires onSelect for selectable branches | Pass |
| calls onSearchChange callback | Pass |

### FilterBar — taxonomyAdapter.test.ts (10 tests)

| Test | Status |
|------|--------|
| converts a simple tree | Pass |
| converts nested children | Pass |
| handles empty tree | Pass |
| leaf nodes have no submenu | Pass |
| with currentValue — sets current: true on matching leaf node | Pass |
| with currentValue — does not mark non-matching nodes as current | Pass |
| with counts — adds badge strings to nodes | Pass |
| with counts — sets disabled on zero-count with disableEmpty | Pass |
| with counts — does not disable zero-count without disableEmpty | Pass |
| with counts — passes counts to nested children with full paths | Pass |

### FilterBar — Lozenge.test.tsx (10 tests)

| Test | Status |
|------|--------|
| renders type label and value | Pass |
| clicking body fires onEdit | Pass |
| clicking remove fires onRemove | Pass |
| remove click does not trigger edit | Pass |
| clicking negate fires onToggleNegate | Pass |
| shows NOT badge when negated | Pass |
| has draggable attributes | Pass |
| vessel-class label resolution — displays resolved label | Pass |
| vessel-class label resolution — displays raw value without labelMap | Pass |
| vessel-class label resolution — displays raw value for unknown path | Pass |

### FilterBar — OrContainer.test.tsx (7 tests)

| Test | Status |
|------|--------|
| renders child lozenges | Pass |
| renders OR label | Pass |
| mini (+) button opens type dropdown | Pass |
| fires onAddChildType when type selected | Pass |
| remove button fires onRemove | Pass |
| renders with droppable attributes | Pass |
| label map forwarding — forwards labelMap to child Lozenges | Pass |

### FilterBar — useTaxonomyMatchCounts.test.ts (7 tests)

| Test | Status |
|------|--------|
| counts leaf nodes correctly | Pass |
| aggregates counts for branch nodes | Pass |
| counts exercises not vessel-type occurrences | Pass |
| returns zero for nodes with no matching items | Pass |
| handles empty items array | Pass |
| handles empty taxonomy | Pass |
| ignores vessel classes not in taxonomy | Pass |

## Key Scenarios Verified

- **Label resolution**: Vessel class lozenges display human-readable labels (e.g., "Type 23 Frigate") instead of raw paths, with graceful fallback for unknown paths
- **Current selection**: Re-opening the dropdown marks the currently selected vessel class with ✓
- **Tree search**: Type-ahead search filters the taxonomy tree by substring match, preserving ancestor chains
- **Match counts**: Per-node counts reflect the filtered data set, with zero-count nodes dimmed and disabled
- **Extensibility**: Adding new vessel types to the taxonomy JSON requires no code changes
- **DragOverlay labels**: Vessel class items show resolved labels when dragged between containers
- **Ambiguous node IDs**: Full-path keys prevent label conflicts (e.g., "auxiliary/tanker" vs "merchant/tanker")

## Known Issues

- None

## Environment

- Runner: vitest 1.6.1
- Branch: claude/implement-speckit-133-BfKj5
- Date: 2026-03-07
