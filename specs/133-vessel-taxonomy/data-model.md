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

```typescript
type TaxonomyLabelMap = ReadonlyMap<string, string>;
// Maps: nodeId → human-readable label
// e.g., "type23" → "Type 23 Frigate"
//        "warship" → "Warship"
```

### TaxonomyMatchCounts (new type alias)

```typescript
type TaxonomyMatchCounts = ReadonlyMap<string, number>;
// Maps: nodeId → count of matching items in current filtered set
// e.g., "warship" → 26, "type23" → 12, "unknown" → 0
```

## Relationships

```
vessel-taxonomy.json
    │
    ├──[parseTaxonomy()]──→ VesselTaxonomyNode[]
    │                            │
    │                            ├──[buildTaxonomyLabelMap()]──→ TaxonomyLabelMap
    │                            │
    │                            ├──[buildDescendantMap()]──→ DescendantMap
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
2. **FilterBar mount**: taxonomy → `buildTaxonomyLabelMap()` → `TaxonomyLabelMap` (memoized)
3. **FilterBar mount**: (items, taxonomy) → `useTaxonomyMatchCounts()` → `TaxonomyMatchCounts` (re-computed when items or active filters change)
4. **Dropdown open**: (taxonomy, counts, currentValue) → `taxonomyToCascadingItems()` → `CascadingMenuItem[]` with badges and current marker
5. **Selection**: CascadingMenu → `onSelect(nodeId)` → lozenge created with `value = nodeId`
6. **Lozenge display**: `resolveTaxonomyLabel(value, labelMap)` → human-readable label

## Validation Rules

- Taxonomy JSON must have `version`, `description`, and `taxonomy` fields
- Each node must have `label` (non-empty string)
- Node IDs (object keys) must be unique within their sibling set
- Path segments use `/` separator (consistent with existing `debrief:vessel_classes` convention)
- Vessel class values in STAC items must be valid slash-separated paths (validated by existing schema tests)
