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

---

## Phase 0: Integration & Dependency Patterns

This section records the implementation-phase decisions raised by `/speckit.plan` Phase 0 — integration patterns with existing infrastructure, dependency posture, and cross-cutting concerns.

### Integration with existing `selectionPath.ts` (from feature 053)

**Decision**: Retain and refactor the existing `services/session-state/src/utils/selectionPath.ts` rather than replace it.

**Rationale**: The module already implements `parsePath`, `buildPath`, `getRoot`, `getDepth`, `getParent`, `escapeSegment`, `unescapeSegment`, and a hardcoded `LEVEL_REGISTRY`. The 186 delta is to (a) replace the hardcoded registry with a LinkML-derived binding (FR-004), (b) add strict validation that rejects unknown level names at the boundary (FR-005), (c) add a `computeRange(anchor, target)` helper for FR-022, and (d) remove any remaining flat-ID fallback logic from callers.

**Alternatives considered**:

- *Rewrite from scratch.* Rejected — the existing utilities have golden-fixture coverage; re-deriving the same API adds risk without benefit.
- *Leave registry hardcoded, add a comment that LinkML is aspirational.* Rejected — violates Article II.1 (single source of truth); defers work that is already in scope.

### Level Registry binding path

**Decision**: The Level Registry source lives in LinkML (`shared/schemas/src/linkml/session-state.yaml`). TypeScript binding is generated via `gen-typescript`; Pydantic binding via `gen-pydantic`. The runtime TypeScript `LEVEL_REGISTRY` constant is populated at module-load time by importing the generated enum/values, not by hand-authored entries.

**Rationale**: Article II.1 requires LinkML to be the single source of truth; Article XV.4 requires generated types to be fully typed with no `any`. A runtime lookup table derived from the generated enum satisfies both.

**Alternatives considered**:

- *Generate the registry as a JSON file consumed at runtime.* Rejected — adds a file format boundary for no gain when the TypeScript binding can carry the data directly.
- *Duplicate the registry in both Python and TypeScript and test they agree.* Rejected — the schema adherence tests already exist; generating from a single source is simpler and less error-prone.

### Persistence integration

**Decision**: Extend `services/session-state/src/persistence/{save.ts,load.ts}` to write/read the `FeatureSelection` (including the new `anchor` field) with the plot's other session state. Add a new `resolve.ts` module responsible for re-resolving persisted paths against live feature data and flagging entries that cannot be resolved. `load.ts` calls into `resolve.ts` after raw deserialisation.

**Rationale**: The save/load pair already handles other session-state slices. Separating "deserialise bytes" from "validate against current data" is the cleanest boundary — `save.ts` and `load.ts` remain pure data plumbing, while `resolve.ts` encapsulates the new semantic check. This keeps unresolvable-handling testable in isolation.

**Alternatives considered**:

- *Resolve during selection, not on load.* Rejected — restore-time resolution is required by FR-018, and doing it lazily would let the UI render a stale selection before the user sees the flag.
- *Store the resolved state alongside the raw paths.* Rejected — resolution is dynamic against current data, so any cached resolution would drift immediately. Re-resolving on load is cheap (one hash-map lookup per path) and always correct.

### Observability integration — LogService

**Decision**: Every unresolvable-path occurrence emits a structured log entry via the existing `@debrief/session-state` `LogService.recordEvent` path (the same hook used by `recordFileSaved` in feature 178). Schema for the entry is defined in `contracts/log-schema.ts`. Log level: `warning`.

**Rationale**: LogService is the existing sanctioned observability channel in the TypeScript stack; routing through it gives us free integration with the Log Panel (feature 176) and any downstream telemetry without inventing a parallel signal path. `warning` level (not `error`) matches the user-visible-degradation framing of FR-027.

**Alternatives considered**:

- *console.warn / console.error.* Rejected — bypasses LogService and loses structured context; also strict-linting would flag it.
- *Custom telemetry hook.* Rejected — no compliance driver, LogService suffices.

### Click modifier dispatch (map → store)

**Decision**: Map click handlers emit click events with an explicit modifier state object `{ shift: boolean, ctrl: boolean, meta: boolean }`. The store-side action router maps `{}` → `setSelection` (replace), `{ctrl}` → `toggleInSelection`, `{shift}` → `selectRange(anchor, target)`. Other modifier combinations (e.g. `{ctrl, shift}`) are reserved but not wired in 186 — they fall back to `toggleInSelection` to avoid silently doing nothing.

**Rationale**: Keeping modifier state at the event boundary (not in global state) preserves testability — each store action has a clean, modifier-free signature. The VS Code webview click message already passes through `apps/vscode/src/webview/messages.ts`, so this is a schema extension, not a new channel.

**Alternatives considered**:

- *One action `handleMapClick(event)` that inspects modifiers internally.* Rejected — harder to unit test; each branch deserves its own action for golden fixtures.
- *Per-modifier message types.* Rejected — explodes the message protocol for no semantic gain.

### Ordering constraint for Shift+click range (FR-024)

**Decision**: Range selection is computed by `computeRange(anchorPath, targetPath, registry)`. It requires the anchor and target to share their full prefix up to the last level-name segment, and that last level's addressing mode must be `index`. If either condition fails, the function returns `null` and the caller (`selectRange` action) falls back to `setSelection` per FR-023.

**Rationale**: This makes the "same immediate parent" and "ordering available" checks explicit and unit-testable. It also naturally defers any future "canonical order for ID-based levels" (FR-024 extension) to a registry field — we can add `canonicalOrder` to `LevelDefinition` later without changing callers.

**Alternatives considered**:

- *Compute range at the store level with inline checks.* Rejected — puts domain logic in the store, hurting testability.
- *Error out on cross-parent Shift+click.* Rejected — FR-023 explicitly requires fallback to single-click replace, not an error.

### Performance strategy — 100 ms / 1,000 paths (FR-025)

**Decision**: Selection-change response time is measured end-to-end from click dispatch to (a) map highlights applied AND (b) downstream panel updates flushed. Implementation strategy:

- Store writes are O(N) in the selection size for toggle/range operations; acceptable at N ≤ 1,000.
- Map rendering uses batched Leaflet style updates via a single `requestAnimationFrame` flush per selection change.
- Panel subscriptions are already diffed by Zustand; no new subscription granularity required.
- Benchmarks live in `services/session-state/tests/integration/selection-performance.test.ts` with a CI threshold; regressions beyond 100 ms fail CI.

**Rationale**: The existing Zustand store already handles bulk updates cleanly. The bottleneck risk is in Leaflet — hundreds of individual marker style updates in a tight loop can jank. Batching into one animation frame keeps us within budget without pulling in a virtualisation library.

**Alternatives considered**:

- *Virtualise map markers.* Deferred — not required at 1,000-path scale; introduces complexity and a new dependency.
- *Store selection as a Set instead of an array.* Rejected for now — uniqueness is enforced at the action layer (FR-016) and ordering matters for primary-designation tie-breaking. A Set would lose order.

### Dependency posture — no new external dependencies

**Decision**: The feature ships with no additions to `package.json`, `pyproject.toml`, or any lockfile.

**Rationale**: Article IX.1 (minimal, vetted dependencies) and the offline-by-default reliability bar (Article I.1). Every piece of required functionality is achievable with the existing stack.

**Alternatives considered**:

- *Pull in `immer` for ergonomic immutable updates in the store.* Rejected — Zustand handles immutability idiomatically; adding `immer` would be unused lift.
- *Pull in `fast-deep-equal` for range deduplication.* Rejected — paths are strings; `Set`-backed uniqueness is O(1) and dependency-free.

