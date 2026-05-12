# Implementation Plan: Properties Panel — Feature & Sub-feature Editing (refreshed)

**Branch**: `192-properties-panel-feature-edit` | **Date**: 2026-05-12 (refresh) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/192-properties-panel-feature-edit/spec.md`

## Summary

Extend the #447 Properties Panel shell across four selection-driven modes
(plot, feature, sub-feature, multi-select read-only summary) AND ship four
prerequisites that the original plan deferred: an upstream multi-select
emitter on the map and Layers panel (US-4), a read-only plot signal
sourced from filesystem-write capability with `ReadOnlyFilesystemError`
escalation (US-5), a per-field "revert" affordance on the six
`TrackProperties` per-platform override slots (US-6), and a single
cross-geometry vertex-metadata slot reachable from every annotation
feature class via `BaseFeatureProperties` (US-7).

The technical approach commits to the three corrections from `/speckit.review`:

1. The staging buffer, save→flush wiring, and provenance call site are
   **net-new** — not extensions of #447. `PropertiesForm` is a monolithic
   widget dispatcher today; the mode-aware controller is part of this
   feature, not a prerequisite.
2. The staging buffer lives in **`ActivityPanel` React state** (a
   `useReducer` hook colocated with the existing `onCommitField`
   controller), not in a new Zustand store. DRY-friendliest of the three
   options; survives selection changes; cleared on successful save;
   preserved on failed save.
3. The integrated save path — staged edits → writer call → provenance
   append → buffer clear → dirty clear — is covered by a dedicated
   Vitest integration test that mocks only the writer, closing the
   silent-provenance failure mode (Article I.3).

For the vertex-metadata slot (the heaviest design choice of the
expansion), research selects the **single-class-on-`BaseFeatureProperties`**
shape with a string `path` slot following the `selectionPath` convention
(`positions/N`, `rings/R/vertices/V`, `vertices/N`, `vertex/0`). All
seven annotation classes plus `TrackProperties` inherit it for free via
LinkML inheritance.

## Technical Context

**Language/Version**: TypeScript 5.x (strict — panel + selection wiring + click handlers + read-only signal consumer); Python 3.11 (LinkML schema + Pydantic adherence)
**Primary Dependencies**: `@debrief/components` (`PropertiesForm`, `ActivityPanel`, widget library — extended in this feature); `@debrief/session-state` (Zustand store, `features` slice — extended with `isReadOnly`; click-handler glue extended for modifier-aware emission); `@debrief/schemas` (LinkML-generated types — regenerated after schema change); `@debrief/stac-writer` (`CapabilityReport.persistent` consumed by the read-only signal source); LinkML ≥ 1.7.0 with the existing `Makefile` generators
**Storage**: GeoJSON Features inside STAC Items on the local filesystem; no new persistence backend (Constitution IV.4). The read-only signal is **derived** state held in session-state; it is not persisted to disk
**Testing**: Vitest + `@testing-library/react` for panel + selection-resolver + integrated save-path; pytest + LinkML adherence for the new `vertex_metadata` slot and its inheritance into all seven annotation classes; Playwright in `apps/web-shell/` for the four end-to-end workflows (US-1, US-2, US-5, US-6 + the multi-select swap from US-4 + a representative annotation-vertex flow from US-7)
**Target Platform**: VS Code extension host (Node 20.x) and web-shell (browser); both render the same `@debrief/components`
**Project Type**: Monorepo (pnpm + uv workspaces) — no new package
**Performance Goals**: Mode swap < 16 ms on a plot of 200 features × 5 000 positions (FR-002); multi-select summary derivation memoised on the selection tuple (O(features × fields), well under the 16 ms budget at the spec's caps); vertex-metadata lookup O(1) at form-load time (memoised Map by `path`)
**Constraints**: Offline-only (Article I.1); strict types, no `any` (Article XV); no new selection store (FR-017); no new form library (FR-016); zero regression to #447 plot-editor mode (FR-012, SC-008); writer abstraction is the only persistence boundary (Article IV.4)
**Scale/Scope**: Up to 200 features × 5 000 positions; expansion now also covers seven annotation feature classes inherited from `BaseFeatureProperties`. SC-005 lossless round-trip across ≥ 100 edits/session; SC-012 lossless round-trip across ≥ 50 vertex edits across all four geometry kinds in one session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Compliance | Notes |
|---|---|---|---|
| I. Defence-Grade Reliability | I.1 Offline by default | PASS | Every edit, signal, and emitter is local — no network. |
| I. Defence-Grade Reliability | I.3 No silent failures | PASS | Read-only attempted writes surface a single notice (FR-020). The integrated save-path Vitest (R-007 refresh) closes the silent-provenance gap flagged in `/speckit.review`. |
| II. Schema Integrity | II.1 Single source of truth | PASS | `vertex_metadata` is a new LinkML slot on `BaseFeatureProperties`; all 7 annotation classes + `TrackProperties` inherit it. Pydantic/TS/JSON Schema regenerated; no hand-written types. |
| II. Schema Integrity | II.2 Schema tests mandatory | PASS | Adherence harness covers the new slot on every concrete class (round-trip + golden fixtures + duplicate-path rejection). |
| III. Data Sovereignty | III.1 Provenance always | PASS | Every save with staged edits appends one `LogEntry` per affected feature (FR-013). Vertex paths use the existing `path` convention from #053. |
| III. Data Sovereignty | III.2 Source preservation | PASS | Edits modify metadata only; geometry untouched (Out of Scope). |
| III. Data Sovereignty | III.3 Audit trail immutable | PASS | Provenance entries append-only. |
| IV. Architectural Boundaries | IV.2 Frontends never persist | PASS | Staging is in-memory React state; all writes route through `saveSession` → writer abstraction. |
| IV. Architectural Boundaries | IV.4 Persistence-host abstraction | PASS | The read-only signal **reads from** the writer's `CapabilityReport.persistent` (the existing typed interface) — it does not bypass the abstraction. No new write code paths introduced. |
| V. Extensibility | V.2 Schema compliance | PASS | `vertex_metadata` flows through normal LinkML generation to every consumer. |
| VI. Testing | VI.2 Services require unit tests; VI.3 Integration tests | PASS | Vitest covers resolver + staging buffer + integrated save path. Schema covered by adherence. Playwright covers the workflows. |
| VII. Test-Driven AI Collaboration | VII.1 Tests before implementation | PASS | Spec acceptance scenarios → contract tests → implementation; ordering enforced by task graph. |
| VIII. Documentation | VIII.1 Specs before code | PASS | Spec ships before plan; plan re-baselined after `/speckit.review` corrections. |
| IX. Dependencies | IX.1 Minimal, vetted dependencies | PASS | **No new runtime dependencies.** Read-only signal piggy-backs on existing `CapabilityReport`. |
| XV. Strict Type Safety | XV.1–XV.6 | PASS | All new TS code strict, no `any`; LinkML-generated `vertex_metadata` is canonical; ESLint + pyright CI gates unchanged. |

**Result**: All gates PASS pre-design. Complexity Tracking remains empty.

The two architectural decisions worth highlighting (and resolved in
research):

- **R-008** picks the single-class-on-`BaseFeatureProperties` shape for
  `vertex_metadata` over per-geometry classes or a polymorphic address
  slot. Inheritance from the base gives all 7 annotation classes the
  slot for free with one definition.
- **R-009** sources the read-only signal from `CapabilityReport.persistent`
  + `ReadOnlyFilesystemError` post-write escalation, with most-restrictive
  precedence. No new schema field for "locked" — would otherwise duplicate
  what the writer abstraction already reports.

## Project Structure

### Documentation (this feature)

```text
specs/192-properties-panel-feature-edit/
├── plan.md                                # This file
├── research.md                            # R-001..R-011 (refreshed)
├── data-model.md                          # vertex_metadata + read-only signal + staging + multi-select
├── quickstart.md                          # 7-story walkthrough
├── contracts/
│   ├── selection-mode.md                  # Mode resolver (cross-geometry, with stale)
│   ├── staged-edits-store.md              # In-ActivityPanel hook + helpers
│   ├── vertex-metadata-slot.md            # LinkML slot + per-geometry path format
│   ├── read-only-signal.md                # Sources, precedence, consumer surface
│   ├── multi-select-emitter.md            # Map + Layers click semantics
│   ├── revert-action.md                   # Per-field revert semantics on the staging buffer
│   └── save-integration.md                # Integrated save-path contract (closes silent-provenance)
├── checklists/
│   └── requirements.md                    # Refreshed in /speckit.specify pass
└── evidence/
    └── opening-context.md                 # Phase 2 cached opener (refreshed)
```

### Source Code (repository root)

```text
shared/
├── schemas/
│   └── src/linkml/
│       ├── common.yaml                    # +VertexMetadata class, +vertex_metadata slot on BaseFeatureProperties
│       └── geojson.yaml                   # untouched (slot inherits via BaseFeatureProperties)
└── components/
    └── src/
        ├── PropertiesPanel/
        │   ├── PropertiesForm.tsx          # extend dispatcher with mode prop (no new file)
        │   ├── modes/
        │   │   ├── FeatureEditorMode.tsx       # NEW
        │   │   ├── SubFeatureEditorMode.tsx    # NEW (vertex-metadata form for all geometries)
        │   │   └── MultiSelectSummaryMode.tsx  # NEW (read-only summary)
        │   ├── selectionMode.ts                # NEW pure resolver
        │   ├── revertControl.tsx               # NEW per-field affordance (FR-023, FR-024)
        │   ├── readOnlyBanner.tsx              # NEW banner for the read-only state
        │   └── provenanceTypes.ts              # unchanged (types/sentinel)
        ├── ActivityPanel/
        │   ├── ActivityPanel.tsx               # extend: stagedEdits via useReducer (R-002a); read-only consumer
        │   └── useStagedEdits.ts               # NEW colocated hook owning the staging buffer
        ├── MapView/
        │   └── MapView.tsx                     # extend onSelect to surface modifier flags (FR-021/022)
        └── FeatureList/
            └── FeatureList.tsx                 # ✅ already passes event flags; no change required

services/
└── session-state/
    └── src/
        ├── store/slices/features.ts            # ✅ existing selection slice (no change)
        ├── store/slices/plot.ts                # extend: derived `isReadOnly` field
        ├── persistence/save.ts                 # consume CapabilityReport + escalate ReadOnlyFilesystemError → isReadOnly
        └── utils/selectionPath.ts              # ✅ existing parser (used by selectionMode)

apps/
├── vscode/                                     # no source changes; consumes @debrief/components
└── web-shell/
    └── playwright/
        ├── pages/AnalysisPage.ts               # extend: selectFeature/selectFeatures (modifier+click) + selectVertex
        └── tests/
            ├── properties-feature-edit.spec.ts       # NEW
            ├── properties-subfeature-edit.spec.ts    # NEW (track point)
            ├── properties-mode-swap.spec.ts          # NEW
            ├── properties-read-only.spec.ts          # NEW (US-5)
            ├── properties-multi-select.spec.ts       # NEW (US-4)
            ├── properties-revert.spec.ts             # NEW (US-6)
            └── properties-annotation-vertex.spec.ts  # NEW (US-7 — one geometry: Polygon)

shared/components/src/PropertiesPanel/__tests__/
├── selectionMode.test.ts                       # NEW (resolver, all geometry kinds)
├── useStagedEdits.test.ts                      # NEW (staging buffer behaviour)
├── saveSession-integration.test.ts             # NEW (3A — closes silent-provenance)
└── revertControl.test.tsx                      # NEW (FR-023, FR-024)

shared/schemas/tests/
└── vertex_metadata_*.py                        # NEW adherence: round-trip, inheritance across 7 classes, duplicate-path rejection
```

**Structure Decision**: Continue the existing monorepo layout. All UI work
lives in `shared/components/src/`; the schema change lives in
`shared/schemas/src/linkml/common.yaml` (a single edit to
`BaseFeatureProperties` — the new slot inherits everywhere); session-state
extensions are confined to `services/session-state/src/`. No new package,
no new app, no new build target.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `PropertiesForm` — Feature mode | `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx` (NEW) | `properties-feature.js` | Show editing a track's tags + a per-platform override **with the revert control** visible |
| `PropertiesForm` — Sub-feature mode (track) | same file | `properties-subfeature-track.js` | Show editing point-level `label`/`tags`/`note` on a track position |
| `PropertiesForm` — Sub-feature mode (polygon vertex) | same file | `properties-subfeature-polygon.js` | Show the same field set on a polygon ring vertex — drives the cross-geometry narrative |
| `PropertiesForm` — Multi-select summary | same file | `properties-multiselect.js` | Show the read-only "differs"/common-value summary |
| `PropertiesForm` — Read-only state | same file | `properties-read-only.js` | Show the lock banner + disabled inputs across modes |

**Inclusion Criteria Applied**:

- [x] New visual component (revert control, read-only banner, mode siblings)
- [x] Significant visual change (mode-aware swap, header changes)
- [x] Interactive demo adds narrative value (revert + vertex annotation are visually compelling)

**Bundleability Verified**:

- [x] Stories exist in Storybook (NEW file — counted as such)
- [x] Components render standalone (story args feed mock selection + mock features)
- [x] Reasonable bundle size expected (< 500 KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/propertiespanel-propertiesform`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| Feature mode | Render, dirty on edit, revert control toggles override state, a11y | light, dark, vscode | fill tag, click revert, assert auto-derived value restored + dirty=true |
| Sub-feature mode (track) | Render header (track + index), label/tags/note inputs | light, dark, vscode | type label, add tag, type note; assert all staged |
| Sub-feature mode (polygon vertex) | Render header (parent feature + `rings/0/vertices/3`), same field set | light, dark, vscode | same interactions; assert same field set as track |
| Multi-select summary | Render disabled state + "(differs)" indicator | light, dark, vscode | hover indicator tooltip; assert `aria-disabled` |
| Read-only state | Render lock banner + disabled inputs across modes | light, dark, vscode | attempt to type → input rejects; banner reads the source reason |

**Testing Strategy**:

- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid` per mode container, `aria-disabled`, `aria-label` on revert/lock)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/PropertiesForm.spec.ts`

**Theme Variant URLs**: see existing pattern; one URL per `(story, theme)` combination — 15 total (5 stories × 3 themes).

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Edit one feature + override + save → reload (US-1, US-6) | MapView, ActivityPanel, PropertiesPanel, NarrativeLog | `.leaflet-container`, `[data-testid="properties-panel"]`, `[data-testid="properties-mode-feature"]`, `[data-testid="revert-vessel_role"]` | open plot, click feature, edit tag + override, click revert, save, reload, re-select, assert values |
| Edit a track-point's metadata, save, reload (US-2) | MapView, ActivityPanel, PropertiesPanel | as above + `[data-testid="properties-mode-subfeature"]`, `[data-testid="vertex-label-input"]` | click point, fill, save, reload, re-click point, assert restored |
| Selection-driven mode swap preserves staged edits (US-3) | MapView, FeatureList, ActivityPanel, PropertiesPanel | `[data-testid="feature-list"]`, `[data-testid="properties-mode-*"]` | cycle no→1→point→2→0; assert mode + staged-edit preservation |
| Multi-feature selection from map + Layers (US-4) | MapView, FeatureList, PropertiesPanel | `.leaflet-container`, `[data-testid="feature-list-row-*"]` | Ctrl/Cmd-click two features on map; same in Layers; assert multi-select summary in both paths |
| Read-only plot disables every editing path (US-5) | ActivityPanel, PropertiesPanel | `[data-testid="read-only-banner"]`, `[data-testid="properties-panel"]` | open a read-only fixture plot; assert banner visible in every mode; assert save action unavailable |
| Annotation vertex metadata, save, reload (US-7) | MapView (Polygon layer), ActivityPanel, PropertiesPanel | `[data-testid="properties-mode-subfeature"]` | click a polygon ring vertex; fill label/tags/note; save; reload; re-click same vertex; assert restored |

**Testing Strategy**:

- [x] Workflow runs end-to-end in the web-shell
- [x] `AnalysisPage` extended with `selectFeature(id, { modifier })`, `selectFeatures(ids)`, `selectVertex(featureId, path)`
- [x] Screenshots written into `specs/192-properties-panel-feature-edit/evidence/screenshots/`

**Test File Location**: `apps/web-shell/playwright/tests/properties-*.spec.ts` (seven files — see Project Structure)

**Run Commands** unchanged: `cd apps/web-shell && node run-playwright.mjs properties-feature-edit`, etc.

## Complexity Tracking

*No violations. Section intentionally empty.*
