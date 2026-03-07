---
layout: future-post
title: "Planning: STAC Collection Summaries for Browser Backend"
date: 2026-03-06
track: [momentum]
author: Ian
reading_time: 4
tags: [tracer-bullet, stac, discovery-ui, e08]
excerpt: "Promoting STAC Catalogs to Collections with pre-aggregated summaries so the Browser UI can filter without scanning every item"
---

## What We're Building

The Browser Discovery UI needs to know what's filterable before it opens a single item. Temporal range, spatial extent, vessel classes present, nationalities, tags -- all the metadata that populates filter dropdowns and constrains map views. Scanning every item at browse time is not acceptable. For a catalog with 200 items, that's 200 file reads just to render a filter bar.

So we're adding automatic Collection summaries. When items are added to a STAC Catalog, the service promotes it to a Collection (a STAC superset -- same structure, three additional fields) and maintains pre-aggregated summaries: temporal extent from `start_datetime`/`end_datetime`, spatial bounding box from geometry envelopes, and enumeration summaries for every `debrief:` extension property defined in #125 -- vessel classes, nationalities, track names, plot tags, feature tags. The Browser UI reads one JSON file and knows everything it needs to populate its filters.

## How It Fits

This is the backend half of Epic E08 (STAC Stack Browser Discovery UI). The CQL2 filter engine (#126) evaluates filter expressions against item arrays in the browser. But the filter bar needs to know what values exist before the user types anything -- which vessel classes are present, what the date range is, which nationalities appear. That metadata comes from Collection summaries. The filter engine and the summaries are complementary: summaries populate the UI, CQL2 filters the results.

The implementation lives entirely in `services/stac/`, adding a new `collection.py` module alongside the existing catalog operations. TypeScript consumers in the Browser UI read the summaries from Collection JSON but never modify them -- consistent with the project's thick-services, thin-frontends architecture.

## Key Decisions

- **Promote, don't duplicate.** A STAC Collection is a strict superset of a Catalog. We change `type` from `Catalog` to `Collection` and add `extent`, `summaries`, and `license` fields. Existing links, item references, and child catalogs remain untouched. Anything that reads a Catalog can read a Collection.

- **Incremental updates for additions, full recompute for deletions.** When items are added, we expand temporal bounds, grow the spatial bounding box, and union new enum values into existing sets. That's O(1) per addition. Deletions require scanning remaining items to recompute bounds -- O(N), but deletions are infrequent in normal analysis workflows. This avoids maintaining reference counts or inverse indexes for a rare operation.

- **Lazy promotion on first meaningful write.** An empty catalog stays a Catalog. Promotion triggers only when the first item with spatial or temporal data is written. This means pre-existing catalogs from earlier versions load without modification and get promoted on their next write -- fully backwards-compatible.

- **Extension property summaries from the #125 spec.** The `debrief:` namespace properties -- `vessel_classes`, `nationalities`, `tags`, `feature_tags`, `track_names` -- are summarised as value enumerations. The summary structure mirrors what the filter bar expects, so there's no transformation step between reading the Collection and populating filter options.

- **No new dependencies.** The implementation uses `json`, `pathlib`, and the existing Pydantic models. No summary-specific libraries, no spatial libraries for bounding box computation (we compute envelopes from coordinate arrays directly).

## What We'd Love Feedback On

- **Summary staleness tolerance.** Summaries are updated on every write operation. But if a user manually edits a STAC item's JSON outside the service layer, summaries could drift. Should we add a `force_recompute()` method exposed via MCP, or is that an edge case not worth the API surface?

- **Spatial extent precision.** Bounding boxes are computed as the envelope of all item geometries. For exercises spanning the antimeridian, a naive min/max longitude produces a box that wraps the wrong way around the globe. We plan to detect this case and split into two bounding boxes per the STAC spec. Are there other geometric edge cases in real maritime data we should handle?

- **Which extension properties deserve summaries.** We're summarising all `debrief:` properties from #125. If some of these have high cardinality in practice (e.g., track names across hundreds of items), the summary arrays could get large. Should we cap enumeration summaries at a threshold and switch to a count-only representation?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
