---
title: "Building REP Loader Temporal Metadata"
date: 2026-03-18
layout: future-post
author: Ian
track: credibility
excerpt: "Temporal extent (start_datetime, end_datetime) now computed from track data during REP file loading."
tags:
  - rep-loader
  - stac-catalog
  - temporal-metadata
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

When you load a REP file into Debrief, it's split into features — tracks, waypoints, annotations. Each track carries `start_time` and `end_time` properties from the REP parser. Until now, those timestamps lived in isolation. The STAC Item that represents the loaded plot didn't know the exercise actually spanned 2022-08-27 to 2022-09-10. It just knew when the file was loaded.

That mattered because downstream features — Timeline/Gantt view, temporal filtering, duration-based queries — all depend on accurate exercise boundaries. We'd ship a view without the data it needs to work correctly.

## What We Built

Added a `update_temporal_metadata()` function to the STAC service that scans all track features in a plot, extracts their `start_time` and `end_time` properties, and writes three temporal fields to the STAC Item:

- **`datetime`** — set to the earliest track timestamp (exercise start time), not the file load time
- **`start_datetime`** — the global minimum across all tracks
- **`end_datetime`** — the global maximum across all tracks

The function is exposed as an MCP tool, so any consumer (VS Code extension, Jupyter notebooks, web tools) can request it via the protocol.

### How it works

```python
from debrief_stac.plot import update_temporal_metadata

result = update_temporal_metadata(catalog_path, plot_id)

if result:
    print(f"Exercise start: {result.datetime}")
    print(f"Temporal extent: {result.start_datetime} to {result.end_datetime}")
```

The function reads `features.geojson` from the plot, filters for features with `kind == "TRACK"`, extracts `start_time` and `end_time`, computes the extent, and writes it back to the STAC Item properties.

### TypeScript consumer

The TypeScript `stacService` was updated to read `start_time` and `end_time` from track features and call the temporal metadata tool. This preps the groundwork for downstream features that need accurate temporal extents.

## By the Numbers

| | |
|---|---|
| Tests passing | 9 |
| Test scenarios | 8 unit + 1 integration |
| Multi-track support | Yes |
| Overlapping time ranges | Handled (global min/max) |

The test suite covers:

- Multi-track temporal extent computation with different time ranges
- Single-track files
- Overlapping time ranges across tracks
- Edge cases: single-position tracks (start == end), tracks without timestamps, empty plots
- Integration test: full workflow from catalog creation through temporal metadata update

All scenarios pass. No regressions against existing STAC catalog operations.

## Lessons Learned

The biggest decision was whether to put temporal aggregation at the Item level or track level. We chose Item level (STAC standard) because downstream consumers like Timeline view need a single exercise duration, not per-track ranges. Track-level temporal properties stay untouched — this is pure Item metadata.

We also learned that gracefully handling edge cases (no tracks, tracks with missing timestamps) was critical. The function returns `None` in those cases, allowing callers to detect and handle fallback to current behaviour (file creation time) without errors.

## What's Next

This enables two major downstream features:

- **Timeline/Gantt view (#131)** — can now render accurate exercise duration bars instead of guessing based on file load time
- **Temporal CQL2 filtering (#126)** — filters like "show plots from August 2022" now work correctly because STAC Items have accurate datetime ranges

→ [See the spec](../spec.md)
→ [See the code](../contracts/update-temporal-metadata.md)
