# Data Model: Vessel Taxonomy and Hierarchical Filtering

**Feature**: 133-vessel-taxonomy
**Date**: 2026-03-07

## Entities

### VesselTaxonomyNode (existing — no changes)

Defined in `shared/components/src/filter-engine/types.ts`:

```typescript
interface VesselTaxonomyNode {
  readonly id: string;           // e.g., "type23"
  readonly label: string;        // e.g., "Type 23 Frigate"
  readonly children?: readonly VesselTaxonomyNode[];
}
```

Source of truth: `shared/schemas/fixtures/stac-browser/vessel-taxonomy.json`

### CascadingMenuItem (extended)

Defined in `shared/components/src/CascadingMenu/CascadingMenu.tsx`:

```typescript
interface CascadingMenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
  readonly swatch?: string;
  readonly disabled?: boolean;
  readonly disabledReason?: string;
  readonly submenu?: readonly CascadingMenuItem[];
  readonly current?: boolean;
  readonly badge?: string;        // NEW: e.g., "(12)" or "(0)"
}
```

### TaxonomyLabelMap (new type alias)

Defined in `shared/components/src/filter-engine/taxonomy.ts` (alongside existing `buildDescendantMap`):

```typescript
type TaxonomyLabelMap = ReadonlyMap<string, string>;
// Maps: full taxonomy path → human-readable label
// e.g., "surface/warship/frigate/type23" → "Type 23 Frigate"
//        "surface/warship" → "Warship"
//        "auxiliary/tanker" → "Tanker"
//        "merchant/tanker" → "Merchant Tanker"   ← distinct from auxiliary/tanker
```

**Key design decision**: Uses full slash-separated paths as keys (not bare node IDs) because
node IDs are only unique within sibling sets. The taxonomy has `tanker` under both `auxiliary`
and `merchant` branches with different labels. Full paths eliminate ambiguity.

### TaxonomyMatchCounts (new type alias)

```typescript
type TaxonomyMatchCounts = ReadonlyMap<string, number>;
// Maps: full taxonomy path → count of matching items in current filtered set
// e.g., "surface/warship" → 26, "surface/warship/frigate/type23" → 12
```

**Count semantics**: Counts are computed against the already-filtered item set (reflecting all
active filters, including any active vessel-class filter). The `buildDescendantMap()` result is
memoized on the taxonomy reference since the taxonomy never changes at runtime.

## Relationships

```
vessel-taxonomy.json
    │
    ├──[parseTaxonomy()]──→ VesselTaxonomyNode[]
    │                            │
    │                            ├──[buildTaxonomyLabelMap()]──→ TaxonomyLabelMap  (in taxonomy.ts, full-path keys)
    │                            │
    │                            ├──[buildDescendantMap()]──→ DescendantMap  (memoized on taxonomy ref)
    │                            │                               │
    │                            │                               └──[useTaxonomyMatchCounts()]──→ TaxonomyMatchCounts
    │                            │
    │                            └──[taxonomyToCascadingItems(counts?, currentValue?)]──→ CascadingMenuItem[]
    │                                                                                          │
    │                                                                                          └──→ CascadingMenu / SearchableCascadingMenu
    │
    └──→ StacBrowserItem.vesselClasses: string[]  (paths like "surface/warship/frigate/type23")
```

## Data Flow (runtime)

1. **App startup**: `vessel-taxonomy.json` → `parseTaxonomy()` → `VesselTaxonomyNode[]` (memoized)
2. **FilterBar mount**: taxonomy → `buildTaxonomyLabelMap()` → `TaxonomyLabelMap` (memoized, full-path keys, lives in taxonomy.ts)
3. **FilterBar mount**: (filteredItems, taxonomy) → `useTaxonomyMatchCounts()` → `TaxonomyMatchCounts` (re-computed when filtered items change; descendantMap memoized on taxonomy ref)
4. **Dropdown open**: (taxonomy, counts, currentValue) → `taxonomyToCascadingItems()` → `CascadingMenuItem[]` with badges and current marker
5. **Selection**: CascadingMenu → `onSelect(nodeId)` → lozenge created with `value = nodeId`
6. **Lozenge display**: `resolveTaxonomyLabel(value, labelMap)` → human-readable label (labelMap uses full paths)
7. **DragOverlay**: FilterBar.tsx DragOverlay calls `resolveTaxonomyLabel()` for vessel-class items
8. **OrContainer children**: OrContainer forwards `labelMap` and `counts` to child Lozenges

## Validation Rules

- Taxonomy JSON must have `version`, `description`, and `taxonomy` fields
- Each node must have `label` (non-empty string)
- Node IDs (object keys) must be unique within their sibling set
- Path segments use `/` separator (consistent with existing `debrief:vessel_classes` convention)
- Vessel class values in STAC items must be valid slash-separated paths (validated by existing schema tests)
