---
title: "Building Context-Sensitive Analysis Tools"
date: 2026-01-15
layout: future-post
author: Ian
track: Shipped · Stage 5
excerpt: "Analysis tools that know what you've selected — now live with full provenance tracking"
tags:
  - debrief-calc
---

## What We're Building

Context-sensitive analysis tools for maritime tactical analysis — the "calc" layer of Future Debrief. The goal is straightforward: when you select track data, the system shows you applicable analysis operations. When you run those operations, you get back valid GeoJSON results with complete provenance about where they came from.

This is stage 5 of our tracer bullet delivery, and it unlocks two critical capabilities. First, scientists can write Python analysis tools without touching the core platform — just decorate a function and it registers automatically. Second, the VS Code extension (stage 6, coming next) gets a library of operations to expose via right-click menus and keyboard shortcuts.

## How It Fits

The architecture principle here is "thick services, thin frontends." The debrief-calc library contains all the analysis logic in pure Python with zero dependency on any UI framework. The MCP wrapper (Model Context Protocol) is just transport — the same tools work via command line, direct Python import, or remote invocation from VS Code.

Results come back as GeoJSON with inline provenance. Every analysis result knows which tool created it, from which source data, and when. This aligns with our Constitution's requirement that provenance always travels with the data.

## Key Decisions

**Decorator-based registration** — Tools self-register on import using `@registry.tool()`. No configuration files to maintain, no risk of forgetting to wire up new tools.

**Selection context + kind filtering** — Tools declare what they operate on: single track, multiple tracks, geographic region, or no selection. They also specify which feature kinds they accept (e.g., "track", "zone"). The registry filters automatically based on what the user has selected.

**Click CLI for verification** — We're building debrief-cli alongside debrief-calc. This gives us a way to test every tool before the VS Code extension exists, and it serves power users who prefer terminal workflows.

**Human-readable default, JSON on demand** — CLI output is formatted for humans by default. Add `--json` and you get structured data for scripting. This is a common pattern (see `gh`, `docker`) but we're open to feedback on whether it's right for our audience.

**Provenance in properties, not sidecar files** — Every result feature includes a `provenance` object in its GeoJSON properties. The alternative was a separate tracking system, but that risks data becoming orphaned from its lineage.

Context-sensitive analysis tools for maritime tactical analysis — the "calc" layer of Future Debrief. When you select track data, the system shows applicable analysis operations. When you run those operations, you get valid GeoJSON results with complete provenance tracking.

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
