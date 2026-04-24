## What We're Building

Right now, if you run a range/bearing calculation between two tracks in Future Debrief, the result appears on the map -- and vanishes when you close the session. That's fine for quick checks but useless for any serious analysis workflow. You need to be able to come back to results, compare them across sessions, share them with colleagues.

So the next piece of work is saving calc tool results as first-class STAC Items in the local catalog. Each saved result will carry `derived_from` links pointing back to the source items that produced it, the tool ID and version, execution parameters, and a timestamp. Full provenance, recorded automatically.

## How It Fits

This closes the loop in our tracer bullet. The sequence is now: load data, display on map, run analysis tools, save results with provenance. Every step produces STAC Items. The catalog becomes the single source of truth -- not just for raw data but for derived analysis too. A saved range/bearing result sits alongside the tracks it was computed from, linked by provenance.

## Key Decisions

- **Python service via MCP, not direct file writes.** The VS Code extension calls into `debrief-stac` through MCP to create result items. This keeps catalog consistency in one place rather than having TypeScript and Python both writing to the same directory.
- **executionId as STAC Item ID.** Every calc tool execution already gets a unique ID. Using that as the STAC Item ID gives us natural idempotency -- saving the same result twice just overwrites the same item rather than creating duplicates.
- **New `debrief:kind` property.** Saved results get `debrief:kind = "calc-result"` so they can be distinguished from loaded plots when browsing the catalog. The catalog lists both, but the UI can filter by kind.
- **Extend ToolProvenance with sourceItemIds.** The provenance object already tracks which features were used. Adding the STAC Item IDs those features belong to lets us construct `derived_from` links without a separate lookup step.
- **Cross-cutting implementation.** New `create_result()` function in the Python `debrief-stac` service, exposed via MCP. New "Save Result" context menu command in the VS Code extension. The extension gathers the result GeoJSON and provenance metadata, sends it to the service, done.
