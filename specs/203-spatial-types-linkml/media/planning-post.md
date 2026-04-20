---
layout: future-post
title: "Planning: One shape, many homes — consolidating spatial types in the schema"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schemas, linkml, tech-debt, refactor]
excerpt: "Three declarations of the same spatial type across two TS packages and one LinkML schema. Time to pick one and mean it."
---

## What We're Building

A `Coordinate` is a longitude and a latitude. Simple idea. In the current codebase it is declared three times — once in the LinkML schema as an object with named fields, once in `shared/components` as a tuple, and once inside `services/session-state` as another tuple. `ViewportPolygon` and `TimeFilter` have the same problem. Three shapes for the same concept is a silent drift hazard: nothing fails loudly when they disagree, but every feature that touches the map or the time slider pays a small tax in conversion code and careful-reviewer attention.

Feature 203 eliminates the duplication at the root. The LinkML schema becomes the single source of truth for `Coordinate`, `ViewportPolygon`, and `TimeFilter`. The duplicate TypeScript declarations are deleted. A pair of converter helpers — `toGeoJSONCoord` and `fromGeoJSONCoord` — lands in `@debrief/utils` to confine tuple-form handling to a narrow interop boundary with GeoJSON and Leaflet. Object form (`{ longitude, latitude }`) becomes canonical everywhere else.

## How It Fits

The schema-first principle is one of the oldest commitments in this rebuild: LinkML generates Pydantic, JSON Schema, and TypeScript so that Python services, the VS Code extension, and the shared component library all speak the same vocabulary. That promise only holds if nobody shadows the generated types with hand-written duplicates. This refactor is the cleanup that restores the invariant for the three spatial/temporal types that drifted furthest.

The work also sets up siblings in the pipeline — features #204 and #205 circle similar "three shapes of the same concept" situations elsewhere in the codebase. Getting the pattern right here (schema as source, converters at the edge, object form in the middle) establishes the template we can reuse.

## Key Decisions

- **Canonical form is the object form** `{ longitude: number, latitude: number }`. It matches LinkML, makes named-field semantics the default, and relegates tuple form to a named interop boundary. Tuples still exist — GeoJSON and Leaflet expect them — but only on the way in and on the way out.
- **`zoom` is added as an optional attribute on `ViewportPolygon`.** A sibling `ViewState` wrapper class was considered and rejected as too cascading for the benefit.
- **`TimeFilter` is reshaped to `{ start?: integer | null, end?: integer | null }`** — nullable epoch milliseconds, rather than the original `{ start: TimeInstant, end: TimeInstant }`. This honours an earlier decision to keep the hot-path time-slider working on plain numeric values. Introducing two types (a serialisation form and a runtime form) was rejected as over-engineering.
- **Validators move too.** `validateCoordinate`, `validateViewportPolygon`, and `calculateViewportCenter` relocate to `@debrief/utils` so they are reachable from both the component library and session-state without a cross-workspace build dependency.
- **Persisted state migrates silently on rehydration.** A one-shot fix-up converts legacy tuple-shaped `viewport.coordinates` to object form, and the persistence schema version is bumped so mid-migration state is detectable. The migration code is explicitly branded as removable after production sessions have cycled through.
- **Zero new runtime dependencies.** One LinkML patch, regenerate the derived artefacts, delete the duplicates, move the validators, add two pure converter functions with unit tests, update every call site. Schema adherence tests (golden fixtures, round-trip, structural comparison) remain the gate.

## What We'd Love Feedback On

- **The silent migration.** We chose to fix up legacy tuple-shaped viewports in place on rehydration rather than bump a version and reset the user's viewport. Silent is friendlier; an explicit reset is more honest about what changed. If you have strong views on which way a schema-driven app should lean here, we want to hear them.
- **The direction of convergence for `TimeFilter`.** We reversed the LinkML type toward epoch-millis rather than forcing the runtime to adopt `TimeInstant`. That keeps the time slider simple, but it does mean the LinkML shape is being pulled toward the runtime rather than the other way around. Is that the right call, or a concession we will regret?
- **Where else does this pattern hide?** Three shapes for one concept is rarely a one-off. If you have spotted similar duplication elsewhere in the codebase — especially in `shared/components` or the session-state layer — flag it. Siblings #204 and #205 already have candidates; more would be welcome.

→ [Read the spec](https://debrief.github.io/debrief-future/#/spec/203)
