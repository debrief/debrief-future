---
layout: future-post
title: "Shipped: Cradle-to-Grave Typing"
date: 2026-03-26
track: [momentum]
author: Future Debrief Team
reading_time: 4
tags: [tracer-bullet, type-safety, linkml, pydantic, typescript, schema-first]
feature_id: 173
excerpt: "Feature 173 complete: 60+ files retyped, dict[str, Any] and Record<string, unknown> eliminated from tool functions, all domain data now typed end-to-end."
---

## What We Shipped

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
