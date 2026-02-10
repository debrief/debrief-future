---
layout: future-post
title: "Planning: Split Undo/Redo"
date: 2026-02-09
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, session-state, provenance, prov-logging]
excerpt: "Narrowing Ctrl+Z to UI-only so tool results stay protected in the provenance log."
---

## What We're Building

Ctrl+Z is dangerous in an analysis tool. If you've just run a distance calculation and instinctively press undo to fix a viewport pan, you could wipe out that calculation result. The undo stack doesn't distinguish between "I moved the map" and "a tool produced analytical output" -- both are just state changes, stacked together.

We're splitting the undo system in two. Ctrl+Z will only reverse UI display state: viewport position, time settings, track visibility, selection, rotation. Data changes -- tool execution results, loaded feature collections -- move to the Log Recording Service we built in Phase 1 (#071), where they get a proper provenance trail instead of sitting in a volatile 50-step stack.

## How It Fits

This is Phase 3 of the PROV Logging Implementation epic (E02). Phase 1 gave us the Log Recording Service that captures every tool execution with PROV-aligned entries (activity, inputs, outputs, timestamps). Phase 2 will add a Log Panel for reviewing and reverting data changes. This phase draws the line: undo handles display, the Log handles data.

The actual change is surprisingly small. The `StateSnapshot` interface drops from 12 fields to 10, removing `featureCollectionUri` (a data reference) and `savePath` (metadata). Four files change, roughly 30 lines total. The dirty-tracking system also shifts -- where it used to watch `featureCollectionUri` for changes, that responsibility now belongs to the Log Service's `markDirty()` callback, which was already wired up in Phase 1.

Because the undo history is purely in-memory (cleared every session), there's no migration to worry about. Old snapshots with the removed fields simply don't exist when the session starts.

## Key Decisions

- **10 fields, not 12**: We're keeping currentTime, timeRange, timeFilter, stepSize, playbackRate, displayMode, viewport, rotation, selection, and hiddenFeatureIds. All display-only. `featureCollectionUri` is a data operation (loading a different plot); `savePath` is metadata (where the file was last saved). Neither belongs in undo.
- **Dirty tracking moves, not duplicates**: Rather than tracking `featureCollectionUri` changes in two places, we remove it from the undo middleware's dirty-trigger fields entirely. The Log Service already calls `markDirty()` when recording tool results. One code path, no ambiguity.
- **No migration path needed**: Undo history is never persisted. Each session starts fresh. This means we can narrow the snapshot type without worrying about deserializing old formats.
- **All 12 existing tests pass**: None of the current undo tests assert on `featureCollectionUri` or `savePath`. We're adding one new test that locks the snapshot to exactly 10 fields, so future changes are deliberate.
- **Hard dependency on #071**: The Log Recording Service must be operational before we can remove data changes from undo. Without the Log, tool results would have no audit trail at all.

## What We'd Love Feedback On

- **Is selection really UI state?** We've classified it as display state (which features are highlighted), not data state. But selection drives tool invocation -- you select features, then run a tool on them. Should Ctrl+Z be able to change what's selected after a tool has run on that selection?
- **Should clearing undo history also be logged?** Currently `clearHistory()` is silent. If an analyst clears their undo stack, should the Log record that event for completeness?
- **50-step limit**: This carries over from the existing implementation. With a narrower snapshot (display-only changes), should the limit change? Display changes tend to be more frequent than data changes were.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
