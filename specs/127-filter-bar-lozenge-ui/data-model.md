# Data Model: Filter Bar with Lozenge UI and AND/OR Logic

**Feature**: 127-filter-bar-lozenge-ui
**Date**: 2026-03-06

## Relationship to #126 Types

This feature's data model is built on the types defined by #126 (CQL2 Filter Engine). The filter bar manages **UI state** that maps to the engine's `FilterExpression` type. No new domain entities are introduced — only UI-specific state wrappers.

## Entity: FilterBarState

The complete UI state of the filter bar. This is the component's internal state, not persisted.

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `items` | `FilterBarItem[]` | Yes | `[]` | Ordered list of top-level items (lozenges + OR containers) |
| `editingId` | `string \| null` | No | `null` | ID of the lozenge currently being edited |
| `isAddMenuOpen` | `boolean` | No | `false` | Whether the filter type dropdown is open |

### Validation Rules

1. Each `FilterBarItem` has a unique `id`
2. At most one `editingId` at a time
3. OR containers must not be nested (no OrContainerItem inside another OrContainerItem)

## Entity: FilterBarItem (discriminated union)

A single item in the filter bar. Either a lozenge or an OR container.

### Variant: LozengeItem

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `kind` | `"lozenge"` | Yes | Discriminant |
| `id` | `string` | Yes | Unique identifier (nanoid) |
| `filterType` | `FilterType` | Yes | From #126 contract types |
| `value` | `string` | Yes | The selected filter value |

### Variant: OrContainerItem

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `kind` | `"or-container"` | Yes | Discriminant |
| `id` | `string` | Yes | Unique identifier (nanoid) |
| `children` | `LozengeItem[]` | Yes | Lozenges within the OR group |

### State Machine

```
LozengeItem states:
  idle → editing (click body) → idle (Escape / click outside / select value)
  idle → dragging (drag start) → idle (drop on top level)
  idle → dragging (drag start) → moved-to-or (drop in OR container)

OrContainerItem states:
  empty (0 children) → populated (add child via mini +, or drag in)
  populated → empty (all children removed/dragged out)
  empty → removed (explicit remove action)
```

## Entity: FilterTypeOption

Metadata for each filter type, used to populate the add menu and select the correct value editor.

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `type` | `FilterType` | Yes | From #126 contract types |
| `label` | `string` | Yes | Display name (e.g., "Vessel Class") |
| `inputMethod` | `InputMethod` | Yes | One of: `"hierarchical"`, `"flat-dropdown"`, `"free-text"`, `"bucket"` |

### FilterType → InputMethod Mapping

| FilterType | Label | InputMethod | Value Source |
|------------|-------|-------------|--------------|
| `vessel-class` | Vessel Class | `hierarchical` | `VesselTaxonomyNode[]` from #126 |
| `plot-tag` | Plot Tag | `flat-dropdown` | Distinct `tags` values from items |
| `feature-tag` | Feature Tag | `flat-dropdown` | Distinct `featureTags` values from items |
| `author` | Author | `flat-dropdown` | Distinct `author` values from items |
| `duration` | Duration | `bucket` | Fixed: `["<6H", "<24H", "<72H", "<10D", ">10D"]` |
| `title` | Title | `free-text` | N/A (user types) |
| `plot-contents` | Plot Contents | `free-text` | N/A (user types) |
| `track-name` | Track Name | `flat-dropdown` | Distinct `trackNames` values from items |
| `nationality` | Nationality | `flat-dropdown` | Distinct `nationalities` values from items |
| `collection` | Folder/Collection | `flat-dropdown` | Distinct `collection` values from items |

**Note**: The spec lists 10 filter types but #126's `FilterType` union has 9 (no `plot-contents`). The `plot-contents` type needs to be added to the #126 contract, or handled as a `title`-like free-text search against a different property. Research decision: add `"plot-contents"` to the `FilterType` union in #126 during implementation, mapping to `debrief:description` or full-text of associated GeoJSON.

## Conversion: FilterBarState → FilterExpression

The filter bar state maps to the #126 `FilterExpression` type:

```typescript
function toFilterExpression(state: FilterBarState): FilterExpression {
  const predicates: Predicate[] = [];
  const orGroups: OrGroup[] = [];

  for (const item of state.items) {
    if (item.kind === "lozenge") {
      predicates.push({ type: item.filterType, value: item.value });
    } else {
      orGroups.push({
        predicates: item.children.map(child => ({
          type: child.filterType,
          value: child.value,
        })),
      });
    }
  }

  return { predicates, orGroups };
}
```

## Entity: DistinctValues

Pre-computed distinct values for dropdown population. Computed once from the full (unfiltered) item set.

| Field | Type | Source |
|-------|------|--------|
| `tags` | `string[]` | All unique `item.tags` values |
| `featureTags` | `string[]` | All unique `item.featureTags` values |
| `authors` | `string[]` | All unique non-null `item.author` values |
| `trackNames` | `string[]` | All unique `item.trackNames` values |
| `nationalities` | `string[]` | All unique `item.nationalities` values |
| `collections` | `string[]` | All unique non-null `item.collection` values |

All arrays are sorted alphabetically for consistent dropdown ordering.
