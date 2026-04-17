# Tasks: Properties Panel for STAC Plot & Catalog Metadata

**Feature Branch**: `193-properties-panel`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Evidence Requirements

**Evidence Directory**: `specs/193-properties-panel/evidence/`
**Media Directory**: `specs/193-properties-panel/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `test-summary.md` | pytest + vitest + Playwright results with YAML front matter (git_sha, captured_at, tests_passed/failed/skipped, coverage_pct) | After all tests pass |
| `usage-example.md` | Concrete demo: open plot → edit `debrief:tags` → blur → verify persistence + provenance | After Story 1 passes |
| `screenshots/properties-form-light.png` | `PropertiesForm` Storybook screenshot (light theme) | After Storybook stories ship |
| `screenshots/properties-form-dark.png` | `PropertiesForm` Storybook screenshot (dark theme) | After Storybook stories ship |
| `screenshots/properties-form-vscode.png` | `PropertiesForm` Storybook screenshot (vscode theme) | After Storybook stories ship |
| `screenshots/interaction.gif` | < 5s, < 2MB GIF: analyst commits a tag edit → disk write → provenance entry | After Playwright E2E passes |
| `sample-item-before.json` | `item.json` before commit | During Story 1 evidence capture |
| `sample-item-after.json` | `item.json` after commit (showing `debrief:overrides` + `debrief:provenance_log`) | During Story 1 evidence capture |
| `round-trip-evidence.md` | LinkML → Pydantic → JSON Schema → TypeScript round-trip proof for `debrief:overrides` + `PropertiesProvenanceEntry` | After schema tests pass |
| `stale-edit-demo.md` | Transcript of Scenario 4 (concurrent external edit) | After stale-edit unit test passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `media/planning-post.md` | Blog post announcing the feature | Already exists (during `/speckit.plan`) |
| `media/linkedin-planning.md` | LinkedIn summary for planning | Already exists (during `/speckit.plan`) |
| `media/shipped-post.md` | Blog post celebrating completion | During Polish phase |
| `media/linkedin-shipped.md` | LinkedIn summary for shipped | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in debrief-future with evidence links | Final task in Polish phase |
| Blog PR | PR in debrief.github.io with shipped post | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

**Goal**: Scaffold the new `PropertiesPanel` folder, the `BrowserSelectionContext` module, and the webview E2E fixture directory. No logic yet — just module plumbing so parallel story work can begin.

- [x] T001 Create PropertiesPanel folder with index barrel `shared/components/src/PropertiesPanel/index.ts`
- [x] T002 [P] Create offline-invariant harness scaffold (throws placeholder) `shared/components/src/PropertiesPanel/__test__/offlineHarness.ts`
- [x] T003 [P] Register offline harness in vitest `setupFiles` for `@debrief/components` `shared/components/vitest.config.ts`
- [x] T004 [P] Create schema-evolution fixture directory `tests/fixtures/properties-panel/.gitkeep`
- [x] T005 [P] Add empty `BrowserSelectionContext.tsx` exporting a `null` context, provider, and `useBrowserSelection` hook `shared/components/src/StacBrowser/BrowserSelectionContext.tsx`
- [x] T006 [P] Add empty `evidence/` and `evidence/screenshots/` directories `specs/193-properties-panel/evidence/.gitkeep`

**Parallel window**: T002, T003, T004, T005, T006 all touch different files and can run concurrently after T001.


## Phase 2: Foundation (Schema + Shared Contracts)

**Goal**: Land the two LinkML additions (`debrief:overrides`, `debrief:provenance_log` + `PropertiesProvenanceEntry`), regenerate Pydantic/JSON Schema/TypeScript, and publish the shared TS contracts so downstream stories can import typed shapes. Everything here is blocking for Phase 3+.

**Independent verification**: After this phase, a golden fixture `item.json` containing both new fields validates against the generated JSON Schema, round-trips Python → JSON → TypeScript → JSON → Python unchanged, and the generated TypeScript types match the hand-authored contracts in `contracts/`.

### Schema (LinkML)

- [x] T007 Add `debrief:overrides` slot (array of strings, optional, default `[]`) to `StacExtensionProperties` `shared/schemas/src/linkml/stac-extension.yaml`
- [x] T008 Add `PropertiesProvenanceEntry` class (activity_id, timestamp, tool, method, fields, source) `shared/schemas/src/linkml/stac-extension.yaml`
- [x] T009 Add `debrief:provenance_log` slot (array of `PropertiesProvenanceEntry`, optional, default `[]`) to `StacExtensionProperties` `shared/schemas/src/linkml/stac-extension.yaml`
- [x] T010 Run `task generate` and commit regenerated Pydantic/JSON Schema/TypeScript outputs under `shared/schemas/src/generated/`

### Schema tests (Article II.2)

- [x] T011 [P][test] Golden fixture for `debrief:overrides` `shared/schemas/fixtures/stac-extension/overrides-valid.json`
- [x] T012 [P][test] Golden fixture for `debrief:provenance_log` with two entries `shared/schemas/fixtures/stac-extension/provenance-log-valid.json`
- [x] T013 [P][test] Round-trip test (Python → JSON → TS → JSON → Python) for new fields `shared/schemas/tests/test_properties_panel_roundtrip.py`
- [x] T014 [P][test] Structural comparison (gen-pydantic vs gen-jsonschema field type + optionality) `shared/schemas/tests/test_properties_panel_structural.py`
- [x] T015 [P][test] Golden-invalid fixture (provenance entry with empty `fields`) MUST fail validation `shared/schemas/fixtures/stac-extension/provenance-log-empty-fields-invalid.json`

### TypeScript contracts (webview-importable)

- [x] T016 [P] Publish `PropertiesProvenanceEntry` + `PROVENANCE_LOG_CAP` + `PROVENANCE_LOG_ARCHIVE_FILENAME` + `PROPERTIES_PANEL_TOOL_SENTINEL` + `isValidPropertiesProvenanceEntry` `shared/components/src/PropertiesPanel/provenanceTypes.ts`
- [x] T017 [P] Publish `PropertiesCommitMessage` + `PropertiesPanelMessage` `shared/components/src/PropertiesPanel/messageTypes.ts`
- [x] T018 [P] Publish `AUTO_DERIVED_FIELDS` readonly list + shared module (single source of truth for service + webview) `shared/components/src/PropertiesPanel/autoDerivedFields.ts`
- [x] T019 [P] Publish `FieldSpec`, `FieldDerivationState`, `PropertiesFormField`, `PropertiesFormProps` types (component-side contracts) `shared/components/src/PropertiesPanel/types.ts`
- [x] T020 Extend `ActivityPanelMessage` union to include `PropertiesCommitMessage` + add `propertiesCollapsed: boolean` to `ActivityPanelCollapseState` `shared/components/src/ActivityPanel/types.ts`
- [x] T021 Extend `StacBrowserMessage` union to include `PropertiesCommitMessage` `shared/components/src/StacBrowser/types.ts`

### Offline harness

- [x] T022 Replace the Phase-1 placeholder offline harness with the full `fetch` / `XMLHttpRequest` patching implementation (throws `OfflineInvariantError`) `shared/components/src/PropertiesPanel/__test__/offlineHarness.ts`
- [x] T023 [test] Smoke test: harness makes `fetch('https://example.com')` throw `OfflineInvariantError` `shared/components/src/PropertiesPanel/__test__/offlineHarness.test.ts`

**Parallel window**: T011–T015 (all new fixture / test files) run concurrently after T010. T016–T019 run concurrently with each other. T020 and T021 depend on T017.


## Phase 3: User Story 1 — Edit open plot metadata from the ActivityPanel (P1)

**Goal**: With a plot open, an analyst expands the new 4th ActivityPanel section ("Properties"), edits a field, and the change persists atomically to `item.json` with a provenance entry. This is the value-delivering slice — after Phase 3, the core feature works on the ActivityPanel surface in isolation (no StacBrowser wiring, no override chips yet — those are P2/P3).

**Independent Test**: Open a plot whose `debrief:tags` are wrong; expand Properties; change a tag and press Enter; verify `item.json` holds the new value; verify one provenance entry was appended; reload the plot and confirm the new value survives. See quickstart.md Scenario 1.

### Tests for Story 1 (write first — TDD pattern per Article VI)

- [x] T024 [P][test] Unit test: `stacService.updateItemMetadata` happy path writes `item.json` and appends provenance `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`
- [x] T025 [P][test] Unit test: `stacService.updateItemMetadata` rejects empty patch with error `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`
- [x] T026 [P][test] Unit test: `stacService.updateItemMetadata` throws `StaleItemJsonError` when mtime changed between read and write `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`
- [ ] T027 [P][test] Unit test: `stacService.updateItemMetadata` throws `SchemaValidationError` on invalid merged properties (no disk write, no provenance) `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`
- [x] T028 [P][test] Unit test: `stacService.updateItemMetadata` throws `ReadOnlyFilesystemError` on EROFS/EACCES `apps/vscode/tests/unit/stacService.updateItemMetadata.test.ts`
- [x] T029 [P][test] Unit test: atomic write — crash between temp-write and rename leaves original intact `apps/vscode/tests/unit/stacService.atomicWrite.test.ts`
- [x] T030 [P][test] Unit test: provenance-log rotation — 501st entry rotates oldest into `provenance_log_archive.jsonl`; active log stays ≤ 500 `apps/vscode/tests/unit/stacService.provenanceRotation.test.ts`
- [x] T031 [P][test] Unit test: archive file uses JSONL (one entry per line), append-only `apps/vscode/tests/unit/stacService.provenanceRotation.test.ts`

### Implementation — service layer (single writer, Article IV.2)

- [x] T032 Implement `stacService.updateItemMetadata` (read → merge patch → merge overrides → append provenance → rotate if cap → validate → re-stat → atomic temp+rename → invalidate cache → return `{updatedProperties, overrides, activityId}`) `apps/vscode/src/services/stacService.ts`
- [x] T033 Implement archive-file helper (atomic append to `provenance_log_archive.jsonl` in the item directory) `apps/vscode/src/services/stacService.ts`
- [x] T034 Export `StaleItemJsonError`, `SchemaValidationError`, `ReadOnlyFilesystemError` classes matching `contracts/stac-service-extension.ts` `apps/vscode/src/services/stacService.ts`

### Implementation — widgets (all reuse `ParameterEditor` commit discipline per Decision 6)

- [x] T035 [P] Implement `ArrayWidget` (chip list; add on Enter, remove on click; max-items + dedupe) `shared/components/src/PropertiesPanel/ArrayWidget.tsx`
- [x] T036 [P] Implement `DateTimeWidget` (ISO-8601 text input; validate + commit on blur/Enter; clear affordance) `shared/components/src/PropertiesPanel/DateTimeWidget.tsx`
- [x] T037 [P] Implement `BboxWidget` (4 numeric quads with min<max invariant; commit on blur) `shared/components/src/PropertiesPanel/BboxWidget.tsx`
- [x] T038 [P] Implement `PlatformArrayWidget` (add/edit/delete platform records) `shared/components/src/PropertiesPanel/PlatformArrayWidget.tsx`

### Implementation — form + resolver

- [x] T039 Implement `schemaResolver.resolveFieldSpec` (JSON Schema property → `FieldSpec`, falling back to `{kind: 'unsupported', reason}`) `shared/components/src/PropertiesPanel/schemaResolver.ts`
- [x] T040 Implement `PropertiesForm` (renders fields in order; routes each field to its widget via `FieldSpec.kind`; invokes `onCommitField(key, value)`; renders `writeError` banner; honours `loading` + `readOnly`) `shared/components/src/PropertiesPanel/PropertiesForm.tsx`
- [x] T041 Wire barrel exports in `index.ts` (PropertiesForm, schemaResolver, four widgets, types, provenance constants) `shared/components/src/PropertiesPanel/index.ts`

### Implementation — ActivityPanel integration

- [x] T042 Add 4th `<PaneSection>` ("Properties") to `ActivityPanel` below Layers; wire `propertiesCollapsed` `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T043 Add hydrate hook that reads `item.properties` from the open plot (via existing plot-open listener) and computes `PropertiesFormField[]` (label from LinkML title, derivation from overrides + `AUTO_DERIVED_FIELDS`) `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T044 Wire `onCommitField` → `postMessage({type: 'properties:commit', storePath, itemPath, patch})` + optimistic local update + rollback on extension-side error reply `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [x] T045 Handle `properties:commit` in the extension-side webview controller: invoke `stacService.updateItemMetadata`; on success post a `properties:committed` ack; on failure post a `properties:error` with the typed error name `apps/vscode/src/panels/activityPanelView.ts`

### Storybook + component E2E (Story 1 scope)

- [ ] T046 [P] `PropertiesForm.stories.tsx` — default story with mock STAC item covering each `FieldSpec.kind` `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T047 [P] `ArrayWidget.stories.tsx` — chip add/remove, max-items, duplicate rejection `shared/components/src/PropertiesPanel/ArrayWidget.stories.tsx`
- [ ] T048 [P] `DateTimeWidget.stories.tsx` — valid + invalid input + clear `shared/components/src/PropertiesPanel/DateTimeWidget.stories.tsx`
- [ ] T049 [P] `BboxWidget.stories.tsx` — quad edit with min<max invariant `shared/components/src/PropertiesPanel/BboxWidget.stories.tsx`
- [ ] T050 [P] `PlatformArrayWidget.stories.tsx` — add/edit/delete row `shared/components/src/PropertiesPanel/PlatformArrayWidget.stories.tsx`
- [ ] T051 [test] Playwright component E2E — `PropertiesForm` render + per-commit `onCommit` invocation + validation errors `shared/components/e2e/PropertiesForm.spec.ts`
- [ ] T052 [test] Playwright component E2E — each widget in each theme (light/dark/vscode) `shared/components/e2e/PropertiesWidgets.spec.ts`

### Webview E2E (Story 1 — the integrated flow)

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — Do NOT skip Playwright E2E tasks because you think browsers can't be installed. The project uses `@sparticuz/chromium` which bundles a Linux Chromium binary via npm. Run `node apps/web-shell/run-playwright.mjs` to extract and configure. Details: `docs/project_notes/playwright-installation-research.md`.

- [ ] T053 [test] Webview E2E — open plot → expand Properties → edit `debrief:tags` → blur → assert `item.json` has new tag + one provenance entry → close+reopen plot → value persists `tests/e2e/test-properties-panel.spec.ts`
- [ ] T054 [test] Webview E2E — invalid datetime commit rejected inline; no disk write; no provenance entry appended `tests/e2e/test-properties-panel.spec.ts`
- [ ] T055 [test] Webview E2E — stale-edit detection — modify `item.json` out-of-band, commit, assert `properties-write-error` banner renders + form reloads from disk `tests/e2e/test-properties-panel.spec.ts`
- [ ] T056 [P] Add `PropertiesPanelPage` page object for the webview E2E tests `tests/e2e/pages/PropertiesPanelPage.ts`

**Parallel window**: T024–T031 (unit tests, TDD) all write to distinct files — run in parallel before implementation. T035–T038 (widgets) are independent files. T046–T050 (stories) likewise. T056 (page object) can ship in parallel with T053–T055.

**Checkpoint**: At end of Phase 3, Story 1 ships green — analyst can edit plot metadata on the ActivityPanel surface. Story 2 (StacBrowser) and Story 3 (override chips on temporal fields) are not yet wired.


## Phase 4: User Story 2 — Edit catalog item metadata from the StacBrowser (P2)

**Goal**: With no plot open, selecting an item in the `StacBrowser` tree reveals a stacked Properties area under `ThumbnailPreview`. Edits commit per-field through the same `stacService.updateItemMetadata` path used by Story 1. No new service code — all leverage Phase 3's foundation.

**Independent Test**: Close all plots; open StacBrowser; click an item; confirm Properties area appears under the thumbnail; edit a field and commit; confirm `item.json` updated; reload the browser and confirm the change survives. See quickstart.md Scenario 2.

### Tests for Story 2

- [x] T057 [P][test] Unit test: `BrowserSelectionContext` — consumer gets `selectedItemPath` when wrapped in Provider; throws without Provider `shared/components/src/StacBrowser/BrowserSelectionContext.test.tsx`
- [ ] T058 [P][test] Webview E2E — close all plots → select catalog item → edit title → blur → `item.json` updated + provenance appended → reload browser → title persists `tests/e2e/test-properties-panel.spec.ts`
- [ ] T059 [P][test] Webview E2E — plot open on item A + StacBrowser focused on item B — commits route to the correct `item.json` per surface `tests/e2e/test-properties-panel.spec.ts`
- [ ] T060 [P][test] Webview E2E — StacBrowser stale-edit detection (out-of-band modify while browser open) surfaces error banner `tests/e2e/test-properties-panel.spec.ts`

### Implementation — BrowserSelectionContext

- [x] T061 Implement `BrowserSelectionContext` Provider + `useBrowserSelection` hook (throws clear error if used outside Provider) `shared/components/src/StacBrowser/BrowserSelectionContext.tsx`
- [ ] T062 Wrap `StacBrowser` root in `BrowserSelectionProvider`; migrate existing `onItemSelect` callback to also update context (backward compatible with existing callers) `shared/components/src/StacBrowser/StacBrowser.tsx`

### Implementation — StacBrowser Properties area

- [ ] T063 Add a stacked vertical split under `ThumbnailPreview` inside the existing `ResizableSplitPane` right panel — drag handle separates thumbnail (top) from Properties (bottom) `shared/components/src/StacBrowser/StacBrowser.tsx`
- [x] T064 Create `PropertiesSidePanel` host component — consumes `useBrowserSelection`, loads `item.json` for the selected path, hydrates `PropertiesFormField[]`, renders `PropertiesForm` `shared/components/src/StacBrowser/PropertiesSidePanel.tsx`
- [x] T065 Wire `onCommitField` → `postMessage({type: 'properties:commit', storePath, itemPath, patch})` with the same optimistic+rollback pattern as the ActivityPanel surface `shared/components/src/StacBrowser/PropertiesSidePanel.tsx`
- [x] T066 Handle `properties:commit` in the StacBrowser panel controller — same handler shape as ActivityPanel, identical service call `apps/vscode/src/panels/stacBrowserPanel.ts`

### Storybook

- [ ] T067 [P] Add `StacBrowser.stories.tsx` "withPropertiesSidePanel" story demonstrating the stacked layout + selection flow `shared/components/src/StacBrowser/StacBrowser.stories.tsx`

**Parallel window**: T057–T060 (tests) are independent of T061–T067 (implementation) and can be authored first.

**Checkpoint**: At end of Phase 4, Story 2 ships green. Both surfaces route through `stacService.updateItemMetadata`. Story 3 (override chips) is the next layer.


## Phase 5: User Story 3 — Auto-derived fields are visible but overrideable (P3)

**Goal**: Auto-derived temporal fields (`start_datetime`, `end_datetime`, `datetime`) display an "auto-derived" chip. Committing a value on one of those fields adds the key to `debrief:overrides` and swaps the chip to "override". `updateTemporalMetadata` is edited to (a) consult `debrief:overrides` and skip listed fields, and (b) become idempotent (no-op when derived === current). This is a correctness + trust layer on top of Stories 1 + 2.

**Independent Test**: Edit `start_datetime` on a plot with timestamped features → value persists + "override" chip renders → trigger `debrief.reloadFeatures` → `start_datetime` unchanged; `end_datetime` (not overridden) still updates. See quickstart.md Scenario 3.

### Tests for Story 3

- [x] T068 [P][test] Unit test: `updateTemporalMetadata` skips fields listed in `debrief:overrides` `apps/vscode/tests/unit/stacService.updateTemporalMetadata.test.ts`
- [x] T069 [P][test] Unit test: `updateTemporalMetadata` is idempotent — no write when derived value equals current value `apps/vscode/tests/unit/stacService.updateTemporalMetadata.test.ts`
- [x] T070 [P][test] Unit test: `updateTemporalMetadata` writes only when at least one field changed — `item.json` mtime stable when all three fields are either overridden or already-current `apps/vscode/tests/unit/stacService.updateTemporalMetadata.test.ts`
- [x] T071 [P][test] Component test: `PropertiesForm` renders "auto-derived" chip for field in `AUTO_DERIVED_FIELDS` absent from overrides; "override" chip for field in overrides `shared/components/src/PropertiesPanel/PropertiesForm.test.tsx`
- [x] T072 [P][test] Webview E2E — override-survival scenario: edit `start_datetime`, reload features, assert value survives on disk + chip remains "override" `tests/e2e/test-properties-panel.spec.ts`

### Implementation — derivation chips in the form

- [x] T073 Thread `derivation: FieldDerivationState` through `PropertiesFormField` computation — derive from `AUTO_DERIVED_FIELDS` + `item.properties["debrief:overrides"]` (rule per data-model.md §5) `shared/components/src/PropertiesPanel/PropertiesForm.tsx`
- [x] T074 Render "auto-derived" and "override" chips in `PropertiesForm` field row header; plain (no chip) for `derivation: 'user'` `shared/components/src/PropertiesPanel/PropertiesForm.tsx`
- [x] T075 [P] Add `data-testid="properties-chip-override"` + `properties-chip-auto-derived` on chips for E2E selectors `shared/components/src/PropertiesPanel/PropertiesForm.tsx`

### Implementation — service-side override + idempotence

- [x] T076 Edit `stacService.updateTemporalMetadata` — read `debrief:overrides`, skip any field present; for remaining fields compute derived value; skip write when derived === current; write atomically only when at least one field changed `apps/vscode/src/services/stacService.ts`
- [x] T077 Ensure `updateItemMetadata` callers pass `overrideFields` correctly when a committed field is in `AUTO_DERIVED_FIELDS` (so the field is added to `debrief:overrides`) `apps/vscode/src/panels/activityPanelView.ts`, `apps/vscode/src/panels/stacBrowserPanel.ts`

### Storybook

- [ ] T078 [P] Add `PropertiesForm.stories.tsx` "withOverrideChips" variant showing both chip states `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`

**Parallel window**: T068–T072 (tests) independent. T073–T075 touch the same file sequentially; T076 + T077 are separate files and can run in parallel.

**Checkpoint**: At end of Phase 5, all three user stories pass end-to-end. Polish phase captures evidence and ships.


## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Land CI gates (offline harness, schema-evolution smoke), capture evidence, produce media content, and open the PR.

### CI gates (constitutional invariants)

- [ ] T079 [test] Wire offline harness into vitest `setupFiles` and assert all `PropertiesPanel` + `stacService.updateItemMetadata` tests still pass with `fetch` / `XMLHttpRequest` throwing (Decision 10, SC-005) `shared/components/vitest.config.ts`
- [ ] T080 [test] Schema-evolution smoke — `tests/fixtures/properties-panel/evolving-schema.yaml` containing a toy `debrief:test_note` field; vitest generates TS + JSON Schema from it, mounts `PropertiesForm`, asserts new input renders (Decision 11, SC-003) `shared/components/src/PropertiesPanel/schemaEvolution.test.ts`
- [ ] T081 Add `properties-panel-schema-evolution` CI step to `.github/workflows/ci.yml` `.github/workflows/ci.yml`

### Evidence collection

- [x] T082 Capture test results using template (`.specify/templates/evidence/test-summary-template.md`) with YAML front matter (git_sha, captured_at, tests_passed/failed/skipped, coverage_pct) in `specs/193-properties-panel/evidence/test-summary.md`
- [x] T083 Create usage demonstration (code + expected output for Scenarios 1–3 from quickstart.md) in `specs/193-properties-panel/evidence/usage-example.md`
- [x] T084 [P] Capture `sample-item-before.json` + `sample-item-after.json` (demonstrating `debrief:overrides` + `debrief:provenance_log` appearing after one commit) in `specs/193-properties-panel/evidence/`
- [x] T085 [P] Capture round-trip evidence (LinkML → Pydantic → JSON Schema → TypeScript → JSON → Python) for both new schema additions in `specs/193-properties-panel/evidence/round-trip-evidence.md`
- [ ] T086 [P] Capture `PropertiesForm` Storybook screenshots in light/dark/vscode themes — `specs/193-properties-panel/evidence/screenshots/properties-form-{light,dark,vscode}.png`
- [ ] T087 [P] Capture interaction GIF (< 5s, < 2MB) via Playwright `page.video()`: analyst expands Properties → edits tag → blur → assertion of saved state in `specs/193-properties-panel/evidence/screenshots/interaction.gif`
- [x] T088 [P] Capture stale-edit demo transcript (Scenario 4 outcome + banner screenshot) in `specs/193-properties-panel/evidence/stale-edit-demo.md`

### Full test-suite gate

- [x] T089 Run `task verify` (lint + typecheck + unit tests — Python + TypeScript); resolve any failures before proceeding (no skipping per global `CLAUDE.md`)
- [ ] T090 Run `cd apps/web-shell && node run-playwright.mjs` for the webview E2E suite (Scenarios 1–5); resolve any failures before proceeding

### Media content

- [x] T091 Spawn `content-specialist` subagent to create shipped blog post (What We Built, Screenshots, Lessons Learned, What's Next) in `specs/193-properties-panel/media/shipped-post.md`
- [x] T092 [P] Create LinkedIn shipped summary (150–200 words, hook opening, link to full post) in `specs/193-properties-panel/media/linkedin-shipped.md`

### PR creation

- [x] T093 Create PR and publish blog: run `/speckit.pr`

**Task T093 must run last. It depends on all evidence (T082–T088), CI gates (T079–T081), test gates (T089, T090), and media (T091, T092) being complete.**


## Dependencies

**Story completion order**: Phase 2 (Foundation) blocks all three user stories. Story 1 (Phase 3) delivers primary value and establishes the service path Story 2 reuses. Story 2 (Phase 4) leverages Phase 3 with zero new service code. Story 3 (Phase 5) is a chip + skip-list layer over both surfaces. Polish (Phase 6) runs last.

**Blocking edges**:

- Phase 1 → Phase 2 (folder + harness scaffolding must exist before schema work)
- Phase 2 T010 (`task generate`) blocks all downstream TypeScript imports of generated types
- Phase 2 T016–T021 block all PropertiesForm + ActivityPanel + StacBrowser work in Phases 3–5
- Phase 3 T032–T034 (service layer) blocks every webview integration task (T045, T066, T077) — the service is the single writer
- Phase 3 T039–T041 (form + widgets + barrel) blocks T064 (`PropertiesSidePanel` in Phase 4) and T073–T075 (chip rendering in Phase 5)
- Phase 4 T061 (`BrowserSelectionContext` implementation) blocks T062, T064
- Phase 5 T076 (override-aware `updateTemporalMetadata`) is independent of Phase 4 and can run in parallel with it — neither depends on the other's code
- Phase 6 T079–T090 block T091–T092; T091–T092 block T093

**No-blocker tasks (parallelisable across phases once Foundation ships)**:

- Widgets (T035–T038) run concurrently
- All `[P][test]` unit test files are independent — run in parallel
- Storybook stories (T046–T050, T067, T078) run concurrently once the components they demo exist


## Post-Compact Follow-Up Tasks (#193 v2)

**Status**: Added 2026-04-17 after the initial `/speckit.implement 193` run surfaced gaps during web-shell testing. User directive: _don't defer — get on with it_. Ordered by user-visible impact.

### Deferred-but-now-required from the original task list

- [ ] T027 [test] Wire a real `SchemaValidationError` path in `stacService.updateItemMetadata` (currently exported but never thrown — LinkML validation is a TODO). Add the matching unit test.
- [ ] T046 [P] `PropertiesForm.stories.tsx` — default story covering every `FieldSpec.kind` `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T047 [P] `ArrayWidget.stories.tsx` `shared/components/src/PropertiesPanel/ArrayWidget.stories.tsx`
- [ ] T048 [P] `DateTimeWidget.stories.tsx` `shared/components/src/PropertiesPanel/DateTimeWidget.stories.tsx`
- [ ] T049 [P] `BboxWidget.stories.tsx` `shared/components/src/PropertiesPanel/BboxWidget.stories.tsx`
- [ ] T050 [P] `PlatformArrayWidget.stories.tsx` `shared/components/src/PropertiesPanel/PlatformArrayWidget.stories.tsx`
- [ ] T051 [test] Playwright component E2E — `PropertiesForm` render + commit `shared/components/e2e/PropertiesForm.spec.ts`
- [ ] T052 [test] Playwright component E2E — each widget in each theme `shared/components/e2e/PropertiesWidgets.spec.ts`
- [ ] T053 [test] Webview E2E Story 1 — open plot → edit `debrief:tags` → blur → assertion `tests/e2e/test-properties-panel.spec.ts`
- [ ] T054 [test] Webview E2E — invalid datetime commit rejected inline `tests/e2e/test-properties-panel.spec.ts`
- [ ] T055 [test] Webview E2E — stale-edit detection banner `tests/e2e/test-properties-panel.spec.ts`
- [ ] T056 [P] `PropertiesPanelPage` page object `tests/e2e/pages/PropertiesPanelPage.ts`
- [ ] T058 [test] Webview E2E Story 2 — close plots → select catalog item → edit title → verify persistence `tests/e2e/test-properties-panel.spec.ts`
- [ ] T059 [test] Webview E2E — routing when plot open on item A and StacBrowser on item B `tests/e2e/test-properties-panel.spec.ts`
- [ ] T060 [test] Webview E2E — StacBrowser stale-edit banner `tests/e2e/test-properties-panel.spec.ts`
- [ ] T062 Wrap `StacBrowser` GoldenLayout tree in `BrowserSelectionProvider`; migrate `onItemSelect` to also update context `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T063 Add stacked vertical split under `ThumbnailPreview` in the existing `ResizableSplitPane` right panel `shared/components/src/StacBrowser/StacBrowser.tsx`
- [ ] T067 [P] Add `StacBrowser.stories.tsx` "withPropertiesSidePanel" story `shared/components/src/StacBrowser/StacBrowser.stories.tsx`
- [ ] T072 [test] Webview E2E — override-survival scenario `tests/e2e/test-properties-panel.spec.ts`
- [ ] T078 [P] Add `PropertiesForm.stories.tsx` "withOverrideChips" variant `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T079 [test] Explicit offline-invariant regression: vitest case that fails if harness is uninstalled from `setupFiles` `shared/components/src/PropertiesPanel/__test__/offlineRegression.test.ts`
- [ ] T080 [test] Schema-evolution smoke — `tests/fixtures/properties-panel/evolving-schema.yaml`; vitest generates TS + JSON Schema, asserts new input renders `shared/components/src/PropertiesPanel/schemaEvolution.test.ts`
- [ ] T081 Add `properties-panel-schema-evolution` CI step to `.github/workflows/ci.yml`
- [ ] T086 [P] Capture `PropertiesForm` screenshots in light/dark/vscode themes `specs/193-properties-panel/evidence/screenshots/properties-form-{light,dark,vscode}.png`
- [ ] T087 [P] Capture interaction GIF (< 5s, < 2MB) of expand → edit → blur → saved-state `specs/193-properties-panel/evidence/screenshots/interaction.gif`
- [ ] T090 [test] Run `cd apps/web-shell && node run-playwright.mjs` for the webview E2E suite; resolve any failures

### New tasks surfaced during testing

- [ ] T094 Host-side ActivityPanel hydrate hook — extension reads `item.properties` from the open plot, loads the LinkML-generated JSON Schema, computes `PropertiesFormField[]`, posts to the webview. Without this the Properties section is empty on real plots. `apps/vscode/src/views/activityPanelView.ts`
- [ ] T095 Host-side catalogOverview hydrate hook — equivalent of T094 for `CatalogOverviewPanel`. `apps/vscode/src/panels/catalogOverviewPanel.ts`
- [ ] T096 Web-shell demo → real integration — replace the mock-field aside with `BrowserSelectionProvider` + `PropertiesSidePanel` fed by real catalog selection events. `apps/web-shell/src/App.tsx`
- [ ] T097 Screenshots + blog update — update `specs/193-properties-panel/media/shipped-post.md` to embed the actual screenshots (not placeholders) and re-publish via `/publish`.
- [ ] T098 Extend `StacBrowserProps` to expose `onItemHighlight` so consumers can differentiate "highlighted in list" from "open plot". `shared/components/src/StacBrowser/types.ts`

### Execution order

1. **T086, T087, T097** — screenshots + blog update (immediate user ask).
2. **T094 + T095** — unblocks real-data rendering on both surfaces.
3. **T062, T063, T098, T096** — StacBrowser layout integration and web-shell fold-in.
4. **T046–T050, T067, T078** — Storybook stories.
5. **T079, T080, T081** — CI gates.
6. **T027, T051–T056, T058–T060, T072, T090** — full test suites.


## Implementation Strategy

**Incremental delivery**: Ship Story 1 first and demo it — it is the most visible value and validates the full stack (service writer, atomic write, provenance, schema-driven form, widgets, ActivityPanel 4th section). Story 2 is a repeat of the integration pattern on a different surface with zero new service code. Story 3 is a small correctness layer.

**TDD rhythm**: Unit tests in each story (T024–T031, T057–T060, T068–T072) are authored before their corresponding implementation — they describe the contract and should fail until the implementation lands.

**Parallel-work windows** (good targets for concurrent tool calls / sub-agents):

1. **Foundation burst**: After T010 generates schemas, T011–T015 (schema tests) and T016–T019 (TS contracts) all run in parallel — six+ files, six+ concurrent authors.
2. **Story 1 widget burst**: After T032–T034 (service) lands, widgets T035–T038 are four independent files.
3. **Story 1 Storybook burst**: Once widgets compile, T046–T050 run concurrently.
4. **Story 1 unit tests**: T024–T031 are eight independent tests in two files (or split into per-scenario files if preferred).
5. **Polish evidence burst**: T084–T088 are five independent evidence artefacts.

**Risk hotspots**:

- **T032 (updateItemMetadata)** is the riskiest single task — it combines atomic write, mtime conflict detection, provenance rotation, and schema validation in one method. Treat it as a long task; consider scheduling its sub-steps as separate commits for easier review even though they land in one file.
- **T076 (updateTemporalMetadata edit)** must preserve existing behaviour for non-overridden fields. Keep the existing test suite green as a regression guard.
- **T043 (ActivityPanel hydrate hook)** touches the plot-open listener — verify it does not interfere with TimeController, Layers, or Tools sections.

**Cut-line safety**: If schedule pressure forces scope reduction, the natural cut-line is Phase 5 (Story 3). Stories 1 + 2 plus Polish would ship a useful Properties Panel with auto-derived fields displayed as plain inputs (no chips, no override-aware derivation) — a documented follow-up, not a broken feature.

