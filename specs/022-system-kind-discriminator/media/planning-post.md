---
layout: future-post
title: "Planning: SYSTEM Kind for Plot State Persistence"
date: 2026-01-23
track: [momentum]
author: Ian
reading_time: 2
tags: [tracer-bullet, schemas, geojson]
excerpt: "Extending the schema to store viewport and selection state alongside spatial data"
---

## What We're Building

When you save a Debrief plot, your exact working context should be preserved — the time window you're examining, the map area you've zoomed to, the tracks you've selected for comparison. Currently our GeoJSON schema handles spatial features well, but has no home for this kind of application state.

We're adding a `SYSTEM` kind to the feature discriminator. SYSTEM features use null geometry (valid GeoJSON) and reserved IDs like `state.temporal`, `state.spatial`, and `state.selection`. When you reopen a plot, the application can retrieve these features directly by ID and restore your working context.

## How It Fits

This extends the LinkML master schema that generates our Pydantic, TypeScript, and JSON Schema representations. The pattern follows existing feature types — TrackFeature, ReferenceLocation — but with null geometry and a different discriminator value. No new dependencies, no architectural changes, just an expansion of what the schema can express.

## Key Decisions

- **Null geometry**: GeoJSON RFC 7946 explicitly allows `geometry: null`. We use this rather than inventing a separate storage mechanism.
- **Reserved ID prefix**: All SYSTEM features use `state.*` IDs. This makes lookup O(1) and prevents collision with user-created feature IDs.
- **No styling properties**: SYSTEM features are metadata, not displayed on the map. Adding style would blur the line between data and presentation.
- **Type discriminator**: A `state_type` field distinguishes temporal, spatial, and selection variants within the SYSTEM kind.

## What We'd Love Feedback On

- Are there other application states worth preserving? We've identified viewports and selection, but may be missing obvious candidates.
- Should selection state include more than just feature IDs? For example, the selection order or grouping?

→ [See the specification](https://github.com/debrief/debrief-future/tree/022-system-kind-discriminator/specs/022-system-kind-discriminator)
