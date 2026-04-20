---
layout: future-post
title: "Planning: One schema-rooted type for the GeoJSON parse boundary"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, linkml, refactor, type-safety]
excerpt: "Five hand-written TypeScript feature interfaces, three subtly different shapes, one constitutional rule they all violate. Time to fix it."
---

## What We're Building

Somewhere along the way, three different hand-written definitions of "a GeoJSON Feature" took root in the monorepo. One lives in `shared/utils/src/types.ts` with typed coordinates and a string-only `id`. A sibling in the same file — `SafeFeature` — has nullable geometry, a `string | number` id, and `coordinates: unknown`. And a third copy drifted into `services/session-state/src/types/results.ts` with its own shape again. Each was written by someone solving a real problem at the time, and each is a small violation of the same rule we wrote into our own constitution: Article II says schema types are derived from LinkML, never hand-written.

This feature replaces all five hand-written types (`SafeFeature`, `SafeFeatureCollection`, `SafeGeometry`, `GeoJSONFeature`, `GeoJSONFeatureCollection`) plus the drifted copy with one LinkML-generated `GeoJSONFeature` class — plus supporting `GeoJSONBoundaryGeometry` and `GeoJSONFeatureCollection` classes. Every in-tree consumer changes its import path from `@debrief/utils` to `@debrief/schemas`. Nothing else moves. No user-visible behaviour changes.

## How It Fits

The constitution is explicit: the schema is the contract. LinkML master schemas define all data structures; Pydantic, JSON Schema, and TypeScript representations are derived. Hand-written types that describe data shapes are a drift risk — the moment two exist for the same concept, they will disagree, and the type-checker will silently pick a side for every consumer.

A recent change (#200) widened the input to `calculateBounds` to a structural minimum that happened to sidestep the drift at one busy call site. That was the right tactical move at the time, but the tripwire was still armed. This feature disarms it. After this lands, a developer searching the monorepo for "the type I use when I parse an untrusted feature" finds exactly one answer, at one import path, with one definition.

The refactor is broad but shallow: roughly thirty files touched with mechanical import-path rewrites, sixty lines of hand-written types deleted, eighty lines added to LinkML, and one regen of the generated outputs. The CI gate (`task verify`) stays green throughout.

## Key Decisions

- **Widen the existing LinkML `GeoJSONFeature` class in place** rather than adding a new `RawGeoJSONFeature` sibling. Reusing the name prevents the same two-classes-one-concept drift from reappearing in the schema itself — and the existing class has only one consumer (`ResultsSlice.result_layers`), which the widened shape still satisfies.
- **Relocate the class from `session-state.yaml` to `geojson.yaml`**, where every other GeoJSON geometry type already lives. One-commit move; placement matters for a reader grepping the schema.
- **Model the widened shape after the permissive `SafeFeature`**: nullable geometry, `string | integer` id, open-ended properties. Narrowing downstream is cheap (the `DebriefFeature` type guards already exist); widening downstream is expensive and forces `as`-casts at every boundary.
- **Subsume backlog #204** into this work. #204 was the narrower version of the same cleanup. Shipping both as two PRs would mean editing the same LinkML file twice and regenerating twice, with an intermediate state where one type is schema-rooted and another is not. One PR, one regen.
- **Python-side `TypeAlias = dict[str, Any]` uses are out of scope.** They're a separate Article II violation across twenty-plus tool signatures, and migrating them requires reasoning about Pydantic validation at every tool boundary. A distinct PR.
- **Zero new `as`-casts at call sites.** If the migration introduces casts, it has traded one form of drift for another. The generated shape is designed to match `SafeFeature` closely enough that consumer call sites compile unchanged.

## What We'd Love Feedback On

- **The name.** We're reusing `GeoJSONFeature` for the loose parse-boundary type rather than introducing `RawGeoJSONFeature`. Reuse avoids a rename ripple and keeps the schema honest about "there is one class for this concept" — but it does mean the existing name now carries a looser shape than it did before. Is that the right trade, or does the `Raw` prefix earn its keep as signal that this type is pre-narrowing?
- **Python scope.** Should we tackle the Python-side `TypeAlias = dict[str, Any]` cleanup in the same PR? Arguments for: one LinkML regen, one coherent "Article II fix" landing. Arguments against: sixty-plus files, Pydantic validation semantics, scope creep on a mechanical refactor.
- **`properties: Any`.** The GeoJSON spec itself leaves properties opaque — we model it as `Any` at the boundary and rely on the `DebriefFeature` variants (`TrackProperties`, `ReferenceLocationProperties`, etc.) to carry the typed shape past narrowing. Is that the right Article II exception, or should we push harder for a structured schema even at the boundary?

The full spec is at `specs/212-linkml-feature-types/spec.md` in the repository.
