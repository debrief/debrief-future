# Usage Example: CQL2 `array_filter` Evaluator

## Problem

An analyst wants to find STAC items containing a "British submarine" -- a platform where nationality is GB AND domain is subsurface. With flat predicates, the engine matches nationality and domain independently, producing false positives when one platform is British and a *different* platform is a submarine.

## Solution: Compound Per-Element Filtering

```typescript
import { createFilterEngine } from '@debrief/components';
import type { FilterExpression } from '@debrief/components';

const engine = createFilterEngine({ taxonomy });

// Find items with a British submarine
const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "GB" },
          { kind: "comparison", field: "domain", value: "subsurface" },
        ],
      },
    },
  ],
};

// Item A: GB surface + DE subsurface → NO match (no single platform is GB+subsurface)
// Item B: GB subsurface → MATCH
const results = engine.filter(items, expression);
```

## Taxonomy Expansion

```typescript
// Find items with a British frigate (matches Type 23, Type 26, FREMM, etc.)
const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "GB" },
          { kind: "comparison", field: "vessel_class", value: "frigate" },
        ],
      },
    },
  ],
};
// Platform with vessel_class "surface/warship/frigate/type23" → MATCH
```

## CQL2 JSON Round-Trip

```typescript
import { cql2JsonToArrayFilters } from '@debrief/components';

// From NL pipeline (#188): CQL2 JSON with array_filter
const cql2 = {
  op: "array_filter",
  args: [
    { property: "debrief:platforms" },
    {
      op: "and",
      args: [
        { op: "=", args: [{ property: "nationality" }, "GB"] },
        { op: "=", args: [{ property: "domain" }, "subsurface"] },
      ],
    },
  ],
};

// Deserialize to ArrayFilterPredicate[]
const arrayFilters = cql2JsonToArrayFilters(cql2);
const expr: FilterExpression = { predicates: [], orGroups: [], arrayFilters };
const results = engine.filter(items, expr);

// Serialize back to CQL2 JSON
const roundTripped = engine.toCql2Json(expr);
// Produces identical CQL2 JSON structure
```

## Negation

```typescript
// Exclude items with British submarines
const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "GB" },
          { kind: "comparison", field: "domain", value: "subsurface" },
        ],
      },
      negated: true,  // Invert: match items where NO platform is a British submarine
    },
  ],
};
```

## Mixed Expressions

```typescript
// Combine existing filters with array_filter
const expression: FilterExpression = {
  predicates: [{ type: "tag", value: "ASW" }],       // Must have ASW tag
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: { kind: "comparison", field: "nationality", value: "GB" },
    },
  ],
  // Items must have ASW tag AND at least one GB platform
};
```
