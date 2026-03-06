# Quickstart: Client-Side CQL2 Filter Engine

## Setup

```bash
# Install the CQL2 parser dependency in shared/components
cd shared/components
pnpm add cql2-filters-parser
```

## Usage

```typescript
import { createFilterEngine } from "@debrief/components/filter-engine";
import type {
  FilterExpression,
  StacBrowserItem,
  VesselTaxonomyNode,
} from "@debrief/components/filter-engine";

// 1. Define vessel taxonomy (provided by #125 fixtures)
const taxonomy: VesselTaxonomyNode[] = [
  {
    id: "surface",
    label: "Surface",
    children: [
      {
        id: "warship",
        label: "Warship",
        children: [
          { id: "frigate", label: "Frigate", children: [
            { id: "type23", label: "Type 23 Frigate" },
            { id: "type26", label: "Type 26 Frigate" },
          ]},
          { id: "destroyer", label: "Destroyer", children: [
            { id: "type45", label: "Type 45 Destroyer" },
          ]},
        ],
      },
    ],
  },
];

// 2. Create engine instance
const engine = createFilterEngine({ taxonomy });

// 3. Load mock items (from #125 fixtures)
const items: StacBrowserItem[] = [/* ...loaded from fixtures... */];

// 4. Filter with AND logic
const andFilter: FilterExpression = {
  predicates: [
    { type: "nationality", value: "GB" },
    { type: "vessel-class", value: "frigate" },
  ],
  orGroups: [],
};
const gbFrigates = engine.filter(items, andFilter);

// 5. Filter with AND + OR logic
const mixedFilter: FilterExpression = {
  predicates: [
    { type: "nationality", value: "GB" },
  ],
  orGroups: [
    {
      predicates: [
        { type: "vessel-class", value: "type23" },
        { type: "vessel-class", value: "type45" },
      ],
    },
  ],
};
// Returns: GB items with Type 23 OR Type 45
const result = engine.filter(items, mixedFilter);

// 6. Duration bucket filter
const shortExercises: FilterExpression = {
  predicates: [{ type: "duration", value: "<6H" }],
  orGroups: [],
};
const quick = engine.filter(items, shortExercises);

// 7. Title substring search
const titleSearch: FilterExpression = {
  predicates: [{ type: "title", value: "atlantic" }],
  orGroups: [],
};
const atlanticExercises = engine.filter(items, titleSearch);

// 8. Serialise to CQL2 JSON (for saved filters / future API calls)
const cql2 = engine.toCql2Json(mixedFilter);
console.log(JSON.stringify(cql2, null, 2));
// Output:
// {
//   "op": "and",
//   "args": [
//     { "op": "=", "args": [{ "property": "debrief:nationalities" }, "GB"] },
//     { "op": "or", "args": [
//       { "op": "=", "args": [{ "property": "debrief:vessel_classes" }, "type23"] },
//       { "op": "=", "args": [{ "property": "debrief:vessel_classes" }, "type45"] }
//     ]}
//   ]
// }

// 9. Check single item match
const isMatch = engine.matches(items[0], andFilter);
```

## Testing

```bash
# Run filter engine tests
cd shared/components
pnpm vitest run src/filter-engine/
```

## File Structure

```
shared/components/src/filter-engine/
├── index.ts              # Public exports
├── types.ts              # FilterExpression, Predicate, OrGroup, StacBrowserItem types
├── engine.ts             # createFilterEngine factory + evaluation logic
├── matchers.ts           # Per-filter-type matching functions
├── taxonomy.ts           # Vessel taxonomy expansion utilities
├── cql2-json.ts          # CQL2 JSON serialisation
├── __tests__/
│   ├── engine.test.ts    # AND/OR evaluation tests
│   ├── matchers.test.ts  # Per-filter-type tests
│   ├── taxonomy.test.ts  # Hierarchical expansion tests
│   └── cql2-json.test.ts # Serialisation tests
```
