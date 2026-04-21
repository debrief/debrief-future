---
layout: future-post
title: "Shipped: Unified Bounds Utilities"
date: 2026-04-21
track: [credibility]
author: Ian
reading_time: 3
category: Tech Debt
status: shipped
feature_id: 219
tags: [tracer-bullet, utils, typescript, tech-debt]
excerpt: "Two functions named calculateBounds, same signature, different expectations — we eliminated the hazard."
---

## What We Built

Two functions. Same name. Same signature. Different expectations about what you'd pass in, different performance characteristics, different test suites. For months, contributors landing in bounds-related code faced a silent choice: `shared/components/src/utils/bounds.ts` or `@debrief/utils`? Nothing in the import path told you which one to pick, and picking wrong meant either a runtime failure or a silently slower map-fit on large STAC collections.

We deleted the duplicate.

The 215-line `shared/components/src/utils/bounds.ts` is gone. Five helpers that lived there — `expandBounds`, `isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`, and `filterBySpatialExtent` — now live alongside `calculateBounds` in `@debrief/utils`. One module, one place to look.

## The Structural Subtyping Workaround

The trickiest part of the merge wasn't moving code — it was reconciling three feature-type families. `DebriefFeature`, `SafeFeature`, and plain `GeoJSONFeature` each carry geometry in the same shape, but they're separate types with separate lineages. Writing a union input type would have required casting at every call site.

The fix was to define `BoundsInputFeature` as a structural minimum — the narrowest interface that all three families satisfy without casts. TypeScript's structural subtyping does the rest: any object with the right geometry shape is accepted, regardless of nominal type. No `as` keywords needed, no LinkML schema changes required, no coupling between `@debrief/utils` and the generated schema packages.

That last point matters. The utils module stays decoupled from schema-generated types. When backlog #212 lands (proper LinkML-generated `SafeFeature` and `GeoJSONFeature` types), nothing in `@debrief/utils` will need to change.

## The Fast-Path Is Strictly Additive

While the three-family reconciliation was in flight, we absorbed backlog item #211 — the pre-computed bbox fast-path. The unified `calculateBounds` now checks `feature.bbox` first. If it's present and valid (finite, correctly ordered), it uses those coordinates directly and skips the per-coordinate walk for that feature.

For STAC-style collections where every item carries a precomputed `bbox`, map-fit latency stays O(n features) rather than O(n coordinates). For collections without `bbox`, behaviour is identical to before. The fast-path is additive: no existing call site changes, no behaviour changes for callers that don't pass `bbox`.

## By the Numbers

| | |
|---|---|
| LOC deleted | 215 |
| Test files deleted | 1 |
| Consumer import changes | 0 |
| Tests passing (`@debrief/utils`) | 300/300 |
| Tests passing (`@debrief/components`) | 1647/1647 |
| Bounds tests (unified, was ~58) | 75 |
| Compile-time type assertions | 5 |

## Lessons Learned

Structural subtyping solves the multi-family input problem cleanly, but you have to commit to it deliberately. The temptation is to write a union type (`DebriefFeature | SafeFeature | GeoJSONFeature`) and handle each branch. That works, but it couples utils to schema packages and multiplies with every new family added. A structural minimum interface is narrower to write and wider to accept — worth the upfront thought.

The fast-path also taught something worth noting: additive optimisations belong in the canonical module, not as a separate decorator layer. Once there's one place for bounds logic, the right place for a bounds optimisation is obvious.

## What's Next

Two related backlog items remain independent of this work.

Backlog #212 will generate `SafeFeature` and `GeoJSONFeature` as proper LinkML-derived types, replacing the hand-written structural stubs. When that lands, `BoundsInputFeature` will continue to accept them — no migration needed.

Backlog #214 is drift prevention: a CI check that catches any future attempt to add a second `calculateBounds` (or equivalent bounds function) outside `@debrief/utils`. The silent choice hazard is gone today, but a linter rule makes it stay gone.

→ [See the PR](https://github.com/debrief/debrief-future/pull/219)
