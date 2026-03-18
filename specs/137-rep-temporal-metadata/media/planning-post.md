---
layout: future-post
title: "Planning: REP Loader Temporal Metadata"
date: 2026-03-18
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, timeline, temporal]
excerpt: "Computing start/end datetimes from track data so the Timeline actually shows when an exercise happened"
---

## What We're Building

When you load a REP file today, the resulting STAC Item gets a `datetime` of "right now" -- the moment you imported it. That's useless for temporal analysis. A 2022 exercise loaded in 2026 appears as a 2026 event. The Timeline/Gantt view (#131) renders it in the wrong place, duration filters miss it, and sorting plots by date produces nonsense.

The fix: after track features are added to a plot, scan all tracks for their `start_time` and `end_time` properties, compute the global temporal extent, and write `datetime`, `start_datetime`, `end_datetime` back to the STAC Item. A REP file from August 2022 should produce a plot dated August 2022. That's the entire feature.

## How It Fits

This sits at the intersection of three recent pieces of work. The REP parser (#002) already extracts per-track `start_time`/`end_time` as ISO 8601 strings. The Collection summaries feature (#136) already aggregates `start_datetime`/`end_datetime` from items into collection-level extents. And the Timeline/Gantt view (#131) already reads those temporal fields for rendering. The missing step is the one in the middle: nobody computes the Item-level temporal extent from the track data. This feature fills that gap.

The implementation adds a single function -- `update_temporal_metadata(catalog_path, plot_id)` -- to the Python STAC service in `services/stac/plot.py`, exposed as an MCP tool. The VS Code extension's existing `updateTemporalMetadata()` method, which currently does this work client-side via direct file I/O, gets replaced with an MCP call to the Python service. That moves temporal computation to the correct architectural layer: thick services, thin frontends.

## Key Decisions

- **Python service, not TypeScript frontend.** A working TypeScript implementation already exists in the VS Code extension. It reads the GeoJSON, scans `times[]` arrays, and writes temporal fields directly to `item.json`. It works, but it violates the Constitution's Article IV boundary -- frontends should not persist data. Moving this to the Python service means Jupyter notebooks, the Electron loader, and any future frontend get temporal metadata without reimplementing the logic.

- **`datetime` = exercise start, not midpoint or null.** STAC allows `datetime` to be null when a range is present, but many consumers use `datetime` for sorting and display. Start time is the most intuitive choice -- when someone asks "when was this exercise?", they mean when it began.

- **Use `start_time`/`end_time` properties, not `times[]` arrays.** Track features carry both: ISO 8601 strings in `start_time`/`end_time` and epoch millisecond arrays in `times[]`. The existing TypeScript implementation uses `times[]`, which requires converting epoch ms to ISO 8601. The Python version uses the already-formatted `start_time`/`end_time` properties. Simpler, and consistent with the schema where these are required fields.

- **Graceful fallback for empty data.** If a REP file has no tracks, or tracks have no temporal information, the function returns None and leaves `datetime` unchanged (creation time). No errors, no missing metadata -- just the same behaviour as today.

- **No collection extent changes.** The summaries code in #136 already reads `start_datetime`/`end_datetime` from items. Once items have those fields populated, collection-level temporal extent updates automatically. Zero integration work.

## What We'd Love Feedback On

- **Calling convention from the extension.** The existing flow in `importRep.ts` calls `updateTemporalMetadata()` after adding features to a plot. We plan to keep the same call site but delegate to MCP internally. Is there a case for computing temporal metadata as part of `add_features()` itself, so callers don't need to remember a second step?

- **Single-position tracks.** When a track has exactly one position, `start_time` equals `end_time`. We plan to set all three STAC fields (`datetime`, `start_datetime`, `end_datetime`) to that single value, producing a zero-duration exercise. Is that reasonable, or should we flag it as anomalous?

- **SRD traceability.** This addresses action item BP-4 from the STAC Browser SRD (rated High priority). If you've reviewed that document and have views on what "accurate temporal extent" should mean for edge cases like exercises that span midnight UTC or cross date boundaries, we'd like to hear them.

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
