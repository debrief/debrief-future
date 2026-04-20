# Research: Storyboarding — Schema + CRUD Core

**Feature**: 215-storyboarding-schema
**Date**: 2026-04-20

## Scope

Eleven research questions must be resolved before Phase 1 design can
proceed. The spec itself (#215) already records the high-level "what";
this file records the "how" and the rejected alternatives. R9, R10, R11
were added after the 2026-04-20 post-plan review (see spec.md §
Clarifications).

---

## R1: LinkML module organisation — single file vs per-entity files

### Decision

Put `StoryboardProperties`, `SceneProperties`, and `Viewport` in a
**single new module** at `shared/schemas/src/linkml/storyboard.yaml`,
imported from `debrief.yaml`. No `HistoryEntry` class is defined here
(see R9 and the 2026-04-20 clarification): provenance flows through the
existing `BaseFeatureProperties.provenance: LogEntry[]` slot.

### Rationale

- Matches the existing one-module-per-domain pattern:
  `stac-extension.yaml`, `session-state.yaml`, `log-entry.yaml` each
  hold multiple related classes in a single file.
- `Viewport` is a sub-record of `Scene`; splitting it into a separate
  file would create unnecessary cross-file imports for a tightly
  coupled cluster.
- Aligns with Article IX: minimise dependency surface. One YAML file =
  one generator pass.
- Two property classes (`StoryboardProperties`, `SceneProperties`) both
  inherit from `BaseFeatureProperties` so provenance/tags/id plumbing is
  not redefined.

### Alternatives considered

1. **Per-entity YAML files (`scene.yaml`, `storyboard.yaml`, …)** —
   rejected as over-granular; the two entities are one aggregate.
2. **Fold into `geojson.yaml`** — rejected because Storyboarding is a
   distinct domain with its own reserved-slot invariants
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

## R4: `feature_set_hash` algorithm + canonicalisation

### Decision

- **Canonicalisation** of `visible_feature_ids` happens *before*
  hashing, deterministically:
  1. `trim()` every ID.
  2. Reject any empty-after-trim ID → `ReservedSlotViolation`-style
     error (module-side validation).
  3. Deduplicate (`new Set(…)`).
  4. Sort lexicographically (ASCII, default `Array.sort` semantics).
- **Algorithm**: SHA-256 over UTF-8 of `JSON.stringify(canonicalIds)`.
- **Output encoding**: lowercase hex, full 64-char string.
- **Storage**: stored in `properties.feature_set_hash` on the Scene
  Feature.
- **Recomputation trigger**: any `createScene`, `updateScene` (when
  `visible_feature_ids` is in the patch), or `duplicateScene` call.
- **Implementation location**: `shared/components/src/utils/hash.ts`
  (lifted from the existing `shared/components/src/nl-cql2/hash.ts`;
  nl-cql2 re-exports from the new location to avoid duplication — see
  R11 for the async decision).

### Rationale

- SHA-256 is available in both Node (`crypto.subtle`) and the browser
  (`crypto.subtle.digest`) — no third-party dependency.
- Canonicalisation is in-spec rather than "in the consumer" so two
  independently-built consumers hashing the same logical set get the
  same hash, regardless of whitespace, duplicates, or ordering drift.
- Sort-then-hash is order-insensitive, matching the spec's "order-
  insensitive `visible_feature_ids`" invariant.
- Full-length hex is a defensive choice: a future collision-finding
  attack on a truncated prefix would corrupt the stale-detection path.
- Consumers compare by string equality — no cryptographic guarantees
  required beyond determinism and low collision probability.
- Hoisting to `shared/components/src/utils/hash.ts` avoids DRY
  violation with nl-cql2.

### Alternatives considered

1. **FNV-1a 64-bit** — rejected; faster but higher collision
   probability and no browser-stdlib path.
2. **MD5** — rejected; deprecated hash family, collision risk higher,
   no tangible speed benefit.
3. **Leave canonicalisation to each consumer** — rejected; the spec is
   a cross-consumer contract and two consumers disagreeing on dedup or
   whitespace would silently desync feature_set_hash at persist time.
4. **Sync hash via a pure-JS SHA-256 polyfill** — rejected; every
   target environment ships Web Crypto, and the async API is the
   standard going forward (see R11).

---

## R5: Atomicity of compound operations (duplicate, copy, cascade delete)

### Decision

Compound operations MUST be **all-or-nothing** with respect to the
FeatureCollection:

- Implement each compound op as an **immer recipe** (`immer.produce(…)`)
  with structural sharing — the recipe builds the full new-state
  FeatureCollection, and any thrown error inside the recipe rolls back
  automatically (immer's produce is abort-safe: if the recipe throws,
  no draft ever reaches the caller).
- The module **never mutates the input FeatureCollection in place**;
  `immer.produce` returns a new object reference only when something
  actually changed, preserving structural sharing on unmodified
  Features.
- Public ops return `{ plot, ... }`; callers swap the reference
  (matching the React / Zustand idiom downstream specs will use).

### Rationale

- SC-005 demands 100% atomicity under injected mid-op failure. `immer`
  gives us transactional semantics by construction: the recipe either
  completes cleanly or the draft is discarded.
- Structural sharing means unmodified Features are **reference-equal**
  across input and output FeatureCollections (tested invariant —
  FR-MODULE-022). This is directly observable by downstream Zustand
  stores for selector memoisation.
- Deep-cloning the entire plot on every op (the hand-rolled alternative)
  blows the p95 < 10 ms target at 100 k positions (FR-TEST-024) —
  measured during research (see perf.bench notes).

### Alternatives considered

1. **In-place mutation + rollback on error** — rejected; brittle under
   partial failure, requires tracking undo log for every field touched.
2. **Hand-rolled staging (deep clone + swap on success)** — rejected as
   the previous plan's approach; `structuredClone` on a 100 k-position
   FeatureCollection costs > 50 ms, violating FR-TEST-024.
3. **Copy-on-write Feature proxies** — rejected; re-implements what
   immer provides, with worse testing ergonomics.

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

Note: `DuplicateFeatureId` is NOT a separate code — ULID collisions
within a single plot are vanishingly unlikely (10^-24 per op at the
expected scale) and surface as `InvariantViolation` with a descriptive
detail if they do happen.

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

## R9: Discriminator — `kind` enum vs `debrief:type` property (NEW)

### Decision

Storyboard and Scene Features use the existing **`kind` discriminator**
pattern established by `BaseFeatureProperties`:

- Extend `FeatureKindEnum` in `common.yaml` with `STORYBOARD` and
  `STORYBOARD_SCENE`.
- `StoryboardProperties.kind` is pinned to `STORYBOARD` (LinkML
  `equals_string`), `SceneProperties.kind` to `STORYBOARD_SCENE`.
- No `debrief:type` property key is introduced.

### Rationale

- The `debrief:` prefix is reserved for STAC `item.properties` (per
  #125's STAC extension). In-plot GeoJSON Features use the canonical
  `kind` discriminator (TRACK, POINT, NARRATIVE, CIRCLE, …). Introducing
  a second discriminator on in-plot Features would split type-narrowing
  across two fields and break every existing consumer that switches on
  `kind`.
- Extending `FeatureKindEnum` is one-line change per value; consumers
  already exhaustiveness-check the enum via TS's discriminated unions.
- Generated TypeScript unions (`Feature = TrackFeature | PointFeature |
  NarrativeFeature | CircleFeature | StoryboardFeature | SceneFeature`)
  narrow cleanly with `feature.properties.kind === "STORYBOARD_SCENE"`.

### Alternatives considered

1. **`properties["debrief:type"]: "storyboard" | "storyboard_scene"`**
   — rejected; the `debrief:` namespace is STAC-Item-only by project
   convention.
2. **A third-layer synthetic property** — rejected; every consumer
   would need to know about both layers.

---

## R10: Structural-sharing immutability — `immer` vs hand-rolled (NEW)

### Decision

Adopt `immer ^10.1.3` as a runtime dependency on
`shared/components/package.json`. Every mutation op is authored as an
`immer.produce(plot, draft => { … })` recipe; unchanged Features are
reference-equal across input and output FeatureCollections.

### Rationale

- `immer` is the de-facto structural-sharing library (10M+ weekly
  downloads, peer-dep-free, 3 KB gzipped).
- Gives us transactional semantics for free: if the recipe throws,
  the draft is discarded and the caller's input is byte-identical
  post-call (see R5 — atomicity).
- Hand-rolled `structuredClone` on a 100 k-position FeatureCollection
  violates FR-TEST-024's p95 < 10 ms target (measured > 50 ms in
  preliminary benching).
- Reference-equality on unchanged Features is directly observable and
  testable (FR-MODULE-022), and critical for downstream Zustand
  selector memoisation in #217.

### Alternatives considered

1. **Hand-rolled deep clone** — rejected on perf and correctness
   (see R5).
2. **Zustand's `produce` middleware** — rejected; pulls in Zustand as
   a dependency of the headless module (Article IV violation).
3. **`structuredClone`** — rejected on perf.

---

## R11: Async-first API — Web Crypto demands Promises (NEW)

### Decision

Every mutation op on the public API returns a `Promise`:

```ts
export async function createScene(
  plot: Plot,
  input: CreateSceneInput,
): Promise<{ plot: Plot; scene: SceneFeature }>;
```

Pure queries (no hash computation) remain **synchronous**:
`listScenesOrdered`, `getStoryboard`, `getScene`,
`getActiveStoryboardDefault`, `detectMissingDataForScene`,
`runPlotOpenMigrations`, `validatePlot`, `readSceneWithStaleness`,
`formatDtg`.

### Rationale

- Web Crypto's `crypto.subtle.digest` is async by specification.
  Any op that (re)computes `feature_set_hash` (createScene, updateScene
  when `visibleFeatureIds` is in the patch, duplicateScene,
  copySceneToOtherStoryboard) MUST return a `Promise`.
- Making only the hash-touching ops async and leaving others sync
  creates API inconsistency — consumers can't blindly `await` every
  mutation. Making all mutations async is one small price for a
  predictable surface.
- Pure queries with no crypto and no I/O have no reason to go async;
  forcing them would harm downstream readability.
- The `readSceneWithStaleness` query is tricky: it *could* recompute
  the hash to detect staleness, but that recomputation is on a known-
  ordered, already-canonicalised list. To keep it synchronous, staleness
  is computed by comparing the stored `feature_set_hash` against a hash
  recomputed **on demand asynchronously by the consumer**; the sync
  query returns both the stored hash and the canonical list so the
  consumer can choose when to await. See the API contract for details.

### Alternatives considered

1. **Sync API with a synchronous SHA-256 polyfill** — rejected; adds a
   new dependency for something the platform already provides.
2. **Only hash-touching ops async, rest sync** — rejected; API
   inconsistency, trap for the consumer who learns `createScene` is
   async but `deleteScene` is not.
3. **Make everything async** — rejected for pure queries; needlessly
   moves synchronous reads to microtask boundaries for zero benefit.

---

## Phase-0 Exit

No `NEEDS CLARIFICATION` markers remain in Technical Context. Proceed
to Phase 1 Design.
