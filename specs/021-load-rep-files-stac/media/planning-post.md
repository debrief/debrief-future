---
layout: future-post
title: "Planning: Drag-Drop REP File Import in VS Code"
date: 2026-01-24
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, vscode-extension, rep-format]
excerpt: "Adding the ability to drag a REP file onto the map panel and see it appear — completing our tracer bullet workflow."
---

## What We're Building

The core piece of our tracer bullet: getting data from a REP file into a STAC-based plot without leaving VS Code.

The primary interaction is drag-and-drop. Analyst has a plot open, drags a `.rep` file from the file explorer onto the map, and the track data appears. No dialogs, no intermediate steps. The original file gets stored as a STAC asset for provenance, and the parsed GeoJSON features merge into the plot's feature collection.

A secondary path handles the case where the target plot isn't obvious — right-click on a REP file in the explorer, select "Load into Debrief...", and pick which catalog and plot to import into. This reuses the catalog picker UI we've already built for the Loader app.

## How It Fits

This feature connects the pieces we've been building: debrief-io for parsing REP files, debrief-stac for storing and managing plot data, and the VS Code extension for display. It's the "Load" in "Load a REP file → store in STAC → display in VS Code → run analysis tool → see results."

The Python services already do the heavy lifting. The implementation is mainly VS Code integration: handling drop events in the webview, spawning the Python process for JSON-RPC calls, and orchestrating the import flow with proper progress feedback and error handling.

## Key Decisions

- **IPC Protocol**: JSON-RPC 2.0 over stdio. Already documented, matches what we planned for the Loader app, avoids network complexity.

- **Duplicate detection by filename**: If you drop `exercise_alpha.rep` twice, the second drop gets rejected with a warning. Simple, fast, matches user expectation.

- **Fail-fast on parse errors**: A malformed REP file rejects entirely rather than partially importing. Users get a clear error message with line numbers. No silent corruption of analysis data.

- **Map auto-zooms to new data**: After import, the view adjusts to show what just arrived. Small thing, but it confirms the import worked without requiring the user to hunt for it.

## What We'd Love Feedback On

- **The right-click flow**: Should the catalog picker be a quick-pick (current plan) or a separate tree view? Quick-pick is simpler but less discoverable.

- **Large file handling**: For REP files with tens of thousands of points, should we show a progress bar during parsing? The Python service is fast, but the JSON-RPC round-trip adds latency.

- **Batch import**: We're explicitly scoping this to single-file import. Is that a problem? Would analysts commonly want to import multiple REP files at once?

→ [View the specification](../../specs/021-load-rep-files-stac/spec.md)
