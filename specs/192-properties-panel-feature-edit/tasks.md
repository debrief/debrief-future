# Tasks: Properties Panel — Feature & Sub-feature Editing

**Feature**: 192 | **Branch**: `claude/implement-speckit-192-W9XHH` (active feature dir `192-properties-panel-feature-edit`)
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/](./contracts/)
**Stories**: 7 (4× P1, 3× P2) | **Schema change**: 1 LinkML class + 1 slot (inherited across 13 concrete classes — see plan re-baseline notes for the class list and adherence-scope split)

> **Re-baseline 2026-05-12 (second pass)**: This task list was updated
> after `/speckit.implement` surveyed actual code state. See
> `plan.md` § "Plan Refresh Notes (re-baseline 2026-05-12, second pass)"
> for the eight discrepancies between the design and the code, and the
> resulting task wording corrections. No tasks were dropped; one new
> task (`T011a`) was added.

## Evidence Requirements

**Evidence Directory**: `specs/192-properties-panel-feature-edit/evidence/`
**Media Directory**: `specs/192-properties-panel-feature-edit/media/`

### Planned Artifacts

| Artifact | Description | Captured When |
|----------|-------------|---------------|
| `evidence/test-summary.md` | Vitest + pytest + Playwright totals with YAML front matter (`git_sha`, `captured_at`, counts, coverage %) using the template at `.specify/templates/evidence/test-summary-template.md` | After all tests pass |
| `evidence/usage-example.md` | End-to-end usage: open a plot, edit one feature, annotate one track point, annotate one polygon vertex, revert an override, demonstrate read-only — with expected outcomes | After the seven workflows are stable |
| `evidence/round-trip-evidence.md` | Schema round-trip proof for `VertexMetadata` across all eight inheriting classes (Python ↔ JSON ↔ TypeScript ↔ JSON ↔ Python) | After schema generators run + adherence tests pass |
| `evidence/screenshots/properties-feature-light.png` | `PropertiesForm` feature mode, light theme | After Storybook E2E |
| `evidence/screenshots/properties-feature-dark.png` | feature mode, dark theme | After Storybook E2E |
| `evidence/screenshots/properties-feature-vscode.png` | feature mode, vscode theme | After Storybook E2E |
| `evidence/screenshots/properties-subfeature-track-vscode.png` | sub-feature mode, track point, vscode theme | After Storybook E2E |
| `evidence/screenshots/properties-subfeature-polygon-vscode.png` | sub-feature mode, polygon ring vertex, vscode theme | After Storybook E2E (cross-geometry hero) |
| `evidence/screenshots/properties-multiselect-vscode.png` | multi-select summary, vscode theme | After Storybook E2E |
| `evidence/screenshots/properties-readonly-vscode.png` | read-only banner + disabled inputs, vscode theme | After Storybook E2E |
| `evidence/screenshots/workflow-mode-swap.gif` | < 5 s interaction GIF cycling no→feature→vertex→multi→none across one selection sequence | After Web-Shell E2E |
| `evidence/screenshots/workflow-revert.gif` | < 5 s interaction GIF clicking the revert affordance and seeing the auto-derived value appear | After Web-Shell E2E |
| `evidence/screenshots/workflow-readonly.png` | Web-shell screenshot of the read-only banner on a chmod-444 fixture | After Web-Shell E2E |
| `evidence/webview-e2e-summary.md` | Summary of the seven web-shell Playwright workflows + their pass/fail status | After Playwright suite passes |

### Media Content

| Artifact | Description | Created When |
|----------|-------------|--------------|
| `evidence/opening-context.md` | Cached opener (Hook + What We're Building + How It Fits + Key Decisions) — already exists from `/speckit.plan` | During `/speckit.plan` (✅ done) |
| `media/shipped-post.md` | Feature post — title prefixed `Building `, first three body sections copied verbatim from `evidence/opening-context.md`, additional sections Screenshots / By the Numbers / Lessons Learned / What's Next | During Polish phase |

### PR Creation

| Action | Description | Created When |
|--------|-------------|--------------|
| Feature PR | PR in `debrief/debrief-future` with evidence | Final task in Polish |
| Blog PR | PR in `debrief.github.io` with `shipped-post.md` | Triggered by `/speckit.pr` |

---

## Phase 1: Setup

Scope: no new package, no new build target. Setup is mostly verification.

- [x] T001 Confirm `.specify/.active-feature` pins to `192-properties-panel-feature-edit` and the working branch is `claude/implement-speckit-192-o9Oby` — read `/home/user/debrief-future/.specify/.active-feature`
- [x] T002 Run baseline gate to confirm pre-feature state is green `task verify`
- [x] T003 [P] Confirm the LinkML generator pipeline runs cleanly on current schema (no schema change yet) `shared/schemas/Makefile`
- [x] T004 [P] Confirm Playwright web-shell harness works in this environment `apps/web-shell/run-playwright.mjs`

## Phase 2: Foundation (blocks all stories)

Five foundation pieces, all of which subsequent stories depend on:
(a) the LinkML schema change + generators, (b) the selection-mode
resolver, (c) the staging buffer hook in `ActivityPanel`, (d) the
read-only signal on the plot slice, (e) the mode dispatcher in
`PropertiesForm`. Tests-first per Constitution VII.1: contracts under
`contracts/` define every assertion before implementation lands.

### LinkML schema change (R-008, vertex-metadata-slot.md)

- [x] T005 [test] Author golden fixtures for `vertex_metadata` per the contract (9 files: empty-omitted, track-positions, polygon-rings, linestring-vertices, multipoint-vertices, point-vertex-zero, invalid-duplicate-path, invalid-mismatched-path-for-geometry, invalid-malformed-path) `shared/schemas/fixtures/vertex_metadata.*.json`. Inheriting class set covered by fixtures: **TrackProperties** (positions), **CircleAnnotationProperties / RectangleAnnotationProperties / PolyAnnotationProperties / MultiPolygonFeatureProperties** (polygon rings), **LineAnnotationProperties / VectorAnnotationProperties** (LineString vertices), **MultiPointFeatureProperties** (MultiPoint vertices), **TextAnnotationProperties / ReferenceLocationProperties** (Point vertex/0). `NarrativeEntryProperties`, `StoryboardProperties`, `SceneProperties` get the empty-omitted fixture only.
- [x] T006 [test] Author pytest adherence suite covering round-trip + inheritance across the **13 concrete classes that inherit `BaseFeatureProperties`** (the seven annotation classes in `annotations.yaml` — `NarrativeEntryProperties`, `CircleAnnotationProperties`, `RectangleAnnotationProperties`, `LineAnnotationProperties`, `TextAnnotationProperties`, `VectorAnnotationProperties`, `PolyAnnotationProperties`; the four geojson classes in `geojson.yaml` — `TrackProperties`, `ReferenceLocationProperties`, `MultiPointFeatureProperties`, `MultiPolygonFeatureProperties`; the two storyboard classes — `StoryboardProperties`, `SceneProperties`) + pattern validation per geometry `shared/schemas/tests/test_vertex_metadata.py`
- [x] T007 Add `VertexMetadata` class to LinkML `shared/schemas/src/linkml/common.yaml`
- [x] T008 Add `vertex_metadata` slot to `BaseFeatureProperties` (so every inheriting class gets it for free) `shared/schemas/src/linkml/common.yaml`
- [x] T009 Regenerate Pydantic, JSON Schema, TypeScript bindings `shared/schemas/Makefile`
- [x] T010 [P] Confirm regenerated `@debrief/schemas` TS bindings export `VertexMetadata` and that `BaseFeatureProperties.vertex_metadata` is reachable on every of the **13 concrete subclasses** (see T006 list) `shared/schemas/dist/` (verification — not a write)

### Selection-mode resolver (selection-mode.md)

- [x] T011 [test] Author Vitest cases for `resolveEditingMode` per the contract (16 cases incl. all four vertex-path shapes + stale branches) `shared/components/src/PropertiesPanel/__tests__/selectionMode.test.ts`
- [x] T011a [test] **NEW (re-baseline)**: Extend the path-level registry in `selectionPath.ts` with `rings` (index), `vertices` (index), and `vertex` (index, valid only with the literal address `0`); update `validatePathSemantics` to accept the new levels; add Vitest cases for each `services/session-state/src/utils/selectionPath.ts` + `services/session-state/src/utils/__tests__/selectionPath.test.ts`. **Without this**, the resolver in T012 will fail semantic validation on every Polygon / LineString / MultiPoint / Point vertex path.
- [x] T012 Implement `resolveEditingMode` using `parsePath` from `services/session-state/src/utils/selectionPath.ts:96` (after the registry extension in T011a) `shared/components/src/PropertiesPanel/selectionMode.ts`

### Staged-edits buffer hook (staged-edits-store.md, R-002a, R-011)

- [ ] T013 [test] Author Vitest for `useStagedEdits` covering every state transition (setters, prune-on-equality, `revertField`/`unrevertField`, selection-independence, `applyEditsToFeatures` for feature/vertex/reverted/sparse-prune, `clearAll`) `shared/components/src/ActivityPanel/__tests__/useStagedEdits.test.ts`
- [ ] T014 Implement `useStagedEdits` as a `useReducer`-backed hook colocated with `ActivityPanel`; export the surface listed in `contracts/staged-edits-store.md` `shared/components/src/ActivityPanel/useStagedEdits.ts`

### Read-only signal on plot slice (read-only-signal.md, R-003)

- [ ] T015 [test] Author Vitest for the **new** plot slice `isReadOnly`/`readOnlyReason` producer rules (default, `setReadOnly(false)` writable, `setReadOnly(true, reason)` non-writable, post-write `ReadOnlyFilesystemError` propagated via the same action, post-write Node `EACCES`, reset on re-open) `services/session-state/src/store/slices/__tests__/plot.readOnly.test.ts`
- [ ] T016 **Create the new `plot` slice** (`isReadOnly: boolean`, `readOnlyReason: string | null`, action `setReadOnly(isReadOnly, reason)`) and wire it into `services/session-state/src/store/index.ts` and `services/session-state/src/types/index.ts` (compose `PlotSlice` + `PlotActions` into `SessionStore` and `SessionState` alongside `document`, `temporal`, etc.). **Files**: `services/session-state/src/store/slices/plot.ts` (NEW), `services/session-state/src/types/plot.ts` (NEW), plus edits to `store/index.ts` and `types/index.ts`. **Re-baseline note**: there is no existing `plot.ts` slice and no `openPlot` action — both are net-new in this task.
- [ ] T017 Wire `saveSession` (`services/session-state/src/persistence/save.ts:57–102`) to detect `ReadOnlyFilesystemError` / Node `EACCES` / Node `EPERM` in its catch block and dispatch the new `setReadOnly(true, reason)` action. **Re-baseline note**: producer rule 1 from `contracts/read-only-signal.md` ("when a plot is opened") is satisfied by the host (VS Code extension or web-shell) calling `stacWriterFs.capability()` after open and dispatching `setReadOnly` accordingly; add the call site in `apps/vscode/src/extension.ts` (where `debrief.openPlot` is registered) and the web-shell equivalent. Track the host wiring as part of this task.
- [ ] T018 [P] Add named selectors `selectIsReadOnly` and `selectReadOnlyReason` to the new plot slice for consumers `services/session-state/src/store/slices/plot.ts`

### Mode dispatcher + bare mode shells (no behaviour yet)

- [ ] T019 **Wrap, don't modify** `PropertiesForm`. The shipped `PropertiesForm.tsx` is wired to STAC item-level fields via the `fields: PropertiesFormField[]` prop and is the plot-mode branch. Introduce a new mode-aware parent that takes `editingMode: EditingMode` plus the existing item-fields surface, and dispatches: `kind: 'plot'` → existing `PropertiesForm`; `feature` / `subfeature` / `multi` → the three new mode components from T020–T022. **Files**: keep `PropertiesForm.tsx` untouched as the plot branch; add new dispatcher (e.g., `PropertiesPanelDispatch.tsx`) at `shared/components/src/PropertiesPanel/`; update the consumer in `ActivityPanel.tsx`'s "Properties" `PaneSection` (line ~570) to render the dispatcher instead of `PropertiesForm` directly. **Re-baseline note**: the previous wording ("extend PropertiesForm with mode prop") implied a single-file edit; that would either regress plot mode or duplicate widget code.
- [ ] T020 [P] Add empty `FeatureEditorMode` shell (renders header + delegates to the existing widget set; behaviour comes in Phase 3) `shared/components/src/PropertiesPanel/modes/FeatureEditorMode.tsx`
- [ ] T021 [P] Add empty `SubFeatureEditorMode` shell (renders header; vertex form comes in Phase 4) `shared/components/src/PropertiesPanel/modes/SubFeatureEditorMode.tsx`
- [ ] T022 [P] Add empty `MultiSelectSummaryMode` shell (renders count; derivation comes in Phase 7) `shared/components/src/PropertiesPanel/modes/MultiSelectSummaryMode.tsx`
- [ ] T023 [P] Add `readOnlyBanner` component (renders banner from `readOnlyReason`; consumed by all modes) `shared/components/src/PropertiesPanel/readOnlyBanner.tsx`

### Integrated save-path contract (save-integration.md, 3A)

- [ ] T024 [test] Author the integrated save-path Vitest (success path + read-only failure + EACCES variant + vertex/revert flush variants) — six scenarios per the contract `shared/components/src/PropertiesPanel/__tests__/saveSession-integration.test.ts`
- [ ] T025 Wire the save path in `ActivityPanel`: collect `applyEditsToFeatures` output → call `saveSession` → on success call `appendProvenance` per affected feature using `PROPERTIES_PANEL_TOOL_SENTINEL` from `provenanceTypes.ts:12–31`, then `useStagedEdits.clearAll()`; on failure preserve buffer and let the plot slice handle read-only escalation `shared/components/src/ActivityPanel/ActivityPanel.tsx`

**Parallelism within Phase 2**: T010, T018, T020, T021, T022, T023 can run in parallel after their dependencies. T005 + T011 + T013 + T015 + T024 are all [test] authoring; in TDD order they precede their implementations and can be authored in parallel by independent contributors.

## Phase 3: US-1 — Edit a single feature's metadata (P1)

**Story goal**: Analyst clicks one track on the map, the panel switches
to the feature editor populated with that feature's editable schema
fields, edits stage in `useStagedEdits`, save flushes them and writes a
provenance entry.

**Independent test criteria**: Run `properties-feature-edit.spec.ts` —
load plot, click feature, edit a tag, save, reload, re-select, assert
restored value AND a `properties-panel@<version>` provenance entry
listing the edited path. SC-001 (≤ 30 s end-to-end), SC-003 (form
auto-derives from schema), SC-004 (provenance shape).

- [ ] T026 [test] Vitest for `FeatureEditorMode` rendering: header shows feature display name, form renders inputs for every editable LinkML slot, override fields visually distinguished from auto-derived (FR-005), dirty indicator flips on any change `shared/components/src/PropertiesPanel/__tests__/FeatureEditorMode.test.tsx`
- [ ] T027 Implement `FeatureEditorMode` body: derive editable `FieldSpec[]` from the LinkML JSON Schema for the feature's `kind`; render through the existing `PropertiesForm` widget dispatcher (no new widgets); thread edits to `useStagedEdits.setFeatureField` `shared/components/src/PropertiesPanel/modes/FeatureEditorMode.tsx`
- [ ] T028 [P] Add `data-testid="properties-mode-feature"` on the mode container + per-field `data-testid` keyed off slot name (for Playwright + a11y) `shared/components/src/PropertiesPanel/modes/FeatureEditorMode.tsx`
- [ ] T029 [P] Storybook story: `PropertiesForm — Feature mode` (with one tag input + one per-platform override visible) `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T030 [P][test] Playwright web-shell: open plot, click feature, edit tag, save, reload, re-select; assert tag restored + provenance entry present `apps/web-shell/playwright/tests/properties-feature-edit.spec.ts`
- [ ] T031 [P] Extend `AnalysisPage` page object with `selectFeature(id, { modifier? })` and `editTag(value)` helpers `apps/web-shell/playwright/pages/AnalysisPage.ts`

## Phase 4: US-2 — Annotate a single track point (P1)

**Story goal**: Analyst clicks a single position on a track; sub-feature
editor renders for `positions/N`; analyst sets `label`/`tags`/`note`;
save persists as a sparse `VertexMetadata` entry on the parent track.

**Independent test criteria**: Run `properties-subfeature-edit.spec.ts`
— load plot, click track point, fill label/tags/note, save, reload,
re-click same point; assert values restored. Inspect the saved item
JSON: `feature.properties.vertex_metadata` contains exactly one entry
with the matching `path: "positions/N"`. SC-002 (≤ 45 s), SC-005
(lossless round-trip), Article III.1 (provenance entry per save).

- [ ] T032 [test] Vitest for `SubFeatureEditorMode` rendering on a track-point path: header reads "<track> — `positions/N`"; form shows label + tags + note inputs; staged edits route through `useStagedEdits.setVertexField`; O(1) read-time lookup via memoised `Map<path, VertexMetadata>` `shared/components/src/PropertiesPanel/__tests__/SubFeatureEditorMode.test.tsx`
- [ ] T033 Implement `SubFeatureEditorMode` for the `positions/N` path: parse the path via `parsePath`, look up the parent track's existing `vertex_metadata` entry (if any) via the memoised Map, render the three inputs, stage edits keyed by `(featureId, path)` `shared/components/src/PropertiesPanel/modes/SubFeatureEditorMode.tsx`
- [ ] T034 [P] Add `data-testid="properties-mode-subfeature"` + per-input testids (`vertex-label-input`, `vertex-tags-input`, `vertex-note-input`) `shared/components/src/PropertiesPanel/modes/SubFeatureEditorMode.tsx`
- [ ] T035 [P] Storybook story: `PropertiesForm — Sub-feature mode (track)` showing a populated point with label + tag + note `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T036 [P][test] Playwright web-shell: click point on track, fill, save, reload, re-click, assert restored; inspect saved JSON has one `VertexMetadata` entry with `path: positions/N` `apps/web-shell/playwright/tests/properties-subfeature-edit.spec.ts`
- [ ] T037 [P] Extend `AnalysisPage` with `selectVertex(featureId, path)` helper (Leaflet position-marker click) `apps/web-shell/playwright/pages/AnalysisPage.ts`
- [ ] T038 [P][test] Vertex out-of-range edge case: write a fixture where the selection points to `positions/9999` on a 50-position track; assert form renders "out-of-range" notice and Save is disabled `apps/web-shell/playwright/tests/properties-subfeature-edit.spec.ts` (extend file from T036)

## Phase 5: US-4 — Multi-feature selection emitter (P1)

**Story goal**: Ctrl/Cmd-click on map and on Layers panel rows emit
multi-feature selections via a single, shared payload shape. Makes the
multi-select summary mode reachable for the first time.

**Independent test criteria**: Run `properties-multi-select.spec.ts` —
plain click → Ctrl/Cmd-click → toggle off → plain click; same loop via
Layers panel rows; navigator.platform mocked once as macOS. Selection
state shapes and panel modes match the contract's transition table
exactly. SC-010 + FR-021 + FR-022.

- [ ] T039 [test] Vitest for the glue function `applyClickToSelection({ target, modifier })` per the contract's transition table (8 cases) `shared/components/src/MapView/__tests__/applyClickToSelection.test.ts`
- [ ] T040 Implement `applyClickToSelection` (pure function) and the modifier-key detection helper that reads `navigator.platform` at app boot (Mac → `metaKey`, else `ctrlKey`); export both `shared/components/src/utils/applyClickToSelection.ts`
- [ ] T041 Extend `MapView.tsx` `onSelect` to surface `{ target, modifier, shift }` instead of `(featureId, event)`; route through `applyClickToSelection` → `setSelection` on the features slice `shared/components/src/MapView/MapView.tsx`. **Re-baseline note**: this is a breaking change to the `onSelect` signature (`shared/components/src/MapView/MapView.tsx:46` today is `(featureId, event)`). Update the two host call-sites as part of this task: `apps/web-shell/` and `apps/vscode/` (`grep -rn "onSelect=" apps/ shared/` to confirm — keep existing single-feature semantics on plain clicks).
- [ ] T042 Converge `FeatureList.tsx` onto the same `applyClickToSelection` glue (replace its inline modifier logic at FeatureList.tsx:154–179 with a call to the shared helper) — DRY per Issue 2's engineering preference `shared/components/src/FeatureList/FeatureList.tsx`
- [ ] T043 [P][test] Playwright web-shell: map two plain → modifier → modifier-toggle → plain sequence; assert selection shape + panel mode at each step `apps/web-shell/playwright/tests/properties-multi-select.spec.ts`
- [ ] T044 [P][test] Playwright web-shell: Layers panel equivalent of T043, asserting identical resulting selection shape `apps/web-shell/playwright/tests/properties-multi-select.spec.ts` (extend file from T043)
- [ ] T045 [P] Extend `AnalysisPage` with `selectFeatures(ids, { source: 'map' | 'layers' })` helper that internally chooses `click({ modifiers: [...] })` based on the mocked platform `apps/web-shell/playwright/pages/AnalysisPage.ts`

## Phase 6: US-5 — Read-only plot detection (P1)

**Story goal**: A read-only plot surfaces as a banner immediately
(pre-flight from `CapabilityReport.persistent`) and as an escalation
after any failed write (`ReadOnlyFilesystemError` / `EACCES` / `EPERM`).
Every panel mode renders disabled inputs; Save is unavailable. Staged
edits are preserved across failed saves (per spec US-5 AS-3).

**Independent test criteria**: Run `properties-read-only.spec.ts` — open
a chmod-0444 fixture; assert banner + disabled inputs in every mode +
Save action unavailable. Then: open a writable plot, stage an edit,
chmod the file to 0444, attempt save, assert banner appears and staged
edits remain in the buffer. SC-009.

- [ ] T046 [test] Vitest for the `readOnlyBanner` component (renders reason text, has `data-testid="read-only-banner"`, `aria-live="polite"`) `shared/components/src/PropertiesPanel/__tests__/readOnlyBanner.test.tsx`
- [ ] T047 Implement `readOnlyBanner` body (per the T023 shell) `shared/components/src/PropertiesPanel/readOnlyBanner.tsx`
- [ ] T048 Plumb `selectIsReadOnly` + `selectReadOnlyReason` into `ActivityPanel`; pass `readOnly` and `readOnlyReason` props down to `PropertiesForm` so every mode renders the banner above its form region; disable the Save action when `readOnly === true` `shared/components/src/ActivityPanel/ActivityPanel.tsx`
- [ ] T049 [P] In every mode component (`FeatureEditorMode`, `SubFeatureEditorMode`, `MultiSelectSummaryMode`, plot mode), apply `disabled` + `aria-disabled="true"` to every input when `readOnly` is true `shared/components/src/PropertiesPanel/modes/*` (touch each of the three sibling files + the plot-mode pathway in `PropertiesForm.tsx`)
- [ ] T050 [P][test] Playwright web-shell — pre-flight path: open the chmod-0444 fixture plot, assert banner appears in plot/feature/sub-feature/multi-select modes, assert all inputs disabled, assert Save action absent `apps/web-shell/playwright/tests/properties-read-only.spec.ts`
- [ ] T051 [P][test] Playwright web-shell — post-write path: open writable plot, stage an edit, chmod 0444 the file from the test, click Save, assert banner appears with the EACCES-derived reason, assert the staged edit is preserved (UI still shows the unsaved value), revert permissions, save again, assert success `apps/web-shell/playwright/tests/properties-read-only.spec.ts` (extend file from T050)
- [ ] T052 [P] Ship a read-only fixture: a copy of the existing local-store plot with the file marked 0444 in the test setup hook (no committed fixture; permissions set per-test) `apps/web-shell/playwright/fixtures/read-only.ts`

## Phase 7: US-3 — Selection-driven mode swap preserves staged edits (P2)

**Story goal**: As selection changes, the panel swaps between modes
without losing staged edits. Includes the multi-select read-only summary
mode now that US-4 has made it reachable.

**Independent test criteria**: Run `properties-mode-swap.spec.ts` —
cycle no → 1 feature → vertex on it → 2 features → no. At each step
assert mode container present + previously-staged edits not lost. Then
re-select earlier targets and assert their edits still in the form.

- [ ] T053 [test] Vitest for `MultiSelectSummaryMode` derivation: input two features with overlapping + diverging fields, assert shared values render their actual value and diverging fields render `(differs)`, assert all inputs `aria-disabled` `shared/components/src/PropertiesPanel/__tests__/MultiSelectSummaryMode.test.tsx`
- [ ] T054 Implement `MultiSelectSummaryMode` derivation (pure, memoised on `(selection.featureIds, featuresById)`); inputs disabled `shared/components/src/PropertiesPanel/modes/MultiSelectSummaryMode.tsx`
- [ ] T055 [P] Add `data-testid="properties-mode-multiselect"` + `data-testid="multiselect-differs-<slot>"` for the `(differs)` cells `shared/components/src/PropertiesPanel/modes/MultiSelectSummaryMode.tsx`
- [ ] T056 [P] Storybook story: `PropertiesForm — Multi-select summary` showing one shared value + one `(differs)` row + the inline "bulk edit not supported" note `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T057 [P][test] Playwright web-shell — full cycle: no → 1 → vertex → 2 → 0; staged edits on the 1-feature and the vertex preserved through every transition (re-select to verify) `apps/web-shell/playwright/tests/properties-mode-swap.spec.ts`
- [ ] T058 [P][test] Vitest unit: selection change does NOT touch the `useStagedEdits` buffer (re-asserts invariant from staged-edits-store.md and from US-3 AS-3) — covered partially by T013; add an explicit selection-driven case if not already present `shared/components/src/ActivityPanel/__tests__/useStagedEdits.test.ts`

## Phase 8: US-6 — Override → auto-derived revert (P2)

**Story goal**: Per-field "Revert" affordance on the six per-platform
override slots on `TrackProperties`. Click revert → field shows
auto-derived value; save → slot absent from the saved feature.

**Independent test criteria**: Run `properties-revert.spec.ts` — load
plot, select feature with at least one override on each of the six
slots, click Revert on `vessel_role`, save, reload, inspect saved JSON
to confirm slot absent. Plus: feature where the registry returns no
auto-derived value → Revert disabled with tooltip. SC-011.

- [ ] T059 [test] Vitest for `revertControl` widget covering the four conditions in the contract's state matrix (override + auto-derived → enabled; reverted → undo label; no auto-derived → disabled + tooltip; no override → hidden) `shared/components/src/PropertiesPanel/__tests__/revertControl.test.tsx`
- [ ] T060 Implement `revertControl` widget per the contract (`revert-action.md`); reads `effectiveValue`/`autoDerivedValue`/`hasOverride`/`isReverted`, emits `onRevert`/`onUnrevert` `shared/components/src/PropertiesPanel/revertControl.tsx`
- [ ] T061 Wire `revertControl` into `FeatureEditorMode` next to each of the six override slots (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`); pass `autoDerivedValue` from the platform-registry resolution (existing `@debrief/data` lookup) `shared/components/src/PropertiesPanel/modes/FeatureEditorMode.tsx`
- [ ] T062 Extend `useStagedEdits` with `revertField`/`unrevertField` actions per the contract; ensure `applyEditsToFeatures` translates `revertedFields` into "slot absent" on the saved feature (sparse storage) — this work belongs in T014 but list it explicitly here so US-6 has a concrete revert-flush hook `shared/components/src/ActivityPanel/useStagedEdits.ts`
- [ ] T063 [P] Extend the provenance `inputs[]` shape to include `op: 'set' | 'revert'` for each path; update the integrated save-path test (T024) if not already covered `shared/components/src/PropertiesPanel/provenanceTypes.ts`
- [ ] T064 [P] Add `data-testid="revert-<slot>"` per revert button (`revert-vessel_role` etc.) `shared/components/src/PropertiesPanel/revertControl.tsx`
- [ ] T065 [P][test] Playwright web-shell: load feature with overrides on `vessel_role`, click revert, save, reload, assert `vessel_role` slot absent from saved JSON `apps/web-shell/playwright/tests/properties-revert.spec.ts`
- [ ] T066 [P][test] Playwright web-shell: load a feature whose `id` is unknown to the platform registry (no auto-derived available), assert revert control disabled + tooltip text `apps/web-shell/playwright/tests/properties-revert.spec.ts` (extend file from T065)

## Phase 9: US-7 — Vertex editing for annotation geometries (P2)

**Story goal**: Generalise the sub-feature editor (US-2) so the same
`label`/`tags`/`note` form is reachable from a Polygon ring vertex, a
LineString vertex, a MultiPoint vertex, and a Point's implicit vertex.
Schema is already in place from Phase 2 (the slot lives on
`BaseFeatureProperties` so all seven annotation classes inherit it).

**Independent test criteria**: Run
`properties-annotation-vertex.spec.ts` — load plot with a polygon
annotation, click one ring vertex, fill label, save, reload, re-click
same vertex, assert restored. SC-012 (≥ 50 vertex edits across all four
geometry kinds in one session round-trip lossless).

- [ ] T067 [test] Extend `selectionMode.test.ts` (T011) with the four annotation-vertex paths if not already present; ensure each resolves to `subfeature` with the correct `path` `shared/components/src/PropertiesPanel/__tests__/selectionMode.test.ts`
- [ ] T068 [test] Vitest for `SubFeatureEditorMode` on each annotation geometry (Polygon `rings/R/vertices/V`, LineString `vertices/V`, MultiPoint `vertices/V`, Point `vertex/0`) — same field set, header reads geometry-appropriate identifier `shared/components/src/PropertiesPanel/__tests__/SubFeatureEditorMode.test.tsx`
- [ ] T069 Extend `SubFeatureEditorMode` to handle all four annotation path shapes (header formatter selects the geometry-appropriate label format; form body is unchanged) — same component, no per-geometry forks beyond the label `shared/components/src/PropertiesPanel/modes/SubFeatureEditorMode.tsx`
- [ ] T070 Extend the map vertex-click handlers so Polygon / LineString / MultiPoint / Point layers emit the structured path string into `selection.primary` via the existing `applyClickToSelection` helper from Phase 5 (geoman exposes vertex-level click events for these layers; wrap them) `shared/components/src/MapView/MapView.tsx`
- [ ] T071 [P] Storybook story: `PropertiesForm — Sub-feature mode (polygon vertex)` showing a populated ring vertex with label + tag + note (cross-geometry hero story for the blog post) `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx`
- [ ] T072 [P][test] Playwright web-shell: click a polygon ring vertex, fill, save, reload, re-click, assert restored; inspect saved JSON for `vertex_metadata` entry with `path: "rings/0/vertices/N"` `apps/web-shell/playwright/tests/properties-annotation-vertex.spec.ts`
- [ ] T073 [P][test] Same workflow against a LineString feature (one entry per test for clarity; `vertices/N` path) `apps/web-shell/playwright/tests/properties-annotation-vertex.spec.ts` (extend file from T072)
- [ ] T074 [P][test] Same workflow against a MultiPoint and against a single Point (`vertex/0`) `apps/web-shell/playwright/tests/properties-annotation-vertex.spec.ts` (extend file from T072)
- [ ] T075 [P][test] Cross-geometry round-trip stress: in one Playwright session edit at least 50 vertices across all four geometry kinds (mix of label/tags/note); save, reload, assert every entry restored byte-for-byte (SC-012) `apps/web-shell/playwright/tests/properties-annotation-vertex.spec.ts` (extend file from T072)

## Phase 10: Polish & Cross-Cutting Concerns

> **⚠️ PLAYWRIGHT WORKS IN CLOUD SESSIONS** — do NOT skip web-shell E2E
> evidence capture because of perceived browser-install constraints. The
> project bundles `@sparticuz/chromium`; run via
> `node apps/web-shell/run-playwright.mjs`. See
> `docs/project_notes/playwright-installation-research.md`.

### Documentation + cross-feature hygiene

- [ ] T076 Verify no regressions to #447 plot-editor mode by re-running its existing acceptance tests (FR-012 / SC-008) — capture in evidence `task verify`
- [ ] T077 [P] Update `BACKLOG.md` row 192 to status `complete` (struck-through) on PR merge — note added to the PR template; not executed here `BACKLOG.md`
- [ ] T078 [P] Update `CLAUDE.md` if any new Active Technologies actually shipped (no new runtime deps were planned, but re-run the script in case generated `@debrief/schemas` exports changed) `.specify/scripts/bash/update-agent-context.sh claude`
- [ ] T079 [P] Document the new `vertex_metadata` slot in any consumer-facing docs that reference `BaseFeatureProperties` — at minimum, add a short note in `docs/architecture/` if a property-list doc exists there `docs/architecture/` (verify presence; create only if a stub exists)

### Evidence Collection

- [ ] T080 Capture test results using template `.specify/templates/evidence/test-summary-template.md` in `specs/192-properties-panel-feature-edit/evidence/test-summary.md` (YAML front matter: `feature: 192-properties-panel-feature-edit`, `captured_at`, `git_sha`, totals across Vitest + pytest + Playwright + coverage %)
- [ ] T081 [P] Create usage demonstration walking through all seven user stories `specs/192-properties-panel-feature-edit/evidence/usage-example.md`
- [ ] T082 [P] Capture schema round-trip evidence (Python ↔ JSON ↔ TS ↔ JSON ↔ Python for `VertexMetadata` across all 8 inheriting classes) using the schema-test runner output `specs/192-properties-panel-feature-edit/evidence/round-trip-evidence.md`
- [ ] T083 [P] Capture web-shell E2E summary (which of the seven workflows passed, run times, screenshots produced) `specs/192-properties-panel-feature-edit/evidence/webview-e2e-summary.md`

### Storybook screenshots (UI component evidence)

- [ ] T084 [P] Capture Storybook screenshots — feature mode × 3 themes `specs/192-properties-panel-feature-edit/evidence/screenshots/properties-feature-{light,dark,vscode}.png`
- [ ] T085 [P] Capture Storybook screenshots — sub-feature track-point + polygon-vertex (vscode theme each) `specs/192-properties-panel-feature-edit/evidence/screenshots/properties-subfeature-{track,polygon}-vscode.png`
- [ ] T086 [P] Capture Storybook screenshots — multi-select summary + read-only state (vscode theme each) `specs/192-properties-panel-feature-edit/evidence/screenshots/properties-{multiselect,readonly}-vscode.png`

### Web-Shell workflow GIFs / hero screenshots

- [ ] T087 [P] Capture mode-swap interaction GIF (< 5 s, < 2 MB) via Playwright `recordVideo` cycling no → feature → vertex → multi → none `specs/192-properties-panel-feature-edit/evidence/screenshots/workflow-mode-swap.gif`
- [ ] T088 [P] Capture revert interaction GIF (< 5 s, < 2 MB) showing one click → auto-derived value appears → save → slot absent from JSON `specs/192-properties-panel-feature-edit/evidence/screenshots/workflow-revert.gif`
- [ ] T089 [P] Capture read-only hero screenshot (banner + disabled inputs across modes) `specs/192-properties-panel-feature-edit/evidence/screenshots/workflow-readonly.png`

### Media Content

- [ ] T090 Create feature blog post (title prefixed `Building `; first three body sections copied verbatim from `evidence/opening-context.md`; remaining sections — Screenshots, By the Numbers, Lessons Learned, What's Next — written from evidence) `specs/192-properties-panel-feature-edit/media/shipped-post.md`

### PR Creation

- [ ] T091 Create PR and publish blog: run `/speckit.pr`

**Task T091 must run last. It depends on every evidence + media task being complete, and on T076 confirming zero regressions to #447.**

## Dependencies

**Phase order**: 1 → 2 → (3, 4, 5, 6 in any order; all P1) → (7, 8, 9 in any order; all P2) → 10.

```text
Phase 1 (setup)
   │
   ▼
Phase 2 (foundation: schema, resolver, staging hook, RO signal, mode shells, save integration)
   │
   ├─→ Phase 3 (US-1)  ─┐
   ├─→ Phase 4 (US-2)  ─┤
   ├─→ Phase 5 (US-4)  ─┤   ◀── makes multi-select reachable; required for Phase 7
   └─→ Phase 6 (US-5)  ─┤
                       │
   ┌───────────────────┘
   │
   ├─→ Phase 7 (US-3) — depends on Phases 3+4+5 (needs all four modes wired)
   ├─→ Phase 8 (US-6) — depends on Phase 3 (FeatureEditorMode); independent of 4/5/6/7/9
   └─→ Phase 9 (US-7) — depends on Phases 4 and 5 (extends SubFeatureEditorMode + applyClickToSelection)
                       │
   ┌───────────────────┘
   ▼
Phase 10 (polish + evidence + media + PR)
```

**Within-phase critical paths**:

- Phase 2: schema (T005–T010) and the resolver (T011–T012) are independent of the staging hook (T013–T014) and the read-only signal (T015–T018); they CAN proceed in parallel by independent contributors. The mode dispatcher (T019) and the save-integration wiring (T024–T025) gate on the staging hook + the resolver. The mode shells (T020–T023) gate only on T019.
- Phase 3: T026 + T027 → T029 + T030 + T031 in parallel.
- Phase 4: T032 + T033 → T035 + T036 + T037 + T038 in parallel.
- Phase 5: T039 + T040 → T041 + T042 → T043 + T044 + T045 in parallel.
- Phase 6: T046 + T047 → T048 → T049 + T050 + T051 + T052 in parallel.
- Phase 7: T053 + T054 → T056 + T057 in parallel; T058 is just a coverage assertion against T013.
- Phase 8: T059 + T060 → T061 + T062 → T063 + T064 + T065 + T066 in parallel.
- Phase 9: T067 + T068 → T069 + T070 → T071 + T072 + T073 + T074 + T075 in parallel.
- Phase 10: T080 must precede T091; T081–T089 are all `[P]` and can run together; T090 reads `evidence/opening-context.md` + `evidence/test-summary.md`; T091 is last and depends on everything above.

**Suggested working order for a single agent**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 in strict serial. The dependency graph **also** supports interleaved development if multiple contributors are available — e.g., Phase 3 and Phase 5 can proceed concurrently once Phase 2 is green.

## Implementation Strategy

This feature ships in eleven increments — one per phase — each merge-
ready and demonstrably useful in isolation.

**Why this ordering**:

1. **Phase 2 is the wide moment** — every story below depends on the
   schema slot, the staging hook, the resolver, and the read-only
   signal. Get this green before fanning out. The integrated save-path
   Vitest (T024) is the single most important test in the feature; it
   gates the silent-failure surface flagged in `/speckit.review`.
2. **All four P1 stories are independent** once Phase 2 is green —
   they can land in any order or in parallel.
3. **US-3 (mode swap) is deferred to Phase 7** because its full
   acceptance covers the multi-select mode, which only becomes
   reachable after Phase 5 ships the emitter. Until then, US-3 is
   testable only against the plot/feature/sub-feature axes.
4. **US-7 (annotation vertices) is last among the P2s** because it
   exercises both the sub-feature renderer (US-2) and the new map
   click handlers (US-4). Doing it after those phases means the
   geometry generalisation is a small, focused diff against a known-
   good base.
5. **Polish is the unified evidence + media + PR pass.** No further
   code lands; only artefacts. The PR task (T091) is mechanically
   last and triggers `/speckit.pr` which handles the blog publish via
   `debrief.github.io`.

**Risk mitigation**:

- The biggest correctness risk is the silent-provenance gap closed by
  T024. Author T024 before T025 so the wiring lands against a failing
  test that turns green.
- The biggest perf risk is the O(n) vertex lookup at render time.
  T032 explicitly asserts O(1) via memoised `Map<path, VertexMetadata>`;
  if the implementation skips the memo, the test fails on the
  large-track fixture (≥ 50 vertices) and surfaces the regression
  early.
- The biggest UX risk is mid-session read-only escalation losing the
  buffer. T051 explicitly tests that the staged edit survives a
  chmod-induced save failure and replays after permissions are
  restored.

**Cross-cutting reminders**:

- Tests first per Article VII.1: every `[test]` task listed here MUST
  land before its non-test counterpart in the same phase. The order
  within a phase already follows this rule.
- No new runtime dependencies — confirm during code review.
- Strict types: `useStagedEdits.ts` is the most type-sensitive file
  (Article XV). Treat any `any` introduced there as a CI failure.
- Provenance shape (`tool`, `method`, `inputs[]` with `op`) is the
  audit trail — confirm visually in `evidence/usage-example.md`
  before opening the PR.

