## What We're Building

Right now, Future Debrief has two separate provenance implementations writing different keys (`provenance` vs `prov`) with flat, limited models. Every time a tool runs, we record *that it happened*, but not much else — no structured parameters, no change deltas, no activity IDs linking related operations.

We're replacing this with a unified PROV-aligned schema foundation. Provenance becomes an append-only array of Log entries on each GeoJSON feature. Each entry captures: what changed (property deltas), what was created (new features, STAC assets), what activity generated it (UUID), and structured parameters with types and tuning annotations. We're adding a system record (Point feature with empty coordinates) for plot-level metadata like snapshot links and branch records. This aligns with W3C PROV vocabulary (`wasGeneratedBy`, `used`, `generated`) and sets up every downstream PROV feature: the Log Service, Log Panel, undo/redo split, snapshots, branching, and replay.

## How It Fits

This is Phase 0 of a 7-phase epic (E02: PROV Logging Implementation). The other six phases — Log Service, Log Panel, undo/redo, snapshots, branching, replay — all depend on this schema foundation. Getting the contract right now means those features can proceed without revisiting the data model. It's the first tracer-bullet deliverable for structured change tracking in Future Debrief.

## Key Decisions

- **snake_case in schemas, camelCase in JSON**: LinkML uses snake_case; Pydantic aliases produce camelCase for JSON/TypeScript compatibility
- **New dedicated schema files**: `log-entry.yaml` and `system-record.yaml`, not bolted onto existing schemas
- **UUID v4 for activity IDs**: No prefix, shared across features in multi-feature operations
- **Provenance becomes an array**: Append-only log on each feature; old single-object format wrapped on read
- **Remove duplicate STAC provenance module**: One implementation, not two
- **System record uses Point with empty coordinates**: Not null geometry — keeps it valid GeoJSON for renderers
- **All new ToolResult fields optional**: Backward compatibility with existing tools
- **Breaking changes permitted**: Article XIV (Pre-Release Freedom) allows schema changes before v4.0.0
