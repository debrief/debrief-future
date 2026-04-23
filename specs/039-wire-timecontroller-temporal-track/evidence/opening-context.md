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
