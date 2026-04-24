# Quickstart: CQL2 `array_filter` Evaluator

**Feature**: 185-cql2-array-filter
**Date**: 2026-04-13

## Overview

This feature extends the existing CQL2 filter engine to support compound per-element filtering on STAC item platform arrays. After implementation, the engine can answer joined queries like "items with a British submarine" — where nationality and domain must be satisfied by the same platform, not different platforms on the same item.

## Usage Examples

### Basic Compound Filter (AND)

Filter for items containing a British submarine:

```typescript
import { createFilterEngine } from '@debrief/components';
import type { FilterExpression } from '@debrief/components';

const engine = createFilterEngine({ taxonomy });

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

const results = engine.filter(items, expression);
```

### Compound Filter with Taxonomy Expansion

Filter for items containing a German frigate (matches type23, type26, fremm, etc.):

```typescript
const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "DE" },
          { kind: "comparison", field: "vessel_class", value: "frigate" },
        ],
      },
    },
  ],
};
```

### Compound Filter with OR Sub-Predicate

Filter for items containing a British or American submarine:

```typescript
const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          {
            kind: "or",
            children: [
              { kind: "comparison", field: "nationality", value: "GB" },
              { kind: "comparison", field: "nationality", value: "US" },
            ],
          },
          { kind: "comparison", field: "domain", value: "subsurface" },
        ],
      },
    },
  ],
};
```

### Negated Compound Filter

Filter for items that do NOT contain any British submarine:

```typescript
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
      negated: true,
    },
  ],
};
```

### Mixed Expression (existing filters + array_filter)

Combine a title search with a compound platform filter:

```typescript
const expression: FilterExpression = {
  predicates: [
    { type: "title", value: "exercise" },
  ],
  orGroups: [],
  arrayFilters: [
    {
      array: "platforms",
      predicate: {
        kind: "and",
        children: [
          { kind: "comparison", field: "nationality", value: "GB" },
          { kind: "comparison", field: "vessel_role", value: "frigate" },
        ],
      },
    },
  ],
};
```

### CQL2 JSON Serialization

Serialize a compound filter to CQL2 JSON:

```typescript
const cql2 = engine.toCql2Json(expression);
// Output:
// {
//   "op": "and",
//   "args": [
//     { "op": "like", "args": [{ "property": "title" }, "%exercise%"] },
//     {
//       "op": "array_filter",
//       "args": [
//         { "property": "debrief:platforms" },
//         {
//           "op": "and",
//           "args": [
//             { "op": "=", "args": [{ "property": "nationality" }, "GB"] },
//             { "op": "=", "args": [{ "property": "vessel_role" }, "frigate"] }
//           ]
//         }
//       ]
//     }
//   ]
// }
```

### CQL2 JSON Deserialization

Load `array_filter` expressions from CQL2 JSON (e.g., from NL pipeline output):

```typescript
import { cql2JsonToArrayFilters } from '@debrief/components';

const cql2Json = {
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

const arrayFilters = cql2JsonToArrayFilters(cql2Json);
// arrayFilters = [{
//   array: "platforms",
//   predicate: { kind: "and", children: [
//     { kind: "comparison", field: "nationality", value: "GB" },
//     { kind: "comparison", field: "domain", value: "subsurface" },
//   ]},
//   negated: false,
// }]

const expression: FilterExpression = {
  predicates: [],
  orGroups: [],
  arrayFilters,
};

const results = engine.filter(items, expression);
```

## Running Tests

```bash
# Run all filter engine tests (existing + new)
pnpm --filter @debrief/components test

# Run only array_filter tests
pnpm --filter @debrief/components test -- --grep "array_filter"
```

## Key Files

| File | Purpose |
|------|---------|
| `shared/components/src/filter-engine/types.ts` | Type definitions (ArrayFilterPredicate, CompoundPredicate, PlatformField) |
| `shared/components/src/filter-engine/engine.ts` | Engine evaluation (extended for arrayFilters) |
| `shared/components/src/filter-engine/matchers.ts` | matchArrayFilter() and evaluateCompound() |
| `shared/components/src/filter-engine/cql2-json.ts` | Serialization + deserialization |
| `shared/components/src/filter-engine/index.ts` | Public exports |
| `shared/components/src/filter-engine/__tests__/array-filter.test.ts` | Evaluation tests |
| `shared/components/src/filter-engine/__tests__/array-filter-cql2.test.ts` | Serialization round-trip tests |
