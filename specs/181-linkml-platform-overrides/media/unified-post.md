---
title: "Building Per-Platform Schema Overrides"
date: 2026-04-13
layout: future-post
author: Ian
track: credibility
excerpt: "STAC items now carry a structured platforms array — compound queries like 'British submarines' are finally representable"
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

The STAC metadata format has changed. Where exercises previously stored nationalities and vessel classes as flat, disconnected lists, they now carry a `debrief:platforms` array of structured `PlatformRecord` entries. Each record binds a platform's identity fields — nationality, vessel class, domain, vessel type, vessel role — together as a unit.

The consequence is that "which exercises involved British submarines?" can now be expressed as a compound predicate: `nationality = "GB" AND domain = "subsurface"`. Before this change, you could filter on either property but not join them, because the data model stored `["GB", "FR"]` and `["subsurface/submarine/ssn/trafalgar", "surface/warship/frigate/type23"]` in separate lists with no pairing.

We also added six optional override fields to `TrackProperties`: `display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, and `domain`. These are analyst-set values that take precedence over registry-derived defaults. When absent — which is almost always, for registered platforms — downstream consumers resolve from the registry at runtime. When present, the analyst's value wins. The field exists in the schema; using it is a deliberate act.

All 100 exercise fixtures have been regenerated in the new format. The old flat fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`) are gone — not deprecated, removed.

## By the Numbers

| | |
|---|---|
| Tests passing | 2,921 |
| Test failures | 0 |
| Files changed | ~40 |
| Exercise fixtures regenerated | 100 |
| Schema files modified | 3 |
| Residual flat-field references | 0 |

The 40 files span six monorepo layers: LinkML schemas, generated Pydantic models, generated TypeScript types, the filter engine, the STAC service, and every Storybook story that previously referenced the old fields. The migration was atomic — schema change and consumer update in one branch.

## Lessons Learned

The decision to remove flat fields immediately rather than keeping them alongside `debrief:platforms` turned out to be the right call, but it required updating a larger surface area than a purely additive change would have. The payoff: zero ambiguity about which field is canonical, and no future cleanup item to track.

One wrinkle worth noting: `VesselDomainEnum` had to move from `stac-extension.yaml` to `common.yaml`. The `domain` field appears on both `TrackProperties` (in `geojson.yaml`) and `PlatformRecord` (in `stac-extension.yaml`). Having GeoJSON import from the STAC extension is semantically backwards — GeoJSON is the foundation, STAC is built on top. Moving the enum to the shared module resolved the dependency direction cleanly.

The sparseness rule for `PlatformRecord` also proved its worth in practice: `{id: "CONTACT-01"}` with all other fields absent is valid. Unregistered contacts and unknown platforms are a normal operating condition in maritime exercises, not schema errors to be papered over.

## What's Next

Save-time resolution (#183) is the next item in the E10 foundation sequence. That's where platform records get populated: when a plot is saved, the enrichment pipeline looks up each `platform_id` in the registry, merges any analyst overrides from `TrackProperties`, and writes the resolved `PlatformRecord` to the STAC item. The schema exists; now we build the code that fills it.

After that: CQL2 `array_filter` support (#185) so the compound predicates the data model now enables can actually be evaluated.

→ [See the branch](https://github.com/debrief/debrief-future/tree/claude/implement-speckit-181-3A7rw)
