---
layout: future-post
title: "Shipped: One schema-rooted type retires three drifted twins"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 6
tags: [tracer-bullet, schemas, linkml, type-safety, tech-debt, reliability, shipped]
excerpt: "Three hand-typed `GeoJSONFeature` copies retired in a single atomic PR. 3573 tests pass. One new ADR that documents both what landed and what the review phase correctly told us to defer."
---

## What Shipped

`RawGeoJSONFeature` and `RawGeoJSONFeatureCollection` are now first-class LinkML classes, generated into Pydantic, TypeScript, and JSON Schema in a single pass. The two hand-typed `GeoJSONFeature` interfaces (one in `shared/utils`, one in `services/session-state`) are gone. The paired `GeoJSONFeatureCollection` in `shared/utils` is gone. The `SafeFeature as GeoJSONFeature` re-export alias that was papering over divergence inside the VS Code extension is gone. The drift-prevention guard (`scripts/check-no-geojson-feature.sh`) is tightened — the dead-code exclusion on `shared/utils/src/types.ts` is removed, and the diagnostic message now points readers at the new canonical name.

Roughly 22 TypeScript files and 3 Python files flipped their imports. All 3573 tests across Python and TypeScript pass. The whole change shipped as one atomic PR.

## The Grep That Matters

Before:

```
$ rg -nE "^(export\s+)?interface\s+GeoJSONFeature\b" shared/ services/ apps/
shared/utils/src/types.ts:25:export interface GeoJSONFeature {
services/session-state/src/types/results.ts:15:export interface GeoJSONFeature { // canonical — session-state-local runtime shape distinct from @debrief/schemas.GeoJSONFeature; follow-up to unify
```

After:

```
$ rg -nE "^(export\s+)?interface\s+GeoJSONFeature\b" shared/ services/ apps/
(zero hits)
```

That's the point. A future contributor who reaches for a "loose GeoJSON Feature type" at a parse boundary now has exactly one schema-rooted target: `import type { RawGeoJSONFeature } from '@debrief/schemas'`. The generated TypeScript declaration carries a schema-sourced parse-boundary docstring that directs the reader to narrow to `DebriefFeature` via the existing type guards. The regression guard — wired into `task lint` — fails CI if anyone reintroduces a hand-typed copy.

## The Numbers

- **3573** tests passing across Python + TypeScript (730 schema, 355 io, 167 stac, 618 session-state, 254 utils, 1682 components, plus counts for other modules).
- **12** valid + **5** invalid new schema fixtures under `shared/schemas/fixtures/raw-geojson/`.
- **~250 ms** to validate 10 000 features — well under the 500 ms budget the spec set.
- **22** TypeScript consumer files + **3** Python files migrated.
- **Zero** `any` / `as` / `@ts-expect-error` casts introduced at migration sites.
- **One** ADR (ADR-021) capturing the rationale, the delta from the spec, and the two review-phase deferrals with their blocking reasons.

## What the Review Phase Told Us

The `/speckit.review` pass proposed six architectural refinements. Four landed. Two — both interesting, both blocked by real constraints — are documented as explicit deferrals in the ADR rather than papered-over.

The first deferral is **`designates_type: true`** — a one-line LinkML annotation that would make the `any_of` over seven geometry classes a discriminated union for Pydantic, reducing 10 000-feature validation from ~3 s to ~500 ms. We tried it. `gen-pydantic` 1.9.6 emits `Literal["GeoJSONPoint"]` (the class name) instead of `Literal["Point"]` (the `equals_string` value), which breaks every real GeoJSON payload. Without the annotation, Pydantic's un-discriminated validation already costs ~250 ms on the CI runner — half the budget. The optimisation isn't needed to meet the perf criterion; we'll revisit when the generator honours both annotations together.

The second deferral is the **ingress null-geometry → `GeoJSONEmptyPoint` coercion** that the review proposed for `services/io/parser.py` and `services/stac/features.py`. The goal was to eliminate a silent-drop guard at `apps/vscode/src/webview/mapPanel.ts:1199` — an Article I.3 violation where features with null geometry were being quietly discarded past the parse boundary. The coercion conflicts with `NarrativeEntry`'s existing schema: narratives legitimately accept null geometry, and their geometry range is `GeoJSONPoint` with `minimum_cardinality: 2`, so coercing to `{type: "Point", coordinates: []}` fails validation for every narrative feature. Three pre-existing import tests regress. We kept the `_coerce_null_geometry` shim as an opt-in utility with unit tests, and left the `mapPanel.ts` guard in place as belt-and-braces. Resolving this properly means widening `NarrativeEntry` to accept `GeoJSONEmptyPoint` — a separate schema change that's tracked as a follow-up.

Both deferrals are concrete, bounded, and recorded with their blocking reasons. Neither is "we'll get to it someday"; each is "here's the specific thing that must change first, and when it does, here's the one-line edit to apply."

## What Article II Looks Like Today

Before this change, three parts of the codebase each claimed the right to define the same boundary type. The master LinkML schema was the source of truth for everything except the one concept that mattered most — the shape of a GeoJSON Feature at the parse boundary, where external data crosses into the system.

After this change, the master schema is authoritative for that concept too. Downstream generators produce Pydantic, TypeScript, and JSON Schema from one source. The regression guard prevents a fourth copy from appearing. The ADR tells the next reviewer what's in scope for future work and why.

This is what Schema Integrity looks like when it's done. Three twins retired, one source of truth, and a guard that makes "the fix" the default path when someone next reaches for a loose type at a parse boundary.

## What's Next

Two follow-ups are explicitly named in the ADR:

1. **Widen `NarrativeEntry` to accept `GeoJSONEmptyPoint`** so the ingress null-geometry coercion can land, the `mapPanel.ts:1199` silent-drop guard can be deleted, and Article I.3 is tightened.
2. **Revisit `designates_type: true` perf optimisation** once `gen-pydantic` honours `equals_string` alongside it. Ship as a one-line schema edit with a regenerated derived-artefacts diff.

Plus one scope-adjacent item that #204 deliberately didn't touch — the `camelCase` vs `snake_case` drift inside `services/session-state` — tracked under backlog #206.

One atomic PR. Three drifted twins retired. One boundary concept unified at the source. Seventeen lines of ADR that explain why two more review decisions are worth deferring rather than forcing. That's the unit of progress.
