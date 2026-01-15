---
layout: future-post
title: "Planning: Context-Sensitive Analysis Tools"
date: 2026-01-15
track: "Planning · This Week"
author: Ian
reading_time: 3
tags: [tracer-bullet, debrief-calc]
excerpt: "Analysis tools that know what you've selected and return results with full provenance tracking"
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

## What We'd Love Feedback On

**Is the CLI command structure intuitive?** We're proposing `debrief-cli tools run track-stats --input file.geojson`. Does this feel natural for analysts who may be coming from legacy Debrief workflows?

**Should tools expose progress for long operations?** Initial spec excludes progress indicators and cancellation. Is this acceptable, or do we need those from day one?

**Are we missing critical provenance fields?** We're tracking tool name, version, timestamp, source references, and parameters. What else would you want to see in the audit trail?

**How discoverable should kind values be?** The "kind" attribute (e.g., "track", "zone", "bearing") is central to filtering which tools apply. Should we expose the valid kinds as a CLI command? As documentation only? Something else?

→ [Join the discussion](https://github.com/debrief/debrief-future/discussions)
