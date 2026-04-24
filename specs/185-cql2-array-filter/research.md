# Research: CQL2 `array_filter` Evaluator

**Feature**: 185-cql2-array-filter
**Date**: 2026-04-13

## R1: Type Model Extension Strategy

### Decision: Add `ArrayFilterPredicate` as a new member of `FilterExpression`, separate from `Predicate`

### Rationale

The existing `Predicate` type represents a single-field, single-value condition (`type` + `value` + optional `negated`). An `array_filter` expression is fundamentally different: it binds a compound boolean expression to an array target and evaluates it per-element. Trying to encode this as a `Predicate` with a special `FilterType` would require overloading the `value` field with structured data, breaking the simple string semantics that all 11 existing filter types rely on.

Instead, we add a new optional field to `FilterExpression`:

```typescript
interface FilterExpression {
  readonly predicates: readonly Predicate[];        // existing
  readonly orGroups: readonly OrGroup[];            // existing
  readonly arrayFilters?: readonly ArrayFilterPredicate[];  // NEW
}
```

This is additive: existing code that constructs `FilterExpression` with only `predicates` and `orGroups` continues to work unchanged. The engine evaluates `arrayFilters` (if present) as additional AND conditions alongside the existing predicates and OR groups.

### Alternatives Considered

- **New `FilterType` value (e.g., `"array-filter"`)**: Would require the `value` field to carry serialized JSON for the compound predicate. Matchers would need special-casing. Breaks the uniform `MatcherFn` signature that all existing types share.
- **Encode as `OrGroup` with special semantics**: OrGroups have different semantics (at-least-one-matches) than `array_filter` (exists-element-matching-all). Would require a discriminator field, adding complexity.
- **Separate evaluation pipeline**: Wrapping the existing engine with an `array_filter` pre-filter. Unnecessary indirection — the engine's `matches()` function is the right place.

## R2: Compound Predicate Representation

### Decision: Explicit tree of `CompoundPredicate` nodes with `and`/`or`/`comparison` variants

### Rationale

An `array_filter` sub-predicate can be a boolean combination of comparisons on different fields of a single array element. We need a recursive type that supports:

- `field = value` comparisons (e.g., `nationality = 'GB'`)
- `AND` of multiple sub-predicates
- `OR` of multiple sub-predicates

```typescript
type CompoundPredicate =
  | { readonly kind: "comparison"; readonly field: PlatformField; readonly value: string }
  | { readonly kind: "and"; readonly children: readonly CompoundPredicate[] }
  | { readonly kind: "or"; readonly children: readonly CompoundPredicate[] };
```

This models the natural tree structure of boolean expressions. The evaluator walks the tree recursively, evaluating each node against a single `PlatformRecord` element.

### Alternatives Considered

- **Flat list of field/value pairs with implicit AND**: Simpler but cannot represent OR sub-predicates (`nationality = 'GB' OR nationality = 'US'`). The spec requires OR support.
- **Reuse existing `Predicate[]` type**: Would require mapping `FilterType` values to `PlatformRecord` fields, which is an awkward semantic overload. `FilterType` values like `"nationality"` already have specific evaluation semantics (search all platforms for any match) that differ from `array_filter` semantics (per-element comparison).
- **CQL2 AST directly**: Using the `cql2-filters-parser` FunctionExpression AST as the internal representation couples the engine to the library's types. The engine's own types should be library-agnostic.

## R3: Platform Field Matching Within `array_filter`

### Decision: Use equality matching for all fields except `vessel_class`, which uses taxonomy expansion

### Rationale

The `PlatformRecord` has 7 fields. Most fields use simple case-insensitive equality:

| Field | Matching | Notes |
|-------|----------|-------|
| `id` | Case-sensitive exact | Platform identifiers are uppercase by convention |
| `name` | Case-insensitive exact | Display names may vary in casing |
| `nationality` | Case-insensitive exact (uppercase normalised) | ISO codes, normalised to uppercase |
| `vessel_class` | **Taxonomy-expanded** | Reuses existing `DescendantMap` for hierarchical matching |
| `vessel_type` | Case-insensitive exact | Leaf of classification path |
| `vessel_role` | Case-insensitive exact | Parent of leaf |
| `domain` | Case-insensitive exact | `"surface"` / `"subsurface"` / `"unknown"` |

For `vessel_class`, a comparison like `vessel_class = 'frigate'` must match all descendant paths (e.g., `surface/warship/frigate/type23`). This reuses the existing `DescendantMap` already built during engine initialisation, so no new data structures are needed.

### Alternatives Considered

- **All fields use exact match (no taxonomy for vessel_class)**: Breaks the "British frigates" use case — the most important compound query identified in the E10 prototype. Users would need to know exact full paths.
- **LIKE/substring matching for all fields**: Over-engineered. Fields like `nationality` and `domain` are short codes; substring matching would produce false positives.

## R4: CQL2 JSON Encoding for `array_filter`

### Decision: Use OGC CQL2 function-call encoding with nested predicate structure

### Rationale

The OGC CQL2 standard encodes function calls as:

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

The first argument is the array property reference. The second argument is the compound predicate expressed as nested CQL2 logical operators. Property references within the predicate use element-relative names (e.g., `"nationality"` not `"debrief:platforms[*].nationality"`), since the `array_filter` establishes the array context.

This encoding is compatible with the `cql2-filters-parser` library's `FunctionExpression` AST node, and follows the pattern documented in the OGC CQL2 specification for custom functions.

### Alternatives Considered

- **Encode as `a_containedBy` with compound value**: The existing `a_containedBy` operator matches scalar values in arrays. There's no standard way to encode compound per-element predicates with this operator.
- **Custom non-standard encoding**: Would work for our internal use but wouldn't be parseable by standard CQL2 tools. Since the NL pipeline (#188) generates CQL2 JSON, standard compliance matters.

## R5: CQL2 JSON Deserialization

### Decision: Add `cql2JsonToArrayFilters()` function for deserializing `array_filter` from CQL2 JSON

### Rationale

The current codebase has serialization (`filterExpressionToCql2Json`) but no deserialization. The NL-to-CQL2 pipeline (#188) will generate CQL2 JSON containing `array_filter` expressions that need to be loaded into `FilterExpression` objects for evaluation.

We add a focused deserialization function specifically for `array_filter` extraction from CQL2 JSON. This function:

1. Walks the CQL2 JSON tree looking for `{"op": "array_filter", ...}` nodes
2. Extracts the compound predicate from the second argument
3. Recursively maps CQL2 `and`/`or`/`=` operators to `CompoundPredicate` nodes
4. Returns `ArrayFilterPredicate[]` that can be merged into a `FilterExpression`

Full CQL2 JSON deserialization (for all filter types) is out of scope — it would be a separate feature. The existing FilterBar persists/restores `FilterBarState` (the UI model), not CQL2 JSON. Only `array_filter` needs deserialization because it's the format the NL pipeline produces.

### Alternatives Considered

- **Full CQL2 JSON → FilterExpression deserializer**: Significantly larger scope. Would need to reverse-map all 11 filter types from CQL2 property names. Not needed by any current consumer.
- **Use `cql2-filters-parser`'s `parseCql2Json()`**: Parses CQL2 JSON into the library's AST, which we'd then need to convert to our types. Adds coupling to library internals for a simple tree walk. The CQL2 JSON structure for `array_filter` is straightforward enough to parse directly.

## R6: Negation Semantics

### Decision: Negation applies to the entire `array_filter` expression (outer negation), not to individual sub-predicates

### Rationale

The `ArrayFilterPredicate` has a `negated?: boolean` flag (mirroring existing `Predicate`). When negated:

- **Normal**: `array_filter(platforms, p -> p.nationality = 'GB' AND p.domain = 'subsurface')` → true if ANY platform matches both conditions
- **Negated**: `NOT array_filter(...)` → true if NO platform matches both conditions

This follows the existing pattern where `Predicate.negated` inverts the entire match result. Inner negation of individual sub-predicates (e.g., `p.nationality != 'GB'`) can be achieved by structuring the compound predicate differently — this avoids adding a `negated` flag to every `CompoundPredicate` node.

### Alternatives Considered

- **Per-comparison negation**: Adding `negated` to each comparison node. Increases type complexity. Inner negation can be expressed via OR/AND restructuring (De Morgan's laws). Not needed for the identified use cases.
- **No negation support**: Would limit expressiveness. The existing engine supports negation on all predicate types; omitting it for `array_filter` would be inconsistent.

## R7: Backward Compatibility

### Decision: Fully additive extension with no breaking changes

### Rationale

The `arrayFilters` field on `FilterExpression` is optional (`?`). All existing code that creates `FilterExpression` objects with only `predicates` and `orGroups` continues to work without changes. The engine's `matches()` function treats `undefined` or empty `arrayFilters` as a no-op (matches all items, consistent with empty `predicates`/`orGroups`).

Key compatibility guarantees:
- All 11 existing filter types work identically
- All existing tests pass without modification
- FilterBar, CatalogOverview, and other consumers are unaffected
- The `FilterEngine` interface gains no new required methods (serialization/deserialization handled internally)

### Alternatives Considered

- **New `FilterEngine` method (e.g., `matchesCompound()`)**: Would change the public interface. Unnecessary — the existing `matches()` and `filter()` methods naturally evaluate the extended `FilterExpression`.
