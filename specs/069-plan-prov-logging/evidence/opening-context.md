## What We're Building

Every analysis tool in Debrief produces results -- bearing calculations, range measurements, speed estimates. Right now, we record a simple provenance stamp: which tool ran, what version, when. That's enough to know what happened, but not enough to undo it, replay it with different parameters, or branch off to explore an alternative hypothesis.

The SRD defines a W3C PROV-inspired logging system that closes this gap. Each tool invocation becomes a structured Log entry with typed parameters (including which ones the analyst can tune), explicit input/output feature references, and a shared activity ID that links multi-feature operations. A new TypeScript Log Service assembles these entries into a timeline that supports undo, snapshots, branching, and parameter replay -- all offline, all stored on the GeoJSON features themselves. For analysts, this means being able to ask "what if I'd used a 30-second interval instead of 60?" and have the system replay the calculation chain from that point forward. For auditors, it means a complete, immutable record of every analytical step.

## How It Fits

This sits at the intersection of two constitutional principles: Article III (every transformation records lineage) and Article IV (services never touch UI). Python calc services remain stateless -- they return expanded ToolResults with structured change tracking. The TypeScript Log Service, living in session-state, wraps those results in PROV-vocabulary entries and writes them to feature properties. The SRD lays out six priorities targeting the March 2026 demonstration, and this transition plan maps each one to concrete implementation phases with clear dependencies.

## Key Decisions

- **Expand ToolResult, don't replace it**: The current Python model gets new fields -- `modifiedFeatures` with property deltas, `createdAssets` with stable identifiers, typed `parameters` with default/tunable annotations. Existing fields stay. Every calc tool populates the expanded contract; the Log Service consumes it.

- **Log Service is TypeScript, not Python**: It's a session-state concern. Python services return data; the Log Service wraps it, assigns activity IDs, and writes entries to feature properties in the Zustand store. No new Python service, no network dependency.

- **UI undo stays separate from data history**: The current undo middleware handles viewport, time controls, visibility -- all display state. Only one field (`featureCollectionUri`) crosses the boundary into data territory. The split is clean: remove two fields from the undo snapshot, leave the rest unchanged.

- **Unify the dual provenance formats**: Today, `debrief-calc` writes `properties.provenance` and `debrief-stac` writes `properties.prov` -- two formats, same purpose, different shapes. Both get replaced by a single PROV-aligned model with `activityId`, `wasGeneratedBy`, `used`, and `generated` fields.

- **Seven phases, no circular dependencies**: Schema foundation first, then Log recording, then four parallel-capable phases (Log panel, undo split, snapshots, branching/replay). Each phase maps to an SRD priority and produces a self-contained backlog item.
