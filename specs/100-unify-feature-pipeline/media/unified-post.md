---
title: "Building Unifying the Feature Pipeline"
date: 2026-02-24
layout: future-post
author: Ian
track: credibility
excerpt: "stacService now returns a single FeatureCollection. 213 lines gone, 938 tests green."
tags:
  - refactoring
---

## What We're Building

`stacService.loadPlotData()` currently returns three separate arrays: tracks, reference locations, and everything else. The irony is that `mapView.tsx` immediately merges them back into a single `DebriefFeature[]` before rendering. We're cutting out the middle step -- the service will return one `FeatureCollection`, and components will classify features themselves using the type guards that already exist in `@debrief/schemas`.

This means removing the extension-local `Track` and `ReferenceLocation` types that duplicate what the schema already provides. The mapping table is almost 1:1 -- `Track.name` maps to `TrackFeature.properties.platform_name`, `Track.color` maps to `TrackFeature.properties.style.line.color`, and so on. The two fields that don't map are `visible` and `selected`, which are UI state, not data properties. They're already managed by session state (`hiddenFeatureIds`, `selection.featureIds`). They were hardcoded to `true`/`false` at load time and never belonged on the data type.

## How It Fits

This is the "thick services, thin frontends" principle applied to the data pipeline itself. Right now the service layer is doing work that belongs at the render boundary -- deciding which features are tracks, which are locations, which are "other". That classification is a rendering concern. A layers panel groups by kind. A map component routes to different renderers. A tool checks eligibility. Each consumer knows what it needs. The service shouldn't be making those decisions upstream.

After this change, adding a new feature kind requires changes only in the rendering layer. The service, view providers, and message protocol don't need to know about it.

## Key Decisions

- **Use existing schema types, not new ones**: `DebriefFeature` from `@debrief/schemas` is already a union of `TrackFeature | ReferenceLocation | MultiPointFeature | MultiPolygonFeature`. Type guards like `isTrackFeature()` and `isReferenceLocation()` already exist and classify by `properties.kind`. No new types to invent.

- **Generic fallback for annotation features**: The current `DebriefFeature` union doesn't include annotation types (circles, rectangles, polylines). Rather than expanding the schema for this refactoring, we'll use a broader `PlotFeature` type that includes a generic catch-all. Proper annotation schema types are a separate concern.

- **Remove `UpdateTracksMessage`**: Temporal filtering currently sends track-specific update messages. Since the time controller already sends `setCurrentTime` and `setDisplayMode`, and `TemporalTrackLayer` already receives `DebriefFeature[]` and filters internally, the track-specific message is redundant.

- **Unify selection protocol**: The webview message protocol currently splits selection into `trackIds[]` and `locationIds[]`. Session state already uses a unified `featureIds[]`. We'll align the message protocol with what session state already does.

- **Three setters become one**: `layersTreeProvider.setTracks()`, `.setLocations()`, `.setShapes()` collapse to `.setFeatures()`. The tree structure is derived from `properties.kind` inside `getChildren()`.

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
