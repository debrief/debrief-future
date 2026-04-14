# Research: Nested Child Selection

**Feature**: 186-nested-child-selection
**Last updated**: 2026-04-14

This document captures the design alternatives considered during specification, the rationale for the chosen approach, and the constitutional/architectural constraints that shaped the decision. It is a companion to [spec.md](./spec.md) and is referenced by the implementation plan.

---

## Context

The spec establishes a path-based selection model (FR-001…FR-028) that replaces flat feature-ID selection with forward-slash-separated paths following JSON Pointer (RFC 6901) conventions. Child levels are resolved through a central Level Registry (FR-003…FR-005) that maps each level name to an addressing mode — ID-based for stable/named levels (for example, `segments`) and index-based for ordinal levels (for example, `positions`).

The mixed addressing model (some levels ID-based, others index-based) was flagged during review as a potential error surface. This document records the design alternatives that were considered and rejected, so future contributors understand why the chosen approach exists.

---

## Chosen approach: mixed-mode addressing resolved via a canonical Level Registry

A selection path takes one of two shapes:

- Single segment (`feature-id`) — whole-feature selection.
- `feature-id/<level-name>/<address>[/<level-name>/<address>…]` — alternating level-name/address pairs after the feature ID, to arbitrary depth.

Each address is interpreted according to the Level Registry, which maps every supported level name to an addressing mode (ID-based or index-based). The registry is authored in LinkML as part of the master schema, and Pydantic/TypeScript/JSON Schema bindings are generated from it. Paths that reference an undefined level name are rejected at the boundary.

### Why this approach

- **Matches the underlying data model.** Positions inside a GeoJSON LineString are inherently ordinal — there is no persisted ID field. Segments (future) are discrete named sub-units with stable identity. Forcing a single addressing mode would either invent synthetic identity or throw away real identity.
- **Single source of truth (Article II.1).** Level semantics live in LinkML. No consumer hardcodes or infers addressing mode.
- **Type safety (Article XV).** Generated Pydantic/TypeScript bindings carry the level definitions into application code with no `Any`/`any`.
- **Defence-grade strictness (Article XIV.4–5).** Unknown level names are rejected at the boundary rather than tolerated.

---

## Rejected alternatives

### Alternative 1 — ID-only addressing, with synthetic position IDs

Every level addressed by an ID. For positions, IDs would be generated at load time (for example, ULIDs, or content-hash IDs derived from `(timestamp, coord)`) and either persisted or recomputed deterministically on reload.

**Rejected because:**

- **Invents identity that does not exist in the data.** GeoJSON LineStrings have no position identity — coordinates are parallel-array values. Any ID we attach is synthetic, meaning we own a new lifecycle problem: when to generate, where to persist, how to migrate, how to reconcile after re-import.
- **Content-hash IDs are brittle.** Floating-point round-trips or minor coordinate corrections change the hash, silently invalidating every selection referencing that position.
- **Persistence overhead.** Storing a ULID alongside every position bloats every track by ~16 bytes per point. For tracks with tens of thousands of positions this is real.
- **No user benefit.** Users cannot meaningfully identify positions by ID — they point at them on the map. ID-based addressing would only serve the serialisation layer.

### Alternative 2 — Self-describing paths (mode encoded in path syntax)

Path segments carry the addressing mode explicitly, for example `track/hms-defender/positions.idx/3` or `track/hms-defender/segments.id/leg-alpha`. A consumer can parse the path correctly in isolation without consulting any external registry.

**Rejected because:**

- **Duplicates the schema.** The Level Registry is already the canonical mapping; encoding it into every path violates single-source-of-truth (Article II.1).
- **Breaks RFC 6901 conventions.** The `.idx`/`.id` suffix is not a JSON Pointer escape — any standard JSON Pointer consumer would misinterpret it.
- **Verbose serialisation.** Every persisted selection grows proportionally to depth, with no gain: consumers already have access to the registry via generated bindings.
- **Does not improve safety.** The real risk is schema drift between producer and consumer. Embedding the mode in the path trades one drift vector (level name semantics) for another (format agreement on the `.idx`/`.id` suffix) — it does not eliminate drift.
- **No human-readability gain.** A reader who does not know the schema cannot interpret `positions.idx/3` any better than `positions/3`; both are meaningless without the schema.

### Alternative 3 — Index-only addressing

Every level addressed by its ordinal position in its parent's collection. Segments become `segments/0`, `segments/1`, … instead of `segments/leg-alpha`.

**Rejected because:**

- **Throws away stable identity.** Segments are identified by name (for example, `leg-alpha`, `leg-bravo`) — that name is the *point* of having a segment. Index-based addressing means any reorder silently corrupts every selection that references a segment.
- **Fragile under mutation.** Insert a new segment at the start of the list and every existing selection now points at the wrong element, with no warning.
- **Removes information the UI needs.** Users select "the alpha leg", not "the first leg". The name carries intent.

### Alternative 4 — Hybrid: canonical flat-ID form retained alongside paths

Keep the existing flat feature-ID form as a first-class alternative representation, add paths as a second form that consumers may optionally accept.

**Rejected because:**

- **Article XIV.1 removes any backwards-compat obligation.** Pre-v4.0.0 we are explicitly permitted — and in this spec, required — to deliver the breaking change cleanly.
- **Two forms multiply every consumer.** Every panel, serialiser, and tool would need to handle both shapes, test both, and decide which to emit. That complexity compounds forever.
- **The single-segment path form already covers the whole-feature case.** `track-hms-defender` is a valid path and behaves identically to what a flat ID would. There is no information gained by also supporting the flat shape.

---

## Key constraints carried forward

- **Single source of truth (Article II.1).** The Level Registry is the only authority on level semantics. FR-003 and FR-004 enforce this.
- **Strict type safety (Article XV).** Generated bindings for the registry must be fully typed — no `Any`/`any` at consumer boundaries.
- **Pre-release freedom (Article XIV.1).** The feature is delivered as a breaking schema change with no deprecation path. Coordinated update across all selection-aware consumers.
- **Strict on import (Article XIV.4).** Unknown level names, malformed paths, and unrecognised escape sequences are rejected at the boundary (FR-005, FR-012). No forgiving parsers.

---

## References

- [spec.md](./spec.md) — functional and non-functional requirements
- [CONSTITUTION.md](../../CONSTITUTION.md) — Articles II, XIV, XV
- [specs/053-nested-child-selection/](../053-nested-child-selection/) — earlier iteration of this feature; retained for historical context
- [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901) — JSON Pointer escaping conventions
