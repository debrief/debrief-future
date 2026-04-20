# Research: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Date**: 2026-04-20

## Scope

Seven research questions must be resolved before Phase 1 design can
proceed. The spec itself (#215) already records the high-level "what";
this file records the "how" and the rejected alternatives.

---

## R1: LinkML module organisation — single file vs per-entity files

### Decision

Put all four entities (`Storyboard`, `Scene`, `Viewport`,
`HistoryEntry`) in a **single new module** at
`shared/schemas/src/linkml/storyboard.yaml`, imported from `debrief.yaml`.

### Rationale

- Matches the existing one-module-per-domain pattern:
  `stac-extension.yaml`, `session-state.yaml`, `log-entry.yaml` each
  hold multiple related classes in a single file.
- `Viewport` and `HistoryEntry` are sub-records of `Scene` /
  `Storyboard`; splitting them into separate files would create
  unnecessary cross-file imports for a tightly coupled cluster.
- Aligns with Article IX: minimise dependency surface. One YAML file =
  one generator pass.

### Alternatives considered

1. **Per-entity YAML files (`scene.yaml`, `storyboard.yaml`, …)** —
   rejected as over-granular; the four entities are one aggregate.
2. **Fold into `geojson.yaml`** — rejected because Storyboarding is a
   distinct domain with its own provenance + reserved-slot invariants
   not shared with track/reference features.

---

## R2: Non-null `time_range` and `bearing ≠ 0` — encoding the reserved slots in LinkML

### Decision

Encode both reserved slots as **LinkML structural constraints** that
reject non-reserved values at schema-validation time:

- `time_range`: declared as a slot whose range is a `TimeRange` class
  but with `required: false`, `value_presence: ABSENT`. (Equivalent to
  "MUST be null / absent in v1".)
- `viewport.bearing`: declared as `float`, `required: true`,
  `equals_number: 0`.

If LinkML's `equals_number` does not carry through all three
generators cleanly (Pydantic, JSON Schema, TS), fall back to:

- `minimum_value: 0`, `maximum_value: 0` on `bearing` (covers all
  three);
- a `pattern` constraint on a string-formatted `time_range` field that
  only matches `null`, paired with a `value_presence: ABSENT`
  declaration.

The Python-side model additionally carries a `@field_validator`
enforcing both invariants — redundancy is intentional (Article II.2:
schema tests are mandatory; we want both the schema *and* the model to
reject the same invalid input).

### Rationale

- `equals_number` and `equals_string` are the canonical LinkML
  mechanism for reserved-value slots; they are already used in
  `geojson.yaml` (e.g. `equals_string: "Point"`).
- The min=max=0 fallback is portable to every generator we use and
  mirrors how other tools encode "reserved-zero" fields.
- Double enforcement (schema + Pydantic validator) matches Article II's
  intent: the schema is the contract, and the generated models are the
  *proof* the contract holds.

### Alternatives considered

1. **Encode as `null` only in documentation, enforce in code** —
   rejected, violates Article II (schema must be the contract).
2. **Use `any_of` with `null`** — rejected because it signals "allowed
   variant" rather than "reserved slot"; a future v2 that permits
   non-null becomes ambiguous to diff against v1.

---

## R3: Cross-reference validation — "Scene.storyboard_id must point at a Storyboard in the same plot"

### Decision

Cross-reference validation lives at **two layers**, not at the LinkML
layer alone:

1. **Schema layer (weak, per-feature)**: each Scene's
   `properties.storyboard_id` is a ULID string (`pattern:
   ^[0-9A-HJKMNP-TV-Z]{26}$`). LinkML validates shape, not reference
   resolution.
2. **Module layer (strong, per-FeatureCollection)**: every mutation
   through the TS CRUD module verifies that the referenced
   `storyboard_id` exists in the provided plot FeatureCollection.
   Orphan Scenes raise `OrphanScene` with the unresolved ID.

A third-layer **plot-save validator** (invoked at save time) will run
the same check plus a "no unreferenced Storyboard" sweep. That
validator ships in this spec as a pure function (`validatePlot`) but
its wiring into the save path belongs to the host (VS Code extension,
#216–#218).

### Rationale

- LinkML cannot validate across entities in a multi-feature collection
  (each Feature is validated in isolation).
- Catching orphan references at the module boundary prevents persisted
  corruption (FR-SCHEMA-007 + FR-MODULE-014 satisfied).
- Providing a pure `validatePlot` function lets consumers run the same
  check at save time without duplicating logic.

### Alternatives considered

1. **LinkML-only validation (single-feature)** — rejected; cannot
   verify cross-feature references.
2. **Module-only validation** — rejected; a malicious or corrupt
   FeatureCollection loaded from disk without going through the module
   would bypass the check.

---

## R4: `feature_set_hash` algorithm

### Decision

- **Algorithm**: SHA-256 of the UTF-8 encoding of
  `JSON.stringify(sortedIds)` where `sortedIds` is the
  `visible_feature_ids` array sorted lexicographically (ASCII).
- **Output encoding**: lowercase hex, full 64-char string.
- **Storage**: stored in `properties.feature_set_hash` on the Scene
  Feature.
- **Recomputation trigger**: any `createScene`, `updateScene` (when
  `visible_feature_ids` is in the patch), or `duplicateScene` call.

### Rationale

- SHA-256 is available in both Node (`crypto.subtle`) and the browser
  (`crypto.subtle.digest`) — no third-party dependency.
- Sort-then-hash is order-insensitive, matching the spec's "order-
  insensitive `visible_feature_ids`" invariant.
- Full-length hex is a defensive choice: a future collision-finding
  attack on a truncated prefix would corrupt the stale-detection path.
- Consumers compare by string equality — no cryptographic guarantees
  required beyond determinism and low collision probability.

### Alternatives considered

1. **FNV-1a 64-bit** — rejected; faster but higher collision
   probability and no browser-stdlib path.
2. **MD5** — rejected; deprecated hash family, collision risk higher,
   no tangible speed benefit.
3. **Stable JSON stringify with canonicalised whitespace** — rejected
   as overkill; the input is a bare string array, not a structured
   object.

---

## R5: Atomicity of compound operations (duplicate, copy, cascade delete)

### Decision

Compound operations MUST be **all-or-nothing** with respect to the
FeatureCollection:

- Implement each compound op as a **staging + commit** pair:
  1. Build the full new-state FeatureCollection in a local variable
     (deep-cloned from the input at call time).
  2. If any step throws (deep-copy failure, hash computation, history
     append, orphan reference), discard the staging variable and
     rethrow — the caller's FeatureCollection remains byte-identical
     to its pre-call state.
- The module **never mutates the input FeatureCollection in place**.
  All public ops return a new object; callers are responsible for
  swapping references (matching the React / Zustand idiom downstream
  specs will use).

### Rationale

- SC-005 demands 100% atomicity under injected mid-op failure. In-
  place mutation with try/finally rollback is error-prone; immutable
  staging is the simpler, testable pattern.
- Immutability matches how downstream consumers (#217 Zustand store)
  will observe state — a new object reference is what triggers
  rerender.
- Deep-clone cost is negligible at expected scale (≤ 500 Features per
  plot).

### Alternatives considered

1. **In-place mutation + rollback on error** — rejected; brittle under
   partial failure, requires tracking undo log for every field touched.
2. **Copy-on-write Feature proxies** — rejected; adds complexity for no
   observable benefit at this scale.

---

## R6: Migration hook contract

### Decision

Expose `runPlotOpenMigrations(plot, registry)` as part of the public
API:

- `registry` is a `Map<number, MigrationFn>` keyed by target
  `schema_version`. The v1 migration is registered as a **no-op**
  function that returns the plot unchanged.
- Called by the host (VS Code extension, web-shell) once per plot-
  open, after parse and before any CRUD call.
- Contract: each registered migration takes a `FeatureCollection` at
  version N-1 and returns one at version N. The runner chains them in
  order.
- The hook is **invoked even when there are no Storyboards** in the
  plot, so that future migrations that *introduce* Storyboards have a
  consistent entry point.

### Rationale

- A registry-based hook is the minimum-viable extension point that
  satisfies FR-MODULE-019 without over-engineering.
- Keeping v1 as a no-op but wired means the first real migration (v2)
  won't require touching the load path — SC-007 is achievable without
  speculative code.
- A `Map<number, fn>` registry is trivially unit-testable: pass a
  stub map with a spy function.

### Alternatives considered

1. **File-based migration discovery (auto-register everything under
   `migrations/`)** — rejected as premature; we have one version.
2. **Implicit migration chained from `schema_version` comparison with
   no registry** — rejected; harder to test and to unregister a
   migration for targeted testing.

---

## R7: Error vocabulary — stable machine codes

### Decision

Ship a `StoryboardError` base class with nine typed subclasses carrying
a stable `code` string (for I18N and testability — Article XI):

| Code | When thrown | Carries |
|------|-------------|---------|
| `DuplicateTimestamp` | `createScene` / `updateScene` collides with an existing Scene in the same Storyboard | `conflictingSceneId`, `timestamp` |
| `OrphanScene` | Scene references a non-existent Storyboard | `sceneId`, `storyboardId` |
| `UnknownStoryboard` | Any op with a `storyboardId` not in the plot | `storyboardId` |
| `UnknownScene` | `updateScene` / `deleteScene` / `duplicateScene` / `copySceneToOtherStoryboard` with a `sceneId` not in the plot | `sceneId` |
| `ReservedSlotViolation` | `time_range` not null **or** `viewport.bearing ≠ 0` at create/update time | `field`, `value` |
| `DuplicateStoryboardName` | `createStoryboard` / `renameStoryboard` collides with an existing Storyboard in the same plot | `name`, `conflictingStoryboardId` |
| `ThumbnailDeepCopyFailed` | `copySceneToOtherStoryboard` cannot deep-copy the thumbnail asset | `cause` (wrapped error) |
| `SchemaMigrationFailed` | `runPlotOpenMigrations` hits an error | `fromVersion`, `toVersion`, `cause` |
| `InvariantViolation` | Catch-all for internal invariant failures (should never be thrown; indicates a module bug) | `detail` |

Each subclass inherits `code: string` (assigned in its constructor) and
`name: string` equal to the subclass name. Consumers match on `code`,
not on `instanceof`, to survive bundler-level name mangling.

### Rationale

- Stable string codes survive minification and bundle merging.
- I18N-friendly: UI layers (#217/#218) translate codes to locale-
  specific messages; this module does not embed user-facing strings.
- Enumerable at compile time — TS `const` enum + discriminated union.

### Alternatives considered

1. **Single `StoryboardError` with a `code` field, no subclasses** —
   rejected; loses the ability to pattern-match with `instanceof` in
   tests, and reduces IDE autocompletion of error-specific fields.
2. **Throw plain strings** — rejected; violates Article XV (strict
   types).
3. **Numeric codes** — rejected; less greppable in logs.

---

## R8: DTG formatter — location and encoding

### Decision

- DTG format: `DDHHmmZ MMM YY` in UTC, e.g. `041500Z APR 26`.
- Implementation: a pure function `formatDtg(isoInstant: string):
  string` in `shared/components/src/storyboard/dtg.ts`.
- On parse failure, the formatter falls back to returning the input
  ISO-8601 string verbatim (per spec: *"Defaults to DTG of `timestamp`
  in `DDHHmmZ MMM YY`; falls back to ISO-8601"*).

### Rationale

- DTG is a pure presentation helper; it belongs in the headless
  module because #216 (capture) needs it to populate the Scene
  `title` default, and #218 (edit) needs it for rename-prompt
  defaults. Extracting it keeps both consumers aligned.
- Date parsing uses `new Date(iso).toISOString()` + hand-rolled slicing
  — no `Intl` or locale-aware formatting needed (DTG is fixed-format
  and locale-invariant by definition).

### Alternatives considered

1. **Host-specific implementation in each of #216/#218** — rejected;
   duplicate logic risks divergence.
2. **`date-fns` or `luxon`** — rejected as a new dependency for a
   fixed-format helper; Article IX says every dependency is a
   liability.

---

## Phase-0 Exit

No `NEEDS CLARIFICATION` markers remain in Technical Context. Proceed
to Phase 1 Design.
