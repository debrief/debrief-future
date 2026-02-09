When you run an analysis tool on a maritime track, where does that history go?

In most analysis software, it doesn't. You get the result, but not a record of what happened, what parameters you used, or which features were inputs versus outputs. Close the session, lose the context.

We're building a log recording service for Debrief that captures every tool execution as a PROV-aligned provenance entry attached to the features it affected. The interesting part: we're splitting the work between Python and TypeScript. Python writes provenance to output features when it creates them. TypeScript creates entries for input features and assembles the timeline at read time by scanning all features' provenance arrays.

No separate timeline store. No sync issues. Just GeoJSON files with embedded history that travels with your data.

This is Phase 1 of a 7-phase provenance system that will eventually enable undo/redo, snapshots, and branching.

[Read the full post](https://debrief.github.io/future/planning-log-recording-service/)

#maritimeanalysis #provenance #opendata
