# Usage Example: CQL2 Filter Engine

## Basic Setup

```typescript
import { createFilterEngine, parseTaxonomy } from "@debrief/components/filter-engine";
import type { FilterExpression, StacBrowserItem } from "@debrief/components/filter-engine";
import taxonomyJson from "./vessel-taxonomy.json";

// Parse the #125 taxonomy fixture into VesselTaxonomyNode[]
const taxonomy = parseTaxonomy(taxonomyJson.taxonomy);

// Create engine instance (pre-computes taxonomy descendant maps)
const engine = createFilterEngine({ taxonomy });
```

## Filter with AND Logic

```typescript
// Find GB frigate exercises
const gbFrigates: FilterExpression = {
  predicates: [
    { type: "nationality", value: "GB" },
    { type: "vessel-class", value: "frigate" },
  ],
  orGroups: [],
};

const results = engine.filter(items, gbFrigates);
// → Only items where nationalities includes "GB"
//   AND vesselClasses includes any frigate descendant path
```

## Filter with AND + OR Logic

```typescript
// Find GB exercises involving Type 23 OR Type 45
const mixedFilter: FilterExpression = {
  predicates: [{ type: "nationality", value: "GB" }],
  orGroups: [
    {
      predicates: [
        { type: "vessel-class", value: "type23" },
        { type: "vessel-class", value: "type45" },
      ],
    },
  ],
};

const results = engine.filter(items, mixedFilter);
// → Items matching: GB AND (Type 23 OR Type 45)
```

## Duration Bucket Filtering

```typescript
// Find short exercises (under 24 hours)
const shortExercises: FilterExpression = {
  predicates: [{ type: "duration", value: "<24H" }],
  orGroups: [],
};

const results = engine.filter(items, shortExercises);
// → Items where (endDatetime - startDatetime) < 24 hours
// → Items with datetime only (no range) treated as 0 duration → matches <24H
```

## Title Search

```typescript
const titleSearch: FilterExpression = {
  predicates: [{ type: "title", value: "atlantic" }],
  orGroups: [],
};

const results = engine.filter(items, titleSearch);
// → Items whose title contains "atlantic" (case-insensitive)
```

## CQL2 JSON Serialisation

```typescript
const cql2 = engine.toCql2Json(mixedFilter);
console.log(JSON.stringify(cql2, null, 2));
```

Output:
```json
{
  "op": "and",
  "args": [
    {
      "op": "a_containedBy",
      "args": [["GB"], { "property": "debrief:nationalities" }]
    },
    {
      "op": "or",
      "args": [
        {
          "op": "a_containedBy",
          "args": [["type23"], { "property": "debrief:vessel_classes" }]
        },
        {
          "op": "a_containedBy",
          "args": [["type45"], { "property": "debrief:vessel_classes" }]
        }
      ]
    }
  ]
}
```

## Single Item Match

```typescript
const isMatch = engine.matches(items[0], gbFrigates);
// → true if item[0] is a GB frigate, false otherwise
```

## Empty Filter (No Predicates)

```typescript
const noFilter: FilterExpression = { predicates: [], orGroups: [] };
const all = engine.filter(items, noFilter);
// → Returns all items (no filtering applied)
```
