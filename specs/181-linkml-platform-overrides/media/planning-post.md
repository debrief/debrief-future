---
layout: future-post
title: "Planning: Per-Platform Schema Overrides"
date: 2026-04-14
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, schema, stac, e10-catalog-discovery]
excerpt: "Restructuring STAC metadata so compound queries like 'British submarines' become possible"
---

## What We're Building

Today you can ask "which plots have a British vessel?" and you can ask "which plots have a submarine?" What you cannot ask is "which plots have a British submarine?" — because the current STAC metadata stores nationalities and vessel classes as flat, disconnected lists. There's a `debrief:nationalities` array with `["GB", "FR"]` and a `debrief:vessel_classes` array with `["surface/warship/frigate/type23", "subsurface/submarine/ssn/trafalgar"]`, but nothing connecting which nationality belongs to which vessel. The data is there. The structure isn't.

This week we're updating the LinkML schema to fix that. The core change is a new `debrief:platforms` array on STAC items — instead of flat lists, each platform gets its own record carrying nationality, vessel class, domain, and type together as a unit. A `PlatformRecord` with `{id: "NELSON", nationality: "GB", vessel_class: "surface/warship/frigate/type23", domain: "surface"}` is unambiguous. Compound predicates just work.

We're also adding six optional override fields to `TrackProperties` in the GeoJSON schema: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain`. These are analyst-set overrides — they're only populated when someone explicitly provides values that differ from the platform registry (#180). When absent, downstream consumers resolve values from the registry at runtime. This keeps the GeoJSON lightweight while giving analysts the final word on any track's identity.

## How It Fits

This is the second item in the E10 foundation phase (NL-Assisted Catalog Discovery). The platform registry (#180, complete) established the hierarchical vessel class tree — the structure where `NELSON`'s identity is derived from its position at `surface/warship/frigate/type23/NELSON`. This feature encodes those structures into the LinkML schema so that generated Pydantic models and TypeScript types enforce the contracts across every service and frontend.

Everything downstream depends on these schema structures. Save-time resolution (#183) needs `PlatformRecord` to know what shape to produce. The CQL2 `array_filter` evaluator (#185) needs the `debrief:platforms` array to know what shape to query against. The filter bar UI (#186) needs TypeScript types for compound predicates. And eventually, NL query generation (#188) translates natural language into CQL2 that targets these structures. Without the schema, none of those features have a type-safe contract to build against.

## Key Decisions

- **VesselDomainEnum moves from `stac-extension.yaml` to `common.yaml`** — the `domain` field appears on both `TrackProperties` (in `geojson.yaml`) and `PlatformRecord` (in `stac-extension.yaml`). Having GeoJSON depend on the STAC extension is semantically backwards, so the enum moves to the shared foundation module. Both files already import `common.yaml`.

- **PlatformRecord is a STAC extension entity, not a general-purpose type** — it represents fully-resolved metadata produced at save-time by merging registry lookups with analyst overrides. It lives in `stac-extension.yaml` alongside its only consumers: `StacExtensionProperties` and `StacItemSummary`.

- **Flat aggregate fields stay during the transition** — `debrief:vessel_classes`, `debrief:nationalities`, and `debrief:track_names` remain in the schema. All 100 exercise fixtures and any real catalog data use them. We add `debrief:platforms` alongside them, and a later cleanup item removes the flat fields after all consumers have migrated.

- **Only `id` is required on PlatformRecord** — a record with just `{id: "UNKNOWN_CONTACT"}` is valid. This handles unregistered platforms with no registry data and no analyst overrides. Sparse records are a natural state, not an error.

- **Override fields use established pattern constraints** — `nationality` is `^[A-Z]{2}$` (ISO 3166-1 alpha-2), `vessel_class` is `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$` (1-4 slash-delimited lowercase segments), and `domain` reuses the existing `VesselDomainEnum`. No new conventions to learn.

- **Targeted fixtures, not wholesale changes** — we're adding ~7 new golden fixtures covering the new structures (fully-populated records, sparse records, invalid values) without modifying the existing 100-item exercise set. The exercise catalog gets regenerated with `debrief:platforms` in a separate item (#184).

## What We'd Love Feedback On

- **Override field granularity**: We have six fields (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`). Some of these are derivable from others — `vessel_type` is the leaf of `vessel_class`, `domain` is the first segment. Should we keep the redundancy for query convenience, or drop the derived fields and compute them at runtime?

- **PlatformRecord identity**: The `id` field matches `platform_id` on `TrackProperties`. Should the same platform appearing in multiple tracks within a plot produce one `PlatformRecord` or multiple? (We're leaning toward one — deduplication at save-time — but the schema doesn't enforce it.)

- **Transition timeline for flat aggregates**: The old `debrief:vessel_classes` / `debrief:nationalities` fields stay for now. Is there a consumer we should be aware of that would break if they were eventually removed? Better to know now.

-> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
