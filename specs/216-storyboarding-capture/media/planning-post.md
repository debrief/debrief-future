---
layout: future-post
title: "Planning: Storyboarding — Capture"
date: 2026-04-21
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, storyboarding, vscode-extension]
excerpt: "One keystroke freezes the current map state — viewport, time, visibility — as a durable Scene inside the plot."
---

## What We're Building

An analyst is watching a track develop on the map. Something interesting happens at 14:37:22. Today, capturing that moment means a screenshot, a note in a side document, maybe a coordinate jotted down — and a separate problem later of reassembling what was actually on screen.

Slice #216 replaces that with a single keystroke. `Ctrl/Cmd+Alt+C` inside the Map Viewer freezes the current viewport, the time-slider instant, and the set of visible tracks into a schema-validated Scene attached to the plot's Storyboard. A 800×600 thumbnail is written alongside as a STAC asset. The Storyboard panel pops open to confirm the Scene is persisted. That's it.

This is the first slice of the Storyboarding epic (#024) that the analyst actually sees and presses. #215 landed the headless pieces — LinkML schema, CRUD module, canonicalisation, provenance — but nothing surfaced in the UI. #216 is the surfacing.

## How It Fits

Storyboarding is a four-slice epic. #215 (shipped) is the schema and CRUD foundation. #216 (this one) is capture. #217 is playback — stepping through Scenes, restoring state, transport controls. #218 is the edit suite — reorder, rename, narration, stale-state detection.

Scope for #216 is narrow on purpose. No playback. No editing. No multi-Storyboard dropdown. No on-map rectangle overlay showing the captured viewport. No detection of Scenes whose underlying data has since changed. Each of those has a home in #217 or #218 and pulling them forward would blur the capture story.

## Key Decisions

**Reuse over reinvention.** The whole capture path sits on three shipped pieces: #215's CRUD module, #174's thumbnail pipeline, and the session-state store. No new runtime dependencies. No new schema modules. Zero Python added. The extension contribution is orchestration: one command, one view provider, a small thumbnail-write helper, and one MapPanel mutator. If this feels like it should have been more work, that's the point — the heavy lifting happened upstream.

**Session-state is the snapshot source.** Viewport (spatial slice), time-slider instant (temporal slice), and hidden-feature IDs (features slice) all already live in the session-state store. A single synchronous `getState()` at shortcut-press returns a consistent tuple — no webview round-trip, no race between "what the user sees" and "what we capture".

**Per-Scene thumbnails as STAC assets.** Each Scene gets its own 800×600 + 200×150 PNG pair written under `{stacItemPath}/scene-thumbnails/` and registered with STAC asset keys like `scene-thumbnail-{sceneId}`. This extends #174's plot-level pattern. The Scene stores the asset *key*, not the href, so renames and catalogue moves don't break references.

**Native VS Code primitives for the resolver.** When a capture collides with an existing Scene's timestamp, `showInformationMessage(..., { modal: true }, 'Replace', 'Offset (+1 s)')` gives the three-button modal. Dismissal is implicit Cancel. Offset recurses with a 5-retry safety cap. First-capture naming uses `showInputBox` with `validateInput` so name-collision feedback renders inline while Enter stays disabled. No custom webview dialogs.

**Stable sidebar view id.** The new `WebviewViewProvider` registers `debrief.storyboardPanel` and mirrors the Log Panel's shape. #217 will extend the same provider with a Storyboard dropdown and transport controls rather than registering a second view. Keeping the id stable now avoids a painful rename later.

## What We'd Love Feedback On

A few things we're genuinely uncertain about:

- **Duplicate-timestamp ergonomics.** Is a modal the right moment-of-friction, or does Offset-by-default feel better for a "press and keep working" workflow? The modal is defensible but interrupts flow.

- **Offset granularity.** We've picked +1 s. For a fast-scrubbing analyst this might be too coarse (many Scenes within a second is plausible); for a slow-paced review it's invisible. Would sub-second offsets create more confusion than they resolve?

- **First-capture naming.** Forcing a Storyboard name on the very first capture is explicit but adds friction right when the analyst has just pressed a shortcut expecting something to happen. Is an auto-generated name ("Untitled Storyboard 1") with rename-on-demand a better default?

- **Panel auto-focus.** We auto-open the Storyboard panel on first capture so the analyst sees their Scene land. Subsequent captures don't steal focus. Is that the right split, or should focus stealing never happen?

→ [Join the discussion]({{DISCUSSION_URL}})
