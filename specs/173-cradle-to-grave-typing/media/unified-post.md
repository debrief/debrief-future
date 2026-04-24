---
title: "Building Cradle-to-Grave Typing"
date: 2026-03-26
layout: future-post
author: Future Debrief Team
track: momentum
excerpt: "Feature 173 complete: 60+ files retyped, dict[str, Any] and Record<string, unknown> eliminated from tool functions, all domain data now typed end-to-end."
tags:
  - pydantic
  - schema-first
  - type-safety
---

## What We're Building

There is a single line in Future Debrief's I/O service that causes more bugs than any other:

```python
Feature = dict[str, Any]
```

That type alias is the canonical return type for every parsed feature. Every downstream consumer -- calc tools, STAC storage, provenance, the VS Code extension -- inherits the weakness. A tool can return `{"properties": {"knid": "TRACK"}}` (note the typo) and no checker catches it. The compiler sees `dict[str, Any]` and shrugs.

We already have the fix. LinkML generates Pydantic models with fully typed properties on the Python side and TypeScript interfaces with discriminated unions on the TypeScript side. Type guards like `isTrackFeature()` exist and work. The problem is adoption: domain data enters the system typed, gets validated at the boundary, then immediately drops into untyped dicts for the rest of its life. About 150 locations across 60 files do this -- 30+ places write `feature.get("properties", {}).get("kind")` instead of `feature.properties.kind`.

This feature closes the gap. Data stays typed from the moment it's parsed to the moment it's serialised.

## How It Fits

Future Debrief's architecture is schema-first: LinkML master schemas generate Pydantic models for Python and TypeScript interfaces for the frontend. Feature 115 (schema-validated tool I/O) proved the approach works at service boundaries. Feature 098 (strict type checking) tightened the compiler settings. Feature 172 (technical debt review) consolidated duplicate type definitions.

This is the logical next step. Those features built the infrastructure; this one enforces it everywhere. When a schema property gets renamed, the compiler should catch every consumer -- not just the ones at the boundary.

## Key Decisions

- **No new dependencies.** The Pydantic models and TypeScript type guards already exist in `debrief_schemas` and `@debrief/schemas`. This is an adoption effort, not a tooling effort.

- **Gradual migration: executor boundary first, then individual tools.** The calc executor already calls `validate_feature()` in warn-and-continue mode. Phase one promotes that to fail-fast. Phase two migrates individual tool functions to accept and return Pydantic models directly, starting with the simplest (single feature in, single feature out). No big-bang rewrite.

- **Type guards over Zod for JSON.parse validation.** The TypeScript side has 9 places that do `JSON.parse(content) as SomeType` -- a compile-time assertion with zero runtime checking. We'll validate through existing type guards from `@debrief/schemas/unions.ts` rather than introducing Zod. The guards already encode the discriminated union logic; adding Zod would duplicate it and add a dependency.

- **Extend the TypeScript generator for session-state and tool-result types.** These exist in LinkML but aren't currently emitted into the TypeScript output because their YAML modules aren't imported into the master `debrief.yaml`. Adding two import lines makes `gen-typescript` include them automatically. The hand-written TypeScript versions in `services/session-state/src/types/` then become redundant.

- **Eliminate the `featureProps.ts` escape hatch.** This utility casts any `DebriefFeature` to `Record<string, unknown>`, discarding all type information. It exists because narrowing a discriminated union felt inconvenient -- but the type guards that make narrowing easy have existed for months. Ten consumer files use the escape hatch today. Each one knows which feature kind it operates on. Adding a guard at the top of each function is straightforward.

**Feature 173 is complete.** Over eight phases, we eliminated the type-safety gaps that caused property-access bugs across the Future Debrief codebase. Domain data now stays typed from parse to serialise.

## What's Next

With end-to-end typing in place, the next tracer-bullet feature (174) can focus on adding new analysis capabilities without the friction of fighting untyped data. Schema evolution becomes safer: rename a field, regenerate, fix the compile errors, done.

The investment in schema-first architecture is paying off.
