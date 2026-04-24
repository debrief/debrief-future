# Usage Example: Platform Chip

A minimal TypeScript snippet wiring `FilterBar` with a preset platform chip.

```tsx
import { FilterBar } from '@debrief/components';
import type { StacBrowserItem, VesselTaxonomyNode } from '@debrief/components';
import type { FilterBarState } from '@debrief/components';

const items: StacBrowserItem[] = [
  /* ...catalog items with debrief:platforms arrays... */
];

const taxonomy: VesselTaxonomyNode[] = [
  /* vessel-class taxonomy tree */
];

// A single compound platform chip: "British submarine"
const initialFilterState: FilterBarState = {
  items: [
    {
      kind: 'lozenge',
      shape: 'platform',
      id: 'demo-chip',
      filterType: 'platform',
      attributes: {
        nationality: 'GB',
        domain: 'subsurface',
      },
    },
  ],
};

export function Demo() {
  return (
    <FilterBar
      items={items}
      taxonomy={taxonomy}
      onFilteredItems={(filtered) => {
        console.log(`${filtered.length} of ${items.length} match`);
      }}
      onExpressionChange={(expr) => {
        // expr.arrayFilters contains one ArrayFilterPredicate:
        // {
        //   array: 'platforms',
        //   predicate: { kind: 'and', children: [
        //     { kind: 'comparison', field: 'nationality', value: 'GB' },
        //     { kind: 'comparison', field: 'domain',      value: 'subsurface' },
        //   ] },
        //   negated: false,
        // }
        console.log(expr.arrayFilters);
      }}
      initialFilterState={initialFilterState}
    />
  );
}
```

## Expected UI

- **Chip label** — `Platform: GB · Subsurface`
- **Chip styling** — tinted blue background + anchor icon (⚓) prefix
- **Filtered count** — plots whose `debrief:platforms` array contains a single record that is both British AND subsurface (no false positives from "British surface ship + German submarine")

## Emitted CQL2 JSON

```json
{
  "op": "array_filter",
  "args": [
    { "property": "debrief:platforms" },
    {
      "op": "and",
      "args": [
        { "op": "=", "args": [{ "property": "nationality" }, "GB"] },
        { "op": "=", "args": [{ "property": "domain" }, "subsurface"] }
      ]
    }
  ]
}
```

## Edit flow

Clicking the chip body opens the `PlatformValueEditor` popover pre-filled with the current attributes. Changing `domain` from `subsurface` to `surface` and confirming preserves the chip's `id` and position; the label updates to `Platform: GB · Surface` and the filter re-runs.

## Negate flow

Clicking the `=` button on the chip flips it to `≠` and adds a `NOT` prefix; the CQL2 output wraps the `array_filter` node in `{"op": "not", "args": [...]}` and the engine inverts the match set.

## Remove flow

Clicking `×` removes the chip from the bar; filter results return to baseline.
