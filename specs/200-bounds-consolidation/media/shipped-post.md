---
layout: future-post
title: "Shipped: Bounds utilities consolidated — and a silent-miss bug caught in the same PR"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, tech-debt, vscode-extension, shared-utils]
excerpt: "One canonical bounds utility, no casts at the call site, and the silent-miss zoom bug we found next door is fixed. The review gate earned its keep."
---

## What We Built

Two copies of `calculateBounds` and `mergeBounds` that had drifted are now one. The duplicate at `apps/vscode/src/utils/bounds.ts` — 116 lines that were 95 % identical to the shared copy — has been deleted. Its duplicate unit test has been deleted. The VS Code map panel now imports `calculateBounds`, `mergeBounds`, and `boundsToLeaflet` from `@debrief/utils` and passes its real feature arrays (`SafeFeature[]` on plot-open, `DebriefFeature[]` on selection-zoom) without an `as`-cast at either call site.

The null-geometry guard that lived in the VS Code copy and not the shared copy — the drift that originally motivated this work — now lives in the canonical utility, so every current and future consumer benefits. A regression test in `shared/utils/tests/bounds.test.ts` locks that behaviour in for good; it was specifically designed to fail against the pre-change shared implementation, then pass after the guard was lifted.

Three commits tell the TDD story: widen the parameter (type-only), add the null-geometry test (the failing one), lift the guard (the passing one). In between, the widened parameter funnels its untyped `coordinates: unknown` through a single named helper — `coerceCoordinates` — anchored in source by a comment to constitution Article XV.5. It's the reviewable narrowing gate that makes the widening safe: no `any`, no double-cast, one place to inspect.

And the `fitToSelection` bug that `/speckit.review` surfaced adjacent to this work — the 35-line inline bounds loop in `mapPanel.ts` that silently missed every `Polygon`, `MultiPolygon`, `MultiPoint`, and `MultiLineString` selection — is fixed. The call site is now three lines that delegate to the consolidated utility. Six new per-geometry-type unit tests assert that every supported shape produces correct bounds in isolation, so the "no silent miss" property can't quietly regress later.

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
