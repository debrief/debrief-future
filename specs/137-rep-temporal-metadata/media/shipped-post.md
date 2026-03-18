---
layout: future-post
title: "Shipped: REP Loader Temporal Metadata"
date: 2026-03-18
track: [credibility]
author: Ian
reading_time: 4
tags: [stac-catalog, temporal-metadata, rep-loader]
excerpt: "Temporal extent (start_datetime, end_datetime) now computed from track data during REP file loading."
---

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
