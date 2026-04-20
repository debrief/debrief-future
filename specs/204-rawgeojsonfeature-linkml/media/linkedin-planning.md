---
layout: future-post
title: "Planning: One schema-rooted type to retire three drifted twins"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 1
tags: [linkml, schema-first, type-safety, tech-debt]
excerpt: "Ever had the same interface defined in three places, each slightly different? We did. Here's the fix."
---

Ever had the same interface defined in three places, each slightly different, each drifting?

We did. A hand-typed `GeoJSONFeature` in one TypeScript package. A second copy in another, with a subtly different `id` type because a later payload demanded it. A third incarnation in a Python service, annotated as `dict[str, Any]` — the Python way of shrugging at a parse boundary. Three definitions of one concept, three places for the spec and the code to diverge.

The fix is one atomic PR: add three classes to the LinkML master schema (`RawGeoJSONGeometry`, `RawGeoJSONFeature`, `RawGeoJSONFeatureCollection`), regenerate Pydantic and TypeScript from source, delete the hand-typed duplicates, migrate roughly 24 TypeScript files and 3 Python files to the generated type.

Why bother for a type-only change? Article II of the project constitution — Schema Integrity — says the master schema is the single source of truth. Three hand-typed twins is a direct violation, tolerated but not accepted. This is the tracer-bullet principle in practice: the schema becomes the only place boundary types are defined.

Follow along for the shipped post once the migration lands.

#FutureDebrief #LinkML #SchemaFirst #TypeSafety #MaritimeAnalysis
