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
