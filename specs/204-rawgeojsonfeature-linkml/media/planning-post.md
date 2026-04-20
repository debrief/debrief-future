---
layout: future-post
title: "Planning: One schema-rooted type to retire three drifted twins"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, schemas, linkml, type-safety, tech-debt]
excerpt: "Three hand-typed definitions of the same GeoJSON Feature concept, each slightly different, each drifting. We're collapsing them into one generated type."
---

## What Happens When Your Schema Has a Twin?

It drifts. Quietly, in small increments, with good intentions behind every edit.

Somewhere in our TypeScript, `GeoJSONFeature` says `id` is a string. Somewhere else, the same name accepts a string or an integer. In `services/stac`, the same concept isn't a type at all — it's `dict[str, Any]`, which is the Python equivalent of shrugging. Three definitions of the same boundary concept, three slightly different shapes, three places for a bug to hide between the spec and the code.

We are about to delete two of them and replace the third.

## How This Happened

Organic growth. The first hand-typed `GeoJSONFeature` was written when we needed a type for "some GeoJSON Feature we haven't narrowed yet" and nothing in the LinkML master schema named that concept. A few months later, another developer in another package needed the same thing, didn't find it exported from a central place, and wrote a second copy — with a marginally different `id` type, because the payload they were looking at had integer IDs and the first copy didn't. In the Python services, a STAC loader took a third route: skip the type altogether, annotate as `dict[str, Any]`, keep moving.

Every individual step was reasonable. The sum is Article II (Schema Integrity) debt: the master schema is no longer the only place where a boundary type is defined.

## What We're Doing

Adding one LinkML submodule with three classes — `RawGeoJSONGeometry`, `RawGeoJSONFeature`, `RawGeoJSONFeatureCollection` — then regenerating Pydantic, TypeScript and JSON Schema from the updated source. The two hand-typed interfaces in `shared/utils/src/types.ts` and `services/session-state/src/types/results.ts` get deleted. So does the paired hand-typed `GeoJSONFeatureCollection`. The `services/stac` `dict[str, Any]` gets replaced with the generated Pydantic `RawGeoJSONFeature`. The existing, under-specified `GeoJSONFeature` LinkML stub in `session-state.yaml` is folded into the new class — paralleling two near-identical "loose Feature" classes would have replicated the exact drift we're paying down.

Roughly 24 TypeScript files and 3 Python files flip their imports. No runtime behaviour changes. No wire-format changes. No persistence changes. The whole thing ships as one atomic PR so reviewers see the schema edit, the regeneration diff, and the consumer migration together in a single pass.

## Why This Is Constitutional, Not Cosmetic

Article II (Schema Integrity) says the LinkML master schema is the single source of truth and derived types must be generated from it. Three hand-typed duplicates of a concept that *should* come from the schema is a direct violation — it's been tolerated, but it's still a violation.

Article XV (Strict Type Safety) forbids `any` in generated output and penalises structural drift. A `dict[str, Any]` annotation on a parse-boundary payload is the Python cousin of the TypeScript `any` we already refuse to tolerate.

One feature, two articles of the constitution. The payoff is not a new capability — it is the removal of an excuse to add a fourth duplicate six months from now.

## What We're Explicitly NOT Doing

There is a related family of permissive types — `SafeFeature`, `SafeGeometry`, `SafeFeatureCollection` in `shared/utils` — used at a different boundary (MCP / service-call handoff, not parse). They may belong under `RawGeoJSONFeature` one day, but that is a judgement call with its own review, and smuggling it into this PR would turn an atomic consolidation into a scope-creep argument. Tracked separately as backlog item #212. Out of scope here.

Also out of scope: the `snake_case` vs `camelCase` drift on surrounding session-state types, any lint rule that would forbid hand-writing a `GeoJSONFeature` interface in future, and any change to the narrow geometry classes (`GeoJSONPoint`, `GeoJSONLineString`, …) that `DebriefFeature` subtypes depend on. Those are each worth doing; none of them is this PR.

## What This Unlocks

A developer touching a parse boundary — file import, IPC message, tool response, STAC catalog load — gets one name to import and one shape to trust. The round-trip tests (Python → JSON → TypeScript → JSON → Python) grow a byte-identical guarantee for three canonical fixtures: string-id, integer-id, null-properties. Onboarding loses a category of "which `GeoJSONFeature` do I import?" confusion that nobody ever remembers until they hit it.

And the next time someone reaches for a "just for this parse boundary" type, there is a schema-sourced docstring on the generated class telling them exactly where the boundary ends and where `DebriefFeature` narrowing begins. The ADR entry in `docs/project_notes/decisions.md` will name the deleted duplicates, so the memory-aware review protocol surfaces the precedent.

## Next Up

Implementation is small and self-contained: the LinkML edit, the regenerated artefacts, the consumer migration, the fixtures, the ADR. The shipped post will show the grep that used to find three hand-written duplicates returning zero matches — and the `task verify` pipeline green on a single PR.
