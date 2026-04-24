---
layout: future-post
title: "Shipped: Per-Platform Schema Overrides"
date: 2026-04-13
track: [credibility]
author: Ian
reading_time: 4
tags: [tracer-bullet, schema, stac, e10-catalog-discovery]
excerpt: "STAC items now carry a structured platforms array — compound queries like 'British submarines' are finally representable"
---

## What We Built

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
