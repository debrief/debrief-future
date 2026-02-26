---
layout: future-post
title: "Shipped: Unifying the Feature Pipeline"
date: 2026-02-24
track: [credibility]
author: Ian
reading_time: 3
tags: [tracer-bullet, architecture, refactoring]
excerpt: "stacService now returns a single FeatureCollection. 213 lines gone, 938 tests green."
---

## What We Built

The feature pipeline now flows in one direction, without splitting and rejoining.

`stacService.loadPlotData()` used to return three separate arrays — `tracks`, `locations`, `otherFeatures` — which every consumer immediately merged back together before doing anything useful. `mapView.tsx` had two transform functions (`trackToFeature`, `locationToFeature`) whose only job was converting the service's local types back into the `DebriefFeature` shape that the rendering layer already spoke. That round-trip existed because the service was making classification decisions that belonged at the render boundary.

Now the service returns a single `DebriefFeatureCollection`. Each feature carries `properties.kind` — `TRACK`, `POINT`, `CIRCLE`, and so on. Components that need to distinguish track features from location markers call `isTrackFeature()` or `isReferenceLocation()` at the point where the distinction matters. The layers tree derives its groups from `properties.kind` inside `getChildren()`. The map routes features to their renderers the same way. Nothing upstream has to know.

The message protocol between the extension host and webviews went from three fields (`tracks`, `locations`, `otherFeatures`) to one (`features`). Selection messages went from `trackIds[]` + `locationIds[]` to a unified `featureIds[]`, which is what session state was already using. The three `setTracks()` / `setLocations()` / `setShapes()` methods on view providers collapsed to a single `setFeatures()`.

Net result: 9 files changed, 304 lines added, 517 removed. The 213-line reduction is almost entirely deleted transform code that was doing work the schema types had already done.

## Screenshots

_Screenshots pending — the change is internal to the data pipeline. No visible UI difference is the point._

## Lessons Learned

The `trackToFeature` and `locationToFeature` functions had been accumulating for a while. Looking at them now, they were each about 10-15 lines of field mapping between near-identical types — `Track.name` to `TrackFeature.properties.platform_name`, `Track.color` to `TrackFeature.properties.style.line.color`. Two fields didn't map: `visible` and `selected`. Those were hardcoded to `true` and `false` at load time and had never been meaningful on the data type. They were UI state that had drifted into a data structure.

The `AnnotationFeature` type was the one addition that wasn't a deletion. The existing `DebriefFeature` union covered tracks, locations, and multi-point/multi-polygon types but had no named type for annotation shapes — circles, rectangles, polylines drawn in the editor. Rather than leave them as untyped `GeoJSONFeature`, we added `AnnotationFeature` to the union. It preserves the original `kind` value from the feature properties and lets the type guards cover the full range cleanly.

One thing that surprised me: only 10 of the 97 `stacService` tests needed updating. The rest were testing parsing and property preservation, which didn't change — only the return shape did. The tests that changed were the ones asserting `result.tracks` and `result.locations` structure, which became `result.features.filter(f => f.properties.kind === 'TRACK')`. Mechanical, not conceptual.

The question about whether to version the message protocol (from the planning post) turned out to be unnecessary. The extension controls both sides of the message boundary, and the test suite covers the full round-trip. A clean swap with no versioning was fine.

## What's Next

The type guards — `isTrackFeature()`, `isReferenceLocation()`, `isAnnotationFeature()` — are now exported from `@debrief/components` rather than being internal utilities. That sets up the next piece of work: Python tools that analyse features will be able to use the same classification logic, via the generated schema types, rather than reimplementing it.

→ [See the specification](https://github.com/debrief/debrief-future/tree/100-unify-feature-pipeline/specs/100-unify-feature-pipeline/spec.md)
→ [API diff: before and after](https://github.com/debrief/debrief-future/tree/100-unify-feature-pipeline/specs/100-unify-feature-pipeline/evidence/api-diff.md)
