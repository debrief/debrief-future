## What We're Building

The debrief-io service transforms legacy file formats into validated GeoJSON features. We're starting with REP files, the primary data format for Debrief v3.x, because parsing them is the critical path for demonstrating the entire architecture.

This isn't just a REP parser. It's an extensible handler registry that will support multiple formats. Register a handler for `.rep`, and the parser automatically routes files to it. Add a new handler for `.gpx` later, and it slots right in.

Every feature that comes out of the parser is validated against our Stage 0 Pydantic models. If a coordinate is out of range or a required field is missing, you'll know exactly which line of the source file caused it.

## How It Fits

Stage 2 of the tracer bullet sits between raw files and storage:

- Uses **debrief-schemas** (Stage 0) to validate all output features
- Feeds validated features into **debrief-stac** (Stage 1) for storage
- Exposes MCP tools for the **Electron loader** (Stage 4) to invoke parsing

The Constitution requires pure transformations with no side effects. debrief-io reads files and returns data. It never writes to disk. That's debrief-stac's job.

## Key Decisions

- **REP format first** — it's the primary legacy format and validates our entire pipeline
- **Handler registry pattern** — `register_handler(".rep", REPHandler)` makes the system extensible
- **Line numbers in all errors** — Constitution Article I.3 says no silent failures; we go further with precise error locations
- **Encoding detection** — try UTF-8 first, fall back to Latin-1 for legacy files
- **Continue after recoverable errors** — collect warnings, return what we can parse, let the caller decide
- **MCP thin wrappers** — core parsing is pure Python, MCP layer adds no business logic
