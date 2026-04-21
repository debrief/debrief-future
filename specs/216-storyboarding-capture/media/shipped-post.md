---
layout: future-post
title: "Shipped: Storyboarding — Capture"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, storyboarding, vscode-extension]
excerpt: "One keystroke from live map to schema-validated Scene — and a durable Storyboard built one capture at a time."
---

## What We Built

An analyst watching a track develop can now freeze the current moment with one keystroke. `Ctrl/Cmd+Alt+C` inside the Map Viewer captures the viewport centre + zoom, the time-slider instant, the visible-feature set, and a 200 × 150 thumbnail into a schema-validated Scene attached to the plot's Storyboard. A 800 × 600 large PNG and a 200 × 150 small PNG are written atomically as STAC assets keyed `scene-thumbnail-{ulid}` and `scene-thumbnail-{ulid}-sm`; the Scene Feature is appended to the plot FeatureCollection via #215's CRUD module; the plot is marked dirty; and a minimal Storyboard panel auto-focuses to confirm the Scene is persisted. Save-close-reopen restores the Scene byte-identical to its pre-save state.

The first capture on a plot prompts for a Storyboard name via a VS Code quick-pick; subsequent captures append to the active Storyboard (resolved as "alphabetically first by name" via #215's `getActiveStoryboardDefault`) without prompting. Collisions at the same timestamp surface a modal `Replace / Offset (+1 s) / Cancel` prompt with a five-retry safety cap on cascading offsets.

## Screenshots

![Storyboard panel — empty state]({{ site.baseurl }}/assets/images/216/panel-empty.png)
*Empty state: the panel lives in the Debrief activity bar and waits for the first `Ctrl+Alt+C`.*

![Storyboard panel — three scenes]({{ site.baseurl }}/assets/images/216/panel-three-scenes-light.png)
*Three captured Scenes in light theme. Each row is thumbnail + DTG label + ISO-8601 timestamp.*

![Storyboard panel — three scenes in VS Code theme]({{ site.baseurl }}/assets/images/216/panel-three-scenes-vscode.png)
*The same three Scenes themed for the VS Code sidebar.*

![Capture-in-flight]({{ site.baseurl }}/assets/images/216/capture-in-flight.png)
*While a capture is in flight, a placeholder row is prepended above the persisted Scenes.*

![Interaction]({{ site.baseurl }}/assets/images/216/interaction.gif)
*Press the shortcut, type a Storyboard name, confirm — the Scene lands in under 1.5 s.*

## Lessons Learned

### Reuse kept the slice tiny

Three pieces of already-shipped infrastructure absorbed every piece of domain logic the spec restated:

- **#215 CRUD module** — canonicalisation, duplicate-timestamp detection, `feature_set_hash`, provenance append, DTG formatter. Zero redundant reimplementation in the extension.
- **#174 thumbnail pipeline** — `MapPanel.requestThumbnailCapture` returns a large + small base64 PNG pair directly from the Leaflet DOM. We added a per-Scene write path alongside the plot-level path — same atomicity discipline, same asset-key convention.
- **Session-state store** — viewport, currentTime, and hiddenFeatureIds are already canonical in Zustand slices. The command handler reads a single consistent snapshot via `sessionStore.getState()` with no round-trip to the webview.

The slice added **one** command handler, **one** WebviewViewProvider, **one** per-Scene thumbnail service, **one** MapPanel mutator pair (`setFeatures` / `getCurrentFeatures`), **one** presentational React panel, and zero runtime dependencies. Every rule the spec restates is delegated to the module that owns it.

### Plot-type conflation caught in review

The extension has a `Plot` type (STAC-Item metadata — title, bbox, time extent, itemPath) and #215 has a separate `Plot` type alias for a GeoJSON FeatureCollection carrying Storyboard / Scene Features. These are structurally different and were silently colliding at the CRUD boundary. Code review caught it; we re-aliased #215's export to `StoryboardPlot` (and `StoryboardPlotTimeRange`) so every consumer picks its lane explicitly. The capture command wraps `MapPanel.currentFeatures` into a throwaway `FeatureCollection` at the CRUD call site and pushes the result back via `setFeatures(…)`; the STAC `Plot` metadata never crosses the CRUD boundary.

### Per-Scene STAC asset extension

The STAC asset entry convention we inherited from #174 keyed plot-level thumbnails as `thumbnail` and `thumbnail-sm`. For per-Scene thumbnails we extended the pattern to `scene-thumbnail-{sceneId}` and `scene-thumbnail-{sceneId}-sm` (ULID-suffixed). PNGs live under `{stacItemPath}/scene-thumbnails/`. The lazy directory creation + rename-on-tmp + item.json-last write order mirrors #174's discipline, so the same atomicity guarantee ("if anything fails, item.json is untouched and no Scene is persisted") applies.

### TDD earned the scope reduction

Fifty-five unit tests landed across five suites: 15 command-handler cases, 15 thumbnail-service cases, 8 view-provider cases, 8 presentational-panel cases, 4 MapPanel-API cases, and 5 actor-resolution cases. Every acceptance scenario and every edge case from spec.md maps 1:1 to a named test. The webview E2E suite is stubbed out pending Blocker #143 (openvscode-server iframe accessibility); when #143 is unblocked, the six workflow tests are ready to run without code changes.

## What's Next

**#217 — Panel + playback.** Multi-Storyboard dropdown, on-map rectangles for the active Storyboard's Scene viewports, the playback transport (Forward / Backward / Left-Right arrows), `flyTo` animation + time-slider tween, scrub-window lock, missing-data hard-block. The core value of the epic — guided walkthroughs of recorded exercises — lives here.

**#218 — Edit suite + housekeeping.** Inline rename, markdown narration, soft-delete + toast-undo, update-to-current (atomic re-snapshot), duplicate, copy-to-other-storyboard (deep-copy thumbnail), stale-thumbnail detection + per-Scene refresh, Analysis Log Panel (#176) integration.

## Try It

After the extension ships:

```
1. Open a plot in the Map Viewer.
2. Frame the map, move the time slider, toggle tracks.
3. Press Ctrl+Alt+C  (Cmd+Alt+C on macOS).
4. Type a Storyboard name on first capture, Enter.
5. The Scene lands in the panel. Capture more to build the narrative.
6. Ctrl+S to save. Close. Reopen. Your Storyboard is still there.
```

## Code

- Feature spec: [`specs/216-storyboarding-capture/spec.md`](https://github.com/debrief/debrief-future/blob/main/specs/216-storyboarding-capture/spec.md)
- Implementation plan: [`specs/216-storyboarding-capture/plan.md`](https://github.com/debrief/debrief-future/blob/main/specs/216-storyboarding-capture/plan.md)
- Command handler: `apps/vscode/src/commands/captureScene.ts`
- Presentational panel: `shared/components/src/panels/StoryboardPanel/`
