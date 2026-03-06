---
layout: future-post
title: "Planning: STAC Extension Spec + Mock Data Fixtures"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, schemas, discovery-ui, e08]
excerpt: "Defining the data contract that nine Discovery UI components will build on"
---

## What We're Building

Before you can build a search interface, you need to agree on what's searchable. That sounds obvious, but it's the kind of thing that goes wrong quietly -- three developers build three components, each assuming vessel type lives in a different property name, and you don't find out until integration.

So this week we're writing the data contract for the STAC Browser Discovery UI. Specifically: a STAC extension specification that defines exactly which properties a Debrief plot carries -- vessel classifications, tags, author, track names, nationalities -- under a `debrief:` namespace prefix. Alongside that, a Python generator script that produces 100 deterministic fixture items covering multiple ocean regions, time ranges, and vessel types. These fixtures become the shared reality that every Storybook component develops against.

The vessel taxonomy is worth mentioning on its own. We've landed on a 3-level hierarchy: category, class, and type. So `surface/warship/frigate/type23` tells you everything in a single slash-separated path. Nineteen leaf types across surface warships, submarines, auxiliaries, and merchant vessels. Enough structure for meaningful hierarchical filtering, not so much that the taxonomy itself becomes a project.

## How It Fits

This is item #125 in the build sequence, and it's the foundation for Epic E08 -- the STAC Browser Discovery UI. Nine downstream items (#126 through #134) depend on this contract. Filter panels, map views, timeline displays, text search -- they all need to agree on property names and value shapes before anyone writes a line of component code.

The extension schema lives as a LinkML module (`stac-extension.yaml`) that imports into the root `debrief.yaml`. That means Pydantic models, JSON Schema, and TypeScript types all generate from the same source. A fixture that validates against the Python model will work with the TypeScript types. No drift.

## Key Decisions

- **`debrief:` namespace prefix** for all extension properties, consistent with existing usage (`debrief:toolId`, `debrief:sourceFeatures`). No formal STAC extension registry submission needed yet.

- **Duration computed at query time**, not stored in `item.properties`. Since `start_datetime` and `end_datetime` are already required STAC fields, storing duration would create a staleness risk if temporal bounds are updated. The filter engine computes it on the fly.

- **Vessel classes as slash-separated taxonomy paths** rather than separate fields for category, class, and type. One string encodes the full hierarchy: `subsurface/submarine/ssn/astute`. Simpler to store, simpler to filter with prefix matching.

- **Feature tags aggregated to item level**. Individual GeoJSON features carry their own tags, but we also store the union of all feature tags in `item.properties` as `debrief:feature_tags`. This makes them discoverable without opening every GeoJSON file.

- **100 fixtures with realistic distributions**, not uniform. North Atlantic gets ~30 items, Arctic gets ~10. Frigates appear more often than VLCCs. The distributions are deliberately skewed to match what analysts would actually see, which matters for testing filter selectivity and UI density.

- **Deterministic generation** from a Python script with fixed seed. Anyone running the generator gets identical output. No "works on my machine" fixture drift.

## What We'd Love Feedback On

- Is the 3-level vessel taxonomy granular enough for realistic filtering, or do analysts need a fourth level (e.g., specific hull numbers)?

- We're using ISO 3166-1 alpha-2 codes for nationalities (`GB`, `US`, `FR`). Should we also store the human-readable name, or is code-to-name mapping a UI concern?

- The fixture set covers six ocean regions. Are there specific geographic areas that would exercise edge cases we haven't considered (e.g., antimeridian crossing in the Pacific)?

- Duration is computed, not stored. If there's a use case where pre-computed duration buckets would significantly simplify a downstream component, we'd want to know before implementation.

-> [See the full specification](https://github.com/debrief/debrief-future/blob/main/specs/125-stac-extension-mock-data/spec.md)
