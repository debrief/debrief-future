# Implementation Plan: Properties Panel — Feature & Sub-feature Editing

**Branch**: `192-properties-panel-feature-edit` | **Date**: 2026-05-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/192-properties-panel-feature-edit/spec.md`

## Summary

Extend the Properties Panel shell shipped in #447 so the in-plot section
edits a single selected feature, or a single track-point sub-feature,
based on `FeatureSelection`. When the primary selection resolves to a
position path (e.g., `track-001/positions/4` per #053), render a form for
new point-level metadata (`label`, `tags`, `note`); when exactly one
feature is selected, render the existing schema-driven form against that
feature's editable `TrackProperties`/`BaseFeatureProperties` slots; when
two or more features are selected, render a read-only field summary;
otherwise fall through to the plot-editor mode that #447 already
delivers.

The technical approach reuses the #447 stack untouched: `PropertiesForm`
as the dispatcher, the existing `ParameterEditor`/`ArrayWidget` family as
widgets, the existing session-state staging buffer (extended with a
`(featureId, positionIndex)` key for point-level edits), and the existing
`appendProvenance(method = 'properties-panel@<version>')` plumbing on
plot save. The only schema change is a new optional `position_metadata`
slot on `TrackProperties` carrying a sparse map keyed by the position
index — chosen over inlining metadata into `TimestampedPosition` so
existing kinematic round-trips stay unchanged.

## Technical Context

**Language/Version**: TypeScript 5.x (strict, panel + selection wiring); Python 3.11 (LinkML schema + Pydantic regeneration tests)
**Primary Dependencies**: existing `@debrief/components` (`PropertiesForm`, `ActivityPanel`, `ParameterEditor`, `ArrayWidget`, `BboxWidget`, `DateTimeWidget`, `PlatformArrayWidget`); `@debrief/session-state` (Zustand store, `features` slice, `selectionPath` utils); `@debrief/schemas` (LinkML-generated TS + Pydantic types); LinkML ≥ 1.7.0 with `gen-pydantic` / `gen-typescript` / `gen-json-schema`
**Storage**: GeoJSON Features inside STAC Items on the local filesystem; no new persistence backend (per Constitution IV.4 — frontends never persist directly; saves continue to flow through the existing `saveSession` writer interface)
**Testing**: Vitest + `@testing-library/react` for the panel unit tests; pytest + LinkML adherence harness for the schema change; Playwright in `apps/web-shell/` for end-to-end selection-driven swap, point-edit, and provenance checks
**Target Platform**: VS Code extension host (Node 20.x) and web-shell (browser); both render the same `@debrief/components` panel
**Project Type**: Monorepo (pnpm + uv workspaces) — no new package, only edits to existing packages
**Performance Goals**: Panel mode swap completes within one render cycle on selection change (FR-002 — no perceptible delay; budget < 16 ms swap latency on a representative plot of 50 features × 200 points)
**Constraints**: Offline-only (Constitution I.1); strict types (Constitution XV — no `any`); no new selection store (FR-017); no new form library (FR-016); zero regressions to #447 plot-editor mode (FR-012, SC-008)
**Scale/Scope**: Targets analyst-scale plots (≤ 200 features, ≤ 5 000 total positions); SC-005 requires lossless round-trip across at least 100 edits in one session; the new `position_metadata` slot must round-trip Python ↔ JSON ↔ TypeScript per Constitution II.2

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Clause | Compliance | Notes |
|---------|--------|------------|-------|
| I. Defence-Grade Reliability | I.1 Offline by default | PASS | All editing flows are local DOM + Zustand + filesystem write through the existing writer (FR-014). |
| I. Defence-Grade Reliability | I.3 No silent failures | PASS | Schema-validation errors surface inline next to the offending field; save state is reflected in the existing dirty indicator (Edge Cases §"Schema validation rejects a value"). |
| II. Schema Integrity | II.1 Single source of truth | PASS | New `position_metadata` slot added to LinkML; Pydantic + TS + JSON Schema **regenerated** (FR-007); no hand-written types. |
| II. Schema Integrity | II.2 Schema tests mandatory | PASS | Adherence tests for the new slot land alongside the schema change (round-trip, golden fixtures, structural comparison) — see `tests/` plan in this document. |
| III. Data Sovereignty | III.1 Provenance always | PASS | Every save with feature- or point-level edits appends a provenance entry via `appendProvenance(method = 'properties-panel@<version>')` (FR-013). |
| III. Data Sovereignty | III.2 Source preservation | PASS | Edits modify metadata only; geometry/coordinates/timestamps are untouched (Out of Scope: editing geometry). |
| III. Data Sovereignty | III.3 Audit trail immutable | PASS | Provenance entries are appended only — `LogEntry[]` model unchanged. |
| IV. Architectural Boundaries | IV.2 Frontends never persist | PASS | Panel stages edits in Zustand only; persistence remains in the existing writer abstraction reached via the existing `saveSession` flow. |
| IV. Architectural Boundaries | IV.4 Persistence-host abstraction | PASS | No direct write code paths added; all writes still flow through the unified writer. ESLint `no-direct-persistence-in-frontend` continues to pass. |
| V. Extensibility | V.2 Schema compliance | PASS | `position_metadata` is a normal LinkML slot — extensions and downstream consumers see it through the regenerated types automatically. |
| VI. Testing | VI.2 Services require unit tests; VI.3 Integration tests | PASS | Panel changes covered by Vitest; schema by adherence harness; selection-driven swap and point-edit by Playwright web-shell tests. |
| VII. Test-Driven AI Collaboration | VII.1 Tests before implementation | PASS | Acceptance scenarios in `spec.md` map 1:1 to Vitest + Playwright cases listed in this plan; tasks (`/speckit.tasks`) will land tests before implementation. |
| VIII. Documentation | VIII.1 Specs before code | PASS | `spec.md` shipped before this plan; this plan precedes any code. |
| IX. Dependencies | IX.1 Minimal, vetted dependencies | PASS | **No new runtime dependencies.** All work uses existing `@debrief/components`, `@debrief/session-state`, `@debrief/schemas`. |
| XV. Strict Type Safety | XV.1–XV.6 | PASS | All new TS code in strict mode; no `any`; LinkML-generated types are canonical for `position_metadata`; ESLint + pyright remain CI-required. |

**Result**: All gates PASS. No entries required in Complexity Tracking.

The single architectural call worth flagging in research is the
**storage shape of point-level metadata** (parallel sparse map vs.
inline on `TimestampedPosition`). This is a schema-modelling choice, not
a constitutional violation; it is resolved in `research.md` R-001.

## Project Structure

### Documentation (this feature)

```text
specs/192-properties-panel-feature-edit/
├── plan.md              # This file
├── research.md          # Phase 0 — schema modelling + selection-path contract
├── data-model.md        # Phase 1 — staged-edit shape + new schema slot
├── quickstart.md        # Phase 1 — verify the feature in 5 minutes
├── contracts/
│   ├── selection-mode.md          # Mode-resolution rules (selection → mode)
│   ├── staged-edits-store.md      # Zustand staging buffer surface
│   └── position-metadata-slot.md  # LinkML slot definition + JSON Schema
├── checklists/
│   └── requirements.md  # (already created by /speckit.specify)
└── evidence/
    └── opening-context.md  # Phase 2 cached opener
```

### Source Code (repository root)

```text
shared/
├── schemas/
│   └── src/linkml/
│       ├── common.yaml          # +PositionMetadata class, +position_metadata slot
│       └── geojson.yaml         # TrackProperties references position_metadata
└── components/
    └── src/
        ├── PropertiesPanel/
        │   ├── PropertiesForm.tsx              # +mode dispatch (existing dispatcher extended)
        │   ├── modes/
        │   │   ├── PlotEditorMode.tsx          # extracted from #447 (no behaviour change)
        │   │   ├── FeatureEditorMode.tsx       # NEW
        │   │   ├── SubFeatureEditorMode.tsx    # NEW
        │   │   └── MultiSelectSummaryMode.tsx  # NEW (read-only)
        │   ├── selectionMode.ts                # NEW — pure mode resolver
        │   ├── stagedEditsStore.ts             # touch — extend keying for (featureId, positionIndex)
        │   └── provenanceTypes.ts              # unchanged
        └── ActivityPanel/
            └── ActivityPanel.tsx               # unchanged

services/
└── session-state/
    └── src/store/slices/features.ts            # touch — selectors for resolving selection → mode

apps/
├── vscode/                  # no source changes; consumes the same @debrief/components
└── web-shell/
    └── playwright/tests/
        ├── properties-feature-edit.spec.ts     # NEW
        ├── properties-subfeature-edit.spec.ts  # NEW
        └── properties-mode-swap.spec.ts        # NEW

shared/components/src/PropertiesPanel/__tests__/  # NEW Vitest suite
shared/schemas/tests/                            # +position_metadata adherence tests
```

**Structure Decision**: Reuse the existing monorepo layout. All UI work
lands in `shared/components/src/PropertiesPanel/`; the schema change
lands in `shared/schemas/src/linkml/`; selection-resolver work lands in
`services/session-state/`. **No new package, no new app, no new build
target.** This keeps the change reviewable as a layered diff and
preserves the #447 plot-editor mode by extracting it into its own mode
component before touching anything else (a no-op refactor that is its
own first task — see `tasks.md` to be generated by `/speckit.tasks`).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `PropertiesForm` (Feature mode) | `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx` (extend existing) | `properties-feature.js` | Show editing one feature's tags + a per-platform override |
| `PropertiesForm` (Sub-feature mode) | `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx` (new story) | `properties-subfeature.js` | Show editing point-level `label` + `tags` + `note` |
| `PropertiesForm` (Multi-select summary) | `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx` (new story) | `properties-multiselect.js` | Show read-only "differs"/common-value summary |

**Inclusion Criteria Applied**:

- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:

- [x] Stories exist in Storybook (extend existing `PropertiesForm.stories.tsx`)
- [x] Components render standalone (no app context required — feed mock selection + mock features as story args)
- [x] Reasonable bundle size expected (< 500 KB — same shape as the existing #447 stories already bundled)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/propertiespanel-propertiesform`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `PropertiesForm.stories.tsx` — Feature mode | Rendering, dirty-indicator on edit, accessibility | light, dark, vscode | fill tag input, blur, assert dirty + value persisted in store mock |
| `PropertiesForm.stories.tsx` — Sub-feature mode | Rendering point header (track + index), label + tag + note inputs | light, dark, vscode | type label, add tag, type note, assert all three staged |
| `PropertiesForm.stories.tsx` — Multi-select summary | Rendering disabled state + "(differs)" indicator | light, dark, vscode | hover indicator, assert tooltip; assert all inputs disabled |

**Testing Strategy**:

- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid` on each mode container, `aria-label` on the differs indicator, `aria-disabled` on multi-select inputs)
- [x] Screenshots captured for evidence (one per mode × theme)

**Test File Location**: `shared/components/e2e/PropertiesForm.spec.ts`

**Theme Variant URLs** (for Storybook):

```text
/iframe.html?id=propertiespanel-propertiesform--feature-mode&globals=theme:light
/iframe.html?id=propertiespanel-propertiesform--feature-mode&globals=theme:dark
/iframe.html?id=propertiespanel-propertiesform--feature-mode&globals=theme:vscode
/iframe.html?id=propertiespanel-propertiesform--sub-feature-mode&globals=theme:light
/iframe.html?id=propertiespanel-propertiesform--sub-feature-mode&globals=theme:dark
/iframe.html?id=propertiespanel-propertiesform--sub-feature-mode&globals=theme:vscode
/iframe.html?id=propertiespanel-propertiesform--multiselect-summary&globals=theme:light
/iframe.html?id=propertiespanel-propertiesform--multiselect-summary&globals=theme:dark
/iframe.html?id=propertiespanel-propertiesform--multiselect-summary&globals=theme:vscode
```

## Web-Shell E2E Testing

| Workflow | Panels/Components Involved | Key Selectors | Interactions |
|----------|---------------------------|---------------|--------------|
| Edit one feature's tags + an override, save, reload | MapView, ActivityPanel, PropertiesPanel | `.leaflet-container`, `[data-testid="properties-panel"]`, `[data-testid="properties-mode-feature"]` | load plot, click feature on map, edit tag input, edit override, click Save, reload, re-select, assert values restored + provenance entry visible in NarrativeLog |
| Edit one track-point's metadata, save, reload | MapView, ActivityPanel, PropertiesPanel, NarrativeLog | `.leaflet-container`, `[data-testid="properties-mode-subfeature"]`, `[data-testid="point-label-input"]`, `[data-testid="point-tags-input"]`, `[data-testid="point-note-input"]` | load plot, click a track point on map, fill label/tags/note, save, reload, re-click same point, assert values restored |
| Selection-driven mode swap with staged edits preserved | MapView, FeatureList, ActivityPanel, PropertiesPanel | `[data-testid="feature-list"]`, `[data-testid="properties-panel"]`, `[data-testid="properties-mode-{plot,feature,subfeature,multiselect}"]` | cycle: no selection → 1 feature → point on it → 2 features → no selection; at each step assert mode container present and previously-staged edits not lost |

**Testing Strategy**:

- [x] Workflow runs end-to-end in the web-shell
- [x] Page objects in `apps/web-shell/playwright/pages/` extended (extend `AnalysisPage` with `propertiesPanel` accessors and `selectFeature(id)` / `selectPosition(featureId, positionIndex)` helpers; do not duplicate)
- [x] Screenshots and/or interaction GIF written **directly** into `specs/192-properties-panel-feature-edit/evidence/screenshots/` from the spec file (follow the `properties-screenshots.spec.ts` path-resolution pattern from #447)

**Test File Location**: `apps/web-shell/playwright/tests/properties-{feature,subfeature,mode-swap}.spec.ts`

**Run Commands**:

- Cloud: `cd apps/web-shell && node run-playwright.mjs properties-feature-edit`
- Local: `pnpm --filter @debrief/web-shell test properties-feature-edit`

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

*No violations. Section intentionally empty.*
