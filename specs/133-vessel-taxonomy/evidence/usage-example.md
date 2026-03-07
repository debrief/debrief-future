# Usage Example: Vessel Taxonomy and Hierarchical Filtering

## Interactive FilterBar with Taxonomy Dropdown

### 1. Browse the Vessel Taxonomy Tree

Click the `(+)` button in the filter bar, select **Vessel Class**. A searchable dropdown opens showing the taxonomy hierarchy:

```
🔍 Search vessel types...
├── Surface Vessel (4)
│   └── Warship (4)
│       ├── Frigate (3)
│       │   ├── Type 23 (2)
│       │   └── Type 26 (1)
│       └── Destroyer (1)
│           └── Type 45 (1)
└── Submarine (1)
    └── Nuclear (1)
        ├── SSN (1)
        └── SSBN (0)  [dimmed — no matching items]
```

### 2. Search for a Vessel Type

Type "type 23" in the search input. The tree filters to show only matching nodes with ancestor paths:

```
🔍 type 23
├── Surface Vessel
│   └── Warship
│       └── Frigate
│           └── Type 23 ✓
```

### 3. Select a Vessel Type

Click **Type 23**. A lozenge appears in the filter bar:

```
[Vessel Class: Type 23] [=] [×]
```

The lozenge displays the human-readable label "Type 23" — not the raw path `surface/warship/frigate/type23`.

### 4. Edit the Selection

Click the lozenge body to re-open the dropdown. The previously selected "Type 23" is marked with ✓.

### 5. Select a Branch Node

Instead of a leaf type, select **Warship** at the branch level:

```
[Vessel Class: Warship] [=] [×]
```

This filters for all exercises containing *any* warship subtype (frigates, destroyers).

### 6. Counts Reflect Active Filters

Add a **Nationality: French** filter. Now open the vessel class dropdown — counts update to reflect only French exercises:

```
├── Surface Vessel (2)
│   └── Warship (2)
│       └── Frigate (2)
│           └── Type 23 (1)
│           └── Type 26 (1)
│       └── Destroyer (0)  [dimmed]
```

### 7. Extend the Taxonomy

To add a new vessel type, simply edit `vessel-taxonomy.json`:

```json
{
  "type31": { "label": "Type 31 Frigate" }
}
```

No code changes required — the new type appears in the dropdown automatically.

## Code Integration

```tsx
import { FilterBar } from '@debrief/components';
import { parseTaxonomy } from '@debrief/components/filter-engine';
import taxonomyJson from './vessel-taxonomy.json';

const taxonomy = parseTaxonomy(taxonomyJson.taxonomy);

function App() {
  return (
    <FilterBar
      items={exercises}
      taxonomy={taxonomy}
      onFilteredItems={setFiltered}
    />
  );
}
```

The FilterBar automatically:
- Builds a label map for human-readable lozenge display
- Computes per-node match counts from the filtered data set
- Renders SearchableCascadingMenu with search, counts, and current-selection marking
