---
layout: future-post
title: "Planning: Unifying our bounds utilities"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, tech-debt, shared-utilities, type-safety]
excerpt: "Two nearly-identical bounds modules in two places. Time to finish the consolidation we started with #200."
---

## What We're Building

For a while now, Debrief has carried two copies of the same bounds-helper
module — one inside `@debrief/components`, one inside `@debrief/utils`. Nine
functions each (`calculateBounds`, `mergeBounds`, `expandBounds`,
`isPointInBounds`, `bboxOverlapsViewport`, `viewportToBounds`,
`filterBySpatialExtent`, `boundsToLeaflet`, `isValidBounds`), ~95 % overlap,
slightly different input types. The kind of duplication that's harmless
until the day someone fixes a bug in one copy and not the other.

This work deletes the duplicate (`shared/components/src/utils/bounds.ts`,
215 LOC) and consolidates everything into a single canonical module at
`shared/utils/src/bounds.ts`. Call sites stay unchanged — anything that
imports from `@debrief/components` continues to work via a barrel
re-export. Net diff is roughly ±50 lines. Nothing visible to the user;
everything visible to the next person who has to touch this code.

## How It Fits

This is the third beat of a three-beat sequence. Feature #200 (shipped)
consolidated the VS Code extension's local copy of the same helpers.
Backlog item #211 — add a pre-computed `bbox` fast-path so we stop walking
every coordinate when the GeoJSON already carries the answer — has been
sitting open since then. And #213 is the tidy-up that finishes the job.

Rather than ship #211 in isolation and then come back to consolidate, we're
absorbing it into #213. One change, one set of tests, one review. The
fast-path is strictly additive — if a feature doesn't carry a valid `bbox`,
we fall back to the existing coordinate walk. No behaviour change for any
existing input.

It's not glamorous, but this kind of dependency chain — #200 → #211 → #213
— is the shape of a project that's actually paying down its debt rather
than accumulating it. The backlog reflects the work; the work reflects the
backlog.

## Key Decisions

A few choices worth surfacing, because they shape what comes after.

**The input type problem.** Debrief currently has three overlapping feature
type families — `DebriefFeature` (our canonical LinkML-generated type),
`SafeFeature` (a runtime-validated variant), and plain `GeoJSONFeature`.
Reconciling those is a separate piece of work (#212). Rather than block on
it, the unified module takes a *structural* minimum: any object with a
`geometry` and optionally a `bbox`. TypeScript's structural subtyping means
all three families assign without casts. The bounds helpers don't need to
know which family they're working with — they just need coordinates.

**When does the fast-path fire?** Only when the feature carries a `bbox`
that is an array, has at least four entries, and every entry is finite.
Anything else — missing, wrong shape, `NaN`, `Infinity` — falls back to
the coordinate walk. No throw, no silent wrong answer. If the data is
malformed, we still compute the right bounds; we just don't trust the
shortcut.

**Typing the fast-path without cheating.** We could have reached
`feature.bbox` behind an `as`-cast or an `any`. We didn't. The input type
explicitly admits an optional `bbox` field, and the runtime guard narrows
it to a valid four-tuple before use. Article XV (Strict Type Safety) isn't
optional, and this is the sort of place where it's tempting to take a
shortcut because "it's just a helper". It isn't.

**The `ViewportPolygon` dependency.** `@debrief/utils` now takes a
type-only dependency on `@debrief/schemas` to import the
`ViewportPolygon` type. The alternative was to redeclare the shape
structurally — which would mean the utility drifts the moment the schema
changes. Redeclaring the very schema type we're trying not to drift felt
perverse, so we're taking the explicit import.

## What We'd Love Feedback On

A few things that could go either way, and we'd rather hear opinions
before the code lands than after.

- **Structural-minimum input type — right long-term call?** It works
  today, but it pushes the three-family reconciliation (#212) further
  down the road. Is that the right trade-off, or does it just defer the
  pain?
- **Fast-path triggers.** "Array, length ≥ 4, all finite" is the strictest
  check we can do without a full schema validation. Is there a
  case we've missed where a `bbox` passes that check but the underlying
  geometry disagrees? If so, what should the helper do — trust the
  `bbox`, walk the coordinates anyway, or flag it?
- **Reproducibility guarantees.** The spec mandates byte-identical output
  for all existing inputs (FR-019/020/021). We're testing this by running
  the new module against every fixture the old module was tested against.
  If there's a class of input we should be including in that battery, now
  is the time to say so.

The discussion is open on GitHub — [join the thread on issue #213][issue].

[issue]: https://github.com/IanMayo/debrief-future/issues/213
