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
