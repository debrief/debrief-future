---
layout: future-post
title: "Planning: CQL2 array_filter Evaluator"
date: 2026-04-13
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, filter-engine, cql2, e10-catalog-discovery]
excerpt: "Extending the filter engine so compound platform queries stop producing false positives"
---

## What We're Building

Our filter engine has a false positive problem. An analyst searching for "British submarines" currently gets back every plot that has a British platform *and* a submarine -- even when those are two different vessels. The nationality filter matches one platform, the domain filter matches another, and the engine reports a hit because both conditions are independently satisfied somewhere in the item. The analyst gets a plot where HMS Montrose (a British frigate) and U-32 (a German submarine) are both present, and has to manually discard it.

The root cause is that the engine evaluates each filter condition against the entire platforms array. It asks "does any platform have nationality GB?" and separately "does any platform have domain subsurface?" -- but never "does *the same platform* have both?" This is the classic cross-join problem, and it appears the moment you filter on more than one attribute of an array element.

We are adding an `array_filter` evaluator to the CQL2 filter engine. It takes a compound predicate -- nationality equals GB *and* domain equals subsurface -- and tests it against each platform element individually. A match only occurs when a single platform satisfies all the conditions. No more false positives from attribute mixing across different platforms on the same item.

## How It Fits

This is part of Epic E10 (NL-Assisted Catalog Discovery). The E10 prototype validated that an LLM can interpret natural language queries like "UK submarines in the 1990s" and generate structured filters. But the prototype put the entire catalog in the prompt context, which does not scale. The production architecture has the LLM generate CQL2 JSON filter expressions instead, and the client-side engine evaluates them against local STAC data.

The `array_filter` function is the missing piece in that pipeline. Feature #188 (NL-to-CQL2 prompt design) will generate CQL2 JSON containing `array_filter` expressions. Feature #186 (filter bar platform chips) will wire the UI so analysts can manually build compound platform filters. Both depend on this evaluator existing.

The implementation is a pure additive extension to the existing engine in `@debrief/components`. No new dependencies. The `FilterExpression` type gains an optional `arrayFilters` field alongside the existing `predicates` and `orGroups`. Existing code that builds filter expressions without `arrayFilters` continues to work unchanged -- the engine treats the missing field as a no-op.

## Key Decisions

- **Compound predicates are a recursive tree, not a flat list.** An `array_filter` sub-predicate can combine AND and OR logic -- "nationality is GB or US, and domain is subsurface." We represent this as a discriminated union of comparison, AND, and OR nodes. A flat list of field/value pairs with implicit AND would be simpler but cannot express the OR case.

- **Vessel class uses taxonomy expansion; everything else uses equality.** When a compound predicate says `vessel_class = 'frigate'`, it matches type23, type26, fremm, and every other descendant in the classification tree. This reuses the existing `DescendantMap` that the engine already builds at initialisation. All other platform fields -- nationality, domain, name, etc. -- use case-insensitive equality. No substring or LIKE matching.

- **CQL2 JSON encoding follows the OGC standard function-call convention.** The serialized form is `{"op": "array_filter", "args": [arrayRef, compoundPredicate]}`, which is compatible with what the `cql2-filters-parser` library expects. Standard compliance matters because the NL pipeline generates this format.

- **Focused deserialization for `array_filter` only.** We are not building a full CQL2 JSON-to-FilterExpression deserializer -- that would need to reverse-map all 11 filter types from CQL2 property names. Only `array_filter` needs deserialization now because it is the format the NL pipeline produces. The existing filter bar persists its own `FilterBarState` (the UI model), not CQL2 JSON.

- **Negation applies at the expression level, not per-comparison.** A negated `array_filter` means "no platform matches this compound predicate." Inner negation on individual comparisons can be expressed by restructuring the boolean tree (De Morgan's laws). This keeps the type simple and mirrors how the existing `Predicate.negated` flag works.

## What We'd Love Feedback On

- **Should the evaluator short-circuit on first matching element?** Currently planned to use `Array.some()` which stops at the first match. For the negated case, we would use `!Array.some()` rather than `Array.every(p => !match(p))`. Both are logically equivalent, but the `every` form might be clearer to read. Any preference?

- **Are there compound queries beyond nationality + domain + vessel class that analysts actually use?** We support all seven platform fields, but we have only seen examples combining nationality with domain or vessel class. If certain combinations never occur in practice, we could simplify the test matrix.

- **Taxonomy expansion depth.** Currently, `vessel_class = 'warship'` matches everything below warship in the tree -- frigates, destroyers, carriers, and all their subtypes. Is matching at every depth always the right behaviour, or are there cases where analysts want to match at a specific level only?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
