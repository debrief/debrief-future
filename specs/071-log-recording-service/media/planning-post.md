---
layout: future-post
title: "Planning: Log Recording Service"
date: 2026-02-09
track: [momentum]
author: Ian
reading_time: 3
tags: [tracer-bullet, provenance, prov-logging, session-state]
excerpt: "Recording tool execution history so analysts know what touched their data and when."
---

## What We're Building

When you run a calculation on a track in Debrief—say, "interpolate missing positions"—the result appears on your plot. But there's no record that the interpolation happened, what parameters you used, or which features were inputs versus outputs. If you close the session and reopen it, that history is gone.

We're adding a log recording service that captures every tool execution as a provenance entry attached to the features it affected. Each entry follows the PROV data model (activity, inputs, outputs, timestamps) and gets written directly to the GeoJSON files in your STAC catalog. Later phases will surface this as an interactive timeline and enable undo/redo, but Phase 1 is pure recording infrastructure.

## How It Fits

This sits between the Python calculation services and the VS Code frontend. When a tool completes, the TypeScript log service parses the result, creates PROV-aligned entries for input features, waits for Python to write output features with their provenance, then marks the catalog dirty so VS Code knows to refresh. The timeline gets assembled at read time by collecting provenance arrays from all features and deduplicating on activity ID—no separate timeline store.

## Key Decisions

- **TypeScript, not Python**: The log service lives in the session-state package because it needs access to the Zustand store for dirty tracking and UI refresh. Python only writes provenance to output features it creates.
- **Write to GeoJSON, not Zustand**: Provenance entries go directly into the `properties.provenance` array of each GeoJSON Feature. The Zustand store holds dirty flags and UI state, not history.
- **Timeline assembly at read time**: Rather than maintaining a separate timeline structure, we scan all features' provenance arrays when needed and deduplicate on `activityId`. Simpler, no sync issues.
- **Graceful fallback for legacy tools**: Not all tools return full ToolResult structures yet. The log service handles both modern MCP-style results and legacy "just a success message" responses.
- **Explicit dirty tracking**: After writing provenance, we call `markDirty(featureId)` to trigger UI updates. No automatic detection.

## What We'd Love Feedback On

- **Deduplication strategy**: We're using `activityId` to merge input/output provenance into a single timeline entry. Does this make sense, or should we preserve separate entries and merge at display time?
- **Dirty tracking granularity**: Currently we mark individual features dirty. Should we also mark entire collections or catalogs to optimize batch updates?
- **Timeline assembly performance**: Reading all features to build a timeline could get slow with large plots. Should we cache the timeline or add an index?

> [Join the discussion](https://github.com/debrief/debrief-future/discussions)
