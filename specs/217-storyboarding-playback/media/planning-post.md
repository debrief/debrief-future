---
layout: future-post
title: "Planning: Storyboarding — Panel + Playback"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 5
tags: [tracer-bullet, storyboarding, vscode-extension, playback]
excerpt: "The slice that turns captured Scenes into a stakeholder briefing — Forward, Backward, and the plot walking itself through the story."
---

## What We're Building

Imagine an analyst walks into a room to brief a senior stakeholder on an exercise that ran for three weeks. The interesting moments are already captured — back at their desk, they watched the tracks develop and pressed `Ctrl/Cmd+Alt+C` every time something mattered. A dozen Scenes, each one a frozen viewport, time, and set of visible tracks, all attached to the plot.

What #217 adds is the part where the plot walks itself through those Scenes.

They open the plot in the Map Viewer. The Storyboard panel shows "Commander's view — 12 Scenes". They press Forward. The map flies to Scene 1's viewport while the time slider tweens to Scene 1's instant. The stakeholder is watching the transition, not waiting for the analyst to zoom and scrub. Forward again. Forward again. Halfway through, a question — the analyst drags the time slider to look at what happened between Scene 5 and Scene 6, then hits Forward and they're back on the rails.

That's the shape of this slice. A header dropdown for picking among the plot's Storyboards. A transport row with Forward / Backward / "Scene N of M". Scoped Left / Right arrow keys that only fire when the analyst's focus is somewhere sensible. Faint rectangles on the map showing the captured viewports. And, underneath, enough machinery to make the transitions look like a briefing tool rather than a debugger.

## How It Fits

Storyboarding (#024) is a four-slice epic. #215 landed the headless schema and CRUD core — shapes, ordering, canonicalisation, missing-data detection. #216 landed capture — one keystroke to freeze a moment as a Scene. #217 (this one) is the delivery flow: the part an analyst actually shows to an audience. #218, which comes after, handles Scene editing, rename, delete, undo, thumbnail refresh, and full Analysis Log integration.

The scope boundary matters. You cannot rename a Scene in this slice. You cannot reorder them. You cannot refresh a stale thumbnail. The *Open for editing* button in the missing-data hard-block modal is wired to a stub that acknowledges the click and does nothing else — #218 will pick it up. Pulling any of that forward would blur the briefing-delivery story that this slice has to tell cleanly.

## Key Decisions

**No new schema. No new runtime dependencies. No Python additions.** Everything in #217 rides on pieces already shipped — the CRUD module from #215, the capture flow and panel shell from #216, session-state, MapView, react-leaflet, the VS Code extension API. The whole slice is orchestration. If it feels like there's less engineering here than there should be, that's the payoff from landing #215 and #216 in the right order.

**Two independent animations, one imperative entrypoint.** On Forward, the service calls `advanceTo(scene, durationMs)`, which fans out to Leaflet's `flyTo` for the map and a `requestAnimationFrame` tween on the time slider's `currentTime`. A shared `transitionId` correlates the pair so that if the analyst starts scrubbing mid-flight, both animations cancel at the frame they're on. 500 ms default, per-Scene overrideable. No animation library — the browser already has two.

**The scrub window reuses the existing `timeFilter` slot.** While positioned on Scene N, the time slider is clamped to `[Scene[N].t, Scene[N+1].t]`. No new slice on `TemporalSlice`, no new widget — the service captures the pre-activation `timeFilter`, applies the clamp during playback, and restores the original on deactivation. Last Scene has no upper bound, so scrubbing past its timestamp is simply disabled.

**The missing-data check hard-blocks.** Before advancing onto a Scene, the service calls `detectMissingDataForScene` from #215. If a feature the Scene references has been deleted, or the Scene's timestamp is now outside the plot's time range, transport stops and a native VS Code modal offers *Jump past this scene* / *Open for editing*. No partial animation, no silent fallback. A half-rendered Scene in front of an audience is worse than a visible interruption.

**Scoped keys, not global keys.** `Left` and `Right` only bind when `debrief.storyboardActive` is true AND focus is on either the Storyboard panel or the Map Viewer. The service manages the `when`-context flag. No arrow-key leakage into the editor, the terminal, or any other panel — something we've seen bite other extensions.

**Active Storyboard selection is ephemeral.** A plot can carry several Storyboards — a commander's view, an ASW evidence thread, a training debrief. The active selection per plot lives in extension memory, keyed by the STAC `documentUri` that `SessionManager` already uses. On plot open, it defaults to the most-recently-modified Storyboard via a new `getMostRecentlyModifiedStoryboard` query we're adding to the #215 CRUD module. Nothing writes to disk. Nothing for #218 to migrate.

## What We'd Love Feedback On

Three open questions where we'd genuinely benefit from perspectives outside the team:

- **Scrub-window lock behaviour.** When the analyst is on Scene 5 and drags the slider to Scene 6's timestamp, should the slider hard-clamp at Scene 6 and require a Forward press, or snap back to Scene 5's window on release? The hard-clamp is more predictable; the snap-back preserves the "one scene at a time" mental model more loudly. We've picked hard-clamp for now, but we're not sure.

- **flyTo animation for briefing audiences.** 500 ms of smooth map motion looks polished in a demo. Does it also look polished at the twelfth transition of a twenty-Scene briefing, or does the audience start wanting an instant cut? Is there a regime — maybe transitions under a certain map-distance — where the fly should be swapped for a direct jump?

- **Overlapping Scene rectangles.** We're rendering viewport rectangles for the active Storyboard, with opacity variation where they overlap. For a Storyboard that revisits the same area across many Scenes, the overlay can get busy. Is the right default "always show rectangles", "show on hover/focus", or "toggle in the panel header"?

→ [Join the discussion]({{DISCUSSION_URL}})
