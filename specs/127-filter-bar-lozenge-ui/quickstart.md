# Quickstart: Filter Bar with Lozenge UI

**Feature**: 127-filter-bar-lozenge-ui

## Prerequisites

- Node.js >= 18.0.0
- pnpm (workspace-level)
- #125 (STAC Extension mock data fixtures) — provides 100 mock STAC items
- #126 (CQL2 Filter Engine) — provides `FilterEngine`, `FilterExpression`, types

## Setup

```bash
# From repository root
pnpm install

# Start Storybook (includes filter bar stories)
cd shared/components
pnpm storybook
```

## Key Files

```
shared/components/src/FilterBar/
├── index.ts                  # Public exports
├── FilterBar.tsx             # Main container component
├── FilterBar.stories.tsx     # Storybook stories (SC-008)
├── Lozenge.tsx               # Single filter pill component
├── OrContainer.tsx           # OR group wrapper
├── FilterTypeMenu.tsx        # Add filter type dropdown
├── ValueEditor.tsx           # Polymorphic value editor popover
├── HierarchicalDropdown.tsx  # Vessel class tree selector
├── useFilterBar.ts           # State management hook (useReducer)
├── useDistinctValues.ts      # Compute dropdown values from items
├── types.ts                  # FilterBarState, FilterBarItem types
├── constants.ts              # Filter type options, labels, input methods
└── __tests__/
    ├── FilterBar.test.tsx    # Integration tests
    ├── useFilterBar.test.ts  # Reducer/state tests
    └── Lozenge.test.tsx      # Lozenge interaction tests
```

## Usage

```tsx
import { FilterBar } from '@debrief/components/FilterBar';
import { createFilterEngine } from '@debrief/components/filter-engine';
import type { StacBrowserItem } from '@debrief/components/filter-engine';

// Items from #125 mock data, taxonomy from #125 vessel taxonomy
const engine = createFilterEngine({ taxonomy });

function DiscoveryPanel({ items }: { items: StacBrowserItem[] }) {
  const [filteredItems, setFilteredItems] = useState(items);

  return (
    <>
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={setFilteredItems}
      />
      <FeatureList items={filteredItems} />
      <MapView features={filteredItems} />
      <Timeline items={filteredItems} />
    </>
  );
}
```

## Running Tests

```bash
# Unit tests
cd shared/components
pnpm test

# Storybook visual verification
pnpm storybook
# Navigate to "FilterBar" stories
```

## Storybook Stories

Navigate to `FilterBar` category in Storybook:

| Story | What it demonstrates |
|-------|---------------------|
| Empty | Filter bar with no filters, "Add filters" hint |
| Single Filter | One lozenge, results narrowed |
| Multiple AND | Two+ lozenges, AND conjunction |
| OR Group | Lozenges inside OR container |
| Mixed AND + OR | Top-level + OR group combined |
| All Filter Types | Each of the 10 filter types with correct input |
| Zero Results | Incompatible filters, "No matches" |
| Interactive | Full add/edit/remove/drag workflow |

## Dependencies Added

| Package | Version | Justification |
|---------|---------|---------------|
| `@dnd-kit/core` | ^6.0.0 | Drag-to-group: move lozenges into/out of OR containers. Accessible, React 18 compatible. |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable within containers (lozenge reordering) |
| `@dnd-kit/utilities` | ^3.0.0 | CSS transform utilities for drag overlay |
| `nanoid` | ^5.0.0 | Unique lozenge IDs (already in scope via other deps) |
