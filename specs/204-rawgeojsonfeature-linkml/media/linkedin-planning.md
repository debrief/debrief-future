---
layout: future-post
title: "Planning: Three drifted type twins, one silent-drop guard, one atomic PR"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 1
tags: [linkml, schema-first, type-safety, reliability, tech-debt]
excerpt: "Ever had the same interface defined in three places? We did. The planning review also surfaced a silent-failure mode hiding in plain sight."
---

Ever had the same interface defined in three places, each slightly different, each drifting?

We did. A hand-typed `GeoJSONFeature` in one TypeScript package. A second copy in another, with a subtly different `id` type because a later payload demanded it. A third incarnation in a Python service, annotated as `dict[str, Any]` — the Python way of shrugging at a parse boundary. Three definitions of one concept, three places for the spec and the code to diverge.

While reviewing the consolidation plan, we also caught a one-liner at the map panel that was silently dropping any feature with a null geometry — a straight-line violation of our *No Silent Failures* principle. Fixing it fell naturally out of the schema work: make `geometry` required in the new schema, coerce nulls to an empty-point geometry at the two ingress sites, and the silent-drop guard becomes obviously wrong.

The fix is one atomic PR: add two classes to the LinkML master schema (`RawGeoJSONFeature` + `RawGeoJSONFeatureCollection`, with a discriminated-union `geometry` slot over the seven existing geometry classes), regenerate Pydantic and TypeScript from source, delete the hand-typed duplicates, migrate ~22 TypeScript and 3 Python files, and bake in a 10 000-feature performance budget so Pydantic stays fast.

Three articles of the constitution addressed — Schema Integrity, Strict Type Safety, No Silent Failures — for the price of one review pass.

Follow along for the shipped post once the migration lands.

#FutureDebrief #LinkML #SchemaFirst #TypeSafety #Reliability #MaritimeAnalysis
