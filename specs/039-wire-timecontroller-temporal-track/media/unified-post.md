---
title: "Building TimeController Now Drives Map Track Rendering"
date: 2026-01-29
layout: future-post
author: Ian
track: momentum
---

# Planning: Wire TimeController to TemporalTrackLayer in VS Code Extension

**The Challenge**: When a tactical analyst scrubs the time slider in Debrief's VS Code sidebar, nothing happens on the map. The TemporalTrackLayer renders static tracks but has no connection to the TimeController UI — breaking the core interactive experience.

## What We're Building

This bug fix (issue #039) completes the last mile of the temporal interaction pipeline. Once merged, moving the time slider will:

- **Full mode**: Display a marker at the current time position on each track, showing where each asset *was* at that exact moment
- **Trail mode**: Render a dynamic "snail trail" — a polyline from each track's start to the current time, letting analysts see the unfolding history of movement

Think of it as playing a tactical replay: scrubbing time becomes an interactive window into the past.

Temporal scrubbing is foundational to maritime analysis. Whether reviewing a search-and-rescue operation or investigating a naval incident, the ability to rewind and replay positions is non-negotiable. Right now, analysts can load tracks and see the full picture, but can't interrogate specific moments in time.

## How It Fits

Our architecture is built on message pipelines: UI events flow through **TimeController** → **SessionStore** → **MapPanel** → **webview**. The infrastructure was half-wired — TimeController already fires `setCurrentTime` and `setDisplayMode` messages, SessionStore captures them, MapPanel passes them to the webview... but the webview did nothing with them.

This fix adds the final receiver: the map webview now listens for these messages and re-renders tracks using Leaflet's `setLatLngs()` API.

## Key Decisions

**1. Port binary search from React to vanilla JS** — The shared React components already had O(log n) timestamp lookup code. We ported the logic to vanilla TypeScript for the webview (which can't use React), keeping the algorithm battle-tested.

**2. Cache timestamps on track load** — Parsing ISO timestamps repeatedly is expensive. We cache epoch values when a track loads, making frame-by-frame lookups constant-time additions.

**3. Lean on Leaflet's built-in primitives** — Rather than re-rendering entire layers, we call `setLatLngs()` on existing polylines. Leaflet batches DOM updates — only what changed gets redrawn.

**4. Add `setDisplayMode` to the extension protocol** — We extended the VS Code → webview message contract with a new backwards-compatible message type.

# Shipped: TimeController Now Drives Map Track Rendering

The time slider in Debrief's VS Code sidebar now controls what you see on the map. Scrub to any moment and every track updates instantly — either showing a position marker (full mode) or growing as a snail-trail from its start point.

## What We Built

This fix completes the temporal interaction pipeline that was half-wired. The TimeController UI already existed, the TemporalTrackLayer rendering logic already existed, and the message pipeline between them already existed — but the final receiver (the map webview) had a TODO stub that ignored incoming time updates.

We added:

- **Temporal rendering in TrackRenderer** — the vanilla JS Leaflet map now responds to `setCurrentTime` and `setDisplayMode` messages
- **Binary search algorithms** — ported from the shared React components into a standalone `temporalUtils.ts` module with 15 unit tests
- **Highlight markers** — `L.circleMarker` per track in full mode, efficiently repositioned on each frame
- **DisplayMode forwarding** — the `setDisplayMode` message type was added to the extension protocol, and MapPanel now forwards mode changes from SessionStore

## How It Works

The pipeline is now complete end-to-end:

1. User scrubs the TimeController slider
2. The webview sends a time change message to the extension host
3. SessionStore captures the new time
4. MapPanel's temporal subscription fires, forwarding `setCurrentTime` and `setDisplayMode` to the map webview
5. TrackRenderer performs a binary search to find the nearest track point, then updates the polyline coordinates and marker position

All timestamp parsing (ISO to epoch) happens once on track load. The binary search is O(log n) per track per frame. Leaflet's `setLatLngs()` handles efficient DOM updates.

## Lessons Learned

**Porting beats importing** — Rather than pulling in the shared React components (which would have required React in the vanilla JS webview), we copied the two pure functions (60 lines) and unit-tested them independently. Simple, no dependency chain, easy to verify.

**The message pipeline was the easy part** — The infrastructure from Feature #029 (session state integration) meant the wiring was already 80% done. The real work was in TrackRenderer: managing cached timestamps, highlight markers, display mode state, and coordinate updates without flicker.

## What's Next

- **#030**: Add replay mode and time acceleration to the temporal state schema
- **#026**: Add annotation shape renderers to the VS Code extension
- **#038**: Context-sensitive tool offering integration
