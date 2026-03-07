---
title: "STAC Collection Summaries: Pre-Aggregated Metadata for Browser Discovery"
date: 2026-03-07
category: shipped
feature: 136-stac-collection-summaries
epic: E08
tags: [stac, collections, summaries, filtering, backend]
---

# STAC Collection Summaries: Pre-Aggregated Metadata for Browser Discovery

We've shipped automatic STAC Collection summaries for the Browser Discovery backend. When analysts create plots or add features, the parent catalog automatically promotes to a Collection with pre-aggregated metadata — temporal ranges, spatial extents, and extension property enumerations — all maintained incrementally without loading individual items.

## What Changed

Debrief STAC catalogs now automatically promote to Collections when items are written. This adds three key pieces of aggregate metadata:

- **Spatial extent**: Union bounding box of all items' spatial data
- **Temporal range**: Earliest start to latest end across all items
- **Property summaries**: Sorted, deduplicated enumerations of vessel classes, nationalities, tags, and track names

Additions update summaries incrementally (O(1) reads). Deletions trigger a full rebuild to ensure accuracy.

## Why It Matters

The Browser Discovery UI (E08) needs aggregate metadata to populate filter controls — dropdown lists, temporal sliders, and spatial bounds — without loading every individual item. Collection summaries provide exactly this, enabling the CQL2 filter engine (#126) and filter bar (#127) to query ranges and enumerations from a single JSON read.

## Technical Highlights

- **Automatic promotion**: Catalogs become Collections transparently on first write
- **Backwards compatible**: Pre-existing catalogs load without errors, promote on next write
- **Atomic writes**: File locking + temp-file-rename prevents corruption on concurrent access
- **Cross-platform**: fcntl on Unix, msvcrt on Windows
- **MCP exposed**: `read_collection_summaries` tool available for VS Code extension
- **TypeScript types**: `StacCollection`, `StacExtent`, `StacSummaries` interfaces for consumers

## Test Coverage

32 new tests covering all four user stories plus 105 existing regression tests — all passing. Collection JSON validates against the contract schema.
