---
layout: future-post
title: "Planning: STAC Catalog Overview Panel"
date: 2026-01-30
track: [momentum]
author: Ian
reading_time: 3
tags: [stac, vscode-extension, visualization, tracer-bullet]
excerpt: "A read-only panel showing map bounds and timeline for every item in a STAC catalog. Double-click to navigate."
---

## What We're Building

When you're working with a STAC catalog that contains dozens or hundreds of plots across space and time, you need to see the whole picture before diving into individual items. We're adding a catalog overview panel to the VS Code extension that shows every item's bounding box on a map and every item's temporal extent on a timeline.

Double-clicking an item navigates to the full plot view we've already built. This gives analysts a spatial-temporal index into their work without leaving the editor.

## How It Fits

STAC catalogs in Future Debrief are directories containing item.json files. Opening a catalog in VS Code should feel like opening a folder — you get an overview of what's inside, then drill down to specifics. The overview panel becomes the entry point for catalog navigation.

This builds on the existing plot view webview. Same Leaflet map, same interaction patterns, but aggregated across items instead of showing one plot's detail.

## Key Decisions

**WebviewPanel instead of CustomReadonlyEditorProvider** — catalogs are directories, not files. WebviewPanel gives us the flexibility to represent a multi-file structure without pretending it's a single document.

**Vanilla JS + Leaflet + SVG** — matches what we're already using in the plot view. No new frameworks, no new dependencies. Leaflet is already in the project for map rendering. Timeline is hand-rolled SVG because the needs are simple: rectangles representing temporal spans.

**Lightweight metadata loading** — the extension host reads just the item.json files (bbox, datetime, title), not the full GeoJSON payloads. Keeps the panel fast even for large catalogs.

**Offline rendering works** — bounding box rectangles and timeline bars render without map tiles. If you're working disconnected, you still see the structure.

## What We'd Love Feedback On

**Timeline representation** — should temporal extents overlap each other (compact but potentially obscured) or auto-stack (clearer but consumes more vertical space)?

**Item selection** — double-click to open is clear, but should single-click highlight the item on both map and timeline simultaneously?

**Catalog refresh** — if items are added to the catalog while the panel is open, should it auto-refresh or require manual reload?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
