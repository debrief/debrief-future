---
layout: future-post
title: "Shipped: CQL2 Filter Engine"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac-browser, filter-engine]
excerpt: "Client-side CQL2 filter engine running against 100 mock STAC items with 9 filter types and hierarchical vessel taxonomy"
---

## What We Built

The STAC Browser Discovery UI can now filter exercises. Nine metadata dimensions -- vessel class, plot tags, feature tags, author, duration buckets, title search, track names, nationalities, and collection -- combined with AND/OR logic, all evaluated client-side against arrays of STAC items. No backend, no network calls. A pure function: items in, filtered items out.

The whole thing lives in `shared/components/src/filter-engine/` as six TypeScript files. It takes a `FilterExpression` (predicates plus optional OR groups), evaluates it against `StacBrowserItem` objects extended with our #125 STAC extension properties, and optionally serialises the expression to OGC CQL2 JSON. That last part is the interesting bit -- these filter expressions are not a throwaway Storybook convenience. They are CQL2 from day one. When the production STAC API arrives, the same expressions that work against mock data now will work against the real API. Configuration change, not rewrite.

## How It Works

Each filter type gets its own matcher function in `matchers.ts`. Straightforward pattern: take an item, take a predicate value, return a boolean. The engine composes these matchers according to the expression structure -- AND across top-level predicates, OR within groups, then AND across groups.

```typescript
const engine = createFilterEngine({ taxonomy });

// GB exercises involving Type 23 OR Type 45
const results = engine.filter(items, {
  predicates: [{ type: "nationality", value: "GB" }],
  orGroups: [{
    predicates: [
      { type: "vessel-class", value: "type23" },
      { type: "vessel-class", value: "type45" },
    ],
  }],
});
```

Serialising to CQL2 JSON produces standard OGC output:

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

The vessel taxonomy is the most involved part. When an analyst filters on "warship", they expect to see frigates, destroyers, carriers -- every descendant class. Rather than walking the tree on each evaluation, `createFilterEngine` pre-computes a descendant map at construction time. Every taxonomy node maps to the set of paths it encompasses. Lookups during filtering are O(1).

Duration is computed, not stored. STAC items have `start_datetime` and `end_datetime`; the engine calculates the difference and checks it against five range buckets: <6H, <24H, <72H, <10D, >10D. Items with only a `datetime` (no range) get zero duration.

## By the Numbers

| | |
|---|---|
| Tests passing | 74 |
| Test suites | 5 |
| Filter types | 9 |
| Source files | 6 |
| Mock items tested against | 100 |
| External dependencies | 1 (cql2-filters-parser) |

## Decisions That Stuck

The planning post laid out six key decisions. All of them survived implementation unchanged, which is a good sign that the upfront thinking was grounded.

**CQL2 from day one** held up well. The `cql2-filters-parser` library handled serialisation cleanly. We map our filter types to CQL2 operators -- `=` for scalars, `a_containedBy` for arrays, `like` with wildcards for title search -- and the output is valid OGC CQL2 JSON. Eleven tests verify the serialisation across all filter types and combinations.

**No visitor pattern** was the right call. We never parse CQL2 text -- expressions are built programmatically from UI state. A thin evaluator with one matcher per filter type ended up being 31 tests worth of clear, isolated logic.

**Pre-computed taxonomy expansion** pays off exactly as expected. The nine taxonomy tests verify tree traversal thoroughly -- leaf nodes, parents, roots, cross-tree independence. Once the descendant map is built, the matchers do not need to know about tree structure at all.

**One level of OR nesting** was sufficient. The integration tests exercise combined AND+OR expressions (nationality AND (frigate OR destroyer)) without any awkwardness in the model.

## What Surprised Us

Graceful missing-data handling turned out to be more important than I anticipated. The integration test suite runs against all 100 mock items from #125, and not every item has every property populated. The rule -- missing property means no match, no error -- kept the engine clean. No special-case branches, no null-checking boilerplate in the matchers. Just a falsy check and move on.

Duration bucket semantics generated the most discussion during planning. We went with range-check behaviour: a 5-hour exercise matches both `<6H` and `<24H`. The alternative was mutually exclusive categories (0-6H, 6-24H, etc.). Range-check won because it matches how analysts actually think -- "show me the short exercises" means "under a day", not "between 6 and 24 hours specifically". We will see if that holds up once the filter bar UI makes this visible to users.

The `cql2-filters-parser` library did exactly what we needed and nothing more. Zero dependencies, clean ES module, straightforward API. Sometimes the boring tool choice is the best one.

## What's Next

The filter engine is pure logic -- no UI at all. Next up is #127, the filter bar component that puts this in front of users. That is where the nine filter types become dropdown menus, tag selectors, and search inputs. The engine is ready; now it needs a face.

> [See the spec](https://github.com/debrief/debrief-future/tree/main/specs/126-cql2-filter-engine)
