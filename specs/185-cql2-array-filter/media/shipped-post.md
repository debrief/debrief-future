---
layout: future-post
title: "Shipped: CQL2 array_filter Evaluator"
date: 2026-04-13
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, filter-engine, cql2, e10-catalog-discovery]
excerpt: "The filter engine now evaluates compound per-element predicates — British submarines match correctly, without false positives from unrelated platforms"
---

## What We Built

The false positive problem in platform filtering is fixed. The CQL2 filter engine in `@debrief/components` now supports `array_filter` — a compound predicate that tests multiple conditions against each platform element individually, rather than scattering them across the whole array.

Before this, searching for "British submarines" would surface any plot containing a British platform and a submarine platform, even when those were two completely different vessels. HMS Montrose (British frigate) and U-32 (German submarine) in the same exercise would match, because nationality=GB satisfied against one platform and domain=subsurface satisfied against another. The engine never asked whether both conditions were true of the same vessel.

Now they are evaluated together. A compound `array_filter` predicate walks each element and only reports a match when a single platform satisfies all conditions. The GB frigate and the German submarine no longer produce a false positive.

## How It Works

The `FilterExpression` type gains an optional `arrayFilters` field alongside the existing `predicates` and `orGroups`. Each entry in `arrayFilters` specifies the target array (always `platforms` for now) and a compound predicate tree — AND, OR, or a single comparison. Existing filter expressions without `arrayFilters` continue to work unchanged.

```typescript
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

// Item with GB surface + DE subsurface → NO match (no single platform is GB+subsurface)
// Item with GB subsurface → MATCH
```

Taxonomy expansion works inside compound predicates too. Querying `vessel_class = 'frigate'` inside an `array_filter` matches any platform with Type 23, Type 26, FREMM, or any other descendant in the classification tree. The engine reuses the `DescendantMap` it builds at initialisation — no separate expansion logic required.

Negation operates at the expression level: `negated: true` on an `array_filter` entry means "no platform satisfies this compound predicate." For exclusion queries — find everything except plots with British submarines — this is a single flag rather than a restructured boolean tree.

The serialization is OGC-standard CQL2 JSON, which is the format the NL-to-CQL2 pipeline (#188) will produce:

```typescript
// Deserialize CQL2 JSON from the NL pipeline
const arrayFilters = cql2JsonToArrayFilters(cql2);
const expr: FilterExpression = { predicates: [], orGroups: [], arrayFilters };

// Round-trip: serialize back to the same CQL2 JSON structure
const roundTripped = engine.toCql2Json(expr);
```

The round-trip is verified — serialize, deserialize, evaluate produces the same results as direct evaluation.

## By the Numbers

| | |
|---|---|
| New tests | 32 |
| Tests failed | 0 |
| Existing tests unchanged | 1273 |
| Test files covered | 80 |
| New dependencies | 0 |

All 32 new tests pass across four user stories: compound evaluation, CQL2 JSON serialization and deserialization, taxonomy expansion inside compound predicates, and negation. The 1273 pre-existing tests in `@debrief/components` are unchanged.

## Lessons Learned

The decision to represent compound predicates as a recursive tree rather than a flat list of AND'd comparisons paid off immediately in the test suite. OR sub-predicates — "nationality is GB or US, and domain is subsurface" — fell out of the tree structure naturally. A flat list would have needed a special case for OR, or would have been silently wrong about what it could express.

The taxonomy expansion being handled by the existing `DescendantMap` meant no new data structures. The tricky part was making sure taxonomy expansion only applied to `vessel_class` and not to fields like `nationality` or `domain`, where "GB" expanding to include "GB/RN" or similar would have been wrong. The discriminated union on field name made that distinction explicit.

One thing I would do differently: the deserializer for CQL2 JSON was scoped narrowly to `array_filter` only, because that is all the NL pipeline produces. That was the right call for now, but the comment in the code explaining why it is intentionally incomplete deserves to be more prominent — it looks like an oversight without context.

## What's Next

Feature #186 (filter bar platform chips) will wire the UI so analysts can build compound platform filters manually without writing CQL2 JSON by hand. Feature #188 (NL-to-CQL2 prompt design) will wire the LLM pipeline that generates `array_filter` expressions from natural language queries like "UK submarines from the Cold War period."

Both blocked on this. Now they can proceed.

→ [See the spec](../spec.md)
