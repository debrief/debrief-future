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

## R-008: Provenance shape per write (FR-010, Article III.1)

**Decision**: Every `SystemState` write appends a single `LogEntry` to the variant's `provenance` array. The `LogEntry` fields used:

- `agent` — set to the value produced by the existing `LogService.getAgent()` infrastructure (per Assumption 3 in spec — agent identity may be enriched by #221 in future).
- `action` — one of `"created"`, `"updated"`, `"replaced"` depending on whether a feature of this `state_type` previously existed in the FeatureCollection.
- `host` — `"vscode"` | `"web-shell"` (a new fields on `LogEntry` if not already present — check during data-model phase).
- `timestamp` — ISO-8601 UTC, generated at save time.
- `version` — the session-state package version (`@debrief/session-state` package.json `version` field), so old provenance entries can be diagnosed.

The provenance array is *append-only* per Article III.3. The helper never modifies existing entries — it only appends.

**Alternatives considered**:
1. **One LogEntry per migrated field**. Rejected — overflows the provenance array on every save; field-level provenance can be reconstructed from the LogEntry timestamp + the value at that time.
2. **Provenance only on first write**. Rejected — Article III.1 (provenance always) and III.3 (immutable audit trail) want a continuous lineage, not just genesis.

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

## Open items remaining for `/speckit.tasks`

These are not unknowns — they are implementation-tactical choices best made at task-breakdown time, not now:

- Exact Zod schema declarations (idiomatic shape — `z.object` vs `z.strictObject` vs `z.object().strict()` — depends on how strict the helper wants to be about unknown properties).
- Specific Playwright selector additions to `AnalysisPage` / `CatalogPage` page objects.
- Fixture corpus content (what bbox values, what timestamps, what selection IDs) — chosen for memorable test failures.
- VS Code extension Mocha companion file structure (per-variant suites vs single suite with table-driven tests).
- Migration commit sequence (R-007) commit messages and ordering details.

These will be enumerated as tasks in `/speckit.tasks`.
