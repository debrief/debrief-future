# Tasks: Migrate session-state slices into in-plot SystemState features

**Feature**: `261-session-state-systemstate` (backlog #249)
**Branch**: `claude/start-speckit-249-wFYtR`
**PR**: [#629](https://github.com/debrief/debrief-future/pull/629)

## Evidence Requirements

**Evidence Directory**: `specs/261-session-state-systemstate/evidence/`
**Media Directory**: `specs/261-session-state-systemstate/media/`

### Feature type and evidence rubric

This is a **Schema Change** + **Library/SDK** + **VS Code Extension Workflow** feature. The rubric combines:
- **Schema Change** → round-trip proof (Python → JSON → TypeScript → JSON), schema fixtures
- **Library/SDK** → code examples showing the shared helper API
- **VS Code Extension Workflow** → workflow screenshots + interaction GIF via Playwright driving web-shell (NOT openvscode-server)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright tasks. The project uses `@sparticuz/chromium` (bundled Linux Chromium via npm). Run via `node apps/web-shell/run-playwright.mjs <spec-basename>`. Full details: `docs/project_notes/playwright-installation-research.md`.

### Planned Artifacts

| Artifact | Description | Captured When |
|---|---|---|
| `evidence/test-summary.md` | Full test results — schema adherence, helper unit, cross-host parity matrix (16 cases), legacy-plot fixture round-trip, save atomicity | After all tests pass (Phase 8) |
| `evidence/usage-example.md` | Code snippet showing `readSystemStateFromFeatureCollection` + `writeSystemStateIntoFeatureCollection` usage with each variant | After Phase 6 (all variants live) |
| `evidence/round-trip-evidence.md` | LinkML → Pydantic → JSON → TypeScript → JSON round-trip for all four `SystemState` variants. Closes Article II.2. | After Phase 2 (schema adherence tests pass) |
| `evidence/sidecar-before.json` / `evidence/sidecar-after.json` | Same plot saved pre- and post-migration. Demonstrates Story 5 sidecar shrinkage. | After Phase 6 |
| `evidence/plot-before.json` / `evidence/plot-after.json` | Same plot's FeatureCollection pre- and post-migration. Shows new SystemState features. | After Phase 6 |
| `evidence/screenshots/spatial-roundtrip-host-a.png` | Web-shell with a recognisable bbox set, immediately before save | Phase 3 Playwright |
| `evidence/screenshots/spatial-roundtrip-host-b.png` | VS Code (or fresh web-shell session) opening the same plot file, no sidecar present, landing on the same bbox | Phase 3 Playwright |
| `evidence/screenshots/temporal-roundtrip-host-a.png` | Time controller set to a specific window + playhead | Phase 5 Playwright |
| `evidence/screenshots/temporal-roundtrip-host-b.png` | Same plot opened elsewhere, time controller restored | Phase 5 Playwright |
| `evidence/screenshots/selection-roundtrip-host-a.png` | FeatureList with a specific selection | Phase 6 Playwright |
| `evidence/screenshots/selection-roundtrip-host-b.png` | Same plot opened elsewhere, selection restored | Phase 6 Playwright |
| `evidence/screenshots/interaction.gif` | < 5s GIF showing save in host A → reopen in host B with same state. The headline user-visible behaviour. | Phase 8 (after all variants live) |
| `evidence/strict-on-import-error.png` | Screenshot of the structured error a user sees when a plot has a malformed SystemState feature (Article XIV.4 demo) | Phase 8 |
| `evidence/atomicity-recovery-hint.png` | Screenshot of the FR-019 recovery hint when FC succeeds but sidecar fails | Phase 8 |

### Media Content

| Artifact | Description | Created When |
|---|---|---|
| `evidence/opening-context.md` | Cached opener — Hook (paired mermaid before/after) + What We're Building + How It Fits + Key Decisions | ✓ DONE during `/speckit.plan` |
| `media/shipped-post.md` | Feature post combining the cached opener verbatim + ship-time evidence (Screenshots, By the Numbers, Lessons Learned, What's Next) | Phase 8 Polish |

### PR Creation

| Action | Description | Created When |
|---|---|---|
| Feature PR | Existing PR #629 — updates with evidence + media on Polish phase commits | Phase 8 |
| Blog PR | New PR in debrief.github.io with shipped-post.md | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Confirm the workspace is in the expected state and the codegen pipeline is functional before we touch the LinkML schema.

- [ ] T001 Verify branch + active feature: confirm `git branch --show-current` returns `claude/start-speckit-249-wFYtR` and `.specify/.active-feature` contains `261-session-state-systemstate`. No file path.
- [ ] T002 Verify codegen pipeline runs cleanly on the existing schema before any changes: `pnpm --filter @debrief/schemas generate` AND `task verify` from repo root. Resolves any pre-existing drift before this work introduces new changes. No file path.
- [ ] T003 [P] Inventory all current call sites for `setActiveStoryboardSelection` and `readPersistedActiveStoryboardId` / `persistActiveStoryboardId` so Phase 4 deletion is confident. Capture a one-line summary at `specs/261-session-state-systemstate/research-notes/active-storyboard-call-sites.md`. File: `specs/261-session-state-systemstate/research-notes/active-storyboard-call-sites.md`.
- [ ] T004 [P] Inventory all current readers/writers of `SystemStateProperties.bbox` / `.zoom` / `.center` to confirm zero runtime blast radius for the 1B schema breaking change. Expected count: 0. Capture at `specs/261-session-state-systemstate/research-notes/spatial-fields-call-sites.md`. File: `specs/261-session-state-systemstate/research-notes/spatial-fields-call-sites.md`.

## Phase 2: Foundation

**Goal**: Land the LinkML delta, regenerate bindings, build the variant-agnostic skeleton of the shared SystemState helper, and put VS Code's save sequencing in the FR-019 shape. After this phase, both hosts can read/write SystemState features generically; per-variant logic is added in Phases 3–6.

**Why blocking**: Every user story depends on (a) the new schema bindings, (b) the helper's public API, (c) FR-019 atomicity, (d) sidecar version-bump support. No story can land without these.

### Schema delta + codegen

- [ ] T010 Modify the LinkML schema per `contracts/linkml-delta.md`: (a) add `current_time: datetime` (optional) to `SystemStateProperties`; (b) **remove** `bbox`, `zoom`, `center` from `SystemStateProperties`; (c) **add** `viewport: ViewportPolygon` (optional) to `SystemStateProperties`; (d) add four `rules:` blocks (one per variant) pinning per-variant required fields conditionally on `state_type`. File: `shared/schemas/src/linkml/geojson.yaml`.
- [ ] T011 Regenerate TypeScript bindings: `pnpm --filter @debrief/schemas gen:typescript`. Verify `SystemStateProperties` includes `current_time?: string` and `viewport?: ViewportPolygon`, and no longer includes `bbox` / `zoom` / `center`. File: `shared/schemas/src/generated/typescript/types.ts`.
- [ ] T012 Regenerate Pydantic bindings: `pnpm --filter @debrief/schemas gen:pydantic`. Verify the generated class matches. File: `shared/schemas/src/generated/python/debrief_schemas/` (module path).
- [ ] T013 [P] Regenerate JSON Schema bindings: `pnpm --filter @debrief/schemas gen:jsonschema`. File: `shared/schemas/src/generated/jsonschema/`.

### Schema fixtures (golden) — closes the gap #237 left

- [ ] T014 [P] Create `valid/active-storyboard.json` fixture (golden — Phase 4 will write the live runtime against this shape). File: `shared/schemas/fixtures/system-state/valid/active-storyboard.json`.
- [ ] T015 [P] Create `valid/temporal.json` fixture (with all three of `start_time`, `end_time`, `current_time`). File: `shared/schemas/fixtures/system-state/valid/temporal.json`.
- [ ] T016 [P] Create `valid/spatial.json` fixture using `ViewportPolygon` shape (4 coordinates + zoom). File: `shared/schemas/fixtures/system-state/valid/spatial.json`.
- [ ] T017 [P] Create `valid/selection.json` fixture (with non-empty `selected_ids`). File: `shared/schemas/fixtures/system-state/valid/selection.json`.
- [ ] T018 [P] Create `valid/selection-empty.json` fixture (empty array — "explicit no selection"). File: `shared/schemas/fixtures/system-state/valid/selection-empty.json`.
- [ ] T019 [P] Create `invalid/temporal-missing-current-time.json` — well-formed except missing field, demonstrates `current_time` is OPTIONAL at the schema level. File: `shared/schemas/fixtures/system-state/invalid/temporal-missing-current-time.json`. (NOTE: this fixture is actually **VALID** at the schema level since `current_time` is optional — name should be `valid/temporal-no-current-time.json`. Rename if confirmed.)
- [ ] T020 [P] Create `invalid/temporal-current-time-out-of-window.json` — schema-valid but Article XIV.4 / FR-018 cross-field invariant violated. File: `shared/schemas/fixtures/system-state/invalid/temporal-current-time-out-of-window.json`. (Adherence test must classify this correctly — see T023.)
- [ ] T021 [P] Create `invalid/temporal-bad-window.json` — `start_time > end_time`. File: `shared/schemas/fixtures/system-state/invalid/temporal-bad-window.json`.
- [ ] T022 [P] Create `invalid/spatial-bad-polygon.json` (e.g. non-axis-aligned, or wrong coordinate count). File: `shared/schemas/fixtures/system-state/invalid/spatial-bad-polygon.json`.
- [ ] T023 [P] Create `invalid/multiple-same-state-type.json` — two features with `state_type: "spatial"` in the same FC. File: `shared/schemas/fixtures/system-state/invalid/multiple-same-state-type.json`.
- [ ] T024 [P] Create `invalid/unknown-state-type.json` — `state_type: "not-a-variant"`. File: `shared/schemas/fixtures/system-state/invalid/unknown-state-type.json`.
- [ ] T025 [P] Create `invalid/missing-discriminator.json` — `properties.kind = "SYSTEM"` but no `state_type`. File: `shared/schemas/fixtures/system-state/invalid/missing-discriminator.json`.
- [ ] T026 [P] Create `invalid/selection-non-string-id.json` — `selected_ids: [1, 2]` (numbers, not strings). File: `shared/schemas/fixtures/system-state/invalid/selection-non-string-id.json`.

### Schema adherence tests

- [ ] T027 [test] Schema adherence: every `valid/*.json` parses through Pydantic without errors and round-trips Python → JSON → Python with bit-identical output. File: `shared/schemas/tests/test_system_state_adherence.py`.
- [ ] T028 [test] Schema adherence: every `invalid/*.json` (except `valid/temporal-no-current-time.json`) fails to parse through Pydantic. File: `shared/schemas/tests/test_system_state_adherence.py` (same file — separate test function).
- [ ] T029 [test] Cross-language round-trip: Python writes a fixture → TypeScript reads → TypeScript writes → Python reads → bit-equal. Closes Article II.2. File: `shared/schemas/tests/test_system_state_round_trip.py`.

### Shared helper module — variant-agnostic skeleton

- [ ] T030 Create the helper module barrel. Re-export from `@debrief/session-state` via `services/session-state/src/index.ts` so hosts import from a single name. File: `services/session-state/src/system-state/index.ts`.
- [ ] T031 Implement `SystemStateLoadError` class with the 5 kinds enumerated in `contracts/system-state-helper.ts.md` (incl. `cross-field-invariant`). File: `services/session-state/src/system-state/errors.ts`.
- [ ] T032 [P] Implement compile-time exhaustiveness guard over `SystemStateTypeEnum` per R-005. File: `services/session-state/src/system-state/exhaustive.ts`.
- [ ] T033 [P] Implement Zod discriminated-union validators for `SystemStateProperties` (one schema per variant, `z.discriminatedUnion('state_type', [...])` over the four). Verify structurally against generated TS types via `z.infer`. File: `services/session-state/src/system-state/validate.ts`.
- [ ] T034 Implement `readSystemStateFromFeatureCollection(fc)` per `contracts/system-state-helper.ts.md`. Handles: no candidates → empty map; one well-formed → populate; malformed → throw; multiple same state_type → throw; unknown state_type → throw; missing discriminator → throw. Does NOT yet do cross-field validation (that's T035). File: `services/session-state/src/system-state/read.ts`.
- [ ] T035 Extend `validate.ts` with cross-field invariants per FR-018 / R-011: temporal variant — `current_time ∈ [start_time, end_time]` when present, and `start_time ≤ end_time`. Wire into `readSystemStateFromFeatureCollection` so violations throw `SystemStateLoadError(kind='cross-field-invariant')`. File: `services/session-state/src/system-state/validate.ts` (extend) AND `services/session-state/src/system-state/read.ts` (call site).
- [ ] T036 Implement `writeSystemStateIntoFeatureCollection(fc, input, ctx)` per contract. Variant-agnostic — iterates `input` keys, upserts features, appends provenance LogEntry using ctx (R-008 / 2A field mapping). Pure — does not mutate `fc`. Uses ULID for new feature IDs. File: `services/session-state/src/system-state/write.ts`.
- [ ] T037 Implement `MIGRATION_SCOPE` typed constant per `contracts/slice-mappings.md` — empty `storeToVariant` for all four variants initially; per-variant tables populated in Phases 3–6. File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T038 Implement `prepareSidecarForSave(...)` per contract — variant-agnostic; uses `MIGRATION_SCOPE` to compute the omit set. File: `services/session-state/src/system-state/mapping.ts` (same file as T037 — barrel exports).

### Helper unit tests (variant-agnostic — per-variant tests added with each story)

- [ ] T039 [test] Unit tests for `read.ts`: every `SystemStateLoadError.kind` branch hit at least once using fixtures from T019–T026. File: `services/session-state/src/system-state/__tests__/read.test.ts`.
- [ ] T040 [P][test] Unit tests for `write.ts`: idempotent (up to provenance), no mutation of input `fc`, cardinality invariant preserved post-write. File: `services/session-state/src/system-state/__tests__/write.test.ts`.
- [ ] T041 [P][test] Unit tests for `validate.ts`: each Zod variant accepts happy fixtures, rejects wrong-shape ones, and cross-field invariants from T035 fire as expected. File: `services/session-state/src/system-state/__tests__/validate.test.ts`.
- [ ] T042 [P][test] Round-trip: `write(read(fc))` for every valid fixture produces an FC structurally equal to the input (modulo provenance length increase). File: `services/session-state/src/system-state/__tests__/round-trip.test.ts`.

### Sidecar version + migration_lineage

- [ ] T043 Bump `CURRENT_SESSION_FILE_VERSION` from `"1.1.0"` to `"1.2.0"` per R-004 / FR-015. Add optional `migration_lineage` field to the `SessionFile` interface. File: `services/session-state/src/persistence/load.ts` (definition) and `services/session-state/src/persistence/save.ts` (writer).

### VS Code save sequencing (FR-019 — closes F1)

- [ ] T044 Refactor `saveSession.ts` to FC-first/sidecar-second per R-012. Lines 163–208: reorder so `storeFeatureCollection` runs before sidecar write; propagate FC write failures (do not catch as non-blocking); on sidecar failure after FC success, surface a structured recovery hint to the user via VS Code notifications API. File: `apps/vscode/src/commands/saveSession.ts`.
- [ ] T045 [test] Test that mocks `storeFeatureCollection` to throw and asserts the sidecar is NOT written, the error propagates to the caller, and the user-visible message is correct. File: `apps/vscode/test/saveSession.atomicity.test.ts`.
- [ ] T046 [P][test] Test that mocks the sidecar write to throw after FC succeeds and asserts the FC contains the new SystemState features, the user sees the recovery hint, and the in-memory store reflects the intended state. File: `apps/vscode/test/saveSession.atomicity.test.ts` (same file as T045 — separate test).

## Phase 3: User Story 1 — Spatial round-trip (P1)

**Goal**: An analyst opens a colleague's plot and lands on the same map view (bbox/zoom/centre) the colleague was looking at when they saved. End-to-end across both hosts.

**Independent test**: Save in web-shell with a recognisable polygon viewport, transfer ONLY the plot file (no sidecar), open in VS Code (and the reverse). Map opens at saved polygon, not the default view. Acceptance per SC-001.

### Wire the spatial mapping into the shared helper

- [ ] T050 Populate `SPATIAL_MIGRATION_SCOPE` in `mapping.ts` per `contracts/slice-mappings.md`: identity mapping `viewport ↔ viewport` (both sides use `ViewportPolygon`). File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T051 Implement `applySpatialReconciliation(fromPlot, fromSidecar) → HydratedSpatialSlice` per contract. SystemState wins for `viewport`; sidecar wins for `rotation`/`drawingMode`/`drawingPaletteIndex`/`viewportLocked`. File: `services/session-state/src/system-state/mapping.ts` (same module).
- [ ] T052 [P][test] Unit tests for `SPATIAL_MIGRATION_SCOPE` + `applySpatialReconciliation`: identity round-trip on `viewport`; sidecar values preserved for non-migrated fields; precedence rules verified for each combination of (plot present/absent × sidecar present/absent). File: `services/session-state/src/system-state/__tests__/spatial.test.ts`.

### Wire spatial into the load path (both hosts)

- [ ] T053 Modify `loadSession.ts` to call `readSystemStateFromFeatureCollection` BEFORE reading the sidecar, then call `applySpatialReconciliation(map.spatial, sidecar.spatial)` to hydrate the spatial slice. File: `services/session-state/src/persistence/load.ts`.
- [ ] T054 [P][test] Unit test: legacy sidecar-only plot (no SystemState/spatial feature in FC) loads with sidecar viewport. File: `services/session-state/tests/unit/persistence.spatial.test.ts`.
- [ ] T055 [P][test] Unit test: plot with SystemState/spatial feature AND a different sidecar viewport — plot wins per FR-007. File: `services/session-state/tests/unit/persistence.spatial.test.ts` (same file).

### Wire spatial into the save path (both hosts)

- [ ] T056 Modify `saveSession.ts` (the package, not the VS Code command — the latter calls into here) to invoke `writeSystemStateIntoFeatureCollection` with the `spatial` input derived from the current slice. Call `prepareSidecarForSave` afterwards. File: `services/session-state/src/persistence/save.ts`.
- [ ] T057 [P][test] Unit test: saving with a non-null `spatial.viewport` produces an FC with a SystemState/spatial feature whose `viewport` field matches the slice's `viewport` byte-for-byte. File: `services/session-state/tests/unit/persistence.spatial.test.ts`.
- [ ] T058 [P][test] Unit test: post-save sidecar does NOT contain the migrated `viewport` key (Story 5 verification for spatial). File: `services/session-state/tests/unit/persistence.spatial.test.ts`.

### Cross-host E2E parity

- [ ] T059 [test] Playwright spec — web-shell writes spatial SystemState feature, the resulting plot file (no sidecar) is reopened in a fresh web-shell session and the bbox is restored. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` (new file — initial scaffolding; temporal/selection tests added in later phases).
- [ ] T060 [test] VS Code extension test (Mocha) — VS Code writes spatial SystemState feature; assert the file content. File: `apps/vscode/test/system-state-roundtrip.test.ts` (new file — initial scaffolding).
- [ ] T061 [test] VS Code → web-shell cross-host: a plot file written by the VS Code Mocha test is opened by a Playwright spec which asserts spatial state restored. Shares a fixture corpus at `specs/261-session-state-systemstate/contracts/fixtures/` per R-006. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` (extend T059).
- [ ] T062 [test] web-shell → VS Code cross-host: a plot file written by the Playwright spec is read by a Mocha test which asserts spatial state restored. File: `apps/vscode/test/system-state-roundtrip.test.ts` (extend T060).

### Phase 3 evidence capture (executed under the Playwright spec — saved into evidence/)

- [ ] T063 The T059 Playwright spec saves `spatial-roundtrip-host-a.png` (with recognisable bbox set) and `spatial-roundtrip-host-b.png` (same bbox restored on a fresh session) directly into `specs/261-session-state-systemstate/evidence/screenshots/`. Follow the path-resolution pattern in `apps/web-shell/playwright/tests/properties-screenshots.spec.ts`. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts` (extend).

## Phase 4: User Story 4 — VS Code parity + active_storyboard consolidation (P1)

**Goal**: VS Code can read AND write every `SystemState` variant — same surface as web-shell. The web-shell's host-private `activeStoryboardPersistence.ts` is folded into the shared helper. No host writes SystemState features via a host-private code path. (FR-011/FR-012.)

**Independent test**: Pin a storyboard in web-shell, save, transfer plot file, open in VS Code, verify the same pin is honoured. Reverse direction also works. Acceptance per SC-003 — for the `active_storyboard` variant cell of the 16-case matrix.

### Wire active_storyboard mapping into the shared helper

- [ ] T070 Populate `ACTIVE_STORYBOARD_MIGRATION_SCOPE` per `contracts/slice-mappings.md`: maps storyboard slice `activeStoryboardId` ↔ SystemState `active_storyboard_id`. Identity mapping (no transformation). File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T071 Implement `applyActiveStoryboardReconciliation(fromPlot, currentStoreState)`. Reuses the existing #237 default-fallback semantics ("no SystemState/active_storyboard feature → use `getActiveStoryboardDefault()`"). File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T072 [P][test] Unit tests for `ACTIVE_STORYBOARD_MIGRATION_SCOPE` + reconciliation. File: `services/session-state/src/system-state/__tests__/active-storyboard.test.ts`.

### Consolidate #237's writer (sequenced — one PR, three commits)

- [ ] T073 **Commit A** — Add delegation: leave `apps/web-shell/src/services/activeStoryboardPersistence.ts` in place but have its two functions call INTO the shared helper. Existing web-shell call sites unchanged; behaviour unchanged; just one extra hop. Verify the existing #237 Playwright + Vitest tests still pass. File: `apps/web-shell/src/services/activeStoryboardPersistence.ts`.
- [ ] T074 **Commit B** — Re-point all web-shell call sites (identified in T003) to import from `@debrief/session-state` directly. File: web-shell call-site files (per T003 inventory).
- [ ] T075 **Commit C** — Delete `apps/web-shell/src/services/activeStoryboardPersistence.ts` and `apps/web-shell/src/services/__tests__/activeStoryboardPersistence.test.ts`. Re-point or rewrite the latter as a thin smoke test against the shared helper if it exercised anything not already covered by Phase 2 helper tests. Files: `apps/web-shell/src/services/activeStoryboardPersistence.ts` (DELETED), `apps/web-shell/src/services/__tests__/activeStoryboardPersistence.test.ts` (DELETED or REPOINTED).

### Wire active_storyboard into VS Code

- [ ] T076 Modify VS Code's load path to invoke the shared helper for `active_storyboard` and apply the pin via the existing storyboard-selection store action. File: `apps/vscode/src/commands/loadSession.ts`.
- [ ] T077 Modify VS Code's save path to populate the `active_storyboard` input to `writeSystemStateIntoFeatureCollection`. File: `apps/vscode/src/commands/saveSession.ts`.
- [ ] T078 [test] VS Code extension test: pin a storyboard via the store, save, inspect the resulting plot file, assert SystemState/active_storyboard feature is present with the correct `active_storyboard_id`. File: `apps/vscode/test/system-state-roundtrip.test.ts` (extend Phase 3 file).

### Cross-host E2E (extend matrix)

- [ ] T079 [test] Extend the Playwright `system-state-roundtrip.spec.ts` to cover the active_storyboard variant cells (4 of 16 — web-shell↔web-shell + web-shell↔VS Code, via fixture corpus). The existing #237 spec `active-storyboard-persistence.spec.ts` continues to run (same-host) as a regression. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.

### Verify #237 regression coverage

- [ ] T080 [test] Run the existing `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` post-T075. Must pass unchanged — the helper is the new writer; the behaviour is preserved. File: `apps/web-shell/playwright/tests/active-storyboard-persistence.spec.ts` (verify only; no edit unless imports break).

## Phase 5: User Story 2 — Temporal round-trip (P2)

**Goal**: An analyst opens a colleague's plot and lands on the same time window (`start_time`/`end_time`) AND playhead position (`current_time`). Scrubbing locally does NOT mark the plot dirty (FR-017). Out-of-window `current_time` fails load with a clear error (FR-018 / R-011 — closes F2).

**Independent test**: Save in one host with a specific time window + playhead, transfer plot file, open in the other host, time controller renders the same window with the playhead in the same position. Acceptance per SC-002.

### Wire the temporal mapping into the shared helper

- [ ] T090 Populate `TEMPORAL_MIGRATION_SCOPE` per `contracts/slice-mappings.md`: `timeRange.start → start_time`, `timeRange.end → end_time`, `currentTime → current_time`. Stays-in-sidecar: `timeFilter`, `stepSize`, `playbackRate`, `playbackState`, `displayMode`. File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T091 Implement `applyTemporalReconciliation(fromPlot, fromSidecar) → HydratedTemporalSlice`. SystemState wins for the three migrated fields; sidecar wins for the five per-machine fields. File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T092 [P][test] Unit tests for `TEMPORAL_MIGRATION_SCOPE` + reconciliation, including the precedence matrix for each combination of (plot present/absent × sidecar present/absent × `current_time` present/absent). File: `services/session-state/src/system-state/__tests__/temporal.test.ts`.

### Wire temporal into the load path

- [ ] T093 Extend `loadSession.ts` (services/session-state) to also call `applyTemporalReconciliation`. Spatial reconciliation was wired in Phase 3 — this just adds temporal alongside. File: `services/session-state/src/persistence/load.ts`.
- [ ] T094 [P][test] Unit test: legacy sidecar-only plot loads with sidecar `timeRange`/`currentTime`. File: `services/session-state/tests/unit/persistence.temporal.test.ts`.
- [ ] T095 [P][test] Unit test: plot with SystemState/temporal feature carrying `current_time` outside `[start_time, end_time]` throws `SystemStateLoadError(kind='cross-field-invariant')`. Closes F2. File: `services/session-state/tests/unit/persistence.temporal.test.ts`.
- [ ] T096 [P][test] Unit test: plot with `start_time > end_time` throws `SystemStateLoadError(kind='cross-field-invariant')`. File: `services/session-state/tests/unit/persistence.temporal.test.ts`.

### Wire temporal into the save path

- [ ] T097 Extend `save.ts` to populate the `temporal` input for `writeSystemStateIntoFeatureCollection`. File: `services/session-state/src/persistence/save.ts`.
- [ ] T098 [P][test] Unit test: saving with a non-null `temporal.timeRange` produces an FC with a SystemState/temporal feature whose `start_time`, `end_time`, `current_time` match the slice. File: `services/session-state/tests/unit/persistence.temporal.test.ts`.
- [ ] T099 [P][test] Unit test: post-save sidecar omits the migrated keys (`timeRange.start`, `timeRange.end`, `currentTime` — but keeps `playbackState`, etc.). Story 5 verification for temporal. File: `services/session-state/tests/unit/persistence.temporal.test.ts`.

### FR-017 verification (no dirty-on-scrub)

- [ ] T100 [test] Behaviour test: programmatically scrub the playhead (call the slice's `setCurrentTime` action), then check the host's dirty-tracking signal — must NOT be set to dirty. (Web-shell-side test since web-shell has the time controller wired most directly.) File: `apps/web-shell/src/services/__tests__/temporal-scrub-dirty.test.ts` (new).

### Cross-host E2E (extend matrix)

- [ ] T101 [test] Extend the Playwright `system-state-roundtrip.spec.ts` to cover the temporal variant — set a window + playhead, save, reload, assert restored. Cover both same-host and cross-host (via fixture corpus). File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.
- [ ] T102 [test] Extend `apps/vscode/test/system-state-roundtrip.test.ts` correspondingly. File: `apps/vscode/test/system-state-roundtrip.test.ts`.

### Phase 5 evidence capture

- [ ] T103 Extend T101 Playwright spec to save `temporal-roundtrip-host-a.png` (recognisable time window + playhead) and `temporal-roundtrip-host-b.png` (restored on second session) into `specs/261-session-state-systemstate/evidence/screenshots/`. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.

## Phase 6: User Story 3 — Selection round-trip (P2)

**Goal**: An analyst opens a colleague's plot and finds the same set of features pre-selected. Selection migrates as plot-shared per Q1=B; future #251 work, if commissioned, layers a per-user override on top.

**Independent test**: Save with feature IDs `[feat-a, feat-b]` selected, transfer plot file, open elsewhere, same two features pre-selected. Acceptance per SC-002a.

### Wire the selection mapping into the shared helper

- [ ] T110 Populate `SELECTION_MIGRATION_SCOPE` per `contracts/slice-mappings.md`: `selection → selected_ids` (identity). Stays-in-sidecar: `hiddenFeatureIds`, `styleVersion`, `featureCollectionUri`. File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T111 Implement `applySelectionReconciliation(fromPlot, fromSidecar) → HydratedFeaturesSlice`. SystemState wins for `selected_ids`; sidecar wins for the rest of the `features` slice. File: `services/session-state/src/system-state/mapping.ts`.
- [ ] T112 [P][test] Unit tests for `SELECTION_MIGRATION_SCOPE` + reconciliation. Includes the "empty array" case (explicit no-selection) — must round-trip as empty, not as absent. File: `services/session-state/src/system-state/__tests__/selection.test.ts`.

### Wire selection into the load path

- [ ] T113 Extend `loadSession.ts` to also call `applySelectionReconciliation`. File: `services/session-state/src/persistence/load.ts`.
- [ ] T114 [P][test] Unit test: legacy sidecar-only plot loads with sidecar `selection`. File: `services/session-state/tests/unit/persistence.selection.test.ts`.
- [ ] T115 [P][test] Unit test: plot with SystemState/selection feature wins over sidecar. File: `services/session-state/tests/unit/persistence.selection.test.ts`.

### Wire selection into the save path

- [ ] T116 Extend `save.ts` to populate the `selection` input for `writeSystemStateIntoFeatureCollection`. File: `services/session-state/src/persistence/save.ts`.
- [ ] T117 [P][test] Unit test: saving with selection `["feat-a","feat-b"]` produces an FC with a SystemState/selection feature whose `selected_ids` matches. File: `services/session-state/tests/unit/persistence.selection.test.ts`.
- [ ] T118 [P][test] Unit test: post-save sidecar omits `selection` (Story 5 verification for selection); preserves `hiddenFeatureIds` and other non-migrated fields. File: `services/session-state/tests/unit/persistence.selection.test.ts`.

### Cross-host E2E (extend matrix — completes the 16-cell matrix)

- [ ] T119 [test] Extend Playwright spec to cover selection — same-host + cross-host via fixture corpus. After this task the 4×4 matrix is complete. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.
- [ ] T120 [test] Extend VS Code Mocha test correspondingly. File: `apps/vscode/test/system-state-roundtrip.test.ts`.

### Phase 6 evidence capture

- [ ] T121 Extend T119 Playwright spec to save `selection-roundtrip-host-a.png` and `selection-roundtrip-host-b.png` into `specs/261-session-state-systemstate/evidence/screenshots/`. File: `apps/web-shell/playwright/tests/system-state-roundtrip.spec.ts`.

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Close out Story 5 (sidecar shrinkage — naturally delivered by Phases 3/5/6, just needs evidence), capture all evidence artefacts, run the legacy-plot fixture corpus, write the feature post, update the PR.

### Story 5 — Sidecar shrinkage verification (no implementation needed — verify the side-effect)

- [ ] T130 [test] Integration test using the legacy-plot fixture corpus: load a #237-era plot (FC has `active_storyboard` only, sidecar v1.1.0 has all three migrated slices) → save → assert the resulting sidecar is v1.2.0, omits the migrated keys, AND the FC gains the three new SystemState features. Closes the FR-014 backward-compat verification. File: `services/session-state/tests/integration/legacy-plot-fixtures.test.ts` (new).
- [ ] T131 [P][test] Same as T130 but starting from a pre-#237-era plot (FC has zero SystemState features). Asserts the upgrade path is identical regardless of the starting #237 state. File: `services/session-state/tests/integration/legacy-plot-fixtures.test.ts`.
- [ ] T132 Create the legacy-plot fixture corpus itself: 2–3 representative pre-migration plot+sidecar pairs committed to `services/session-state/tests/integration/legacy-plot-fixtures/`. Inputs are crafted by hand to be minimal but representative (small FC, both `active_storyboard` and non-`active_storyboard` flavours). File: `services/session-state/tests/integration/legacy-plot-fixtures/` (directory + ~6 files).

### Evidence Collection

- [ ] T133 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) in `specs/261-session-state-systemstate/evidence/test-summary.md`. YAML front matter MUST include `feature`, `captured_at`, `git_sha`, `tests_passed`, `tests_failed`, `tests_skipped`, `coverage_pct`. Body documents the cross-host parity matrix (16 cells), schema adherence (4 valid + ≥7 invalid fixtures), helper unit suite, atomicity tests, legacy-fixture round-trip, and the FR-018 cross-field-invariant tests. File: `specs/261-session-state-systemstate/evidence/test-summary.md`.
- [ ] T134 [P] Create usage demonstration in `specs/261-session-state-systemstate/evidence/usage-example.md`. Shows a TypeScript snippet calling `readSystemStateFromFeatureCollection`/`writeSystemStateIntoFeatureCollection` for each variant, with the expected before/after FeatureCollection JSON. File: `specs/261-session-state-systemstate/evidence/usage-example.md`.
- [ ] T135 [P] Capture round-trip evidence (Article II.2 — Schema Change rubric): Python → JSON → TypeScript → JSON → Python bit-equality across all four valid fixtures. Format as a markdown table. File: `specs/261-session-state-systemstate/evidence/round-trip-evidence.md`.
- [ ] T136 [P] Save `evidence/sidecar-before.json` (a sidecar saved by a pre-migration build of the project, taken from the legacy-fixture corpus T132) and `evidence/sidecar-after.json` (the same plot's sidecar after T130 has run). The diff visualises Story 5. Files: `specs/261-session-state-systemstate/evidence/sidecar-before.json`, `specs/261-session-state-systemstate/evidence/sidecar-after.json`.
- [ ] T137 [P] Save `evidence/plot-before.json` (FC before migration) and `evidence/plot-after.json` (FC after — three new SystemState features). Files: `specs/261-session-state-systemstate/evidence/plot-before.json`, `specs/261-session-state-systemstate/evidence/plot-after.json`.
- [ ] T138 Run the full Playwright suite (`cd apps/web-shell && node run-playwright.mjs system-state-roundtrip`) to produce all six round-trip screenshots already authored in Phases 3/5/6 (spatial/temporal/selection × host-a/host-b). Confirm files land at `specs/261-session-state-systemstate/evidence/screenshots/`. No file path — verification step.
- [ ] T139 Record the interaction GIF (< 5s, < 2MB) showing the headline flow — host A saves a plot, host B opens the same file (no sidecar) and lands on the saved state. Use Playwright's video recording + ffmpeg-to-gif (see `docs/e2e-testing-guide.md`). File: `specs/261-session-state-systemstate/evidence/screenshots/interaction.gif`.
- [ ] T140 [P] Capture `evidence/strict-on-import-error.png`: the host UI surface when a plot has a malformed SystemState feature (Article XIV.4 demo). Use a hand-crafted broken-fixture plot and load it in either host. File: `specs/261-session-state-systemstate/evidence/strict-on-import-error.png`.
- [ ] T141 [P] Capture `evidence/atomicity-recovery-hint.png`: the VS Code recovery-hint message when sidecar write fails after FC success (FR-019). Requires mocking the sidecar writer in a manual run — or use the test fixture's screenshot capability. File: `specs/261-session-state-systemstate/evidence/atomicity-recovery-hint.png`.

### Media Content

- [ ] T142 Create the feature post in `specs/261-session-state-systemstate/media/shipped-post.md`. Title prefixed with `Building `. First three body sections (What We're Building, How It Fits, Key Decisions) copied verbatim from `evidence/opening-context.md`. Remaining sections (Screenshots, By the Numbers, Lessons Learned, What's Next) written from the evidence captured above. Use the Content Specialist agent (`.claude/agents/media/content.md`) via Task tool. File: `specs/261-session-state-systemstate/media/shipped-post.md`.

### Final cleanups

- [ ] T143 Run `task verify` from repo root one final time. All checks (lint + typecheck + unit + Playwright E2E) must be green. No file — verification step.
- [ ] T144 [P] Update `BACKLOG.md` row 249: status `specified` → `implementing` → `complete` (struck through) at the appropriate point during this phase. File: `BACKLOG.md`.
- [ ] T145 [P] Add an ADR entry to `docs/project_notes/decisions.md` for the spatial-shape unification (1B / R-010) and the shared-helper module location (R-001). Two ADRs, sequenced. File: `docs/project_notes/decisions.md`.
- [ ] T146 [P] Log work completion in `docs/project_notes/issues.md` with ticket ID (#249), PR URL (#629), and evidence directory link. File: `docs/project_notes/issues.md`.

### PR Creation

- [ ] T147 Create PR and publish blog: run `/speckit.pr`. This task MUST run last. It updates PR #629 with the final commit set + evidence, AND opens a cross-repo PR in debrief.github.io with `shipped-post.md`. Returns both PR URLs.

**Task T147 must run last. It depends on T130–T146 being complete.**

## Dependencies

### Phase-level ordering

```text
Phase 1 (Setup) ──┐
                  ├─▶ Phase 2 (Foundation: schema + helper skeleton + FR-019)
                  │       │
                  │       ├──┬─▶ Phase 3 (Spatial — P1)        ──┐
                  │       │  │                                    │
                  │       │  └─▶ Phase 4 (active_storyboard — P1) │
                  │       │                                       │
                  │       └─▶ Phase 5 (Temporal — P2)  ──────────┤── all converge ──▶ Phase 7 (Polish, Story 5, evidence, PR)
                  │                                              │
                  │           Phase 6 (Selection — P2) ─────────┘
                  ▼
```

### Hard dependencies (must-precede)

- **T010 → T011, T012, T013** — codegen depends on the LinkML edit landing first.
- **T011, T012 → T027, T028, T029** — adherence tests need the new bindings.
- **T014–T026 → T027–T029** — adherence tests need the fixtures.
- **T030–T038 → all per-variant tasks (T050+, T070+, T090+, T110+)** — the helper skeleton must exist before per-variant mappings can land.
- **T031 (SystemStateLoadError) → T035 (cross-field validator)** — validator throws the error class.
- **T035 → T039, T095, T096** — cross-field tests need the validator wired.
- **T043 → T130, T131, T136** — sidecar version-bump and `migration_lineage` shape must exist before the legacy-plot tests assert on them.
- **T044 → T045, T046** — atomicity tests need the refactored save flow.
- **T050–T052 → T053–T058** — spatial mapping/reconciliation must exist before load/save wire it in.
- **T056 (save.ts spatial wiring) → T057, T058** — save tests need the wiring.
- **T059–T062 → T063 (screenshots)** — screenshots are emitted by the spec.
- **T073 (Commit A: delegation) → T074 (Commit B: re-point) → T075 (Commit C: delete)** — the consolidation MUST be sequenced; deleting before re-pointing breaks callers.
- **T076, T077 → T078, T079** — VS Code active_storyboard tests need the host wiring.
- **T080 (regression check) depends on T075** — runs the existing #237 spec AFTER deletion to confirm the shared helper preserves behaviour.
- **T090–T092 → T093–T099** — same shape for temporal as spatial.
- **T100 → none** — FR-017 dirty-check is independent of the matrix.
- **T110–T112 → T113–T118** — same shape for selection.
- **T119, T120, T130, T131 → T138** — the full matrix + legacy fixtures must pass before the Playwright run that emits the canonical screenshot set.
- **T132 → T130, T131** — fixture corpus must exist before tests using it can pass.
- **All evidence tasks (T133–T141) → T142 (shipped-post.md)** — the post quotes from evidence.
- **T143 (task verify) → T147** — `task verify` must be green before the PR-creation task runs.
- **All previous tasks → T147 (/speckit.pr)** — the PR commits and the blog publish are the final action.

### Parallelisation summary (`[P]` tasks)

- **Inside Phase 1**: T003, T004 in parallel.
- **Inside Phase 2 codegen**: T013 alone is [P]; T011/T012 must follow T010 strictly.
- **Inside Phase 2 fixtures**: T014–T026 all [P] (each fixture is an independent file).
- **Inside Phase 2 helper**: T032, T033 in parallel after T030 lands the barrel; T040, T041, T042 in parallel after T034/T036 land.
- **Inside Phase 2 atomicity tests**: T046 can run alongside T045 if they're in the same test file.
- **Inside Phase 3**: T052, T054, T055, T057, T058 are all [P] inside the spatial story.
- **Inside Phase 4 consolidation**: NO parallelism — T073/T074/T075 are strictly sequential commits.
- **Inside Phase 5**: T092, T094–T099 are [P] inside the temporal story.
- **Inside Phase 6**: T112, T114–T118 are [P] inside the selection story.
- **Inside Phase 7 evidence**: T134, T135, T136, T137, T140, T141 are [P] — each writes to a distinct file. T144, T145, T146 are [P] (different files).

### Cross-story parallelism

After Phase 2 lands, Phases 3, 4, 5, and 6 each touch a different `MIGRATION_SCOPE` entry, a different reconciliation function, and disjoint test files. They COULD theoretically be developed in parallel — but they all extend the same `loadSession.ts` and `saveSession.ts`, creating merge conflicts. **Recommendation: sequence them P1 → P1 → P2 → P2 to keep merge surface small.** The single-PR/single-branch context (#629) makes parallel branches unattractive here.

## Implementation Strategy

### Incremental delivery — what works after each phase

| After phase | What demonstrably works (independent test) |
|---|---|
| Phase 1 | Codegen pipeline is healthy; no functional change. |
| Phase 2 | LinkML schema has the new shape; all 11+ fixtures pass adherence; the shared helper can read a FC with zero SystemState features (returns empty map); VS Code save is atomic on the FC-write step (FR-019 verified via mock test). NO user-visible round-trip yet — that needs at least one per-variant phase. |
| Phase 3 (Spatial — P1) | **HEADLINE BEHAVIOUR LIVE for spatial.** A user can save a plot in either host, transfer ONLY the plot file, open in the other host, and the map view is restored. SC-001 passes. |
| Phase 4 (active_storyboard — P1) | #237's existing behaviour is preserved AND VS Code now also produces/consumes `active_storyboard` SystemState features. The 4 active_storyboard cells of the 16-cell matrix pass. The host-private writer in web-shell is gone. |
| Phase 5 (Temporal — P2) | A user gets the time window + playhead restoration too (SC-002). The 4 temporal cells of the matrix pass. F2 (out-of-window current_time) is closed — bad plots fail with a clear error instead of rendering off-screen. |
| Phase 6 (Selection — P2) | Selection restoration (SC-002a). The full 16-cell matrix is green. |
| Phase 7 (Polish) | Story 5 verified end-to-end (sidecar shrinkage demonstrable via T136 evidence). Article XIV.4 strict-on-import demoed via T140. PR has full evidence + media; blog post drafted. |

Each per-variant phase is **independently shippable** — you could stop after Phase 3 + 4 and have a working "spatial + active_storyboard" subset. The plan is structured to deliver the highest-value variant (spatial, the uncontroversial slice per approval) first.

### Branching and PR strategy

This work is **one PR** (#629) updating progressively. Phase 4's consolidation (T073/T074/T075) is the only sequencing concern — the three commits MUST land in order within the same PR. If at any point the PR becomes too large for reviewer comfort (>~2000 LOC diff), this can be split into a foundation PR (Phases 1–2) and a per-variant follow-up PR (Phases 3–7), but the recommendation is to keep it together so the cross-host matrix lands as a single coherent unit.

### Mid-phase checkpoint commits

The Polish phase aside, commit cadence inside each phase should follow these checkpoints:
- After T010–T013 (schema + codegen): "schema delta lands".
- After T014–T029 (fixtures + adherence): "schema fixtures + tests".
- After T030–T042 (helper skeleton): "shared helper skeleton".
- After T043–T046 (sidecar version + atomicity): "FR-019 + sidecar v1.2.0".
- After each per-variant phase: one commit per phase ("spatial round-trip", "active_storyboard consolidation", "temporal round-trip", "selection round-trip").
- Inside Phase 4: T073, T074, T075 are separate commits (three commits in the consolidation sub-sequence).
- Inside Phase 7: one commit per evidence batch (test-summary, screenshots, GIF, media post, ADRs).

Each commit message body should reference the relevant FR / SC / R numbers from the spec/plan so the PR is greppable for compliance review.

### Risk mitigation

- **Schema regen drift**: T002 verifies the regen pipeline runs cleanly BEFORE we touch the schema, so any failure after T010 is genuinely T010's fault.
- **#237 consolidation breaking web-shell**: T073 (Commit A — delegation) keeps `activeStoryboardPersistence.ts` in place initially; T080 runs the existing #237 spec after deletion as a regression check. Three-commit sequence is reviewable.
- **Cross-host fixture drift**: T061/T062 use a SHARED fixture corpus at `specs/261-session-state-systemstate/contracts/fixtures/`. Both directions read the same files; this catches divergence between host writers immediately.
- **Article I.3 silent failures in atomicity**: T045/T046 explicitly mock the failure paths. F1/F2 close via FR-018/FR-019 with their own tests.
- **Playwright in cloud session**: Use the project's `run-playwright.mjs` wrappers — they handle `@sparticuz/chromium` extraction (see `docs/project_notes/playwright-installation-research.md`). Do not assume browsers can't be installed.
