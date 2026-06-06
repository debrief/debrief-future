<!--
Cached opener for the feature post. Written during /speckit.plan.
The ## Hook heading is stripped at ship time; the other three sections are
copied verbatim into media/shipped-post.md.
-->

## Hook

![Three storyboard scene thumbnails captured at different times but sharing identical framing, sitting beneath a locked map with the viewport-lock banner visible along the top edge](images/viewport-lock-multi-scene-thumbnails.png)

## What We're Building

A small padlock on the Storyboard panel that freezes the map's centre and zoom for the rest of the session. With it on, you can step time forward, switch display modes, toggle visibility, change the selection, capture a scene, repeat — and every thumbnail in the series comes out framed exactly the same. Scroll the wheel, double-click, hit the fit-to-window button, even ask an external tool to fly somewhere else: the map doesn't budge until you unlock it.

That's it. It's a single boolean, but it's the boolean that turns "capturing a story" from a careful-don't-touch-anything exercise into something you can do confidently while you concentrate on the analysis you're actually telling.

## How It Fits

The viewport lock sits at the seam between session state and the map. One new field — `viewportLocked` — on the `SpatialSlice` in `@debrief/session-state` is the source of truth; the `MapView`, the `LeafletToolbar`, the Storyboard panel header, and the MCP `setViewport` tool all read from it and react. It's runtime-only — deliberately excluded from the persisted session via a `Pick` over `SpatialSlice` so a reload always comes back unlocked, and force-cleared on plot load for the same reason. This is the third and final layer of viewport-stability work on the storyboarding track: PRs #623 and #625 stopped the map drifting *accidentally* (see `docs/project_notes/viewport-mutation-audit.md` for the receipts); this gives the analyst an *intentional* guarantee on top.

## Key Decisions

- **Snapshot-and-restore the Leaflet handlers, don't blanket-enable on unlock.** Lock-on records which of the six gesture handlers were enabled, disables all six, and unlock re-enables only the snapshotted set — so a host that had keyboard nav off for its own reasons doesn't get it turned back on as a side effect.
- **`VIEWPORT_LOCKED` as a typed error code on `setViewport`, not a thrown exception.** External MCP callers get a machine-detectable, additive signal; existing callers that never lock the viewport see no behaviour change at all.
- **A keyboard shortcut on the map div, not on Leaflet's keyboard handler.** Leaflet's keyboard handler is one of the six things lock disables — so the `L` shortcut to toggle lock lives on the React root instead, and stays reachable when everything Leaflet-driven is frozen.
- **Banner across the top of the map, padlock in the panel header, disabled tooltips on the toolbar buttons.** Three surfaces, one state — chosen so the lock is impossible to forget you turned on, and so every place that *would* have moved the map now tells you why it won't.
