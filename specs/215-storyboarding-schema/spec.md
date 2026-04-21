# Feature Specification: Storyboarding — Schema + CRUD Core

**Feature Branch**: `215-storyboarding-schema`
**Created**: 2026-04-20
**Status**: Draft — ready for quality-checklist validation
**Parent Epic**: #024 Storyboarding Briefings — [idea doc](../../docs/ideas/017-storyboarding-briefings.md)
**Sibling Specs**: #215 (this), #216 (capture), #217 (panel + playback), #218 (edit suite + housekeeping)
**Input**: First of four sibling specs splitting epic #024. This slice delivers the headless foundation.

## Summary

This spec delivers the **schema-first foundation** for the Storyboarding
epic: LinkML master models for `Storyboard`, `Scene`, `Viewport`, and
`HistoryEntry`; their generated Pydantic, JSON Schema, and TypeScript
bindings; and a **shared TypeScript CRUD module** at
`shared/components/storyboard/` that enforces every schema invariant —
ordering, duplicate-timestamp rejection, `feature_set_hash` computation,
missing-data detection, provenance append-only — *without any UI*.

No capture shortcut, no panel, no playback. Downstream specs (#216, #217,
#218) consume this module as their backing data layer. Shipping this slice
in isolation is valuable because it unblocks every follow-up spec in
parallel and lands the Article II schema adherence tests that every later
PR will depend on.

## Clarifications

### Session 2026-04-20 (post-plan review)

- **Q**: Should Storyboard and Scene Features use `properties["debrief:type"]`
  as the discriminator, or the existing in-plot `kind` pattern?
  **A**: Use `kind: STORYBOARD` and `kind: STORYBOARD_SCENE`, extending
  `FeatureKindEnum`. The `debrief:` prefix is reserved for STAC
  `item.properties` (per #125); in-plot Features use the canonical
  `BaseFeatureProperties.kind` discriminator. FR-SCHEMA-003 updated
  accordingly.
- **Q**: Should Storyboards/Scenes carry their own `history[]` + author/
  timestamp fields, or use the existing inherited `provenance: LogEntry[]`
  slot on `BaseFeatureProperties`?
  **A**: Use the inherited `provenance: LogEntry[]` slot (Article III
  single-surface provenance). Drop the proposed `HistoryEntry`,
  `created_by`, `last_modified_by`, `last_modified_at` fields. The Analysis
  Log (#176) already reads `LogEntry`, so this unifies consumers.
  `LogEntry` gains an optional `agent` slot to carry the human actor;
  the 10 storyboard CRUD ops are encoded via `WasGeneratedBy.tool =
  "storyboard-crud"` + `WasGeneratedBy.parameters.op`.
- **Q**: Is the CRUD module allowed to be asynchronous?
  **A**: Yes — Web Crypto's `subtle.digest` is async, so any op that
  (re)computes `feature_set_hash` MUST return a `Promise`. All
  mutation ops become async for a consistent API; pure queries stay
  sync.
- **Q**: What is the concrete scope boundary with Py→JSON→TS→JSON→Py
  round-trip testing, perf benchmarking, and hash canonicalisation?
  **A**: All three are in scope for #215 (moved from "deferred" into
  the core slice). The cross-language round-trip harness is an Article
  II gate that has to land with the schema, not after.

## User Scenarios & Testing *(mandatory)*

This spec's "users" are the **downstream specs and their developers** —
the module is headless. Each scenario is independently testable with
unit / adherence tests, with no UI required.

### User Story 1 — Schema round-trips cleanly across Python and TypeScript (Priority: P1)

A downstream developer (or a generated-code consumer) reads and writes
Storyboard and Scene Features. The LinkML-generated bindings must
preserve every field end-to-end through Python → JSON → TypeScript →
JSON → Python with no drift.

**Why this priority**: This is the Article II gate. Without passing
round-trip, no downstream spec can build on the schema with confidence.

**Independent Test**: Load each golden fixture under
`shared/schemas/fixtures/` into Pydantic, dump to JSON, load into
TypeScript, dump to JSON, load back into Pydantic — assert the final
object equals the original for every field including nested `viewport`,
ordered `history[]`, and order-insensitive `visible_feature_ids`.

**Acceptance Scenarios**:

1. **Given** a valid Storyboard + Scene fixture, **When** the round-trip
   harness runs end to end, **Then** the final deserialised object is
   equal to the original on every field.
2. **Given** an invalid fixture (e.g. duplicate Scene timestamps,
   non-null `time_range` in v1, bearing ≠ 0, orphan Scene), **When** the
   fixture is loaded by either binding, **Then** validation rejects the
   fixture with an error that names the violated invariant.
3. **Given** the LinkML sources, **When** the Pydantic-generated JSON
   Schema and the LinkML-generated JSON Schema are compared, **Then**
   they are field-for-field equal.

---

### User Story 2 — CRUD module enforces all invariants at the module boundary (Priority: P2)

A downstream caller uses the shared TypeScript module to create, read,
update, and delete Storyboards and Scenes. The module rejects invalid
operations at its boundary, not in the UI or in the persistence layer
below.

**Why this priority**: Centralising invariant enforcement at the module
boundary is what lets downstream UI specs stay thin. Without it, each
consuming spec has to re-implement the rules.

**Independent Test**: Drive the module from a test harness (no UI)
through every public operation — `createStoryboard`, `createScene`,
`updateScene`, `deleteScene`, `duplicateScene`,
`copySceneToOtherStoryboard`, `listScenesOrdered` — and assert that:
(a) valid calls mutate the in-memory FeatureCollection as expected, (b)
invalid calls throw with a stable, machine-inspectable error code, (c)
invariants (ordering, duplicate rejection, hash recomputation,
provenance append) are maintained after every call.

**Acceptance Scenarios**:

1. **Given** a Storyboard with Scenes at timestamps `t1 < t2 < t3`,
   **When** `listScenesOrdered` is called, **Then** it returns the
   Scenes in ascending-timestamp order regardless of insertion order.
2. **Given** a Scene at timestamp `t`, **When** `createScene` is called
   with the same `storyboard_id` and the same `t`, **Then** the module
   raises a `DuplicateTimestamp` error carrying the conflicting Scene's
   `id` so the caller can surface a Replace / Offset / Cancel prompt.
3. **Given** any mutation call (`updateScene`, `deleteScene`,
   `duplicateScene`, `copySceneToOtherStoryboard`), **When** the call
   succeeds, **Then** the target Feature's
   `last_modified_{by,at}` are updated and exactly one `HistoryEntry` is
   appended with the correct `op` value.
4. **Given** a call to `copySceneToOtherStoryboard`, **When** it
   succeeds, **Then** the new Scene has a fresh `id`, the destination
   `storyboard_id`, and a `thumbnail_asset_ref` pointing to a **deep
   copy** of the source asset (not the same reference).

---

### User Story 3 — Missing-data detection is accurate and side-effect-free (Priority: P3)

The module exposes a pure query — `detectMissingDataForScene(scene,
plotFeatures, plotTimeRange)` — that classifies each Scene as *ok*,
*missing-features*, or *out-of-range*. Downstream UI specs use this
query to drive their hard-block prompts; the query itself does not
mutate anything.

**Why this priority**: The missing-data hard-block is shared between
playback (#217) and edit (#218). Centralising the detection keeps both
consumers aligned on one definition.

**Independent Test**: Feed the query a matrix of Scenes (fully resolving
/ partially resolving / outside time range) and a fixture plot; assert
the returned classification and the list of missing feature IDs without
mutating any input.

**Acceptance Scenarios**:

1. **Given** a Scene whose `visible_feature_ids` all resolve and whose
   `timestamp` is inside the plot time range, **When** the detector
   runs, **Then** it returns `ok`.
2. **Given** a Scene with one or more unresolved `visible_feature_ids`,
   **When** the detector runs, **Then** it returns `missing-features`
   together with the list of unresolved IDs.
3. **Given** a Scene whose `timestamp` is outside the plot time range,
   **When** the detector runs, **Then** it returns `out-of-range`.
4. **Given** the detector is invoked, **When** it returns, **Then**
   neither the Scene nor the plot argument has been mutated in any way.

---

### Edge Cases

- **Non-null `time_range`** in schema v1 is rejected by the schema
  (reserved slot); the module surfaces this as a validation error.
- **`viewport.bearing` ≠ 0** in v1 is rejected by the schema.
- **Orphan Scene** (unknown `storyboard_id`) is rejected by both
  schema-level cross-reference validation and module-level CRUD.
- **Antimeridian-crossing viewport** produces a best-effort Polygon in
  MVP; the module emits a warning through its logger but does not
  throw. (MultiPolygon splitting is deferred — out of scope.)
- **`feature_set_hash` mismatch** at read time is a **non-fatal** signal
  — the module returns the Scene with a `stale` boolean and leaves the
  decision to the consumer.
- **Deep-copy of thumbnail asset** in `copySceneToOtherStoryboard` must
  succeed before the destination Scene is persisted; if the deep copy
  fails, the whole op rolls back.

## Requirements *(mandatory)*

### Functional Requirements

All FRs in this spec concern the schema and the headless module. No UI
FRs appear here; those live in #216–#218.

- **FR-SCHEMA-001**: System MUST define `Storyboard`, `Scene`,
  `Viewport`, and `HistoryEntry` in the LinkML master schema under
  `shared/schemas/`.
- **FR-SCHEMA-002**: System MUST generate Pydantic, JSON Schema, and
  TypeScript bindings from those LinkML sources via the existing
  generation pipeline.
- **FR-SCHEMA-003**: Storyboard and Scene instances MUST be standard
  GeoJSON Features (`type: "Feature"`) carrying the inherited
  `properties.kind` discriminator from `BaseFeatureProperties`, with
  values `STORYBOARD` and `STORYBOARD_SCENE` respectively. Both values
  MUST be added to `FeatureKindEnum` in `common.yaml`. *(Updated per
  2026-04-20 clarification: the previous `properties["debrief:type"]`
  encoding was withdrawn to match the established in-plot pattern.)*
- **FR-SCHEMA-003a**: Storyboard and Scene property classes MUST
  inherit from `BaseFeatureProperties`, picking up the existing
  `provenance: LogEntry[]` append-only slot. Every CRUD mutation MUST
  append exactly one `LogEntry` to `provenance[]` with
  `was_generated_by.tool = "storyboard-crud"` and
  `was_generated_by.parameters.op` set to the relevant op value
  (`create`, `rename`, `describe`, `delete`, `restore`,
  `update-to-current`, `duplicate`, `copy-in`, `insert-middle`,
  `refresh-thumbnail`). The human actor is carried by a new optional
  `agent: string` slot on `LogEntry`. No separate `history[]`,
  `created_by`, `last_modified_by`, or `last_modified_at` fields are
  defined.
- **FR-SCHEMA-004**: The schema MUST reject any Scene with a non-null
  `time_range` in schema version 1 (reserved slot).
- **FR-SCHEMA-005**: The schema MUST reject any Scene with
  `viewport.bearing` ≠ 0 in schema version 1 (reserved slot).
- **FR-SCHEMA-006**: The schema MUST reject two Scenes with the same
  `timestamp` within the same Storyboard.
- **FR-SCHEMA-007**: The schema MUST reject any Scene whose
  `storyboard_id` does not reference an existing Storyboard within the
  same plot FeatureCollection.
- **FR-SCHEMA-008**: Storyboard Features MUST carry a `schema_version`
  integer (starting at `1`) to support forward migrations.
- **FR-SCHEMA-009**: The system MUST pass all three Article II
  adherence tests: golden fixtures (at least the seven cases named in
  *Key Entities → Schema-first obligations*), Python↔TypeScript
  round-trip, and Pydantic-generated-vs-LinkML-generated JSON Schema
  equality.

- **FR-MODULE-010**: System MUST provide a shared TypeScript module at
  `shared/components/storyboard/` exposing a stable public API for
  Storyboard/Scene CRUD that consumes and returns plain GeoJSON
  Features (not UI-framework-bound objects).
- **FR-MODULE-011**: The module MUST expose at minimum:
  `createStoryboard`, `renameStoryboard`, `deleteStoryboard` (cascading
  to Scenes), `createScene`, `updateScene`, `deleteScene`,
  `duplicateScene`, `copySceneToOtherStoryboard`,
  `listScenesOrdered(storyboardId)`, `getActiveStoryboardDefault
  (plotFeatures)`, and `detectMissingDataForScene(scene, plotFeatures,
  plotTimeRange)`.
- **FR-MODULE-012**: On every successful CRUD mutation the module MUST
  append exactly one `LogEntry` to the target Feature's inherited
  `provenance[]` slot, with `was_generated_by.tool =
  "storyboard-crud"`, `was_generated_by.parameters.op` set to the
  relevant op value, and `agent` set to the caller-supplied actor
  string. "Created-by / last-modified-by / last-modified-at" are
  derived at read time from the first/last `provenance` entry; they
  are NOT stored as separate slots.
- **FR-MODULE-013**: `listScenesOrdered` MUST return Scenes sorted by
  `timestamp` ascending; no explicit `order` field is consulted or
  written.
- **FR-MODULE-014**: On duplicate-timestamp conflicts the module MUST
  raise a typed error (`DuplicateTimestamp`) carrying the conflicting
  Scene's `id`, and MUST NOT perform the write.
- **FR-MODULE-015**: `copySceneToOtherStoryboard` MUST produce a new
  Scene with a fresh ULID `id`, the destination `storyboard_id`, and a
  thumbnail asset reference that points to a deep-copied asset distinct
  from the source's. If the deep copy fails, the op MUST roll back
  atomically (no partial write).
- **FR-MODULE-016**: The module MUST compute `feature_set_hash` as a
  deterministic hash of the **canonicalised** `visible_feature_ids`
  (trim whitespace on each ID, reject empty strings, dedupe, sort
  lexicographically) on every create/update that touches
  `visible_feature_ids`. SHA-256 hex, lowercase, 64 chars. The hash
  function is async (Web Crypto `subtle.digest`).
- **FR-MODULE-017**: `detectMissingDataForScene` MUST be pure — it MUST
  NOT mutate the Scene, the plot features, or the plot time range — and
  MUST return one of `ok`, `missing-features` (with the list of
  unresolved IDs), or `out-of-range`.
- **FR-MODULE-018**: The module MUST NOT depend on React, VS Code
  APIs, or any other UI framework at its core. (React bindings for
  downstream specs may live in a sibling sub-module but MUST NOT be on
  the core-module path.)
- **FR-MODULE-019**: The module MUST run a plot-open migration hook
  keyed on `schema_version`; the v1 hook is a no-op but MUST be wired
  so later versions can register migrations without touching the load
  path.
- **FR-MODULE-020**: `provenance[]` arrays MUST be treated as
  append-only by the module — existing entries are never mutated or
  removed by any public operation.
- **FR-MODULE-021**: Every mutation op MUST return a `Promise` (Web
  Crypto is async; the API is async-first for consistency). Pure
  queries (`listScenesOrdered`, `get*`, `detectMissingDataForScene`,
  `validatePlot`, `runPlotOpenMigrations`) remain synchronous.
- **FR-MODULE-022**: The module MUST use `immer.produce(…)` for
  structural sharing on every mutation; unmodified Features MUST be
  reference-equal across input and output FeatureCollections (tested
  invariant).
- **FR-TEST-023**: The spec MUST land a Python → JSON → TypeScript →
  JSON → Python round-trip harness covering at least the two valid
  single-Feature fixtures (Article II SC-001 gate). Implementation
  via pytest invoking a Node subprocess that parses + re-serialises
  through the generated TypeScript models.
- **FR-TEST-024**: The spec MUST land a Vitest performance benchmark
  (`shared/components/src/storyboard/__tests__/perf.bench.ts`)
  measuring `createScene`, `updateScene`, and
  `copySceneToOtherStoryboard` p95 latency on synthetic plots of
  100, 1 000, 10 000, and 100 000 total position reports. Target:
  **p95 < 10 ms at 100k positions** on the CI runner.

### Key Entities *(schema-first; authoritative)*

This section is the **authoritative definition** for the whole epic.
Sibling specs (#216, #217, #218) reference this section rather than
re-defining the entities.

Storyboards capture an analyst's narrated walk-through of a plot. The
data model is schema-first (Article II): both entities below are added
to the LinkML master schema under `shared/schemas/` and generate
Pydantic, JSON Schema, and TypeScript bindings via the existing
pipeline. Both entities are carried as standard **GeoJSON Features**
inside the plot's FeatureCollection, so they round-trip through the
existing plot-edit path with no STAC API changes.

#### Entity 1 — Storyboard (parent Feature)

**Purpose**: A named, ordered collection of Scenes attached to a single
plot. A plot can carry multiple Storyboards; none are "active" on disk
— active selection is an ephemeral UI concern handled by #217.

**GeoJSON shape**:
- `type`: `"Feature"`
- `geometry`: `Polygon` — computed hull covering the union of child
  Scene viewport bounds. Recomputed whenever the Scene set changes.
- `properties.kind`: `STORYBOARD` (inherited discriminator)

**Attributes** (all on `properties`):

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `kind` | `STORYBOARD` | yes | Inherited from `BaseFeatureProperties`. |
| `id` | ULID string | yes | Stable identifier; survives renames and re-imports. |
| `name` | string | yes | Display title (unique within a plot). |
| `description` | markdown string | no | Rendered in the panel; also available to downstream briefing renderers. |
| `schema_version` | integer | yes | Migration vector. Starts at `1`. |
| `tags` | string[] | no | Inherited from `BaseFeatureProperties`. |
| `provenance` | `LogEntry[]` | yes | Inherited from `BaseFeatureProperties`. Append-only. Each CRUD op appends one entry; first entry's timestamp is `created_at`, last entry's is `last_modified_at`, `agent` field identifies the actor. |

**Invariants**:
- `name` is unique within the owning plot's FeatureCollection.
- `id` is immutable after creation.
- `schema_version` is monotonically non-decreasing across edits.
- The parent Storyboard Feature is **not rendered on the map** (panel-
  only entity); this is enforced by the rendering layer in #217, not by
  the schema.

---

#### Entity 2 — Scene (child Feature)

**Purpose**: A single captured moment in a Storyboard — the analyst's
map viewport, timestamp, and per-feature visibility at capture time,
plus a thumbnail.

**GeoJSON shape**:
- `type`: `"Feature"`
- `geometry`: `Polygon` — the map viewport bounds at capture time.
- `properties.kind`: `STORYBOARD_SCENE` (inherited discriminator)

**Attributes** (all on `properties`):

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `kind` | `STORYBOARD_SCENE` | yes | Inherited from `BaseFeatureProperties`. |
| `id` | ULID string | yes | Stable identifier. |
| `storyboard_id` | ULID string | yes | Foreign key → `Storyboard.id`. |
| `title` | string | yes | Defaults to DTG of `timestamp` in `DDHHmmZ MMM YY`; falls back to ISO-8601. |
| `description` | markdown string | no | Optional per-scene narrative. |
| `viewport` | `Viewport` sub-record | yes | Camera state. |
| `timestamp` | ISO-8601 instant | yes | Drives Scene ordering. |
| `time_range` | `{start, end}` or `null` | no | **Reserved** — MUST be `null` in v1. |
| `visible_feature_ids` | array of stable feature IDs | yes | IDs visible at capture. Canonicalised (trim, dedupe, sort) before hashing. |
| `feature_set_hash` | string | yes | SHA-256 hex of canonicalised `visible_feature_ids`. |
| `thumbnail_asset_ref` | STAC asset reference | yes | Populated by #216 at capture time via #174. |
| `transition_duration_ms` | integer | yes | Playback override. Default `500`. |
| `tags` | string[] | no | Inherited from `BaseFeatureProperties`. |
| `provenance` | `LogEntry[]` | yes | Inherited from `BaseFeatureProperties`. Append-only. CRUD ops append one entry per mutation; first = created, last = last-modified. |

**Invariants**:
- `timestamp` unique within a Storyboard.
- Ordering is **derived** from `timestamp` ascending — no explicit
  `order` field exists.
- `feature_set_hash` matches a recomputation over sorted
  `visible_feature_ids` at persist time.
- `time_range` MUST be `null` in schema v1.
- `viewport.bearing` MUST be `0` in schema v1.

---

#### Sub-Entity — Viewport

| Attribute | Type | Required | Notes |
|-----------|------|----------|-------|
| `center` | `[lon, lat]` | yes | Longitude / latitude. |
| `zoom` | float | yes | Leaflet-compatible. |
| `bearing` | float | yes | MUST be `0` in v1. |

#### Provenance encoding — how CRUD ops map to `LogEntry`

The inherited `provenance: LogEntry[]` slot carries one `LogEntry` per
CRUD mutation. Encoding:

| `LogEntry` field | Value for storyboard CRUD ops |
|------------------|--------------------------------|
| `activity_id` | fresh UUID v4 for each op |
| `timestamp` | ISO-8601 instant when the op ran |
| `agent` (NEW optional slot) | Actor string (e.g. `"alice"`) |
| `was_generated_by.tool` | `"storyboard-crud"` |
| `was_generated_by.tool_version` | `"1.0.0"` (semver of this spec) |
| `was_generated_by.parameters.op` | one of: `create`, `rename`, `describe`, `delete`, `restore`, `update-to-current`, `duplicate`, `copy-in`, `insert-middle`, `refresh-thumbnail` |
| `was_generated_by.parameters.summary` | one-liner for the Analysis Log (#176) |
| `used` | source feature IDs (empty for `create`; source scene for `duplicate`/`copy-in`) |
| `generated` | output feature IDs (the Storyboard or Scene id) |
| `execution_duration` | `PT0S` (CRUD is effectively instantaneous) |
| `rationale` | free-text analyst annotation (optional) |

---

#### Schema-first obligations (Article II)

The LinkML source and generated artefacts MUST satisfy all three
adherence tests:

1. **Golden fixtures** under `shared/schemas/fixtures/` covering at
   least: minimal valid, full-featured valid, duplicate-timestamp
   invalid, missing-thumbnail invalid (for consumers — enforced by
   #216), bearing ≠ 0 invalid, non-null `time_range` invalid, orphan
   Scene invalid.
2. **Round-trip** Python → JSON → TypeScript → JSON → Python preserves
   every field.
3. **Schema comparison** — Pydantic-generated JSON Schema equals
   LinkML-generated JSON Schema field-for-field.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 — Lossless round-trip.** **100%** of golden fixtures
  round-trip through Python ↔ TypeScript with zero field drift (byte-
  for-byte equality after normalised JSON formatting).
- **SC-002 — Schema comparison matches.** Pydantic-generated and
  LinkML-generated JSON Schemas are **field-for-field identical**.
- **SC-003 — Invariant coverage.** **100%** of the invariants named in
  *Key Entities* are exercised by at least one positive test (valid
  case passes) and one negative test (invalid case rejected with a
  stable error).
- **SC-004 — Module boundary integrity.** **0%** of invariant-violating
  module calls succeed; all are rejected with a typed error before any
  mutation is applied.
- **SC-005 — Atomicity of compound ops.** `duplicateScene`,
  `copySceneToOtherStoryboard`, and `deleteStoryboard` (cascade) are
  tested under injected mid-op failure — in **100%** of injected-
  failure runs the FeatureCollection is left unchanged (no partial
  write).
- **SC-006 — Missing-data detector is side-effect-free.** **100%** of
  detector calls leave all inputs byte-identical to their pre-call
  state (verified by deep-equal on inputs before and after).
- **SC-007 — Migration hook wired.** The plot-open migration hook is
  invoked on **100%** of plot-opens that contain at least one
  Storyboard, and is a no-op at schema version 1 (no observable
  mutations, no errors).
- **SC-008 — No UI coupling in core.** The core module compiles and
  tests pass with React, VS Code extension API, and Leaflet as missing
  / unresolved peer imports.
- **SC-009 — Offline.** Every adherence test and module test passes
  with networking disabled (Article I).

## Assumptions

- **ID scheme**: ULID for both Storyboard and Scene `id`.
- **DTG format**: `DDHHmmZ MMM YY` (ZULU); the DTG formatter helper
  lives in the module and is consumed by #216.
- **Zoom precision**: float (Leaflet-native) — the schema does not
  force an integer.
- **Article IV narrow exception**: the shared TS module at
  `shared/components/storyboard/` is a deliberate departure from the
  Python-services pattern because storyboard data is pure GeoJSON-
  Feature round-trip with no domain logic. Full justification will
  appear in the Constitution Check of this spec's `plan.md`.
- **`time_range` and `bearing` reserved slots**: encoded in v1 as
  required-null / required-0 so future v2 schemas can relax them
  without a breaking migration.

## Dependencies

- **LinkML generation pipeline** under `shared/schemas/` (hard) — the
  single source-of-truth for Pydantic / JSON Schema / TS bindings.
- **Stable feature IDs across sessions** (hard) — Scenes reference
  plot features by stable ID. The plot-edit path must preserve IDs
  across save/reload; this is an existing invariant, not something
  this spec establishes.
- **Plot save/dirty-state mechanism** (hard, indirect) — the module
  produces mutations on a FeatureCollection that the host is expected
  to mark dirty; the module does not call save itself.

## Out of Scope

Everything UI-facing lives in sibling specs:

- **Capture shortcut, first-capture quick-pick, synchronous thumbnail
  integration** → #216.
- **Storyboard panel, Scene list, dropdown, transport buttons / arrow
  keys, on-map Scene rectangles, `flyTo` + time-slider tween, scrub-
  window lock, missing-data hard-block prompt** → #217.
- **Inline rename, markdown description editor, delete-with-toast-
  undo, update-to-current, duplicate, copy-to-other-storyboard UI
  affordance, stale-thumbnail badge + refresh button, Analysis Log
  (#176) integration** → #218.
- **Dedicated distraction-free briefing renderer**, animated time-
  range Scenes, antimeridian MultiPolygon splitting, Storyboard
  sharing / real-time collaboration, video export → deferred / phase-
  2 (same as parent epic).
