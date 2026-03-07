# Component API Contracts: Vessel Taxonomy

## SearchableCascadingMenu

**File**: `shared/components/src/CascadingMenu/SearchableCascadingMenu.tsx`

```typescript
interface SearchableCascadingMenuProps extends CascadingMenuProps {
  /** Enable the search input above the menu */
  readonly searchable?: boolean;
  /** Placeholder text for the search input (default: "Search...") */
  readonly searchPlaceholder?: string;
  /** Callback when search text changes (for analytics/telemetry) */
  readonly onSearchChange?: (query: string) => void;
}
```

**Behavior**:
- When `searchable` is falsy, renders CascadingMenu unchanged (backwards compatible)
- When `searchable` is true, renders a text input above the menu items
- Search filters items by case-insensitive substring match on `label` using `String.includes()` (not regex — avoids special-character exceptions)
- Matching nodes retain their ancestor chain (parents shown even if they don't match)
- Empty search text shows the full tree
- Search clears when menu is dismissed

**Layout**: SearchableCascadingMenu owns its container positioning. It receives `anchorPosition` and manages layout internally (search input + menu as a single positioned container). The inner CascadingMenu is positioned relatively within the wrapper's container, not via absolute `anchorPosition`.

## taxonomyToCascadingItems (enhanced)

**File**: `shared/components/src/FilterBar/taxonomyAdapter.ts`

```typescript
interface TaxonomyAdapterOptions {
  /** Currently selected value (node ID) to mark with current: true */
  readonly currentValue?: string;
  /** Match counts per node ID for badge display */
  readonly counts?: ReadonlyMap<string, number>;
  /** When true, nodes with count 0 are disabled */
  readonly disableEmpty?: boolean;
}

function taxonomyToCascadingItems(
  nodes: readonly VesselTaxonomyNode[],
  options?: TaxonomyAdapterOptions,
): CascadingMenuItem[];
```

**Behavior**:
- Without options: identical to current behavior (backwards compatible)
- With `currentValue`: sets `current: true` on the matching node
- With `counts`: adds badge strings like `"(12)"` to each node
- With `disableEmpty: true`: sets `disabled: true` on nodes where count is 0

## useTaxonomyMatchCounts

**File**: `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts`

```typescript
function useTaxonomyMatchCounts(
  items: readonly StacBrowserItem[],
  taxonomy: readonly VesselTaxonomyNode[],
): ReadonlyMap<string, number>;
```

**Behavior**:
- Returns a map from node ID to the count of items matching that node's subtree
- Uses `buildDescendantMap()` for subtree expansion
- Memoized on items and taxonomy references
- An item with multiple vessel classes in the same subtree counts once per ancestor node

## buildTaxonomyLabelMap

**File**: `shared/components/src/filter-engine/taxonomy.ts` (alongside existing `buildDescendantMap`)

```typescript
function buildTaxonomyLabelMap(
  taxonomy: readonly VesselTaxonomyNode[],
): ReadonlyMap<string, string>;
```

**Behavior**:
- Returns a map from **full taxonomy path** to human-readable label
- Keys are slash-separated paths (e.g., `"surface/warship/frigate/type23"` → `"Type 23 Frigate"`)
- Full paths used as keys to avoid ambiguity — `"auxiliary/tanker"` → `"Tanker"` vs `"merchant/tanker"` → `"Merchant Tanker"`
- O(n) tree walk, called once and memoized
- Lives in taxonomy.ts alongside `parseTaxonomy` and `buildDescendantMap` to share tree-walking patterns (DRY)

## resolveTaxonomyLabel

**File**: `shared/components/src/filter-engine/taxonomy.ts`

```typescript
function resolveTaxonomyLabel(
  value: string,
  labelMap: ReadonlyMap<string, string>,
): string;
```

**Behavior**:
- Looks up `value` directly in the label map (values are already full paths)
- Returns `labelMap.get(value)` or the raw value as fallback (graceful degradation for unknown paths)
- O(1) lookup — no path-segment extraction needed since map keys are full paths

## filterCascadingItems (pure utility)

**File**: `shared/components/src/CascadingMenu/filterCascadingItems.ts`

```typescript
function filterCascadingItems(
  items: readonly CascadingMenuItem[],
  query: string,
): CascadingMenuItem[];
```

**Behavior**:
- Recursively filters items by case-insensitive substring match on label using `String.toLowerCase().includes()` (not regex)
- Preserves ancestor chain: if a child matches, all ancestors are included
- Returns empty array if no matches
- Expands matching branch nodes automatically (flattens submenu path to match)
