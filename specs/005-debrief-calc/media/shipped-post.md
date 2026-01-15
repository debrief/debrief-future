---
layout: future-post
title: "Shipped: Context-Sensitive Analysis Tools"
date: 2026-01-15
track: "Shipped · Stage 5"
author: Ian
reading_time: 4
tags: [tracer-bullet, debrief-calc, shipped]
excerpt: "Analysis tools that know what you've selected — now live with full provenance tracking"
---

## What We Built

Context-sensitive analysis tools for maritime tactical analysis — the "calc" layer of Future Debrief. When you select track data, the system shows applicable analysis operations. When you run those operations, you get valid GeoJSON results with complete provenance tracking.

This is stage 5 of our tracer bullet delivery, and it enables two critical capabilities. Scientists can write Python analysis tools without touching the core platform — decorate a function and it registers automatically. The VS Code extension (stage 6, coming next) gets a library of operations to expose via right-click menus and keyboard shortcuts.

## What's Included

### debrief-calc Library

The core Python library with:
- **Tool Registry** — Decorator-based registration with `@tool()`. Tools self-register on import.
- **Context-Aware Discovery** — Filter tools by selection type (single, multi, region) and feature kind (track, zone, etc.)
- **Provenance Tracking** — Every result includes inline provenance: tool, version, timestamp, sources, parameters.
- **Three Built-in Tools**:
  - `track-stats` — Point count, duration, distance, average speed for single tracks
  - `range-bearing` — Range and bearing between two tracks at sample points
  - `area-summary` — Geographic extent statistics for regions

### debrief-cli

Command-line interface for verification and power user workflows:

```bash
# List available tools
debrief-cli tools list

# Describe tool parameters
debrief-cli tools describe track-stats

# Run analysis
debrief-cli tools run track-stats --input track.geojson

# Validate GeoJSON
debrief-cli validate output.geojson
```

Human-readable output by default, `--json` for scripting.

### MCP Server

Model Context Protocol wrapper for remote access. The VS Code extension will use this in stage 6.

## By the Numbers

- **199 tests passing** (100% pass rate)
- **2 packages**: debrief-calc and debrief-cli
- **3 built-in tools** demonstrating the patterns
- **5 user stories** implemented across P1-P3

## Key Decisions Made

**Decorator-based registration** — Works exactly as planned. `@tool()` makes it trivial to add new analysis capabilities.

**Kind filtering** — The `kind` attribute on GeoJSON features (e.g., "track", "zone") integrates cleanly with tool discovery.

**Provenance in properties** — Inline tracking in GeoJSON properties proved to be the right call. No orphaned metadata.

**Click CLI** — Simple, composable commands. Exit codes follow conventions (0=success, 2-5 for specific failures).

## What's Next

Stage 6: VS Code Extension. The extension will consume debrief-calc via MCP, providing:
- Right-click context menus filtered by selection
- Tool execution with progress indication
- Result visualization on the map

The calc library is ready — now we build the UI that exposes it.

→ [Browse the code](https://github.com/debrief/debrief-future/tree/005-debrief-calc/services/calc)
→ [Try the CLI](https://github.com/debrief/debrief-future/tree/005-debrief-calc/services/cli)
