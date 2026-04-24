---
title: "Building Bounds utilities consolidated — and a silent-miss bug caught in the same PR"
date: 2026-04-20
layout: future-post
author: Ian
track: momentum
excerpt: "One canonical bounds utility, no casts at the call site, and the silent-miss zoom bug we found next door is fixed. The review gate earned its keep."
tags:
  - shared-utils
---

## What We're Building

Two copies of `calculateBounds` and `mergeBounds` exist in the monorepo: one in `@debrief/utils`, one in `apps/vscode/src/utils/bounds.ts`. They were identical once. They aren't anymore — the VS Code copy carries a defensive null-geometry guard that the shared copy lacks. A bug fix landed in one place and not the other. That is exactly the failure mode "exactly one implementation" is supposed to prevent.

The plan is to delete the VS Code copy, lift the null-guard into the canonical utility (so every consumer benefits), and point the map panel at the shared one. About 116 lines of near-duplicate code disappear. The behaviour users see on "zoom to fit" when a plot opens stays identical.

Except there's a second thing, and this is the more interesting part of the story.

## How It Fits

The first pass at this spec was clean enough to pass quality checks. Then `/speckit.review` ran and surfaced two issues worth catching.

The first was a scope overclaim. The spec said "exactly one implementation of `calculateBounds` in the monorepo" — but there is a third, legitimately different implementation in `shared/components` that takes LinkML-typed `DebriefFeature` input and carries extra helpers (`expandBounds`, `bboxOverlapsViewport`, `viewportToBounds`). Unifying that one would mean reconciling three feature-type families and migrating four consumers. It is its own backlog item. The success criterion has been narrowed to the generic-GeoJSON call-site family, which is what we're actually fixing.

The second issue was sitting one function away from the code we were already touching. The VS Code map's `fitToSelection()` — the "zoom to highlighted features" feature — has a fourth, inline copy of "compute bounds from features" that only handles `Point` and `LineString`. If your selection contains a `Polygon` or a `MultiPolygon` or anything `Multi`-shaped, the map silently does the wrong thing. It has been doing the wrong thing for years. Nobody filed a bug because the failure mode is "map doesn't zoom quite where I expected" — easy to shrug off, easy to miss.

We've folded the fix into this PR. It's one line on the call site (replace a 35-line inline loop with a call to the consolidated utility), and the per-geometry-type unit tests we were writing anyway verify the behaviour for all seven geometry types. Article I.3 of the constitution forbids silent failures. This PR removes one.

## Key Decisions

- **Widen the parameter, don't unify the types.** The three pre-change callers disagreed on what they passed in (`GeoJSONFeature[]`, a `SafeFeature`-derived alias, `DebriefFeature[]`). The shared utility's parameter is widened to a structural-minimum shape that all three satisfy. The deeper "two types for one entity" smell stays out of scope.
- **One explicit narrowing gate.** The widened parameter admits `coordinates: unknown`. Rather than letting `unknown` propagate implicitly, a single named function — `coerceCoordinates` — is the one reviewable narrowing location at the utility's entry point. No `any`, no double-cast. Anchored in source by a comment to constitution Article XV.5.
- **Three small commits, in TDD order.** Widen the parameter (type-only), add a null-geometry regression test (fails at runtime), lift the null-guard (test passes). The v1 plan mis-ordered these. The v2 plan gets it right.
- **Fold the `fitToSelection` fix in.** One adjacent silent-miss, verified by tests we were already adding. Separating it would waste the reviewer's attention for no gain.

Two copies of `calculateBounds` and `mergeBounds` that had drifted are now one. The duplicate at `apps/vscode/src/utils/bounds.ts` — 116 lines that were 95 % identical to the shared copy — has been deleted. Its duplicate unit test has been deleted. The VS Code map panel now imports `calculateBounds`, `mergeBounds`, and `boundsToLeaflet` from `@debrief/utils` and passes its real feature arrays (`SafeFeature[]` on plot-open, `DebriefFeature[]` on selection-zoom) without an `as`-cast at either call site.

## Lessons Learned

The review gate was the story here. The v1 spec passed every quality check on its own terms — but `/speckit.review` flagged two things that the authoring session hadn't:

The **scope overclaim**. The spec originally said "exactly one `calculateBounds` in the monorepo." That would have been wrong: `shared/components/src/utils/bounds.ts` is a legitimately separate implementation on LinkML-typed `DebriefFeature` arrays with extra helpers (`expandBounds`, `bboxOverlapsViewport`, `viewportToBounds`, and friends). Unifying it means reconciling three feature-type families and migrating four consumers — a real project, not this one. The v2 spec narrows the success criterion to "exactly one for the generic-GeoJSON call-site family" and captures the broader unification as a follow-up backlog item.

The **silent-miss bug** sitting one function away from the code we were already touching. `fitToSelection` in `mapPanel.ts` has been doing the wrong thing for years — zooming to only the `Point`/`LineString` subset of a mixed selection, silently skipping everything else. Nobody filed a bug because the failure mode ("map doesn't zoom quite where I expected") is too small to bother with in isolation. Once a single reviewer saw both pieces of code in the same session, folding the fix in cost us one extra commit. Separating it would have meant the fix waited in a follow-up that might never close.

Both caught by asking "is there anything adjacent to the stated scope that we should reconsider?" — after the spec was otherwise done. That gate paid for itself in this PR. The narrowing-gate requirement (FR-007) also came out of that session; it is now embedded in the utility's source in a way that a future drift would have to actively unlearn.

## What's Next

Four follow-ups were queued during this PR, captured in the backlog and waiting for prioritisation:

- **#214 — Drift-prevention rule.** A lint or CI check that fails if `apps/*/src/utils/bounds.ts` reappears, or more generally if any `apps/*` file re-exports a symbol that `shared/utils` already owns. Makes the "exactly one" guarantee durable instead of relying on reviewer vigilance.
- **#213 — `shared/components` bounds unification.** The deferred half of this scope. Requires reconciling `DebriefFeature` / `SafeFeature` / `GeoJSONFeature` — which is Article II territory.
- **#212 — LinkML-generated `SafeFeature` / `GeoJSONFeature`.** The two hand-written TypeScript feature types that predate this PR; the Article II tripwire that any "schema-adjacent" type should be LinkML-generated.
- **#211 — Pre-computed `bbox` fast-path.** `shared/components`'s version honours `feature.bbox` when present; `@debrief/utils`'s does not. Convergent-behaviour tweak that's a prerequisite for #213.

The most valuable of the four is #214 — the drift-prevention rule — because it's what keeps today's SC-001 durable. The others are real tech debt but they don't reopen today. #214 prevents tomorrow's re-duplication.

And the review gate stays. It caught something non-trivial on a spec that looked clean, on a session that thought it was done. That's worth more than the friction of running it.

---

*Evidence for this work lives under `specs/200-bounds-consolidation/evidence/` in the feature PR. Six new per-geometry-type tests, one null-geometry regression, five narrowing-gate shape-mismatch assertions, and a before/after diff of `fitToSelection` are the core artefacts.*
