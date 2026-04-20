---
layout: future-post
title: "Planning: Storyboarding — Schema + CRUD Core"
date: 2026-04-20
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, storyboarding, schema, linkml]
excerpt: "The unglamorous first slice of Storyboarding — schema and headless CRUD, no UI, so three sibling specs can build in parallel."
---

## What We're Building

Storyboarding is how an analyst takes a plot and walks a reader through it: a sequence of captured Scenes, each one a viewport, a timestamp, a visible-feature set, and a thumbnail. It's one of the capabilities that makes the difference between "I have a map" and "I have a briefing". The parent epic (#024) covers the full thing — capture shortcut, panel, playback, edit suite.

This spec (#215) deliberately ships none of that. No capture button. No panel. No playback. What it does ship is the **headless schema and CRUD foundation** that the three sibling specs (#216 capture, #217 panel + playback, #218 edit suite) all build on top of: LinkML models for `Storyboard`, `Scene`, `Viewport`, and `HistoryEntry`; their generated Pydantic, JSON Schema, and TypeScript bindings; and a shared TypeScript CRUD module that enforces every invariant — ordering, duplicate-timestamp rejection, `feature_set_hash` computation, provenance append-only — at the module boundary, before any UI code runs.

It's the unglamorous slice. And it's the one that unblocks everything else.

## How It Fits

Storyboards and Scenes are carried as standard GeoJSON Features inside the plot's existing FeatureCollection — no new files, no new STAC API surface. That's what keeps them flowing through the save/dirty-state path VS Code already owns, and it's why this slice can stay small: we're adding types and guarantees, not plumbing.

The CRUD module lives at `shared/components/storyboard/`, following the precedent set by the filter-engine module from #126. That's a narrow departure from the usual thick-Python-services pattern — justified because storyboard data is pure GeoJSON round-trip with no domain algorithmics, and all three consumers are TypeScript webview surfaces. A Python service in front would be a passthrough. The Constitution Check in the plan records this explicitly.

Once this slice lands, specs #216, #217, and #218 can build against a stable, schema-adherent data layer in parallel. Any one of them can ship first.

## Key Decisions

Eight technical decisions drove the research phase. A few of the interesting ones:

- **LinkML module organisation**: all four entities in one `storyboard.yaml`, imported from `debrief.yaml`. Matches the existing pattern (`stac-extension.yaml`, `session-state.yaml`).
- **Reserved-slot encoding**: `time_range` must be null and `viewport.bearing` must be 0 in schema v1. Encoded with LinkML structural constraints (`equals_number: 0`, `value_presence: ABSENT`) *and* a Pydantic `@field_validator` — redundant by design, because Article II says the schema is the contract and the generated models are the proof it holds.
- **Cross-reference validation in two layers**: LinkML validates shape (ULID regex); the TS module validates reference resolution per FeatureCollection. LinkML can't validate across entities in a collection, so the module boundary is where orphan Scenes get caught.
- **`feature_set_hash` algorithm**: SHA-256 over the UTF-8 encoding of `JSON.stringify(sortedIds)`, full 64-char hex. Available in both Node and browser, no dependency, order-insensitive.
- **Atomicity via immutable staging**: compound ops (duplicate, copy-to-other-storyboard, cascade delete) build a new FeatureCollection in a local variable; if anything throws, we discard it and rethrow. Never mutate inputs in place. Matches the React/Zustand idiom the downstream specs will use.
- **Error vocabulary**: nine typed subclasses of `StoryboardError`, each with a stable string `code` that survives minification. `DuplicateTimestamp` carries the conflicting Scene's ID so callers can surface a Replace / Offset / Cancel prompt.
- **Migration hook**: `runPlotOpenMigrations(plot, registry)` is wired now as a no-op at v1, so the first real migration (v2) won't touch the load path.
- **DTG formatter**: `DDHHmmZ MMM YY` in UTC, lives in the module itself so #216 and #218 share one implementation.

All nine `HistoryEntry.op` values — `create`, `rename`, `describe`, `delete`, `restore`, `update-to-current`, `duplicate`, `copy-in`, `insert-middle`, `refresh-thumbnail` — are frozen by this spec. Downstream specs use these; they don't extend them.

## What We'd Love Feedback On

Three genuine open questions where I'd value input from people who've done this work for real:

- **DTG format**: I've gone with `DDHHmmZ MMM YY` (e.g. `041500Z APR 26`). Is that the format field analysts actually expect, or is there a regional / doctrinal variant I should be matching instead?
- **`HistoryEntry.op` vocabulary**: the ten values above are what I've extracted from the downstream specs' operation surface. Is anything missing that a briefing workflow would want in the audit trail — retitle-without-rename, thumbnail-only-refresh-during-playback, something else?
- **`feature_set_hash` as staleness signal**: SHA-256 over sorted `visible_feature_ids` tells us *which features were visible at capture time*, not *what those features looked like then*. If an underlying track moves, the hash doesn't change. Is that the right boundary for a "Scene is stale" prompt, or does the staleness detector also need to hash feature contents?

No UI to show this week. Next week's slice is #216 — the capture shortcut and the first-capture quick-pick — and that one has screenshots.
