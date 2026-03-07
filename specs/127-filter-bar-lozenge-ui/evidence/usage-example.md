# Usage Example: FilterBar Component

## Basic Usage

```tsx
import { FilterBar } from '@debrief/components/FilterBar';
import type { StacBrowserItem, VesselTaxonomyNode } from '@debrief/components/filter-engine';

function DiscoveryPanel({ items, taxonomy }: {
  items: StacBrowserItem[];
  taxonomy: VesselTaxonomyNode[];
}) {
  const [filteredItems, setFilteredItems] = useState(items);

  return (
    <div>
      <FilterBar
        items={items}
        taxonomy={taxonomy}
        onFilteredItems={setFilteredItems}
        onExpressionChange={(expr) => console.log('CQL2:', expr)}
      />
      <ResultsList items={filteredItems} />
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `items` | `StacBrowserItem[]` | All STAC items (unfiltered) for dropdown value population |
| `taxonomy` | `VesselTaxonomyNode[]` | Vessel taxonomy tree for hierarchical filtering |
| `onFilteredItems` | `(items: StacBrowserItem[]) => void` | Called whenever filtered results change |
| `onExpressionChange` | `(expr: FilterExpression) => void` | Called whenever filter expression changes (for CQL2 serialisation) |

## Filter Types

| Type | Input Method | Example |
|------|-------------|---------|
| Vessel Class | Hierarchical dropdown (CascadingMenu) | surface > warship > frigate > Type 23 |
| Plot Tag | Flat dropdown from data | convoy, asw, blue-water |
| Feature Tag | Flat dropdown from data | high-priority, reviewed |
| Author | Flat dropdown from data | CDR Smith, CDR Jones |
| Duration | Fixed bucket selector | Under 6 hours, Under 24 hours, Over 10 days |
| Title | Free-text substring search | "CASEX" matches "CASEX Alpha" |
| Plot Contents | Free-text substring search | Full-text search |
| Track Name | Flat dropdown from data | HMS Argyll, HMS Diamond |
| Nationality | Flat dropdown from data | French, British, German |
| Collection | Flat dropdown from data | exercises-2024, training-2025 |

## Using the Hook Directly

```tsx
import { useFilterBar, toFilterExpression } from '@debrief/components/FilterBar';

function CustomFilterUI() {
  const {
    state,
    expression,
    addLozenge,
    removeLozenge,
    editLozenge,
    addOrContainer,
    addChildLozenge,
    moveToContainer,
  } = useFilterBar();

  // Add a nationality filter
  addLozenge('nationality', 'French');

  // Create an OR group and add filters inside
  addOrContainer();
  const containerId = state.items[0]?.id;
  if (containerId) {
    addChildLozenge(containerId, 'vessel-class', 'type23');
    addChildLozenge(containerId, 'vessel-class', 'type45');
  }

  // Convert to FilterExpression for the engine
  const expr = toFilterExpression(state);
  // { predicates: [...], orGroups: [...] }
}
```

## Storybook Stories

Access all stories at: `FilterBar` in Storybook

- **Empty**: Default empty state with hint text
- **Single Filter**: Add one filter and see results narrow
- **Multiple AND**: Add multiple filters combined with AND logic
- **OR Group**: Create OR containers with drag-to-group
- **Interactive**: Full workflow demo
- **All Filter Types**: Try all 10 filter types
- **Zero Results**: Incompatible filters showing empty state
