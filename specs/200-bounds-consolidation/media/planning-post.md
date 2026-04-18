---
layout: future-post
title: "Planning: Consolidating bounds utilities into @debrief/utils"
date: 2026-04-18
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, tech-debt, shared-utils, vscode-extension]
excerpt: "Deleting a 161-LOC duplicate of calculateBounds and lifting a latent null-geometry bug fix into the shared version."
---

## What We're Building

There are two `bounds.ts` files in the repo that do roughly the same job. One lives in `shared/utils/src/bounds.ts` and is the canonical version. The other lives in `apps/vscode/src/utils/bounds.ts` — 161 lines, ~95% byte-identical to the shared one, with its own byte-identical test file alongside. A single consumer (`apps/vscode/src/webview/mapPanel.ts`) imports the duplicate. Everything else already uses the shared version.

The plan is to delete the duplicate, switch the one consumer to `@debrief/utils`, and lift the one genuine difference — a defensive `if (!feature.geometry) continue;` guard — into the shared implementation. Net change: ~140 LOC removed, one source of truth for bounds calculation, and a latent bug eliminated.

The latent bug is the interesting part. The shared `calculateBounds` currently destructures `feature.geometry.type` without a null check. The vscode copy was forked specifically to add that guard. Any future caller passing a `SafeFeature` with missing geometry — which is a valid shape in our schema — would hit a `TypeError` today. The guard needs to be in the shared version regardless of the consolidation.

## How It Fits

This sits at the maintenance seam of the tracer bullet. As the VS Code extension and shared components have grown in parallel, a few utilities forked early and never got reconciled. `bounds` is the clearest case: same algorithm, same tests, two copies, one of which has silently diverged to carry a bugfix.

Article XV of the constitution (Strict Type Safety) and Article VI (Testing) both point the same way here — a single, tested implementation beats two almost-identical ones. Article VII (Test-Driven AI Collaboration) drives the sequencing: the three new unit tests (null geometry, undefined geometry, all-null → null) get written first and observed to fail against the current shared code before the guard is lifted.

## Key Decisions

- **Widen the parameter type rather than unify the feature types.** `calculateBounds` today takes a narrow `GeoJSONFeature`; the vscode call site has a wider `SafeFeature`. The plan is to widen the parameter to a minimal structural shape — `ReadonlyArray<{ geometry?: { type: string; coordinates: unknown } | null }>` — which accepts both without new casts. The alternative, reconciling `SafeFeature` and `GeoJSONFeature` into a shared base type, is a bigger piece of work and doesn't belong inside a 161-LOC deletion. Flagged as backlog.
- **Preserve the falsy null-guard exactly.** `!feature.geometry` catches both `null` and `undefined`. Tightening to `=== null` would reintroduce the crash path for `undefined`, which is how the schema actually represents missing geometry in some flows. Match the existing `mapPanel.ts` idiom.
- **Scope discipline: leave the third `bounds.ts` alone.** There's a 207-LOC `shared/components/src/utils/bounds.ts` that's `DebriefFeature`-typed and does spatial-filter helpers. It's genuinely a different module, not a duplicate, and sweeping it into this change would turn a cleanup into a refactor. Out of scope, deliberately.
- **Test-first, no new abstractions.** Three additive tests, one import swap, one guard lift, two file deletions. No new dependencies, no schema change, no API change, no UI change. Gated by the full `task verify` CI.

## What We'd Love Feedback On

The open design question worth raising: is parameter-widening the right long-term shape for `calculateBounds`, or is this the moment to invest in proper `SafeFeature`/`GeoJSONFeature` unification?

Widening the parameter is cheap, local, and unblocks this consolidation without touching the wider type graph. But it does encode — as a structural type — the fact that two feature shapes exist and both flow through the same utility. Every future shared utility that takes features will face the same choice.

The alternative is to spend a focused piece of work now defining a single feature contract that both the vscode and shared layers consume, and migrating call sites. More expensive, larger blast radius, but it removes the "two feature shapes" problem at the root.

For contributors who've worked on GeoJSON or schema-first type layering in similar codebases: which way would you lean, and what made the call for you?

→ [Join the discussion](https://github.com/debrief-future/debrief/discussions) (link TBD once spec lands)
