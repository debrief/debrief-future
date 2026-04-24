## What We're Building

The Schema Foundation is the bedrock of Debrief v4.x. We're creating a schema-first architecture where LinkML serves as the single source of truth, generating Pydantic models for Python services, JSON Schema for frontend validation, and TypeScript interfaces for type-safe UI development.

This isn't just about defining data structures. It's about guaranteeing that every component of the system speaks the same language. When a Python service validates a TrackFeature and the TypeScript frontend renders it, they're both working from the same schema definition. No drift. No surprises.

## How It Fits

The Schema Foundation is Stage 0 of our tracer bullet approach. Every downstream service depends on these schemas:

- **debrief-stac** (Stage 1) uses them to validate STAC Items and GeoJSON features
- **debrief-io** (Stage 2) uses them to validate parsed REP files
- **The VS Code extension** (Stage 6) uses TypeScript interfaces for type-safe rendering

Without validated schemas, we can't guarantee data integrity across the stack. This is why Constitution Article II mandates schema tests gate all merges.

## Key Decisions

- **LinkML as master schema language** — industry-standard, generates to multiple targets, excellent for GeoJSON profiles
- **Tracer bullet scope** — starting with just TrackFeature and ReferenceLocation; SensorContact, PlotMetadata, and ToolMetadata come in future iterations
- **Three adherence test strategies** — golden fixtures, round-trip testing (Python to JSON to TypeScript to JSON to Python), and schema comparison
- **Zero manual edits to generated files** — all customisation via LinkML or generator configuration
- **Single `make generate` command** — propagates any LinkML change to all derived schemas
