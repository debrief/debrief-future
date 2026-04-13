# Data Model: CQL2 `array_filter` Evaluator

**Feature**: 185-cql2-array-filter
**Date**: 2026-04-13

## New Types

### ArrayFilterPredicate

Represents a single `array_filter()` call — a compound predicate evaluated per-element against an array property.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `array` | `"platforms"` | Yes | Target array property (only `platforms` supported in this iteration) |
| `predicate` | `CompoundPredicate` | Yes | Boolean expression tree evaluated per-element |
| `negated` | `boolean` | No (default: false) | When true, inverts the result — matches items where NO element satisfies the predicate |

### CompoundPredicate (discriminated union)

A recursive boolean expression tree. Each node is one of three kinds:

#### Comparison Node

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `"comparison"` | Yes | Discriminator |
| `field` | `PlatformField` | Yes | Field on PlatformRecord to compare |
| `value` | `string` | Yes | Value to compare against |

#### AND Node

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `"and"` | Yes | Discriminator |
| `children` | `CompoundPredicate[]` | Yes | All children must evaluate to true |

#### OR Node

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `kind` | `"or"` | Yes | Discriminator |
| `children` | `CompoundPredicate[]` | Yes | At least one child must evaluate to true |

### PlatformField (string union)

Enumeration of allowed fields for comparison within `array_filter`:

```
"id" | "name" | "nationality" | "vessel_class" | "vessel_type" | "vessel_role" | "domain"
```

These correspond 1:1 with the fields on `PlatformRecord` from `@debrief/schemas`.

## Modified Types

### FilterExpression (extended)

The existing `FilterExpression` interface gains one optional field:

| Field | Type | Required | Change |
|-------|------|----------|--------|
| `predicates` | `readonly Predicate[]` | Yes | **UNCHANGED** |
| `orGroups` | `readonly OrGroup[]` | Yes | **UNCHANGED** |
| `arrayFilters` | `readonly ArrayFilterPredicate[]` | No | **NEW** — optional array of `array_filter` expressions, AND'd with existing predicates and OR groups |

## Existing Types (unchanged, for reference)

### PlatformRecord (from `@debrief/schemas`)

| Field | Type | Required | Matching Semantics in `array_filter` |
|-------|------|----------|--------------------------------------|
| `id` | `string` | Yes | Case-sensitive exact match |
| `name` | `string` | No | Case-insensitive exact match |
| `nationality` | `string` | No | Case-insensitive exact match (ISO 2-letter code) |
| `vessel_class` | `string` | No | **Taxonomy-expanded** — matches value and all descendant paths |
| `vessel_type` | `string` | No | Case-insensitive exact match |
| `vessel_role` | `string` | No | Case-insensitive exact match |
| `domain` | `string` | No | Case-insensitive exact match |

### StacBrowserItem (unchanged)

The `array_filter` evaluator accesses `item.platforms` (type: `readonly PlatformRecord[]`) — no changes to the item type.

## Evaluation Semantics

```
matches(item, expression) =
    all top-level predicates match (AND)                     // existing
  AND all OR groups have at least one match                  // existing
  AND all arrayFilters match (AND)                           // NEW
```

For each `ArrayFilterPredicate`:
```
matchArrayFilter(item, af) =
  item.platforms.some(platform => evaluateCompound(platform, af.predicate))
  XOR af.negated
```

For `CompoundPredicate` evaluation against a single `PlatformRecord`:
```
evaluateCompound(platform, pred) =
  IF pred.kind == "comparison":
    compareField(platform[pred.field], pred.value, pred.field)
  IF pred.kind == "and":
    pred.children.every(c => evaluateCompound(platform, c))
  IF pred.kind == "or":
    pred.children.some(c => evaluateCompound(platform, c))
```

Where `compareField` uses case-insensitive equality for most fields, and taxonomy-expanded matching for `vessel_class`.

## Relationships

```
FilterExpression
  ├── predicates: Predicate[]           (existing, AND'd)
  ├── orGroups: OrGroup[]               (existing, AND'd)
  └── arrayFilters: ArrayFilterPredicate[]  (NEW, AND'd)
        └── predicate: CompoundPredicate
              ├── comparison → PlatformField + value
              ├── and → CompoundPredicate[]
              └── or → CompoundPredicate[]
```
