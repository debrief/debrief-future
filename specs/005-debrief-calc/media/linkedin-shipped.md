We shipped context-sensitive analysis tools for Future Debrief.

Unlike generic one-size-fits-all tools, debrief-calc adapts to what you're analyzing. Select a track — get track-specific operations. Analyze regions — different tools appear. Every result returns as GeoJSON with complete provenance: you always know which tool ran, on what data, and when.

What we built:
- Tool registry with decorator-based registration (scientists add tools without touching core code)
- Context-aware discovery filtering by selection type and feature kind
- CLI for power users and automation: `debrief-cli tools run track-stats --input data.geojson`
- MCP server for remote integration

199 tests passing. Full provenance tracking. Ready for VS Code extension integration.

This is stage 5 of our tracer bullet — building a thick-services architecture where the frontend orchestrates but doesn't contain domain logic.

Interested in maritime tactical analysis? The code is on GitHub.

[Link to repo]

#FutureDebrief #MaritimeAnalysis #OpenSource #Python #GeoJSON
