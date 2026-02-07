Analysis results that disappear when you close the tool aren't analysis results -- they're disposable screenshots.

This week we're planning how Future Debrief will persist calc tool outputs (range/bearing, sensor coverage, etc.) as STAC Items in the local catalog. Each saved result carries derived_from links back to its source data, the tool version, parameters used, and execution timestamp. Full provenance chain, recorded automatically.

The interesting design choice: we're reusing the existing executionId as the STAC Item ID. That gives us idempotent saves for free -- no duplicate-detection logic needed. The Python service handles all catalog writes via MCP, so the VS Code extension never touches the file system directly.

This closes the analysis loop in our tracer bullet: load, display, analyse, save. The catalog becomes the single source of truth for both raw data and derived results.

Read more: [link]

#FutureDebrief #MaritimeAnalysis #STAC
