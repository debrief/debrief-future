An analyst walks into the briefing room, boots Debrief, opens last night's exercise, hits one keystroke — and the map flies to the opening Scene, the time slider snaps to that window, and the on-map rectangles reshuffle to mark the narrative path. One Forward click later, they're at Scene 2. That's #217 — the Storyboard panel + playback — shipped today.

What made the slice tight was the three-trigger transition-clear. An in-flight Leaflet `flyTo` is guarded by a token. Three independent events can clear it: Leaflet's `moveend`, the webview becoming hidden, or a safety timer set to `durationMs + 250ms`. The clear handler is idempotent by token — whichever of the three fires first wins; the rest no-op. The invariant ("`transitionInFlight=true` always eventually becomes `false`, no leaks, no double-fire") costs six lines and makes the playback state machine fully auditable. I'd extract it into a reusable "transition guard" the next time a third feature needs the same shape.

154 new unit tests, 23 commits, zero new runtime dependencies. Full post: {{POST_URL}}

#FutureDebrief #MaritimeAnalysis #OpenSource
