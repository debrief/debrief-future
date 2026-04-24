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
