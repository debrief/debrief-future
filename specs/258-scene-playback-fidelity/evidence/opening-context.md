<!--
Cached opener for the feature post — feature #258
"Storyboard Scene Playback Fidelity & UI Polish".
Written during planning; read by `/speckit.pr` at ship time.
-->

## Hook

| Before | After |
|---|---|
| Every scene rectangle on the map was the same ~100m square at the scene's centre, regardless of how the author had framed the view | Each scene rectangle traces the actual viewport bounds the author captured — wide context shots look wide, tight close-ups look tight |
| Clicking a scene that was captured in Trail mode silently played it back in Full mode | The scene's display mode is captured with the viewport and restored on playback, so Trail-mode scenes stay in Trail |
| The currently-playing scene's rectangle was visually indistinguishable from the others on a busy map | The active scene picks up the same drop-shadow and pulse halo that selected tracks already use |
| Scenes rendered as peer leaves in the feature list, scattered between tracks and other features | Each Storyboard folds its child Scenes under a single collapsible parent row, mirroring how Tracks group their Positions |

## What We're Building

A storyboard is only as good as the moments it captures. If I frame a wide view of three vessels converging and then a tight close-up on the interception, I want the rectangles on the map to *look* like that — wide, then tight — and I want clicking each one to put the audience back exactly where I left them, including whether they were watching full tracks or just trailing wakes. Four small gaps surfaced during field testing of PR #606 broke that promise in different ways, and this change closes all four together.

Concretely: scenes now carry a `display_mode` (Full or Trail) and restore it on playback alongside the viewport; scene rectangles are computed from the real Leaflet bounds at capture time instead of a placeholder square; the active scene gets the canonical track-selection halo so it's unambiguous on a busy map; and the feature list groups each storyboard's scenes under a collapsible parent row instead of mixing them in with tracks.

## How It Fits

This is a fast follow-up to PR #606 — which introduced scene-click navigation under the E13 storyboarding epic — tidying up the seams that field use exposed. The schema edit lands in `storyboard.yaml` and regenerates Pydantic and TypeScript through the usual LinkML pipeline; the rendering and grouping changes ride on existing surfaces (`SceneRectangleLayer`, `FeatureList/flattenFeatures.ts`) rather than introducing new ones. Nothing here is architecturally new — it's the storyboarding feature growing into the conventions the rest of the map and feature list already follow.

## Key Decisions

- **Reference the existing `DisplayModeEnum`, don't duplicate it.** The new `display_mode` slot on `Scene` points at the enum already defined in `session-state.yaml`. Article II.1 of the constitution is explicit about single source of truth for schemas, and a parallel enum would have drifted within a release.
- **Reuse the track-selection halo, don't invent a new "active scene" treatment.** The BACKLOG entry originally suggested a `var(--vscode-focusBorder)` style, but the existing `debrief-map-feature--selected` CSS — drop-shadow plus pulse — is already the project's vocabulary for "this is the one you're looking at". Borrowing it makes scenes feel like first-class map features instead of a bolted-on overlay.
- **Use Leaflet's own `getBounds()` + `containerPointToLatLng()` for the viewport polygon.** The alternative was hand-rolled `L.CRS.EPSG3857.latLngToPoint` math. Same result, much less code to review, and Leaflet already handles the edge cases (wrapped longitudes, non-standard CRS) we'd otherwise have to rediscover.
- **Tolerate legacy scenes; don't migrate them.** `display_mode` is `required: false` in the schema, so scenes captured before this change still parse. On read, the time controller is left untouched when `display_mode` is absent, and the placeholder polygon is recomputed at render time. No batch migration script — Article III.2 source-preservation means we fix things opportunistically rather than rewriting on-disk catalogues.
- **Ship all four gaps together.** They look like four independent fixes but they aren't: (a) display-mode capture is the precondition for (b)/(c) to render the author's intent; (c)'s active-scene halo is the same selection treatment (d)'s grouped rows need to surface; and all four touch the same `SceneRectangleLayer` and feature-list data flow. Splitting them would have meant landing a partially-fixed playback experience and then revisiting the same files twice more.
- **Group scenes in `FeatureList`, not the "Layers panel".** The BACKLOG entry called the affected component the Layers panel, but the actual surface is `FeatureList` — and its existing parent/child machinery (already proven for `Track → Position`) was the obvious place to land STORYBOARD → STORYBOARD_SCENE rows. Worth flagging because the naming mismatch could easily have sent a reader looking in the wrong file.
