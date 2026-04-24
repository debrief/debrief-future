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

### The Core Fix

The root cause was simple: a type alias in the I/O service defined all features as `dict[str, Any]`, making the compiler blind to invalid property access across 150 locations in 60 files. We replaced it with a `DebriefFeature` union type, forcing every consumer to declare which feature kind it operates on.

### What Changed

**8 phases completed:**

- **Phase 0:** Added missing schema definitions to LinkML: `PlotSummary`, `StacItemSummary`, `ResultsSlice`, and harmonised `DatasetEnvelope` with its schema.

- **Phase 1:** Extended the TypeScript generator to emit session-state, tool-result, and chart-data types. `SessionState`, `TemporalSlice`, `DatasetEntry` etc. now generate directly from LinkML rather than being hand-written.

- **Phase 2:** Deleted ~20 hand-written TypeScript type definitions that duplicated generated schemas. Imports from `@debrief/schemas` and `@debrief/schemas/unions.ts` replaced them.

- **Phase 3:** Retyped all 13 Python tool functions to accept specific feature types and return Pydantic models instead of bare dicts. The executor validates on tool boundary; tools no longer return untyped output.

- **Phase 4:** Migrated 10 TypeScript tool functions to use explicit feature-type parameters with type guards instead of the `propsRecord` escape hatch. The utility function that cast `DebriefFeature` to `Record<string, unknown>` was deleted.

- **Phase 5:** Added post-`JSON.parse()` validation at 9 deserialization points (VS Code extension, STAC service, config service, calc service). Data no longer enters the type system via silent `as` casts.

- **Phase 6:** Migrated session-state and tool-result types to import from generated schemas. Removed duplicate hand-written definitions in `services/session-state/src/types/` and `services/session-state-py/src/debrief_session/`.

- **Phase 7:** Updated provenance and STAC pipelines to validate features on read, not just write. The STAC features module now fails fast on invalid data instead of loading corrupted JSON as valid.

### By the Numbers

- **60+ files modified** across Python services, TypeScript frontends, and shared schemas
- **13 Python tool functions** retyped with Pydantic models
- **10 TypeScript tool functions** migrated to type guards
- **Session-state types** now generated to TypeScript from LinkML
- **Tool-result types** (`DatasetEntry`, `DatasetSeries`, etc.) generated and deployed
- **`dict[str, Any]` eliminated** from all tool function signatures
- **`Record<string, unknown>` eliminated** from core feature-handling logic
- **`propsRecord` escape hatch deleted** from `apps/vscode/src/utils/featureProps.ts`
- **`as unknown as` casts removed** from domain data paths in calc and STAC services

### The Impact

When a schema property gets renamed now, the compiler catches every consumer. No more silent failures from typos in property names. Tools declare their preconditions in code: `def analyze_track(feature: TrackFeature)` makes it clear that this function only works on tracks. The TypeScript side has equivalent guards via `isTrackFeature()` type narrowing.

The codebase is smaller (no duplicate types) and more maintainable (schema changes ripple automatically via code generation instead of requiring manual sync). And most importantly: property-access bugs that used to hide until runtime are now caught at compile time.

## What's Next

With end-to-end typing in place, the next tracer-bullet feature (174) can focus on adding new analysis capabilities without the friction of fighting untyped data. Schema evolution becomes safer: rename a field, regenerate, fix the compile errors, done.

The investment in schema-first architecture is paying off.
