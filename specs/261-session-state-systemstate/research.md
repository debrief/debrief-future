# Research: Retire the sidecar — all plot state in the FeatureCollection

**Feature**: `261-session-state-systemstate` | **Phase**: 0 | **Date**: 2026-05-27

This phase resolves the open design questions surfaced during the spec rewrite. Each item is a binding decision for Phase 1+ unless a later spec amendment overrides it. Findings are grounded in the actual codebase (verified file reads), not the aspirational shapes of the prior #261 artefacts.

---

## R-001 — Shared helper location

**Decision**: A single module at `services/session-state/src/system-state/`, re-exported from `@debrief/session-state`. Not a new workspace package.

**Rationale**: It exists to hydrate/extract the existing Zustand store across the persistence boundary — tightly coupled to that store. Both hosts already import `@debrief/session-state`. A ~5-file module does not justify a new build/test pipeline (Article IX.1). Promotable to a package later via `git mv` if a non-session consumer emerges.

**Alternatives**: New `@debrief/system-state` package (rejected — premature, package proliferation); host-private helpers (rejected — violates FR-015 single-producer).

---

## R-002 — SystemState wire shape (the authoritative runtime, not the aspirational docs)

**Decision**: Follow #237's *shipped* shape exactly (spec Assumption: the runtime is authoritative):
- `id`: deterministic `state.<type>` — `state.spatial`, `state.temporal`, `state.selection`, `state.activestoryboard`. Matches the existing schema `id` pattern `^state\.[a-z]+$`.
- `geometry`: `{ "type": "Point", "coordinates": [] }` (the schema's `GeoJSONEmptyPoint`), **not** `null`.
- `properties`: `{ kind: "SYSTEM", state_type, …variant fields }`.
- The deterministic id makes "at most one per `state_type`" a natural upsert key (find by id / state_type, replace in place).

**Rationale**: The prior #261 `data-model.md` claimed ULID ids, `null` geometry, and *required* provenance — all three contradicted by `shared/components/src/storyboard/activeStoryboardSelection.ts` (verified) and the `SystemState` class in `geojson.yaml`. NG-002 forbids changing the `active_storyboard` wire shape, so the other three variants adopt the same shape for consistency.

**Alternatives**: ULID ids (rejected — the schema id pattern is `^state\.[a-z]+$`; digits/hyphens are illegal, and a deterministic id is a better upsert key than a random one for a singleton-per-type feature). `null` geometry (rejected — diverges from shipped shape and the `GeoJSONEmptyPoint` schema type).

---

## R-003 — Typing against a flat generated interface

**Decision**: The generated `SystemStateProperties` is a **flat interface** with `kind: string` / `state_type: string` (verified — `gen-typescript` does not emit discriminated unions or string-literal enums for slot ranges). The helper therefore:
- Defines a **Zod discriminated union** keyed on `state_type` (one schema per variant) in `validate.ts`, which is the runtime narrowing boundary (Article XV.5).
- Exposes per-variant value types via `z.infer` of those schemas (or `Extract`-style aliases layered over a locally-declared discriminated union), so callers get fully-typed variants without re-listing fields by hand (Article IV.5).
- Keeps a compile-time exhaustiveness guard over `SystemStateTypeEnum` (`exhaustive.ts`) so adding a LinkML variant fails the build until the helper handles it.

**Rationale**: `Extract<SystemStateProperties, { state_type: 'temporal' }>` (the prior contract's pattern) resolves to `never` against a flat `state_type: string` interface — it cannot work as written. Zod is already a project dependency and is the established JSON-boundary validator.

**Alternatives**: Hand-written variant interfaces (rejected — Article IV.5 forbids re-listing fields; drift risk). Post-processing `gen-typescript` to emit a discriminated union (rejected — large generator change, out of scope; runtime narrowing is sufficient).

---

## R-004 — Schema value-type consolidation (FR-002a)

**Decision**: Move the shared value types into `common.yaml` (which `geojson.yaml` already imports) as their single definition, and delete the duplicates:
- `ViewportPolygon` (today only in `session-state.yaml`) → `common.yaml`.
- `Coordinate` (in both `common.yaml` and `session-state.yaml`) → keep `common.yaml`, delete the `session-state.yaml` copy.
- `TimeStep` + `TimeUnitEnum`, `DisplayModeEnum`, `PlaybackStateEnum`, and the temporal value types the store still consumes (`TimeInstant`, `TimeRange`, `TimeFilter`) → `common.yaml`.
- Delete the duplicate `DisplayModeEnum` in `storyboard.yaml`.
- Remove the now-vestigial `SessionFile` / `SessionState` root classes from `session-state.yaml`; remove slice classes left with no runtime consumer.

**Rationale**: `geojson.yaml` imports only `common`/`styling`/`log-entry` (verified) — it cannot reference types siloed in `session-state.yaml`. Consolidating into the common base both unblocks `SystemStateProperties` references and pays down a pre-existing Article II.1 duplication.

**Alternatives**: Make `geojson.yaml` import `session-state.yaml` (rejected — creates a cluster cycle and entrenches the duplication; `session-state.yaml` is being gutted anyway). Redefine the types a third time in `geojson.yaml` (rejected — Article II.1).

**Verification before edit**: confirm the duplicate `Coordinate`/`DisplayModeEnum` definitions are semantically identical (they appear to be), and that codegen names are unaffected by which file defines them (the `debrief.yaml` aggregator merges all clusters, so generated TS/Pydantic symbol names do not change — only the authoring file moves).

---

## R-005 — gen-json-schema + ViewportPolygon.coordinates risk (FR-006a)

**Decision**: Anticipate that placing `viewport: ViewportPolygon` on `SystemStateProperties` (in `geojson.yaml`, which IS in the JSON Schema build via `debrief-jsonschema.yaml`) may trip the known `gen-json-schema` bug with `Coordinate` as a multivalued class range — the documented reason `session-state.yaml` is excluded from the JSON Schema build today (`generate.py` lines ~24–26, verified). Resolution path, in order of preference:
1. Add a targeted `generate.py` post-processor for the `ViewportPolygon`/SystemState JSON Schema slot, mirroring the existing GeoJSON-coordinate post-processors already in that script.
2. If that proves brittle, validate SystemState fixtures through **Pydantic only** (the cross-language round-trip already exercises Python validation) and exclude the SystemState JSON Schema slot from AJV.

**Rationale**: The bug is pre-existing and file-scoped; we must not let it silently produce a broken SystemState JSON Schema. Pydantic adherence + round-trip is the stronger gate regardless.

**Alternatives**: Ignore (rejected — Article I.3/II.2; a broken JSON Schema is a silent validation hole). Move SystemState out of the JSON Schema build wholesale (rejected — SystemState is core plot content, unlike the sidecar-only session-state cluster).

---

## R-006 — Field conversions (the mappings are NOT identity)

**Decision** (authoritative mapping lives in `contracts/slice-mappings.md`):
- **Temporal** — store holds **epoch numbers**; the feature holds **ISO-8601 strings**. Convert with the existing `epochToISO`/`isoToEpoch` / `timeRangeToISO`/`timeRangeFromISO` helpers (`services/session-state/src/types/temporal.ts`, verified). `currentTime: null` ⇒ `current_time` absent. The time *filter* (`{start?,end?}` epoch) maps to `filter_start_time`/`filter_end_time` ISO bounds so every timestamp on the feature is ISO (spec decision).
- **Spatial** — `viewport: ViewportPolygon` is a genuine identity map (same shape both sides). `rotation: number` → `rotation`.
- **Selection** — store holds a `FeatureSelection` object `{ featureIds, primary, timestamp }`; only `featureIds → selected_ids` and `primary → selected_primary` migrate. `timestamp` is dropped (regenerated on load).
- **active_storyboard** — `activeStoryboardId ↔ active_storyboard_id`, identity, unchanged from #237.

**Rationale**: The prior contract called these "identity" — false for temporal (epoch vs ISO) and selection (object vs array). Getting the conversions explicit prevents silent data loss.

**Alternatives**: Store ISO in the slice (rejected — Review Decision 5C deliberately uses epoch for hot-path updates; out of scope to revisit). Persist the whole `FeatureSelection` (rejected — `timestamp` is per-session noise; `selected_ids`/`selected_primary` are the meaningful state).

---

## R-007 — Visibility as a per-feature `visible` flag

**Decision**: Add optional `visible: boolean` to `BaseFeatureProperties` (`common.yaml:330` — verified location; propagates to all feature-props classes via `is_a`). Semantics: **absent or `true` ⇒ visible; `false` ⇒ hidden**. On save, write `visible: false` onto hidden features (omit/clear otherwise). On load, hydrate the store's hidden set from features carrying `visible: false`. This replaces the sidecar's `features.hiddenFeatureIds` denylist.

**Rationale**: Visibility is intrinsically a property of the feature; it travels with the feature with no separate index to keep in sync. Adding to the single base class covers every feature type at once.

**Alternatives**: A `state.visibility` SystemState feature holding a hidden-id list (rejected — re-creates the denylist-out-of-sync problem the per-feature flag avoids; the user explicitly chose push-down). Always writing `visible: true` (rejected — bloats every feature; absent=visible keeps files clean).

**Accepted cost**: toggling visibility mutates the feature and appends to its provenance (FR-014). Growth is bounded to *saved* states (FR-021 — exploration doesn't persist), so it accrues per save, not per transient toggle. Compaction is a deferred follow-up (NG-003).

---

## R-008 — Dirty-tracking model (FR-019/FR-020/FR-021)

**Decision**:
- View-state changes — pan, zoom, rotate, scrub/seek, select, hide/reveal — update the in-memory store but **never set the dirty flag** (FR-019). No close prompt from exploration.
- An **explicit save** persists the complete current state into `features.geojson` regardless of dirty (FR-020). Concretely, `apps/vscode/src/commands/saveSession.ts` must drop (or bypass) its `if (!state.dirty) { …return }` early-return (verified — lines ~124–128) for the explicit save command so a looked-at-only view can be committed.
- Only **substantive content edits** (add/delete/modify features, captured scenes, tool results) set dirty and drive the on-close prompt (FR-021).

**Rationale**: With viewport/selection/time now *plot state*, naïvely marking dirty on every pan would make merely viewing a plot prompt to save — user-hostile. Decoupling the dirty flag (close-prompt trigger) from "what an explicit save writes" resolves it cleanly and keeps "user controls when changes commit."

**Alternatives**: Mark dirty on any view change (rejected — nag pathology). Debounced auto-save of view-state (rejected — surprising writes; out of scope; left to #250's web-shell save-trigger UX question). An explicit "save view" gesture distinct from save (rejected — unnecessary; the existing save command, with the guard relaxed, already does it).

---

## R-009 — Sidecar removal: hard cut, no read shim

**Decision**: Delete the sidecar with **no** legacy read path.
- `services/session-state/src/persistence/{load.ts, save.ts}` sidecar file-I/O (`saveSession`/`loadSession`/`extractPersistentState`/`serializeState`, `SessionFile` interface, `schema.ts` version machinery) is removed or repurposed into FeatureCollection hydrate/extract helpers.
- VS Code: delete `deriveSessionPath`, the `loadSession(session, sessionPath)` block in `openPlot.ts` (lines ~188–208), and the `saveSession(session, savePath)` call in `saveSession.ts`.
- The `@debrief/session-state` package re-exports change accordingly; consumers (`openPlot.ts`, `saveSession.ts`, `sessionManager.ts`, the standalone MCP server) are updated.

**Rationale**: Zero `.debrief-session` files are committed (verified — `git ls-files` returns none); the project is pre-release (Article XIV.5 — fix the data, don't carry a compatibility reader). A shim would be dead weight from day one.

**Alternatives**: One-release read-then-migrate shim (rejected — no real corpus to migrate; pre-release). Leave the package functions but unused (rejected — dead code; knip would flag it).

---

## R-010 — Host wiring

**Decision**:
- **VS Code load** (`openPlot.ts`): the FeatureCollection is already loaded via `stacService.loadPlotData` (verified — `plotData.features`). After it loads, call `readSystemStateFromFeatureCollection(plotData)` + the visibility reader, and hydrate the store. Remove the sidecar load block.
- **VS Code save** (`saveSession.ts`): build the SystemState write-input + visibility from the store, call `writeSystemStateIntoFeatureCollection(mapPanel.getCurrentFeatures(), input, ctx)` + apply `visible` flags, then write `features.geojson` via the existing `storeFeatureCollection` path (verified — it already writes `features.geojson`). Remove the sidecar write. Relax the not-dirty guard (R-008).
- **Web-shell**: on plot open, hydrate from the FeatureCollection (read SystemState + visibility); on FeatureCollection persistence to the IndexedDB plot store (#236), the view-state SystemState features are already present in the FC because view changes funnel through the shared writer (FR-009a). `activeStoryboardPersistence.ts` is folded into the helper; `StoryboardPanelMount.tsx` re-points to `@debrief/session-state`.

**Rationale**: Both hosts already read and write the FeatureCollection; the change is to inject/extract SystemState features into that existing flow rather than maintain a parallel sidecar. Single writer (FR-015).

**Alternatives**: A new persistence path (rejected — Article IV.4; the FC write already routes through the writer abstraction).

---

## R-011 — active_storyboard consolidation sequencing

**Decision**: Three ordered steps within the single branch:
1. Make the shared helper handle `active_storyboard` with #237's exact wire shape (re-using / absorbing `shared/components/src/storyboard/activeStoryboardSelection.ts` logic).
2. Re-point web-shell call sites (`StoryboardPanelMount.tsx`, and `storyboardPlayback/service.ts` if it writes) to the helper.
3. Delete `apps/web-shell/src/services/activeStoryboardPersistence.ts` and re-point/retire its test. Run #237's existing Playwright spec unchanged as the regression gate.

**Rationale**: Sequenced delegation keeps the #237 behaviour green throughout; deleting before re-pointing would break callers.

**Open sub-question for Phase 1**: whether `shared/components/src/storyboard/activeStoryboardSelection.ts` stays the canonical `active_storyboard` implementation that the helper *delegates to* (it lives in `@debrief/components`, consumed by storyboard UI and `storyboardPlayback/service.ts`), or whether the helper becomes canonical and components re-exports it. Leaning: the helper delegates to the existing components function for `active_storyboard` (avoids disturbing storyboard-playback internals) while owning the other three variants. Confirmed in the contract.

---

## R-012 — Provenance for visibility

**Decision**: Visibility transitions use the **existing per-feature provenance mechanism** (`provenance` `LogEntry[]` on the feature's own properties, via the established `LogService`/`buildLogEntry` path). No new schema fields on `LogEntry` (uses `agent`, `was_generated_by.{tool, tool_version}`, `activity_type`, `timestamp`). View-state SystemState features remain lean (no provenance array) per FR-013.

**Rationale**: Reuses shipped provenance infrastructure; consistent with how feature mutations are already logged. The growth is accepted and bounded to saves (R-007).

**Alternatives**: Provenance on the `state.*` features (rejected — they're current-state markers, not transformations; #237 already writes none). New `LogEntry` field for host identity (rejected — existing fields suffice; mirrors prior #261 review resolution 2A).

---

## R-013 — Cross-field invariants + strict-on-import

**Decision**: The helper's load validator (in `validate.ts`, called from `read.ts`) enforces, per variant:
- temporal: `current_time ∈ [start_time, end_time]` when present; `start_time ≤ end_time`. Violation → `SystemStateLoadError(kind='cross-field-invariant')` with the offending feature id + values.
- structural: unknown `state_type`, missing discriminator, variant-required field absent, or two features sharing a `state_type` → `SystemStateLoadError` (kinds `unknown-state-type` / `missing-discriminator` / `malformed-feature` / `multiple-features-with-same-state-type`).
- Absence of a variant feature is **not** an error — it routes to defaults (FR-008).

**Rationale**: Article I.3 / XIV.4 — strict on import, no silent clamping. Distinguishes "absent" (normal) from "present but malformed" (loud failure).

**Alternatives**: Tolerant clamping of out-of-window `current_time` (rejected for now — that's the explicit follow-up #267, triggered only if strict proves user-hostile).

---

## Summary of decisions

| # | Decision |
|---|---|
| R-001 | Helper at `services/session-state/src/system-state/`, re-exported from `@debrief/session-state` |
| R-002 | Wire shape = #237 shipped: `state.<type>` id, empty-Point geometry, lean (no provenance) |
| R-003 | Flat generated interface → Zod discriminated union + exhaustiveness guard (no `Extract<>`) |
| R-004 | Consolidate shared value types into `common.yaml`; gut `session-state.yaml`; dedup |
| R-005 | gen-json-schema ViewportPolygon risk → `generate.py` post-processor, else Pydantic-only validation |
| R-006 | Conversions: temporal epoch↔ISO; selection `FeatureSelection`→`selected_ids`/`selected_primary`; viewport identity |
| R-007 | Visibility = per-feature `visible` flag on `BaseFeatureProperties` (absent=visible) |
| R-008 | Exploration never dirty; explicit save persists regardless of dirty; relax saveSession guard |
| R-009 | Hard cut — delete sidecar I/O, no read shim |
| R-010 | Host wiring rides the existing FeatureCollection read/write at both hosts |
| R-011 | active_storyboard consolidation: delegate → re-point → delete, with #237 regression gate |
| R-012 | Visibility provenance via existing per-feature LogEntry mechanism; view-state features lean |
| R-013 | Strict-on-import + cross-field invariants → `SystemStateLoadError`; absence ≠ error |
