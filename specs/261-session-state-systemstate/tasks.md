# Tasks: Retire the sidecar — all plot state in the FeatureCollection

**Feature**: `261-session-state-systemstate` (backlog #249)
**Branch**: `claude/speckit-implement-261-gC93A`

## Evidence Requirements

**Evidence Directory**: `specs/261-session-state-systemstate/evidence/`
**Media Directory**: `specs/261-session-state-systemstate/media/`

### Feature type and evidence rubric

This is a **Schema Change** + **Library/SDK** + **VS Code Extension Workflow** feature:
- **Schema Change** → round-trip proof (Python → JSON → TypeScript → JSON), golden fixtures.
- **Library/SDK** → code examples showing the shared `system-state` helper API.
- **VS Code Extension Workflow** → workflow screenshots + interaction GIF via Playwright driving the **web-shell** (NOT openvscode-server).

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tasks. The project bundles a Linux Chromium via `@sparticuz/chromium`; run `cd apps/web-shell && node run-playwright.mjs <spec-basename>`. Full details: `docs/project_notes/playwright-installation-research.md`.

### Planned Artifacts

| Artifact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | Full results — schema adherence, helper unit, cross-host round-trip, visibility, strict-import, dirty-tracking | Phase 7 |
| `evidence/usage-example.md` | TS snippet calling `readSystemStateFromFeatureCollection` / `writeSystemStateIntoFeatureCollection` + visibility helpers, with before/after FC JSON | Phase 7 |
| `evidence/round-trip-evidence.md` | LinkML → Pydantic → JSON → TypeScript → JSON bit-equality for all four variants + a `visible:false` feature | Phase 2 (adherence) |
| `evidence/features-before.json` / `evidence/features-after.json` | Same plot's `features.geojson` before/after — shows the `state.*` features + `visible` flags appear | Phase 4/5 |
| `evidence/dir-listing-before.txt` / `evidence/dir-listing-after.txt` | `ls` of the item directory: three files → two files (sidecar gone) | Phase 6 |
| `evidence/screenshots/roundtrip-host-a.png` | Host A: recognisable viewport + time window + selection, before save | Phase 4 Playwright |
| `evidence/screenshots/roundtrip-host-b.png` | Host B: same `features.geojson` only, state restored | Phase 4 Playwright |
| `evidence/screenshots/visibility-host-a.png` / `visibility-host-b.png` | Feature hidden in A; still hidden after reopen in B | Phase 5 Playwright |
| `evidence/screenshots/interaction.gif` | < 5s GIF: save in A → reopen `features.geojson` only in B → same state | Phase 7 |
| `evidence/screenshots/strict-import-error.png` | The structured error a user sees for a malformed SystemState feature (Article XIV.4) | Phase 7 |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) | ✓ DONE during `/speckit.plan` |
| `media/shipped-post.md` | Feature post = cached opener verbatim + ship-time evidence (Screenshots, By the Numbers, Lessons Learned, What's Next) | Phase 7 |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | New PR in debrief-future with evidence + media | Phase 7 (`/speckit.pr`) |
| Blog PR | PR in debrief.github.io with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Confirm the workspace and codegen pipeline are healthy before touching the schema, and inventory the call sites this work will move or delete.

- [x] T001 Confirm branch + active feature: `git branch --show-current` is `claude/speckit-implement-261-gC93A` and `.specify/.active-feature` contains `261-session-state-systemstate`. No file path.
- [x] T002 Verify codegen runs clean on the current schema before changes: `cd shared/schemas && uv run python scripts/generate.py`, then `git diff --quiet -- shared/schemas/src/generated/` (expect no drift). Establishes that any post-T010 drift is genuinely this work's. No file path.
- [x] T003 [P] Inventory active_storyboard call sites to retire/repoint in Phase 3 (`readPersistedActiveStoryboardId`, `persistActiveStoryboardId`, `getActiveStoryboardSelection`, `setActiveStoryboardSelection`). Record at `specs/261-session-state-systemstate/research-notes/active-storyboard-call-sites.md`.
- [x] T004 [P] Inventory the sidecar surface to delete in Phase 6 (`deriveSessionPath`, package `saveSession`/`loadSession`/`extractPersistentState`/`serializeState`, `SessionFile`/`schema.ts`, and `@debrief/session-state` re-exports of them). Record at `specs/261-session-state-systemstate/research-notes/sidecar-call-sites.md`.
- [x] T005 [P] Confirm zero runtime readers of `SystemStateProperties.bbox`/`.zoom`/`.center` and confirm the generated `SessionFile`/`SessionState`/slice classes have no runtime importer (gates the Phase 2 deletions). Record at `specs/261-session-state-systemstate/research-notes/schema-deletion-safety.md`.

## Phase 2: Foundation

**Goal**: Land the schema (value-type consolidation + `SystemStateProperties` delta + per-feature `visible` + `rules:`), regenerate bindings, prove adherence, and build the variant-agnostic shared helper with unit tests. After this phase: the schema carries the new shape; all fixtures pass; the helper reads an FC with no SystemState features as `{}` and round-trips every variant — but no host is wired and no sidecar is removed yet.

**Why blocking**: every story depends on (a) the new bindings, (b) the helper public API, (c) the consolidated value types being referenceable from `geojson.yaml`.

### Schema cluster consolidation (FR-002a, R-004)

- [x] T010 Move the shared value types into `common.yaml` as their single definition — `ViewportPolygon`, `TimeStep` + `TimeUnitEnum`, `DisplayModeEnum`, `PlaybackStateEnum`, `TimeInstant`, `TimeRange`, `TimeFilter` — and delete the `session-state.yaml` copies; dedup `Coordinate` (keep `common.yaml`'s) and delete the `storyboard.yaml` `DisplayModeEnum` duplicate. File: `shared/schemas/src/linkml/common.yaml`.
- [x] T011 Remove the now-vestigial `SessionFile` and `SessionState` classes from `session-state.yaml`, plus any slice classes confirmed unused by runtime (per T005); if the file is left empty, remove it from the `debrief.yaml` imports list. Files: `shared/schemas/src/linkml/session-state.yaml`, `shared/schemas/src/linkml/debrief.yaml`.
- [x] T012 Add optional `visible: boolean` to `BaseFeatureProperties` (absent/true ⇒ visible) per `contracts/linkml-delta.md` §1. File: `shared/schemas/src/linkml/common.yaml`.

### SystemStateProperties delta (FR-001/FR-002/FR-004)

- [x] T013 Apply the `SystemStateProperties` delta per `contracts/linkml-delta.md` §3: remove `bbox`/`zoom`/`center`; add `viewport`, `rotation`, `current_time`, `filter_start_time`, `filter_end_time`, `display_mode`, `step_size`, `playback_rate`, `selected_primary`; add the four per-variant `rules:` blocks; update the `SystemStateTypeEnum.spatial` description. Files: `shared/schemas/src/linkml/geojson.yaml`, `shared/schemas/src/linkml/common.yaml`.

### Codegen (FR-002, FR-006a)

- [x] T014 Regenerate all bindings: `cd shared/schemas && uv run python scripts/generate.py`. Verify generated `SystemStateProperties` gains the new fields and loses `bbox`/`zoom`/`center`, and that `BaseFeatureProperties` children gain `visible?: boolean`. Files: `shared/schemas/src/generated/**`.
- [x] T015 Resolve the `gen-json-schema` `ViewportPolygon.coordinates` multivalued-class-range risk (FR-006a / R-005): add a targeted post-processor in `scripts/generate.py` mirroring the existing GeoJSON-coordinate fixes, or — if brittle — exclude the SystemState `viewport` slot from the JSON Schema build and document Pydantic-only validation. File: `shared/schemas/scripts/generate.py`.

### Golden fixtures (FR-006, SC-005)

- [x] T016 [P] Create valid spatial fixture (`viewport` + `rotation`). File: `shared/schemas/fixtures/system-state/valid/spatial.json`.
- [x] T017 [P] Create valid temporal fixture (all of `start_time`/`end_time`/`current_time`/`filter_start_time`/`filter_end_time`/`display_mode`/`step_size`/`playback_rate`). File: `shared/schemas/fixtures/system-state/valid/temporal.json`.
- [x] T018 [P] Create valid selection fixture (`selected_ids` + `selected_primary`). File: `shared/schemas/fixtures/system-state/valid/selection.json`.
- [x] T019 [P] Create valid active_storyboard fixture in #237's shipped shape (closes the missing-fixture gap). File: `shared/schemas/fixtures/system-state/valid/active-storyboard.json`.
- [x] T020 [P] Create a valid geographic feature carrying `properties.visible: false`. File: `shared/schemas/fixtures/system-state/valid/feature-visible-false.json`.
- [x] T021 [P] Create invalid spatial fixture: `state_type: spatial` with no `viewport` (rules violation). File: `shared/schemas/fixtures/system-state/invalid/spatial-missing-viewport.json`.
- [x] T022 [P] Create invalid selection fixture: `selected_ids: [1, 2]` (numbers). File: `shared/schemas/fixtures/system-state/invalid/selection-non-string-id.json`.
- [x] T023 [P] Create invalid fixture: two features both `state_type: spatial` in one FC. File: `shared/schemas/fixtures/system-state/invalid/multiple-same-state-type.json`.
- [x] T024 [P] Create invalid fixture: unknown `state_type` value. File: `shared/schemas/fixtures/system-state/invalid/unknown-state-type.json`.
- [x] T025 [P] Create invalid fixture: `kind: SYSTEM` with no `state_type` discriminator. File: `shared/schemas/fixtures/system-state/invalid/missing-discriminator.json`.
- [x] T026 [P] Create cross-field fixtures (schema-valid, invariant-violating — classified by the helper, not Pydantic): `current_time` outside `[start_time,end_time]`, and `start_time > end_time`. Files: `shared/schemas/fixtures/system-state/cross-field/temporal-current-time-out-of-window.json`, `shared/schemas/fixtures/system-state/cross-field/temporal-bad-window.json`.

### Schema adherence tests (FR-006, SC-005/SC-006/SC-008)

- [x] T027 [test] Pydantic adherence: every `valid/*` parses and round-trips Python→JSON→Python bit-identically; every `invalid/*` is rejected by Pydantic. File: `shared/schemas/tests/test_system_state_adherence.py`.
- [x] T028 [test] Cross-language round-trip for all four variants + the `visible:false` feature: Python writes → TypeScript reads → TypeScript writes → Python reads → bit-equal (Article II.2). File: `shared/schemas/tests/test_system_state_round_trip.py`.

### Shared helper — variant-agnostic core (R-002, R-003, R-013)

- [x] T030 Implement `SystemStateLoadError` with the five `kind`s per `contracts/system-state-helper.ts.md`. File: `services/session-state/src/system-state/errors.ts`.
- [x] T031 [P] Implement the compile-time exhaustiveness guard over `SystemStateTypeEnum`. File: `services/session-state/src/system-state/exhaustive.ts`.
- [x] T032 Implement Zod discriminated-union validators (one schema per variant, keyed on `state_type`) plus the temporal cross-field invariants (`current_time ∈ [start,end]`; `start ≤ end`). Structurally check `z.infer` against the generated flat `SystemStateProperties` so drift fails the build (R-003). File: `services/session-state/src/system-state/validate.ts`.
- [x] T033 Implement `readSystemStateFromFeatureCollection(fc)` → `SystemStateMap` per contract: empty FC ⇒ `{}`; one well-formed ⇒ populate; malformed/unknown/missing-discriminator/duplicate-state_type/cross-field ⇒ throw `SystemStateLoadError`. Pure, order-independent, no mutation. File: `services/session-state/src/system-state/read.ts`.
- [x] T034 Implement `writeSystemStateIntoFeatureCollection(fc, input)` → new FC per contract: upsert by `state.<type>` id with empty-Point geometry; **no** `provenance` written (FR-013); absent keys unchanged; input not mutated; cardinality ≤1 per `state_type`. File: `services/session-state/src/system-state/write.ts`.
- [x] T035 Implement visibility helpers `readHiddenFeatureIds(fc)` and `applyVisibilityToFeatureCollection(fc, hiddenIds)` (absent/`true` ⇒ visible; `false` ⇒ hidden; pure). File: `services/session-state/src/system-state/visibility.ts`.
- [x] T036 Implement the `mapping.ts` skeleton: declare the six store↔variant converter signatures from the contract; implement the conversion utilities (epoch↔ISO via existing `epochToISO`/`isoToEpoch`/`timeRange*`; `FeatureSelection`↔`selected_ids`/`selected_primary`). Per-variant converter bodies are completed in Phases 3–4. File: `services/session-state/src/system-state/mapping.ts`.
- [x] T037 Create the public barrel and re-export the helper surface from `@debrief/session-state`. Files: `services/session-state/src/system-state/index.ts`, `services/session-state/src/index.ts`.

### Helper unit tests (variant-agnostic)

- [x] T038 [test] `read.ts` tests: every `SystemStateLoadError.kind` branch hit (using the Phase 2 invalid/cross-field fixtures); empty FC ⇒ `{}`. File: `services/session-state/src/system-state/__tests__/read.test.ts`.
- [x] T039 [P][test] `write.ts` tests: input `fc` not mutated (deep-equal after call); cardinality ≤1 per `state_type`; no `provenance` on `state.*`; absent keys untouched. File: `services/session-state/src/system-state/__tests__/write.test.ts`.
- [x] T040 [P][test] `validate.ts` tests: each variant accepts its happy fixture, rejects a wrong-shape one; cross-field invariants fire with `kind='cross-field-invariant'`. File: `services/session-state/src/system-state/__tests__/validate.test.ts`.
- [x] T041 [P][test] `visibility.ts` + round-trip tests: `write(read(fc))` is structurally equal for valid fixtures; visibility absent=visible and round-trips. File: `services/session-state/src/system-state/__tests__/round-trip.test.ts`.

## Phase 3: User Story 4 — Host parity via one shared writer + active_storyboard consolidation (P1)

**Goal**: Both hosts read/write the `active_storyboard` variant through the shared helper; #237's host-private web-shell writer is folded in and deleted. This proves the single-writer pattern end-to-end on the already-shipped variant before the three new variants ride on it.

**Why first among stories**: the shared-writer plumbing and the consolidation are preconditions for US1; doing it on `active_storyboard` (which already lives in the FC, never in the sidecar) means no persistence behaviour changes for the other fields yet — zero interim breakage.

**Independent test**: pin a storyboard in web-shell, save, transfer `features.geojson`, open in VS Code → same pin honoured (and reverse). #237's existing spec passes unchanged.

### Wire active_storyboard into the shared helper (delegating to #237 — R-011)

- [x] T050 Complete the `active_storyboard` converter in `mapping.ts`: `activeStoryboardId ↔ active_storyboard_id`, delegating the FC read/write to `@debrief/components` `getActiveStoryboardSelection`/`setActiveStoryboardSelection` so the wire shape is unchanged (NG-002). File: `services/session-state/src/system-state/mapping.ts`.
- [x] T051 [P][test] Unit test the active_storyboard converter + that `read`/`write` surface the same shape #237 produces. File: `services/session-state/src/system-state/__tests__/active-storyboard.test.ts`.

### Consolidate #237's writer (sequenced — three commits)

- [ ] T052 **Commit A (delegation)**: leave `apps/web-shell/src/services/activeStoryboardPersistence.ts` in place but have its two functions call into the shared helper; behaviour and call sites unchanged. Verify #237's Vitest + Playwright still pass. File: `apps/web-shell/src/services/activeStoryboardPersistence.ts`.
- [ ] T053 **Commit B (re-point)**: re-point web-shell call sites identified in T003 to import from `@debrief/session-state` directly. Files: `apps/web-shell/src/StoryboardPanelMount.tsx` (and `shared/components/src/storyboardPlayback/service.ts` if it writes).
- [ ] T054 **Commit C (delete)**: delete `apps/web-shell/src/services/activeStoryboardPersistence.ts` and re-point or retire `apps/web-shell/src/services/__tests__/activeStoryboardPersistence.test.ts` (a thin smoke test against the helper if it covered anything not already in Phase 2). Files: `apps/web-shell/src/services/activeStoryboardPersistence.ts` (DELETED), `apps/web-shell/src/services/__tests__/activeStoryboardPersistence.test.ts` (DELETED/REPOINTED).

### Wire active_storyboard into VS Code (read + write via the helper)

- [x] T055 In `openPlot.ts`, after `stacService.loadPlotData`, call `readSystemStateFromFeatureCollection(plotData)` and apply the `active_storyboard` pin via the existing storyboard-selection store action. (Leave the sidecar load block intact for now — it carries temporal/spatial/selection until Phase 4.) File: `apps/vscode/src/commands/openPlot.ts`.
- [x] T056 In `saveSession.ts`, populate `active_storyboard` into `writeSystemStateIntoFeatureCollection(mapPanel.getCurrentFeatures(), input)` before the `storeFeatureCollection` write. (Leave the sidecar write intact for now.) File: `apps/vscode/src/commands/saveSession.ts`.

### Cross-host parity + #237 regression

- [x] T057 [test] VS Code extension test (Mocha): pin a storyboard via the store, save, assert the resulting `features.geojson` contains `state.activestoryboard` with the correct `active_storyboard_id`. File: `apps/vscode/test/system-state-roundtrip.test.ts`.
- [x] T058 [test] Run the existing `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` post-T054 — MUST pass unchanged (the shared helper is now the writer; behaviour preserved). File: `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` (verify only).

## Phase 4: User Story 1 — Self-describing plot: spatial + temporal + selection round-trip (P1)

**Goal**: Viewport/rotation, the time window/playhead/filter/display-mode/step/rate, and selection all persist into and load from `features.geojson` in both hosts. The host sidecar load/save calls for these fields are removed. After this phase: save in host A, transfer ONLY `features.geojson`, open in host B → map view, time, and selection are restored (SC-001/SC-002a). Exploration never marks the plot dirty (FR-019); an explicit save persists the current view (FR-020).

**Independent test**: per the spec's US1 independent test — `features.geojson`-only transfer restores viewport + time window + playhead + selection, both directions.

### Complete the per-variant converters (mapping.ts)

- [x] T060 Complete the spatial converter: `viewport` identity (both `ViewportPolygon`); `rotation` identity; `viewport === null` ⇒ omit `state.spatial`. File: `services/session-state/src/system-state/mapping.ts`.
- [x] T061 Complete the temporal converter: `timeRange.{start,end}` epoch→ISO `start_time`/`end_time`; `currentTime` epoch→ISO `current_time` (null ⇒ omit); `timeFilter.{start,end}` epoch→ISO `filter_start_time`/`filter_end_time` (absent ⇒ omit); `displayMode`/`stepSize`/`playbackRate` identity; `timeRange === null` ⇒ omit `state.temporal`. File: `services/session-state/src/system-state/mapping.ts`.
- [x] T062 Complete the selection converter: `selection.featureIds → selected_ids`, `selection.primary → selected_primary` (null ⇒ omit); empty selection ⇒ omit `state.selection`; on load regenerate `selection.timestamp`. File: `services/session-state/src/system-state/mapping.ts`.
- [x] T063 [P][test] Unit tests for the three converters: epoch↔ISO bit-equality within SC-001/SC-002 tolerance; `FeatureSelection` split; null/empty ⇒ omit; defaults on absence. File: `services/session-state/src/system-state/__tests__/mapping.test.ts`.

### Dirty-tracking contract (FR-019/FR-020/FR-021)

- [x] T064 Ensure view-state store mutations do NOT set the dirty flag — `setViewport`, `setRotation`, `setSelection`, `setCurrentTime`, `setTimeRange`, `setTimeFilter`, `setDisplayMode`, `setStepSize`, `setPlaybackRate` — while substantive content edits still do (FR-019/FR-021). File: `services/session-state/src/store/middleware/dirty.ts` (and/or the relevant slice setters).
- [x] T065 [P][test] Behaviour test: each view-state action leaves `dirty` false; a content edit sets it true. File: `services/session-state/src/store/middleware/__tests__/dirty.systemstate.test.ts`.

### VS Code load + save wiring (remove the sidecar calls)

- [x] T066 In `openPlot.ts`, extend the SystemState read (from T055) to hydrate spatial/temporal/selection into the store via the converters, then **delete** the sidecar load block (≈ lines 188–208) and the `deriveSessionPath` import there. File: `apps/vscode/src/commands/openPlot.ts`.
- [x] T067 In `saveSession.ts`, add spatial/temporal/selection to the `writeSystemStateIntoFeatureCollection` input; **delete** the `saveSession(session, savePath)` sidecar call and `deriveSessionPath`; relax the `if (!state.dirty) {…return}` early-return so an explicit save persists a looked-at-only view (FR-020). File: `apps/vscode/src/commands/saveSession.ts`.

### Web-shell load + save wiring (FR-009a)

- [x] T068 Web-shell plot open: hydrate spatial/temporal/selection from the loaded FeatureCollection via the shared helper. File: `apps/web-shell/src/` (plot-open path — confirm exact module, e.g. the plot loader feeding the session store).
- [x] T069 Web-shell save: ensure view-state changes funnel into the FeatureCollection through the shared writer so the existing IndexedDB persistence (#236) captures the `state.*` features (FR-009a). File: `apps/web-shell/src/` (FC-persist path).

### Tests + cross-host E2E (SC-001/SC-002a/SC-003)

- [x] T070 [P][test] Unit/integration: an FC with no `state.*` features loads with defaults (no error); an FC with them hydrates the store; saving a populated store yields the three `state.*` features and writes no sidecar. File: `services/session-state/src/system-state/__tests__/host-roundtrip.test.ts`.
- [x] T071 [test] Playwright web-shell spec: set a recognisable viewport + time window + playhead + selection → explicit save → reload page (clear in-memory store) → reopen `features.geojson` only → assert viewport/time/selection restored. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.
- [x] T072 [test] Cross-host parity: a `features.geojson` written by the VS Code Mocha test is opened by the Playwright spec (state restored), and one written by Playwright is read by the Mocha test — via a shared fixture corpus. Files: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`, `apps/vscode/test/system-state-roundtrip.test.ts`.

### Phase 4 evidence capture

- [x] T073 The T071 spec writes `roundtrip-host-a.png` (recognisable viewport/time/selection pre-transfer) and `roundtrip-host-b.png` (restored from `features.geojson` only) into `specs/261-session-state-systemstate/evidence/screenshots/`, plus `features-before.json`/`features-after.json` showing the `state.*` features appear. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.

## Phase 5: User Story 3 — Feature visibility as a per-feature property (P2)

**Goal**: Hiding/revealing a feature toggles `properties.visible` on that feature; visibility travels with the feature in `features.geojson` and round-trips. Replaces the sidecar's `hiddenFeatureIds` denylist (which is removed with the sidecar in Phase 6). Transitions are recorded on the feature's own provenance (FR-013/FR-014).

**Independent test**: hide two features, save, transfer `features.geojson`, reopen → the same two are hidden; the file shows `visible: false` on exactly those.

### Host wiring (both hosts, via the helper from T035)

- [x] T080 VS Code load: in `openPlot.ts`, hydrate the store's hidden set from `readHiddenFeatureIds(plotData)` (so visibility comes solely from per-feature `visible`, not a sidecar). File: `apps/vscode/src/commands/openPlot.ts`.
- [x] T081 VS Code save: in `saveSession.ts`, apply the store's hidden set to the FeatureCollection via `applyVisibilityToFeatureCollection(features, hiddenIds)` before writing `features.geojson`. File: `apps/vscode/src/commands/saveSession.ts`.
- [x] T082 Web-shell: hydrate the hidden set from the FC on plot open and apply it back through the shared writer on persist (mirrors T068/T069). File: `apps/web-shell/src/` (plot-open / FC-persist path).

### Visibility provenance (FR-013/FR-014/R-012)

- [ ] T083 When a feature's visibility toggles, append a `LogEntry` to that feature's own `provenance` via the existing `LogService` (`buildLogEntry`), so the transition is recorded in the in-memory FC and persists on the next save. Wire at the host visibility-toggle handler. Files: the visibility-toggle handler(s) in `apps/vscode/src/` and `apps/web-shell/src/` (confirm exact module).

### Tests + E2E (SC-004)

- [x] T084 [P][test] Visibility round-trip unit/integration: `applyVisibilityToFeatureCollection` then `readHiddenFeatureIds` is identity; absent `visible` ⇒ visible; a revealed feature clears the flag. File: `services/session-state/src/system-state/__tests__/visibility.roundtrip.test.ts`.
- [x] T085 [test] Playwright web-shell spec: hide two features → save → reload → reopen `features.geojson` only → same two hidden; assert the file carries `visible: false` on exactly those ids. Writes `visibility-host-a.png` / `visibility-host-b.png` into `specs/261-session-state-systemstate/evidence/screenshots/`. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.

## Phase 6: User Story 2 — Delete the sidecar (P1)

**Goal**: With all state now riding in `features.geojson` (Phases 3–5 removed the host sidecar load/save calls), delete the now-dead package-level sidecar I/O and verify the two-file invariant. After this phase: no runtime code reads or writes a `*.debrief-session` file, and a saved plot directory is exactly `item.json` + `features.geojson` (+ thumbnail assets).

**Independent test**: `grep -rn "debrief-session"` over `apps`/`services` (excluding generated/docs) returns no runtime read/write code; a save produces no third file.

- [x] T090 Delete the package-level sidecar I/O — `saveSession`, `loadSession`, `extractPersistentState`, `serializeState`, `parseSessionJson`, the local `SessionFile` interface, and the version machinery — or reduce `load.ts`/`save.ts` to thin FC hydrate/extract wrappers only if a caller still needs them. Files: `services/session-state/src/persistence/load.ts`, `services/session-state/src/persistence/save.ts`, `services/session-state/src/persistence/schema.ts`, `services/session-state/src/persistence/index.ts`.
- [x] T091 Remove the `@debrief/session-state` re-exports of the deleted sidecar functions/types. File: `services/session-state/src/index.ts`.
- [x] T092 Update remaining consumers identified in T004 so the build is clean (e.g. `apps/vscode/src/services/sessionManager.ts`, `services/session-state/src/standalone.ts`, the MCP server) — none should import the deleted functions. Files: per T004 inventory.
- [x] T093 [test] Remove or rewrite tests that exercised the deleted sidecar functions (the `persistence` load/save/round-trip suites) — replace assertions with the FC-based hydrate/extract path where still relevant. Files: `services/session-state/src/persistence/__tests__/**` (and any sidecar fixtures).
- [x] T094 [test] Two-file-invariant check (SC-002): after a save, assert the item directory contains only `item.json` + `features.geojson` (+ thumbnail assets) and no `*.debrief-session`; capture `dir-listing-after.txt`. Add the repo grep guard (`grep -rn "debrief-session" apps services --include='*.ts' | grep -v generated` ⇒ empty). File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` (extend) + `specs/261-session-state-systemstate/evidence/dir-listing-after.txt`.
- [x] T095 Run `pnpm exec knip` (and `task verify` lint+typecheck) to confirm no dead exports/files remain from the sidecar deletion. No file path.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Capture evidence, write the feature post, record ADRs, update project memory + backlog, run the full gate, open the PR.

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — screenshot/GIF tasks below MUST be executed, not deferred. Run `cd apps/web-shell && node run-playwright.mjs system-state-roundtrip`. The bundled `@sparticuz/chromium` produces real PNGs into `specs/261-session-state-systemstate/evidence/screenshots/`.

### Evidence Collection

- [x] T100 Capture test results using the template (`.specify/templates/evidence/test-summary-template.md`) — YAML front matter with `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`; body covers schema adherence (4 variants + visibility), the helper unit suite, cross-host round-trip, visibility, strict-import, and dirty-tracking. File: `specs/261-session-state-systemstate/evidence/test-summary.md`.
- [x] T101 [P] Create the usage demonstration — TS snippet calling `readSystemStateFromFeatureCollection` / `writeSystemStateIntoFeatureCollection` + the visibility helpers, with before/after `features.geojson` JSON. File: `specs/261-session-state-systemstate/evidence/usage-example.md`.
- [x] T102 [P] Capture the schema round-trip proof (Article II.2 rubric): Python → JSON → TypeScript → JSON → Python bit-equality across all four variants + a `visible:false` feature, as a markdown table. File: `specs/261-session-state-systemstate/evidence/round-trip-evidence.md`.
- [x] T103 Run the full Playwright suite (`cd apps/web-shell && node run-playwright.mjs system-state-roundtrip`) to (re)produce `roundtrip-host-a.png`, `roundtrip-host-b.png`, `visibility-host-a.png`, `visibility-host-b.png`, `features-before.json`, `features-after.json` and confirm they land in `specs/261-session-state-systemstate/evidence/`. No file path — verification step.
- [x] T104 [P] Capture `strict-import-error.png`: load a hand-crafted `features.geojson` with a malformed SystemState feature and screenshot the structured error the user sees (Article XIV.4). File: `specs/261-session-state-systemstate/evidence/screenshots/strict-import-error.png`.
- [x] T105 Record the interaction GIF (< 5s, < 2MB): save in host A → reopen `features.geojson` only in host B → same view/time/selection. Use Playwright `recordVideo` + ffmpeg-to-gif. File: `specs/261-session-state-systemstate/evidence/screenshots/interaction.gif`.

### Media Content

- [x] T106 Create the feature post via the Content Specialist agent (`.claude/agents/media/content.md`): title prefixed with `Building `; the `What We're Building` / `How It Fits` / `Key Decisions` sections copied verbatim from `evidence/opening-context.md`; add `Screenshots`, `By the Numbers`, `Lessons Learned`, `What's Next` from the captured evidence. File: `specs/261-session-state-systemstate/media/shipped-post.md`.

### Project memory + backlog

- [x] T107 [P] Add ADRs to `docs/project_notes/decisions.md`: (a) sidecar retirement → two-file model; (b) visibility as a per-feature `visible` flag with accepted provenance growth; (c) shared value-type consolidation into `common.yaml`. File: `docs/project_notes/decisions.md`.
- [x] T108 [P] Log completion in `docs/project_notes/issues.md` with ticket #249, the PR URL, and the evidence directory link. File: `docs/project_notes/issues.md`.
- [x] T109 [P] Strike through BACKLOG.md row 249 (status → `complete`). File: `BACKLOG.md`.

### Final verification + PR

- [ ] T110 Run `task verify` (lint + typecheck + unit + Playwright E2E + knip) from the repo root — all green. No file path — verification step.
- [ ] T111 Create PR and publish blog: run `/speckit.pr`. Creates the feature PR in debrief-future (with evidence + media) and the blog PR in debrief.github.io (`shipped-post.md`); returns both URLs. **MUST run last.**

**Task T111 must run last. It depends on T100–T110 being complete.**

## Dependencies

### Phase-level ordering

```text
Phase 1 (Setup)
   └─▶ Phase 2 (Foundation: schema + codegen + fixtures + helper core)
          ├─▶ Phase 3 (US4: shared writer + active_storyboard consolidation)  ─┐
          │        └─▶ Phase 4 (US1: spatial/temporal/selection + drop host sidecar calls) ─┤
          │                 └─▶ Phase 5 (US3: per-feature visibility) ─────────────────────┤
          │                          └─▶ Phase 6 (US2: delete sidecar code + verify) ───────┤
          └────────────────────────────────────────────── all converge ──▶ Phase 7 (Polish + PR)
```

### Hard dependencies (must-precede)

- **T010–T013 → T014** — codegen needs the schema edits landed first.
- **T014 → T027, T028** — adherence/round-trip tests need the regenerated bindings.
- **T016–T026 → T027, T028** — adherence tests need the fixtures.
- **T030–T037 (helper core) → all per-variant + host tasks (T050+, T060+, T080+)**.
- **T032 (validate) → T033 (read), T038, T040** — read/validate tests need the validators.
- **T052 → T053 → T054** — the active_storyboard consolidation is a strict three-commit sequence; deleting before re-pointing breaks callers.
- **T054 → T058** — the #237 regression spec runs after deletion.
- **T060–T062 (converters) → T066–T072** — host wiring + E2E need the converters.
- **T064 (dirty contract) → T065, T067 (FR-020 explicit-save relax)**.
- **Phase 4 (host sidecar calls removed) → Phase 6 (package sidecar code deleted)** — do not delete the package functions while a host still calls them.
- **T035 → T080–T085** — visibility helpers precede visibility wiring.
- **T100–T105 (evidence) → T106 (post quotes evidence)**.
- **T103 (Playwright run) → T100 test-summary numbers, T105 GIF**.
- **T110 (task verify green) → T111 (/speckit.pr)**.
- **All previous tasks → T111**.

### Parallelisation (`[P]`)

- Phase 1: T003, T004, T005 in parallel.
- Phase 2 fixtures: T016–T026 all in parallel (independent files). Helper tests T039–T041 in parallel after their modules land.
- Phase 4: T063, T065 parallel within their sub-steps.
- Phase 5: T084 parallel.
- Phase 7 evidence: T101, T102, T104 in parallel; T107, T108, T109 in parallel (different files).

### Cross-story note

Phases 3–6 all touch `openPlot.ts` / `saveSession.ts` and `mapping.ts`, so they are **sequenced** (not parallel branches) to keep the merge surface small within the single PR. The order P1(US4) → P1(US1) → P2(US3) → P1(US2-deletion) is dependency-driven: the shared writer and the three migrated variants must be in the FC before the sidecar can be deleted.

## Implementation Strategy

### Incremental delivery — what works after each phase

| After phase | What demonstrably works |
|---|---|
| Phase 1 | Codegen healthy; call-site + deletion-safety inventory captured. No functional change. |
| Phase 2 | Schema carries the new shape; all fixtures pass adherence + cross-language round-trip; the helper reads an FC with no SystemState features as `{}` and round-trips every variant. No host wired; sidecar untouched. |
| Phase 3 (US4) | Both hosts read/write `active_storyboard` through the one shared helper; #237's host-private writer is gone; #237 regression spec green. Sidecar still carries the other three fields (no breakage). |
| Phase 4 (US1) | **Headline live.** Save in either host, transfer ONLY `features.geojson`, open in the other → viewport + time window + playhead + selection restored (SC-001/SC-002a). Exploration never marks dirty; explicit save persists the view. Host sidecar load/save calls for these fields are gone. |
| Phase 5 (US3) | Feature visibility round-trips via per-feature `visible`; transitions logged on the feature's provenance (SC-004). |
| Phase 6 (US2) | The sidecar code is deleted; a saved plot is exactly two files; repo grep is clean (SC-002, SC-007). |
| Phase 7 | Evidence + feature post + ADRs captured; `task verify` green; PR opened. |

Each story phase is independently testable. The lowest-risk, highest-value increment (Phase 3 + Phase 4) could ship alone as "spatial/temporal/selection/active-storyboard in the FC" even before the visibility push-down and the final code deletion.

### Branch / PR strategy

One PR on `claude/speckit-implement-261-gC93A`, updated progressively. The only strict in-PR sequencing is the T052→T053→T054 active_storyboard consolidation (three commits) and the Phase-4-before-Phase-6 ordering (remove host sidecar calls before deleting the package code). Suggested commit checkpoints: schema+codegen; fixtures+adherence; helper core; active_storyboard consolidation (×3); spatial/temporal/selection + sidecar-calls-removed; visibility; sidecar-code-deleted; polish/evidence.

### Risk mitigation

- **Codegen drift** — T002 proves the pipeline clean before T010, so any post-edit drift is genuinely this work's.
- **gen-json-schema ViewportPolygon bug (FR-006a)** — T015 confronts it explicitly; Pydantic-only validation is the documented fallback.
- **#237 consolidation breaking web-shell** — the T052/T053/T054 three-commit sequence keeps behaviour green throughout; T058 is the regression gate.
- **Interim breakage from sidecar removal** — strictly ordered: host sidecar calls go in Phase 4 (once the FC carries the fields), package code deletion in Phase 6.
- **Playwright in cloud** — use `run-playwright.mjs` (`@sparticuz/chromium`); do not skip screenshot tasks.
