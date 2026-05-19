# Research: Migrate session-state slices into in-plot SystemState features

**Feature**: `261-session-state-systemstate`
**Phase**: 0 (pre-design research)
**Date**: 2026-05-19

This document resolves open design questions surfaced by `plan.md`. The spec's [NEEDS CLARIFICATION] markers (Q1, Q2) were resolved at spec time — this document captures the **downstream design decisions** that flow from those resolutions.

---

## R-001: Where does the shared SystemState helper live?

**Decision**: `services/session-state/src/system-state/` — a new module *inside* the existing `@debrief/session-state` package.

**Rationale**:
- The helper exists to back the session-state slices' persistence boundary. It is not a general-purpose utility — it is the persistence shim for a specific store.
- Both hosts already depend on `@debrief/session-state`. Adding a new sub-export (`@debrief/session-state/system-state`) is zero new dependency graph.
- Per Article IX.1 (minimal dependencies) the bar for spinning up a new workspace package is "would another consumer need this without taking the whole session-state package?" — currently no, and we don't speculate. If a future consumer needs SystemState read/write without the store, the module is movable via `git mv` with no behavioural change.
- The web-shell's existing `activeStoryboardPersistence.ts` is conceptually in the wrong place — it lives in `apps/web-shell/src/services/` but is host-agnostic logic. Moving its replacement to `services/session-state/src/system-state/` corrects this.

**Alternatives considered**:
1. **Separate workspace package `@debrief/system-state`**. Rejected — package proliferation cost (build pipeline, test pipeline, version bumping) without a second consumer to justify it.
2. **`shared/components/src/system-state/`**. Rejected — components are UI artefacts; this is a data-shape helper. Wrong shelf.
3. **Leave at `apps/web-shell/src/services/activeStoryboardPersistence.ts` and add VS Code copy**. Rejected — explicitly violates FR-011/FR-012 (single producer).

**ADR**: The decision will be recorded in `docs/project_notes/decisions.md` as a new ADR during implementation.

---

## R-002: How is the LinkML schema extended for `current_time`?

**Decision**: Add `current_time: datetime` as a new **optional** attribute on `SystemStateProperties` in `shared/schemas/src/linkml/geojson.yaml`. Enforce the "if `state_type == temporal` then `current_time` SHOULD be present" rule via a LinkML `rules` block (LinkML ≥1.7 supports class-level rules).

**Rationale**:
- LinkML 1.7+ supports `rules` with `preconditions`/`postconditions` blocks that express discriminator-conditional constraints, which is the natural shape for "temporal variant requires current_time".
- Making the attribute optional at the *class* level keeps generated Pydantic/TS types simple — `current_time: Optional[datetime]` / `current_time?: string`.
- Strict-on-import (Article XIV.4) is enforced by the helper's `validate.ts` (R-005), not the schema, because the schema's role is shape definition, not runtime narrowing per-variant.
- Per FR-016 and the spec's Q2 resolution: optional initially, with the option to tighten to required in a future deprecation cycle.

**Field shape**:
```yaml
current_time:
  description: >-
    For temporal SystemState features, the analyst's playhead position at
    save time (the moment the time-cursor was scrubbed to). When absent on
    a temporal SystemState feature, the playhead is assumed unset and
    falls back to the start of the analytical window.
  range: datetime
  required: false
```

**Alternatives considered**:
1. **Add as required, gate runtime against unmigrated plots**. Rejected — would break #237's existing `active_storyboard` fixtures and any plots web-shell has already written, which lack the field by definition. Violates the "additive only" gate.
2. **Create a new sub-variant `temporal_with_playhead`**. Rejected — pointless variant proliferation. The discriminator already disambiguates; the new field is just additional data on the existing variant.
3. **Store as a separate `playhead` `SystemState` variant**. Rejected — splits semantically-coupled state across two features and complicates the "at most one per state_type per plot" rule (FR-003).

---

## R-003: Reconciliation algorithm when both sources disagree (FR-007)

**Decision**: Two-pass load. First pass reads the plot's `FeatureCollection` and extracts all `SystemState` features into a `SystemStateMap` keyed by `state_type`. Second pass loads the sidecar — for each migrated field, if the corresponding `SystemStateMap` entry exists, the SystemState value wins and the sidecar value for that field is discarded (in-memory, before applying to the store). Non-migrated fields (playback state, drawing mode, etc.) load from the sidecar normally.

**Algorithm**:

```text
function loadSession(store, plotPath):
    fc = await readPlotFile(plotPath)
    sysStateMap = readSystemStateFromFeatureCollection(fc)
    # sysStateMap is a typed map: { temporal?: TemporalState, spatial?: SpatialState, selection?: SelectionState, active_storyboard?: ActiveStoryboardState }

    sidecar = await readSidecar(sidecarPath(plotPath)) | { /* defaults */ }

    # For each migrated field, prefer sysStateMap, fall back to sidecar
    temporal = applyTemporalReconciliation(sysStateMap.temporal, sidecar.temporal)
    spatial = applySpatialReconciliation(sysStateMap.spatial, sidecar.spatial)
    selection = applySelectionReconciliation(sysStateMap.selection, sidecar.features)

    # Non-migrated fields always come from sidecar
    playback = sidecar.temporal.playback ?? defaultPlayback()
    drawing = sidecar.spatial.drawing ?? defaultDrawing()
    # …

    store.applyHydratedState({ temporal, spatial, selection, playback, drawing, … })
    store.applyActiveStoryboard(sysStateMap.active_storyboard)
```

Per-slice reconciliation functions are pure, unit-testable, and live in `mapping.ts` alongside the slice↔variant field maps.

**Error path**: If the plot contains a malformed `SystemState` feature (FR-003, FR-004 edge cases), the load surfaces an error to the host with the offending feature IDs; the host decides whether to surface a user-visible message, a logged warning, or both. The helper itself does not silently fall back to sidecar — strict on import (Article XIV.4).

**Alternatives considered**:
1. **Sidecar wins**. Rejected per FR-007 (the plot file is the canonical, portable artefact).
2. **Last-write-wins by timestamp comparison**. Rejected — both sources carry timestamps but they're not synchronised (sidecar's `savedAt` vs SystemState's `provenance[*].timestamp`); using them invites Byzantine "clock skew" bugs and adds no real value over "plot wins".
3. **Merge field-by-field within a slice**. Rejected — gives the user no mental model. "If the plot has a spatial SystemState feature, the plot's bbox/zoom/center are authoritative. Period."

---

## R-004: Sidecar version bump strategy

**Decision**: Bump `SessionFile.version` minor from `1.1.0` → `1.2.0`. Add a `migration_lineage` field (optional) for diagnostic purposes only — not used by the load path.

**Rationale**:
- Per spec FR-015, the bump signals "this sidecar was written under the post-migration regime — migrated fields will be absent".
- Semver minor (1.1.0 → 1.2.0) signals additive change (the **schema** is additive — a sidecar with the old `version` and a complete-shape body still loads; a sidecar with the new `version` is missing fields the loader knows to look for in the plot file).
- Older readers (running pre-migration code) reading a new-version sidecar would: see the bumped version (which they treat as forward-compatible because semver minor); see absent migrated fields; fall back to *their* defaults. This is wrong behaviour for them (they wouldn't know to look in the plot), but they're not in deployment anyway — the cross-host parity matrix tests cover both hosts running the new code.
- No backward-incompatibility break per Article II.3 — migration path is documented (this file).

**`migration_lineage` field shape**:
```json
"migration_lineage": {
  "schema_version_at_write": "1.2.0",
  "migrated_variants": ["temporal", "spatial", "selection"]
}
```

Purpose: forensic diagnosis if a sidecar has been corrupted or hand-edited. Not load-relevant.

**Alternatives considered**:
1. **Bump major (2.0.0)**. Rejected — Article II.3 reserves major for breaking changes; this is additive.
2. **No version bump; rely on field presence to detect era**. Rejected — version is the existing detection mechanism per FR-015; reusing it is cheaper than inventing a parallel detection.

---

## R-005: Runtime validation at the schema boundary (Article XV.5, Article XIV.4)

**Decision**: Use Zod for TypeScript runtime validation, derived structurally from the generated `SystemStateProperties` type via `z.discriminatedUnion('state_type', [tempSchema, spatialSchema, selectionSchema, activeStoryboardSchema])`. Use Pydantic v2 for the Python adherence-test side (already in place — no change needed beyond regenerating from LinkML).

**Rationale**:
- Article XV.5 requires explicit type-narrowing at every untyped-data ingress. The plot's `FeatureCollection` is parsed JSON — its `properties` blob is `unknown` until narrowed.
- A discriminated union over `state_type` is exactly the shape LinkML defines and exactly the shape the runtime needs.
- Zod is already used elsewhere in the project (spec-navigator, backlog-navigator) — not a new dependency. No `any` introduced.
- The Zod schemas live in `services/session-state/src/system-state/validate.ts` and are derived from the generated `SystemStateProperties` interface via the existing pattern (declaring `z.object` shapes that the type checker verifies match the generated types via `z.infer`).

**Compile-time exhaustiveness guard** (Article IV.5):
```typescript
// In exhaustive.ts — fails the build if LinkML adds a new state_type and the helper hasn't been updated.
type _ExhaustiveStateTypeGuard = Exclude<
  SystemStateTypeEnum,
  'temporal' | 'spatial' | 'selection' | 'active_storyboard'
> extends never
  ? true
  : never;
const _exhaustive: _ExhaustiveStateTypeGuard = true;
```

**Alternatives considered**:
1. **Hand-rolled validators using `typeof` checks**. Rejected — Article XV.7 (cast as expert override) and Article IV.5 (no hand-rolled subset types) both push toward generated/derived validators.
2. **Validate at the host level (re-validate in VS Code and web-shell separately)**. Rejected — duplicates the validation contract; the shared helper IS the boundary.
3. **Skip runtime validation; trust the generated types**. Rejected — Article XV.5 explicitly requires a typed model at each ingress. Parsed JSON is the canonical ingress.

---

## R-006: Cross-host test matrix architecture

**Decision**: Three layers of tests, each adding coverage at a different granularity:

1. **Schema adherence** (`shared/schemas/tests/test_system_state_adherence.py`) — Pydantic round-trips every fixture in `shared/schemas/fixtures/system-state/{valid,invalid}/`. Counts toward Article VI.1 and SC-006.
2. **Helper unit tests** (`services/session-state/src/system-state/__tests__/*.test.ts`) — Vitest covers each pure function (`read`, `write`, mapping per variant, reconciliation per variant). Counts toward Article VI.2.
3. **Cross-host parity matrix** (Playwright in web-shell, Mocha extension-host in VS Code) — for each of the 4 variants × 2 producers × 2 readers = 16 test cases, save in producer / load in reader / assert state matches. Counts toward Article VI.3 and SC-003.

The matrix runs as two Playwright specs + one VS Code extension test file:
- `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` — web-shell-produces → web-shell-reads (4 cases) + web-shell-produces → VS Code-reads (4 cases, via shared file fixture and Mocha companion).
- `apps/vscode/test/system-state-roundtrip.test.ts` — VS Code-produces → VS Code-reads (4 cases) + VS Code-produces → web-shell-reads (4 cases, via shared file fixture).

The "produced in A → read in B" pairs share a fixture corpus at `specs/261-session-state-systemstate/contracts/fixtures/` so neither host has to host-shell out to the other.

**Alternatives considered**:
1. **Single Playwright suite that drives both hosts**. Rejected — VS Code automation via Playwright (#142) is unreliable and reserved for chrome-level concerns. Use the native VS Code test runner for the VS Code half.
2. **Skip the cross-product, just test "round-trip in same host"**. Rejected — cross-host parity is exactly the point of the migration (SC-003); same-host round-trip wouldn't catch helper-version-mismatch regressions.

---

## R-007: Backward compatibility — what about the existing `active_storyboard` runtime?

**Decision**: The shared helper, when reading a `FeatureCollection` containing only an `active_storyboard` SystemState feature (today's web-shell-written plots), returns a `SystemStateMap` with `active_storyboard` populated and the other three variants `undefined`. The loader treats `undefined` for migrated variants as "fall back to sidecar" — which for the migrated fields is "fall back to whatever the sidecar said (which is the same as today)".

In other words: existing plots that have `active_storyboard` but not the other three SystemState features are **identical** to today's behaviour for those plots, plus they continue to work for `active_storyboard` because the shared helper inherits #237's read path. Article VI.3 verifies this with a "load an existing fixture" test pinned to a known #237-era plot file.

**Rationale**:
- No code-path divergence between "this plot has a temporal SystemState feature" and "this plot doesn't" — they take the same load path, just hit different branches.
- No "migration script" needed for old plots — they upgrade naturally on first save under the new code (FR-014).

**Migration of `activeStoryboardPersistence.ts`**:
1. Add new shared helper, keep `activeStoryboardPersistence.ts` calling INTO it (delegation).
2. Re-point existing web-shell call sites at the shared helper directly.
3. Run the existing #237 Playwright test suite — passes unchanged.
4. Delete `activeStoryboardPersistence.ts` and its tests.

The migration is **one PR**, in three sequenced commits, so each commit is reviewable in isolation but the deletion happens with all callers already moved over.

---

## R-008: Provenance shape per write (FR-010, Article III.1) — REVISED per review 2A

**Decision**: Every `SystemState` write appends a single `LogEntry` to the variant's `provenance` array, using **the existing LinkML `LogEntry` shape — no new fields added**.

Field mapping (verified against `shared/schemas/src/linkml/log-entry.yaml`):

| Concept | LogEntry field | Value at write time |
|---|---|---|
| Producing host | `was_generated_by.tool` | `"vscode-extension"` \| `"web-shell-session-state"` |
| Producing host version | `was_generated_by.tool_version` | `@debrief/session-state` package.json `version` |
| User-or-agent identity | `agent` | from existing `LogService.getAgent()` infrastructure (per Assumption 3 in spec; #221 will enrich this) |
| Write action | `activity_type` | `"created"` \| `"updated"` \| `"replaced"` (LinkML `ActivityType` enum gains these if they don't already exist — single value-set extension at most, no new top-level fields) |
| When | `timestamp` | ISO-8601 UTC at save time |
| Activity ID | `activity_id` | fresh ULID per write |
| Required structural fields (per LinkML LogEntry spec) | `used`, `generated`, `execution_duration` | populated with sensible defaults — `used=[]` (no source inputs for state captures), `generated=[<SystemState feature id>]`, `execution_duration="PT0S"` (instantaneous capture) |

The provenance array is *append-only* per Article III.3. The helper never modifies existing entries — it only appends.

**Why this revision**: The original draft of R-008 invented three fields (`host`, `action`, `version`) that don't exist on the LinkML `LogEntry` class. This would have been a silent second schema change, violating Article II.3 (no undocumented schema growth) and Article IV.5 (boundary types must be derived, not rewritten). The fix maps onto the existing typed surface — adding at most enum values to `ActivityType` if needed, but no new fields. See `contracts/system-state-helper.ts.md` `SystemStateWriteContext` for the helper-side shape.

**Open task for `/speckit.tasks`**: confirm `ActivityType` enum already includes (or grows to include) `"created"`, `"updated"`, `"replaced"`. If the enum has different terminology today, adopt it rather than extending. Either way the change is to the value-set, not the structure.

**Alternatives considered**:
1. **Add `host`/`action`/`version` to LogEntry as a parallel schema delta**. Rejected per review 2A — breadth of blast radius (LogEntry is used everywhere; new fields would force every existing fixture and writer to migrate).
2. **One LogEntry per migrated field**. Rejected — overflows the provenance array on every save; field-level provenance can be reconstructed from the LogEntry timestamp + the value at that time.
3. **Provenance only on first write**. Rejected — Article III.1 (provenance always) and III.3 (immutable audit trail) want a continuous lineage, not just genesis.
4. **Skip provenance for SystemState writes**. Rejected — violates Article III.1.

---

## R-009: Edge case — what counts as "no SystemState feature" vs "malformed SystemState feature"?

**Decision**: A FeatureCollection has zero, one, or multiple Features whose `properties.kind === "SYSTEM"`. Each such Feature is a **candidate**. A candidate is "well-formed" if Zod validation against the discriminated union of `SystemStateProperties` variants passes.

| Candidate state | Outcome |
|---|---|
| No candidates with `state_type=X` | `sysStateMap[X]` is `undefined`. Loader falls back to sidecar for migrated fields of variant X. |
| Exactly one candidate with `state_type=X`, Zod passes | `sysStateMap[X]` is populated with the parsed value. Authoritative. |
| Exactly one candidate with `state_type=X`, Zod fails | Load error: surfaces feature ID, Zod error message, refuses to proceed. **Strict on import per Article XIV.4.** |
| Multiple candidates with `state_type=X` | Load error: surfaces ALL candidate feature IDs, refuses to proceed. **At most one per state_type per plot — FR-003.** |
| Candidate with `properties.kind === "SYSTEM"` but `state_type` is unknown enum value | Load error: surfaces feature ID, unknown enum value. **Article XIV.4 — strict.** |
| Candidate with `properties.kind === "SYSTEM"` but no `state_type` at all | Load error: surfaces feature ID, missing discriminator. **Article XIV.4 — strict.** |

No "skip and continue" tolerance. Each error halts load and is surfaced to the host with structured detail.

---

---

## R-010: Spatial shape unification (review resolution 1B)

**Problem surfaced by review**: the LinkML schema contains two parallel representations of "map viewport":

- `ViewportPolygon` (`{ coordinates: Coordinate[]; zoom?: number }`) — consumed by `SpatialSlice.viewport` and the map components.
- `SystemStateProperties` with `state_type=spatial` — the `bbox: float[4]` + `zoom: float` + `center: float[2]` fields modelled in #215 but never produced.

These purport to model the same concept ("the saved viewport"). They have different field shapes and different field names. This is an Article II.1 (single source of truth) violation in the schema itself, pre-dating this work.

**Decision**: Unify on `ViewportPolygon`. The LinkML delta (`contracts/linkml-delta.md`) **removes** `bbox`, `zoom`, `center` from `SystemStateProperties` and **adds** `viewport: ViewportPolygon`. The slice mapping becomes an identity rather than a transformation. Article XIV.1 (pre-release breaking changes permitted) covers the removal — zero runtime blast radius because no host produces or consumes the old fields today.

**Rationale**:

1. **Article II.1** — collapses two schema representations into one. The schema is now self-consistent.
2. **Minimal-diff helper** — the helper has no spatial conversion code. `mapping.ts` doesn't carry `polygonToBboxCenter` / `bboxCenterToPolygon` functions, which would have been a maintenance hot-spot and a round-trip-drift risk.
3. **Zero migration cost for existing plots** — no plot in the wild contains a `SystemState`/`spatial` feature, so no plot needs conversion.
4. **ViewportPolygon is more expressive** — preserves the exact four corners. Bbox+center is a *projection* (loses orientation if a future iteration wants tilted viewports; even though `rotation` is per-machine today, the wire shape doesn't pre-emptively flatten).

**Alternatives considered**:
1. **Conversion pair (1A)** — `polygonToBboxCenter` / `bboxCenterToPolygon` round-trip in the helper, both shapes preserved. Rejected — keeps the Article II.1 violation in the schema; adds drift risk; doubles maintenance.
2. **Defer spatial migration (1C)** — ship temporal + selection only. Rejected — spatial was the *uncontroversial* slice per approval; deferring it would leave the user-visible primary (Story 1) unfinished.
3. **Unify on bbox+zoom+center (slice changes shape)** — refactor `SpatialSlice.viewport` to drop `ViewportPolygon`. Rejected — far larger blast radius (map components consume `ViewportPolygon`), and `ViewportPolygon` is the more expressive shape anyway.

**Open task for `/speckit.tasks`**: confirm no other consumers of the old `SystemStateProperties.bbox`/`zoom`/`center` fields exist (search `bbox`, `center` against `SystemStateProperties` references). Expected to be zero. If non-zero, treat as additional cleanup — see "Spatial shape cleanup follow-up" backlog item (Q4).

---

## R-011: `current_time` bounds validation (review resolution 3A — closes F2)

**Problem surfaced by review**: a colleague's plot could carry `start_time=2024-01-01`, `end_time=2024-01-31`, `current_time=2024-06-01`. The original plan deferred this as "out of scope to validate". Runtime behaviour was undefined — the playhead would render off-screen or wrap to an arbitrary position, silently. Article I.3 (no silent failures) violation.

**Decision**: The helper's `validate.ts` enforces a cross-field invariant: **`current_time ∈ [start_time, end_time]`** when all three are present. Violation triggers `SystemStateLoadError` with `kind: 'cross-field-invariant'`. No silent clamping. Article XIV.4 (strict on import) applies.

A second cross-field rule comes along: **`start_time ≤ end_time`** — a degenerate window is meaningless, and catching it explicitly improves error reporting.

**Behaviour at the host**: The error is surfaced to the user with the offending feature ID, the offending field values, and the violated invariant. The host decides whether to bail the load entirely or offer "open with sidecar defaults" — but the helper does not silently fall back.

**Rationale**:
- Article I.3 — no silent failures on the new persistence path.
- Article XIV.4 — strict on import. The data is wrong; we say so, we don't bend the runtime to accommodate it.
- Article XIV.5 — fix the data, not the consumer. The user (or the producing host) is responsible for fixing the malformed plot.

**Alternatives considered**:
1. **Clamp `current_time` to `[start_time, end_time]` silently**. Rejected — Article I.3.
2. **Surface a warning, proceed with `current_time = start_time`**. Rejected — warnings get ignored; the user wouldn't see them. Worse than a hard error for a load-time problem.
3. **Stay deferred (original plan position)**. Rejected — review identified the silent-failure path as a critical gap.

**Open task for `/speckit.tasks`**: define the exact error-message text the host surfaces to the user. The helper's responsibility ends at the structured error; user-facing copy is host-side.

**Backlog spin-off**: if future UX research wants tolerant behaviour (e.g. "out-of-window playhead → snap to nearest edge with a toast"), the policy can be revisited via a separate backlog item — see Q4 spin-off "Out-of-window current_time policy". This work commits to the strict-on-import default.

---

## R-012: VS Code save atomicity (review resolution 3A — closes F1)

**Problem surfaced by review**: `apps/vscode/src/commands/saveSession.ts:163–208` performs the sidecar write at line 163, the FC write at line 178, and **catches FC write failures as non-blocking at line 180**. Pre-this-feature this was tolerable (no SystemState in the FC). Post-this-feature, sidecar saying "I migrated my spatial state" while the FC lacks the spatial SystemState feature creates a silent inconsistency on the next load (the sidecar fallback for spatial is short-circuited because `migration_lineage` says "migrated", but the SystemStateMap is empty). Article I.3 violation.

**Decision**: Reorder and tighten the save flow.

```text
NEW save flow (VS Code) — replaces saveSession.ts:163–208:
  1. Compose the desired post-save Zustand store state in memory.
  2. Call writeSystemStateIntoFeatureCollection(currentFC, input, ctx) → newFC.
  3. Call prepareSidecarForSave(...) → newSidecar (with version 1.2.0).
  4. Attempt FC write first:
       try: await storeFeatureCollection(storePath, plotUri, newFC.features)
       catch: PROPAGATE — do not write sidecar. User sees a save-failed error.
                The plot is unchanged. The sidecar is unchanged.
  5. Then attempt sidecar write:
       try: await writeSidecar(sidecarPath, newSidecar)
       catch: PROPAGATE with a recovery hint — "FC was written but sidecar was not;
                next open may use defaults for per-machine fields. Re-save to recover."
                The plot is updated (new SystemState features present); the sidecar is stale.
                This is recoverable on next save and SAFE for the new migrated state
                (plot-shared fields all live in the FC).
```

Atomicity model: **FC-first, sidecar-second.** If both succeed, perfect. If FC fails, neither is touched. If FC succeeds but sidecar fails, the plot is in a *forward-compatible* state (new fields persisted; old per-machine fields may use defaults next time) and the user is told.

This deliberately treats the FC write as the primary commit. Rationale:
1. The FC is where the user's *content* lives. Losing the FC write is the irrecoverable case.
2. The sidecar is per-machine. Losing it is recoverable (defaults + re-save).
3. The order matches the data flow direction — content first, metadata second.

**Test coverage** (from review 3A):
- Mock `storeFeatureCollection` to throw → assert sidecar NOT written, error propagates.
- Mock sidecar write to throw after FC succeeds → assert FC contains new SystemState features, error propagates with recovery hint, user sees correct error.

**Out of scope** (per review resolution; backlog candidate at Q4): making the broader save flow truly transactional (cross-file, all-or-nothing). The thumbnails step at saveSession.ts:184–203 already has its own non-atomic semantics; this work only addresses the FC↔sidecar pair on the migrated-state path.

**Web-shell parity**: `apps/web-shell/src/services/stacWriterIdb.ts` writes the whole FC blob in a single IndexedDB transaction (verified — lines 487–500). No sidecar exists. Atomic by construction; no host-side work needed.

**Alternatives considered**:
1. **Sidecar-first, FC-second**. Rejected — sidecar saying "I migrated" before the FC actually carries the new features is the failure mode we're closing.
2. **Two-phase commit with rollback**. Rejected — file-system rollback in Node.js is non-trivial and the FC-first order makes recovery natural without it.
3. **Defer the fix**. Rejected per review 3A — ships a known Article I.3 violation.

---

## Open items remaining for `/speckit.tasks`

These are not unknowns — they are implementation-tactical choices best made at task-breakdown time, not now:

- Exact Zod schema declarations (idiomatic shape — `z.object` vs `z.strictObject` vs `z.object().strict()` — depends on how strict the helper wants to be about unknown properties).
- Specific Playwright selector additions to `AnalysisPage` / `CatalogPage` page objects.
- Fixture corpus content (what bbox values, what timestamps, what selection IDs) — chosen for memorable test failures.
- VS Code extension Mocha companion file structure (per-variant suites vs single suite with table-driven tests).
- Migration commit sequence (R-007) commit messages and ordering details.

These will be enumerated as tasks in `/speckit.tasks`.
