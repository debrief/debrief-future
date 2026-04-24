# Feature Specification: Consolidate spatial types in LinkML + add lat/lon ↔ GeoJSON converters

**Feature Branch**: `203-spatial-types-linkml`
**Created**: 2026-04-20
**Status**: Draft
**Input**: Backlog item [#203](../../BACKLOG.md) — Tech Debt, V:4 M:2 A:4 (Total 10), Complexity: Medium. Full problem statement at [`docs/ideas/203-spatial-types-linkml.md`](../../docs/ideas/203-spatial-types-linkml.md).

## Context

Three spatial/temporal types — `Coordinate`, `ViewportPolygon`, and `TimeFilter` — are each defined in two TypeScript packages, and the LinkML schema defines a third shape that matches neither runtime copy. The duplication is already documented in inline code comments (see the `Schema equivalent ... Not migrated` notes in `services/session-state/src/types/spatial.ts` and `temporal.ts`).

| Type | `shared/components` | `services/session-state` | `@debrief/schemas` (LinkML) |
|------|---------------------|--------------------------|-----------------------------|
| `Coordinate` | tuple `[number, number]` | tuple `[number, number]` | object `{ longitude, latitude }` |
| `ViewportPolygon` | 4-tuple of `Coordinate` + optional `zoom` | 4-tuple of `Coordinate` + optional `zoom` | `multivalued: Coordinate`, no `zoom` |
| `TimeFilter` | `{ start: number \| null, end: number \| null }` | `{ start: number \| null, end: number \| null }` | `{ start: TimeInstant, end: TimeInstant }` |

The schema's object form aligns with the `CONSTITUTION.md` principle that LinkML is the root of truth for derived types. The runtime tuple form is retained historically because Leaflet and GeoJSON both use `[longitude, latitude]` pairs on the wire, and because the `TimeFilter` epoch-millis form was adopted in Review Decision 5C for hot-path state updates.

This feature removes the duplication by making the object form canonical across all application code and confining tuple form to a narrow GeoJSON/Leaflet interop boundary through new converter helpers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Single source of truth for spatial types (Priority: P1)

A developer adding a new map-viewport-aware feature (panel, filter, tool) needs the `Coordinate`, `ViewportPolygon`, and `TimeFilter` types. They import all three from `@debrief/schemas` and get exactly one definition per type — no ambiguity about which copy to use, no structural drift.

**Why this priority**: This is the load-bearing outcome of the refactor. Every downstream benefit (type-safety, schema adherence tests, GeoJSON boundary clarity) depends on the duplication being eliminated first. Without this, the refactor has no value.

**Independent Test**: Grep the entire repo for `type Coordinate`, `interface ViewportPolygon`, `interface TimeFilter`. Only `shared/schemas/generated/` (generated artefacts) should define them. No hand-authored source file should declare them.

**Acceptance Scenarios**:

1. **Given** a developer runs `rg "^export (type|interface) (Coordinate|ViewportPolygon|TimeFilter)" --type ts`, **When** the search completes, **Then** it returns only the generated files under `shared/schemas/generated/typescript/` (or equivalent single source).
2. **Given** a fresh clone and a clean install, **When** `task verify` runs, **Then** lint, typecheck, and tests pass end-to-end with the consolidated types in place.
3. **Given** a developer imports `Coordinate` in a new TypeScript file, **When** IDE "Go to definition" is invoked, **Then** the resolver points to `@debrief/schemas` and not to either duplicate.

---

### User Story 2 — Safe GeoJSON / Leaflet interop at the boundary (Priority: P1)

A developer working at an interop boundary (reading a GeoJSON `Feature`, passing coordinates to Leaflet, emitting a GeoJSON polygon) needs to convert between the canonical object form and the tuple form without reimplementing the swap inline or risking latitude/longitude order mistakes.

**Why this priority**: Without clearly named converters, developers will re-invent `[coord.longitude, coord.latitude]` inline in dozens of places, and the duplication will reappear in a different form. The converters must exist and be the only tuple-handling pattern in new code; otherwise the refactor's long-term value erodes.

**Independent Test**: `@debrief/utils` exports `toGeoJSONCoord` and `fromGeoJSONCoord` with documented GeoJSON axis order. Unit tests assert round-trip equality for a set of canonical and edge-case coordinates. Adapter code at the GeoJSON/Leaflet boundary calls these helpers.

**Acceptance Scenarios**:

1. **Given** a `Coordinate` object `{ longitude: -1.5, latitude: 51.5 }`, **When** `toGeoJSONCoord(coord)` is called, **Then** it returns `[-1.5, 51.5]` (GeoJSON longitude-first order).
2. **Given** a GeoJSON-style tuple `[-1.5, 51.5]`, **When** `fromGeoJSONCoord([-1.5, 51.5])` is called, **Then** it returns `{ longitude: -1.5, latitude: 51.5 }`.
3. **Given** any valid `Coordinate`, **When** it is passed through `fromGeoJSONCoord(toGeoJSONCoord(c))`, **Then** the result is structurally equal to the input (round-trip identity).
4. **Given** a code review on a new PR that handles GeoJSON geometry, **When** a reviewer greps the diff for `\[.*longitude.*latitude|\.longitude,.*\.latitude`, **Then** they see only calls to `toGeoJSONCoord` / `fromGeoJSONCoord` — not hand-rolled tuple construction in new code.

---

### User Story 3 — Schema round-trip tests still pass after regeneration (Priority: P1)

The schema owner (or CI) regenerates Pydantic + TypeScript artefacts from the updated LinkML source and the existing schema adherence tests still pass — including round-trip tests (Python → JSON → TypeScript → JSON → Python) for `Coordinate`, `ViewportPolygon`, and `TimeFilter`.

**Why this priority**: The project constitution requires derived schemas to pass adherence tests before merge (`CLAUDE.md` / `Schema Test Strategy`). If the schema change breaks generated-artefact contracts, downstream consumers (VS Code extension, web-shell, Python services) will fail at runtime.

**Independent Test**: Running the schema adherence test suite (`uv run pytest` over the schema tests + any TypeScript-side comparison) against the regenerated artefacts. All three types exercised by golden fixtures under `shared/schemas/fixtures/`.

**Acceptance Scenarios**:

1. **Given** the updated LinkML source for `Coordinate`, `ViewportPolygon`, `TimeFilter`, **When** `gen-pydantic` and `gen-typescript` run, **Then** both complete without errors and emit types with the canonical object shape.
2. **Given** the regenerated Pydantic and TypeScript artefacts, **When** the round-trip test suite runs, **Then** every fixture for the three types produces a structurally identical object at the end of the round-trip.
3. **Given** a spec-level fixture for `ViewportPolygon` serialised to JSON, **When** the JSON Schema generated by LinkML and by Pydantic are compared, **Then** they agree on the canonical shape (including whether `zoom` is present).

---

### User Story 4 — Runtime map / viewport / time filtering still works (Priority: P2)

A user loading a sample plot in the VS Code extension or the web-shell app sees the map render, the viewport restore on reload, the time slider apply a filter, and the "three-view sync" feature continue to function — all with the canonical types flowing through the session-state store.

**Why this priority**: This is the observable-behaviour guarantee. P1 stories prove the types are consolidated; this story proves the consolidation did not silently break consumers. Lower priority than P1 because if P1 holds and schema round-trip passes, behavioural regressions are unlikely but still possible (e.g., a consumer that assumed tuple order).

**Independent Test**: Documented smoke-test set covering: (a) loading a REP sample and seeing tracks on the map, (b) changing viewport and confirming it persists across reload, (c) dragging the time filter and seeing feature visibility update, (d) three-view-sync still selecting the same feature across map, list, and timeline.

**Acceptance Scenarios**:

1. **Given** a fresh session-state store with a persisted `SpatialSlice`, **When** the store rehydrates, **Then** the viewport is applied to the map without "coordinate shape mismatch" errors.
2. **Given** a user drags the time filter, **When** the `TimeFilter` is written to the store and read by the timeline + map, **Then** both views reflect the same start/end and feature visibility updates correctly.
3. **Given** the VS Code extension and the web-shell both consume `@debrief/session-state`, **When** each loads the same sample plot, **Then** neither logs a type error and both render the same features within the same viewport.

---

### Edge Cases

- **Tuple-form dependency in generated LinkML output**: LinkML's `gen-typescript` may emit `ViewportPolygon.coordinates` as `Coordinate[]` (an unbounded array) rather than the fixed 4-tuple the runtime currently enforces. Spec: the consolidated type MUST preserve the 4-corner cardinality constraint (`minimum_cardinality: 4`, `maximum_cardinality: 4` are already in the schema), and downstream consumers MUST accept the generated array type — runtime validators reject non-4-corner inputs at the validation step.
- **Persisted state rehydration**: Existing persisted session state on disk/localStorage may contain viewport coordinates in tuple form. The consolidated runtime MUST either (a) refuse to rehydrate old tuple-shaped state with a clear error, or (b) include a one-time migration that converts tuple-shaped coordinates to object form. Default assumption: migration, documented in `decisions.md`.
- **GeoJSON axis order mistakes**: Confusion between `[longitude, latitude]` (GeoJSON) and `[latitude, longitude]` (Leaflet LatLng) is a common source of bugs. The converter helpers MUST be explicit about GeoJSON order in their names, JSDoc, and unit tests. Leaflet's `[lat, lng]` form is out of scope — code that needs it calls `.reverse()` explicitly or uses Leaflet's `L.latLng` constructor.
- **Validators in the right package**: `validateCoordinate` and `validateViewportPolygon` currently live in `services/session-state`. After the refactor they must live in `@debrief/utils` so components and session-state can both import them without a cross-workspace dependency.
- **Third copy via `shared/components/src/utils/spatial-types.ts` file header**: That file's comment explicitly says "local copies ... to avoid a cross-workspace build dependency". After the refactor, `@debrief/components` MUST be allowed to depend on `@debrief/schemas` (it already does transitively via other generated types) and the file MUST be deleted, not kept as a re-export.
- **`SpatialSlice` with `drawingMode`**: `SpatialSlice` in `services/session-state` carries ephemeral UI fields (`drawingMode`, `drawingPaletteIndex`) that the generated schema version does not have. This feature does not re-home `SpatialSlice` — only the types it composes. `SpatialSlice` keeps its current location and imports the canonical `ViewportPolygon`.

## Requirements *(mandatory)*

### Functional Requirements

**LinkML as root of truth**

- **FR-001**: `@debrief/schemas` MUST be the single source of truth for the types `Coordinate`, `ViewportPolygon`, and `TimeFilter`. After this feature lands, no hand-authored TypeScript file in the repository may declare a type or interface named `Coordinate`, `ViewportPolygon`, or `TimeFilter`.
- **FR-002**: The canonical `Coordinate` shape MUST be the object form `{ longitude: number, latitude: number }` with the existing LinkML bounds (`longitude` in `[-180, 180]`, `latitude` in `[-90, 90]`). This is already present in `shared/schemas/src/linkml/session-state.yaml` and MUST be preserved.
- **FR-003**: The canonical `ViewportPolygon` MUST carry its 4-corner cardinality constraint (exactly 4 `Coordinate` objects in clockwise `[NW, NE, SE, SW]` order) in the LinkML source. An optional `zoom: float` attribute MUST be added to `ViewportPolygon` to match the runtime's existing usage (see research R-001); pre-existing fixtures without `zoom` remain valid.
- **FR-004**: The canonical `TimeFilter` MUST be defined in LinkML with two optional attributes, `start` and `end`, each of `range: integer` representing nullable epoch milliseconds (null/missing means unbounded on that side). This change reverses the current `TimeInstant`-based schema definition and aligns with Review Decision 5C per research R-002. `TimeInstant` remains canonical for `TimeRange` (out of scope for this feature).

**Code generation & regeneration**

- **FR-005**: Regenerating artefacts from the updated LinkML source (`pnpm --filter @debrief/schemas build` or equivalent) MUST produce Pydantic models, JSON Schema, and TypeScript definitions without errors.
- **FR-006**: The schema round-trip test (Python → JSON → TypeScript → JSON → Python) MUST pass for `Coordinate`, `ViewportPolygon`, and `TimeFilter` using golden fixtures committed under `shared/schemas/fixtures/`.
- **FR-007**: Generated JSON Schema and Pydantic-produced JSON Schema MUST agree on the canonical shape of all three types (the existing "schema comparison" adherence test MUST pass).

**Runtime consolidation**

- **FR-008**: `shared/components/src/utils/spatial-types.ts` MUST be deleted. Consumers in `@debrief/components` MUST import `Coordinate`, `ViewportPolygon`, and `TimeFilter` directly from `@debrief/schemas`.
- **FR-009**: `services/session-state/src/types/spatial.ts` MUST stop declaring `Coordinate` and `ViewportPolygon`. Consumers within `@debrief/session-state` MUST import them from `@debrief/schemas`. `SpatialSlice`, `SpatialActions`, `DrawingMode`, `DEFAULT_SPATIAL_SLICE`, `normalizeRotation`, and the validators remain in their respective packages (validators move — see FR-012).
- **FR-010**: `services/session-state/src/types/temporal.ts` MUST stop declaring `TimeFilter`. Consumers within `@debrief/session-state` MUST import it from `@debrief/schemas`.
- **FR-011**: `calculateViewportCenter` MUST be updated to operate on the canonical object form (`{ longitude, latitude }`) rather than tuples.

**Validators and converter helpers**

- **FR-012**: `validateCoordinate` and `validateViewportPolygon` MUST move from `services/session-state` to `@debrief/utils`. Their signatures MUST accept the canonical object form.
- **FR-013**: `@debrief/utils` MUST export `toGeoJSONCoord(coord: Coordinate): [number, number]`. It MUST return `[longitude, latitude]` — GeoJSON axis order. JSDoc MUST state the axis order explicitly.
- **FR-014**: `@debrief/utils` MUST export `fromGeoJSONCoord(coord: [number, number]): Coordinate`. It MUST accept `[longitude, latitude]` — GeoJSON axis order — and return `{ longitude, latitude }`. JSDoc MUST state the axis order explicitly.
- **FR-015**: Round-trip identity MUST hold: for every valid `Coordinate c`, `fromGeoJSONCoord(toGeoJSONCoord(c))` MUST deep-equal `c`. Unit tests MUST assert this over a canonical fixture set plus edge cases (antimeridian `lon = ±180`, poles `lat = ±90`, zero, negative values, fractional precision).

**Boundary discipline**

- **FR-016**: Existing code that crosses the GeoJSON/Leaflet boundary (feature geometry serialisation, map viewport marshalling, drawing-tool output) MUST use `toGeoJSONCoord` / `fromGeoJSONCoord` rather than hand-rolled tuple construction. An audit of call sites MUST be completed as part of the implementation and any remaining hand-rolled conversions MUST either be replaced or explicitly documented as intentional (with justification).
- **FR-017**: New code MUST NOT reintroduce hand-rolled tuple-order conversions. This is enforced socially via PR review for this refactor; a lint rule is out of scope for this feature but may be considered as follow-up.

**State persistence**

- **FR-018**: Persisted session state containing tuple-form coordinates MUST be handled inside `applySessionState` in `services/session-state/src/persistence/load.ts` via a `coerceViewport` helper (sibling pattern to the existing `coerceEpoch` at `load.ts:186-192`) that detects tuple-shaped coordinates and converts them to object form before the value reaches `setViewport` (see research R-003 and `contracts/persistence-migration.md`). The migration replaces the existing blind `as never` cast at `load.ts:125`. `SCHEMA_VERSION` MUST bump from `'1.0.0'` to `'1.1.0'`. The legacy-tuple branch MUST be annotated `REMOVABLE:` so it can be deleted in a follow-up.

- **FR-020**: TypeScript-level cardinality of `ViewportPolygon.coordinates` MUST be accepted as `Coordinate[]` (unbounded array) in the generated types — a relaxation from the current hand-authored 4-tuple guarantee. The 4-corner constraint MUST be enforced at the validator level via `validateViewportPolygon`, and the `data-model.md` MUST document this trade so future reviewers understand it is a conscious delta.

- **FR-021**: The `TimeFilter` shape convention MUST be documented in `data-model.md`: runtime writes `{ start: number | null, end: number | null }`; generated TypeScript emits `{ start?: number, end?: number }` (optional). Consumers use `value != null` checks which accept both `undefined` and `null` — consistent with the existing pattern at `load.ts:109-110`.

- **FR-022**: `shared/components/src/utils/bounds.ts#viewportToBounds` MUST be updated from tuple-indexed coordinate access (`c[0]`, `c[1]`) to object-field access (`c.longitude`, `c.latitude`), AND gain an inline comment flagging that the function is specific to 4-corner polygons and must not be reused on large arrays (because the `Math.min(...lons)` spread would hit V8's argument limit). A targeted unit test MUST assert correct bounds output given object-form coordinates.

**Smoke test coverage**

- **FR-019**: A documented smoke-test set MUST accompany the change, covering: VS Code map panel renders tracks; web-shell map panel renders tracks; viewport persists across reload in both hosts; time filter drag applies to map and timeline and list; three-view-sync (#132) still synchronises selection. These tests MAY be manual with screenshots captured as evidence under `specs/203-spatial-types-linkml/evidence/`.

### Key Entities

- **Coordinate**: A geographic point. Canonical shape: `{ longitude: number, latitude: number }`. Constraints: `longitude ∈ [-180, 180]`, `latitude ∈ [-90, 90]`. Single authoritative definition in LinkML at `shared/schemas/src/linkml/session-state.yaml`.
- **ViewportPolygon**: A geographic area as a 4-corner polygon supporting rotated views. Canonical shape: `{ coordinates: Coordinate[], zoom?: number }` — `zoom` is an optional attribute on the polygon itself (research R-001). Cardinality: exactly 4 coordinates in clockwise `[NW, NE, SE, SW]` order.
- **TimeFilter**: Constraints on the visible time window. Canonical shape: `{ start?: integer | null, end?: integer | null }` — both fields are optional/nullable epoch milliseconds (research R-002). Semantics: `null`/missing start or end means the filter is unbounded on that side.
- **GeoJSON Coordinate Tuple** (boundary type, not stored): `[longitude, latitude]`. Appears only in code that reads, writes, or passes through GeoJSON geometry or Leaflet tuple inputs. Created via `toGeoJSONCoord`, consumed via `fromGeoJSONCoord`. Never used in application state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero hand-authored TypeScript declarations of `Coordinate`, `ViewportPolygon`, or `TimeFilter` remain in the repository after this feature merges. Verified by a grep over the diff and over the post-merge tree.
- **SC-002**: All three schema adherence test categories (golden fixtures, round-trip, schema comparison) pass for the three types after regeneration. `task verify` passes green on the PR.
- **SC-003**: `@debrief/utils` exports `toGeoJSONCoord` and `fromGeoJSONCoord`; their unit tests achieve round-trip identity across the canonical fixture set (minimum 10 coordinates including edge cases). Test file must exist and pass.
- **SC-004**: The VS Code extension and web-shell both load a sample plot, restore viewport across reload, apply time filtering, and maintain three-view-sync — verified by the smoke-test set in FR-019 with screenshot evidence.
- **SC-005**: No user-visible regression in map rendering, viewport restore, or time filtering, as measured by the smoke test and by passing the existing Playwright E2E suites for web-shell and VS Code.
- **SC-006**: Net code deletion: the `shared/components/src/utils/spatial-types.ts` file is removed (-30 lines) and the `Coordinate` / `ViewportPolygon` / `TimeFilter` type declarations in `services/session-state/src/types/*.ts` are removed (-40 lines). Net addition is bounded by the converter helpers and their tests (expected net ≤ +100 lines, with a deletion of ≥ 70 lines of duplication).

## Dependencies

- **Schema regeneration toolchain** (LinkML, `gen-pydantic`, `gen-typescript`, `gen-json-schema`) — already configured in `shared/schemas/`.
- **`@debrief/schemas` as a dependency of `@debrief/components`** — already transitive; this feature formalises direct consumption.
- **`@debrief/utils`** — new exports added; no new external dependencies required.
- **No new runtime dependencies.**

## Parallelisation

This is one of three LinkML-layer items (#203, #204, #205) that all edit `shared/schemas/src/linkml/*.yaml` and regenerate artefacts. Per `docs/ideas/203-spatial-types-linkml.md`:

- If `shared/schemas/src/linkml/` files are modular by concern (which they are — `common.yaml`, `session-state.yaml`, etc.), each LinkML item can land independently.
- Regenerated artefact files (`shared/schemas/generated/...`) WILL conflict if two LinkML PRs land together without a rebase.
- Recommendation: serialise the three items OR coordinate on a clean-rebase merge order. This feature should be mergeable without blocking #204 / #205 provided rebase discipline holds.

Fully parallel with non-LinkML items (#199, #200, #201, #202, #206).

## Assumptions

- **A1**: The canonical form is the object form `{ longitude, latitude }`. This is consistent with the LinkML schema already, and inverting this (making tuples canonical) would require changing the schema and is not in scope.
- **A2**: GeoJSON axis order is `[longitude, latitude]` (per RFC 7946). The converter names and semantics commit to this. Leaflet `LatLng` order is `[latitude, longitude]` — any code interacting with Leaflet directly uses Leaflet's own constructors, not these converters.
- **A3**: `validateCoordinate` / `validateViewportPolygon` are stable utilities with no session-state-specific dependencies and can move to `@debrief/utils` without import cycles.
- **A4**: `SpatialSlice` (with `drawingMode`, `drawingPaletteIndex`, `rotation`) is out of scope for this feature. It stays in `services/session-state` and is updated only to import the canonical `ViewportPolygon`.
- **A5**: `TimeRange`, `TimeInstant`, `TimeStep`, `TemporalSlice`, and other temporal types are out of scope for this feature — they have analogous duplication issues but are tracked separately (or not at all). Only `TimeFilter` is in scope because the idea document explicitly names it.
- **A6**: The default state-persistence migration strategy (FR-018) is "silent in-place migration on load". This is the lowest-friction option for pre-release-scale data; if persisted state has shipped widely, revise in clarification.
- **A7**: Smoke tests for FR-019 are manual with screenshot evidence; converting them to automated E2E is out of scope and can be follow-up work.

## Out of Scope

- Changes to `SpatialSlice`, `TemporalSlice`, `TimeRange`, `TimeInstant`, `TimeStep`, or `DrawingMode` shapes.
- A lint rule to prevent hand-rolled tuple conversions (see FR-017 — social enforcement only).
- Changing Leaflet-boundary code to use these converters in places where it currently uses Leaflet's own `L.latLng` constructor.
- Python-side converter helpers (`to_geojson_coord` / `from_geojson_coord`). Python consumers use Pydantic models with named attributes; tuple form only appears in GeoJSON payloads which `debrief-io` handles at its own boundary.
- Retroactive cleanup of every existing hand-rolled tuple conversion in the codebase — FR-016 requires an audit and replacement of call sites touched by this change, not an exhaustive sweep.
- Refactoring `viewportToBounds` to use for-loop accumulators (latent `Math.min(...lons)` scaling trap). We add a code comment flagging the constraint but defer the rewrite.
- Removing `TimeFilter` from `session-state-py`'s public re-exports. Nothing consumes it today; the surface-area cleanup is a follow-up item, not a blocker.

## Follow-up Work (not backlog entries, captured here for traceability)

The review surfaced four candidate follow-up items. They are NOT being added to `BACKLOG.md`; they are documented here so that the spec remains the single place to discover them.

1. **Python converter helpers (`to_geojson_coord` / `from_geojson_coord`)** — add symmetric Python helpers to `@debrief/utils`-equivalent Python utility package if/when a concrete call site emerges. Blocked on: a Python boundary-crossing consumer that benefits from named converters. No action until then.
2. **ESLint rule forbidding hand-rolled `[coord.longitude, coord.latitude]` tuple construction** — an AST rule that nudges developers toward `toGeoJSONCoord` at the lint layer. Complements FR-017's social enforcement. No action until we see hand-rolled patterns reappear in review.
3. **Delete the `coerceViewport` legacy-tuple migration branch** — once all production session files have been saved under `SCHEMA_VERSION = '1.1.0'`, remove the tuple-detection branch from `coerceViewport` and (optionally) the whole helper if shape coercion is no longer needed. Timing: suggest a follow-up review window after v4.0.0 release.
4. **Remove `TimeFilter` from `services/session-state-py`'s public API** — currently re-exported at `services/session-state-py/src/debrief_session/__init__.py:18,33` and `types.py:22,32`. No consumer; surface-area cleanup only. Could be done opportunistically on the next `session-state-py` touch.
