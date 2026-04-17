# Implementation Plan: Properties Panel for STAC Plot & Catalog Metadata

**Branch**: `193-properties-panel` | **Date**: 2026-04-17 (post `/speckit.review` revision) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/193-properties-panel/spec.md`

## Summary

Add a schema-driven Properties Panel that edits STAC item metadata (title, description, temporal fields, `debrief:tags`, `debrief:platforms`, `debrief:feature_tags`) at two surfaces: a new 4th section of `ActivityPanel` (plot open) and a new stacked area under `ThumbnailPreview` in `StacBrowser` (plot closed). Both surfaces are write-through: every committed edit flows through a single service method `stacService.updateItemMetadata`, which atomically writes `item.json`, appends a per-commit entry to `item.properties["debrief:provenance_log"]`, and registers the edited fields in `item.properties["debrief:overrides"]`. `stacService.updateTemporalMetadata` is edited to respect the overrides list and to become idempotent. Forms render from the LinkML-generated JSON Schema; scalar widgets reuse the existing `ParameterEditor` pattern, with new sibling widgets (`ArrayWidget`, `DateTimeWidget`, `BboxWidget`, `PlatformArrayWidget`) that follow the same `onCommit(name, value) / onCancel()` lifecycle. No `PropertiesSlice` / Zustand staging — data changes go through services, session-state stays UI-only. StacBrowser gains a surface-local `BrowserSelectionContext` React context so sibling panels can subscribe to the current item.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, VS Code extension, web-shell); Python 3.11 (schema generation only).
**Primary Dependencies**: React 18.x, Zustand ^5.0.0 (unchanged by this feature — no new slices), `@debrief/schemas` (generated TypeScript types + JSON Schema), `@debrief/components` (existing `ParameterEditor`, `ActivityPanel`, `StacBrowser`), VS Code Extension API ^1.85.0, LinkML >= 1.7.0 (schema generation only), `ulid` (per-commit activity_id generation — small existing dep).
**Storage**: Filesystem — `item.json` written atomically by `apps/vscode/src/services/stacService.ts` via temp+rename. Provenance archive at `<item_dir>/provenance_log_archive.jsonl` (newline-delimited JSON, append-only). No database, no network.
**Testing**: vitest (unit + component), Storybook (visual), Playwright ^1.57.0 via `@sparticuz/chromium` (component E2E + VS Code webview E2E), pytest (schema tests for `debrief:overrides` + `debrief:provenance_log` + `PropertiesProvenanceEntry`), plus two new CI gates: offline-invariant harness (Decision 10) and schema-evolution smoke (Decision 11).
**Target Platform**: VS Code extension (desktop) and web-shell (browser).
**Project Type**: Web/desktop hybrid — existing `pnpm workspaces` monorepo.
**Performance Goals**: Opening the Properties section renders the form within 200ms (P95) after expansion. A single committed edit completes its full disk write within 100ms on modest disk. `debrief:provenance_log` stays bounded at 500 entries per item (Decision 12), so read-rewrite stays O(cap), not O(total edits).
**Constraints**: Offline-only (FR-010, Article I.1 — enforced in CI by Decision 10 fetch-mock harness). No new form library (FR-011). No new global selection store (FR-007 — surface-local context instead). Article XV strict typing — zero `any` in new code. No `PropertiesSlice` — data via services, not Zustand (Decision 2).
**Scale/Scope**: Item-level metadata — tens of editable fields per item, arrays capped by the LinkML schema to ~50 entries. One plot open at a time (today).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Evidence |
|---------|------|--------|----------|
| I. Defence-Grade Reliability | Offline by default; no silent failures | ✅ Pass | FR-010 + Decision 10 enforced in CI; FR-014 + Decision 9 atomic write + mtime stale-edit detection; all errors surfaced inline or via banner. |
| II. Schema Integrity | LinkML source of truth; schema tests gate merges | ✅ Pass | Two LinkML additions (`debrief:overrides`, `debrief:provenance_log` + `PropertiesProvenanceEntry`), golden + round-trip + structural tests. |
| III. Data Sovereignty | Provenance always; audit trail immutable | ✅ Pass | FR-006 + Decision 7 record one entry per commit. Decision 12 archive-rotation preserves immutability (append-only JSONL — no in-place deletion). |
| IV. Architectural Boundaries | Services return data only; frontends don't persist | ✅ Pass | All writes through `stacService.updateItemMetadata`. Webviews never write disk. Decision 2 reinforces: session-state stays UI-only. |
| V. Extensibility | Schema-driven form | ✅ Pass | FR-003 + SC-003 + Decision 11 CI gate. |
| VI. Testing | Unit + integration + CI required | ✅ Pass | Full test matrix in Storybook E2E + Webview E2E sections below. |
| VII. Test-Driven AI Collaboration | Acceptance criteria testable | ✅ Pass | Every FR-### maps to Given/When/Then in spec.md. |
| VIII. Documentation | Spec before code; ADRs for significant decisions | ✅ Pass | spec.md + plan.md + research.md (14 decisions, post-review). |
| IX. Dependencies | Minimal, vetted | ✅ Pass | Zero new runtime deps. `ulid` already in the workspace. |
| X. Security | No secrets; no cloud assumption | ✅ Pass | Local-filesystem only. |
| XI. Internationalisation | Strings externalisable | ✅ Pass | Form labels resolved from LinkML `title` annotations. |
| XIII. Contribution Standards | Atomic commits, PR review, CI green | ✅ Pass | Standard flow. |
| XIV. Pre-Release Freedom | Breaking schema changes permitted pre-v4.0 | ✅ Pass — noted | Two additive LinkML changes; no breaking schema evolution. |
| XV. Strict Type Safety | No `any`; strict mode | ✅ Pass | All contracts strongly typed; schema boundary uses `unknown` with per-field narrowing. |

**Result**: No violations. No Complexity Tracking entries required.

## Project Structure

### Documentation (this feature)

```text
specs/193-properties-panel/
├── plan.md              # This file (post-review revision)
├── spec.md              # Feature specification (post-review revision)
├── research.md          # Phase 0 findings + 14 decisions including review deltas
├── data-model.md        # Entities: debrief:overrides, debrief:provenance_log, PropertiesProvenanceEntry, BrowserSelectionContext
├── quickstart.md        # Reviewer-facing manual test script (updated for direct-write)
├── contracts/
│   ├── activity-panel-messages.ts     # Single properties:commit message
│   ├── stac-service-extension.ts      # updateItemMetadata + updateTemporalMetadata (edit)
│   ├── provenance-entry.ts            # PropertiesProvenanceEntry shape + archive constants
│   └── properties-form-component.ts   # PropertiesForm + FieldSpec + BrowserSelection
├── checklists/
│   └── requirements.md
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 3 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
shared/
├── schemas/
│   └── src/linkml/stac-extension.yaml          # ADD debrief:overrides + debrief:provenance_log + PropertiesProvenanceEntry
│
├── components/
│   ├── src/
│   │   ├── PropertiesPanel/                    # NEW folder
│   │   │   ├── PropertiesForm.tsx              # NEW — schema-driven form
│   │   │   ├── schemaResolver.ts               # NEW — JSON Schema → FieldSpec
│   │   │   ├── ArrayWidget.tsx                 # NEW — chip list for string arrays
│   │   │   ├── DateTimeWidget.tsx              # NEW — ISO-8601 picker
│   │   │   ├── BboxWidget.tsx                  # NEW — bounding box quad
│   │   │   ├── PlatformArrayWidget.tsx         # NEW — platform record list
│   │   │   ├── PropertiesForm.stories.tsx      # NEW
│   │   │   ├── ArrayWidget.stories.tsx         # NEW
│   │   │   ├── DateTimeWidget.stories.tsx      # NEW
│   │   │   ├── BboxWidget.stories.tsx          # NEW
│   │   │   ├── PlatformArrayWidget.stories.tsx # NEW
│   │   │   ├── __test__/
│   │   │   │   └── offlineHarness.ts           # NEW — Decision 10 (fetch-mock)
│   │   │   └── index.ts                        # NEW
│   │   ├── ActivityPanel/
│   │   │   ├── ActivityPanel.tsx               # EDIT — add 4th <PaneSection>
│   │   │   └── types.ts                        # EDIT — propertiesCollapsed + PropertiesCommitMessage
│   │   ├── StacBrowser/
│   │   │   ├── StacBrowser.tsx                 # EDIT — stacked Properties area under ThumbnailPreview
│   │   │   ├── BrowserSelectionContext.tsx     # NEW — surface-local selection context
│   │   │   └── types.ts                        # EDIT — PropertiesCommitMessage
│   │   └── LogPanel/
│   │       └── ParameterEditor.tsx             # UNCHANGED — reused by PropertiesForm
│   └── e2e/
│       ├── PropertiesForm.spec.ts              # NEW — Playwright component E2E
│       └── PropertiesWidgets.spec.ts           # NEW
│
services/
└── session-state/                              # UNTOUCHED (Decision 2 — no new slice)
│
apps/
├── vscode/
│   ├── src/
│   │   ├── services/stacService.ts             # EDIT — add updateItemMetadata (atomic+mtime, archive rotation);
│   │   │                                       #         EDIT updateTemporalMetadata (override-aware + idempotent)
│   │   ├── panels/activityPanelView.ts         # EDIT — handle properties:commit
│   │   └── panels/stacBrowserPanel.ts          # EDIT — handle properties:commit
│   └── tests/unit/
│       ├── stacService.updateItemMetadata.test.ts   # NEW — happy + stale + schema + read-only
│       ├── stacService.atomicWrite.test.ts          # NEW — crash-safety
│       └── stacService.provenanceRotation.test.ts   # NEW — Decision 12 cap + archive
│
tests/
├── e2e/
│   └── test-properties-panel.spec.ts           # NEW — webview E2E covering Decisions 2, 8, 9
└── fixtures/
    └── properties-panel/
        └── evolving-schema.yaml                # NEW — Decision 11 schema-evolution CI gate
```

**Structure Decision**: Existing monorepo layout. New folder `shared/components/src/PropertiesPanel/`. Existing services (`stacService`) gain one new method and one edit. Session-state is completely untouched (Decision 2). Blast radius: ~15 new files, ~7 edited files, 2 LinkML additions. Fewer moving parts than the pre-review draft (was ~30 files).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| `PropertiesForm` | `shared/components/src/PropertiesPanel/PropertiesForm.stories.tsx` | `properties-form.js` | Interactive demo: live-edit mock STAC item across all widget types; shows validation + override chips; demonstrates per-commit persistence. |
| `ArrayWidget` | `shared/components/src/PropertiesPanel/ArrayWidget.stories.tsx` | `array-widget.js` | Chip-list add/remove for `debrief:tags`. |
| `BboxWidget` | `shared/components/src/PropertiesPanel/BboxWidget.stories.tsx` | `bbox-widget.js` | Four-quad numeric editor with min<max invariant. |

**Inclusion Criteria Applied**:

- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:

- [ ] Stories exist in Storybook (after task T### ships)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB) — no new heavy deps

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/propertiespanel-propertiesform--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `PropertiesForm.stories.tsx` | Schema-driven render, per-commit persistence (via mocked onCommit), validation errors, derivation chips | light, dark, vscode | fill, select, click, keyboard, blur |
| `ArrayWidget.stories.tsx` | Chip add/remove, max-items, duplicate rejection | light, dark, vscode | fill, Enter-to-add, click-to-remove |
| `DateTimeWidget.stories.tsx` | ISO-8601 format validation, clear | light, dark, vscode | fill, blur |
| `BboxWidget.stories.tsx` | Quad edit, min<max invariant | light, dark, vscode | fill, blur |
| `PlatformArrayWidget.stories.tsx` | Add/edit/delete platform rows | light, dark, vscode | click, fill, select |

**Testing Strategy**:

- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (`data-testid`, `aria-label` on every field)
- [x] Screenshots captured for evidence
- [x] **Offline-invariant harness (Decision 10)**: all component tests run with `fetch` / `XMLHttpRequest` mocked to throw — regression-proofs FR-010.

**Test File Location**: `shared/components/e2e/PropertiesForm.spec.ts`, `shared/components/e2e/PropertiesWidgets.spec.ts`.

**Theme Variant URLs** (for Storybook):

```
/iframe.html?id=propertiespanel-propertiesform--default&globals=theme:light
/iframe.html?id=propertiespanel-propertiesform--default&globals=theme:dark
/iframe.html?id=propertiespanel-propertiesform--default&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Edit open plot tag, commit, reload | ActivityPanel (Properties section), MapPanel | `[data-testid="activity-panel-properties"]`, `[data-testid="properties-field-debrief:tags"]` | expand section, add tag, blur, close+reopen plot, assert tag present, assert `debrief:provenance_log` entry |
| Edit catalog item with no plot open | StacBrowser (list + thumbnail + properties stacked area) | `[data-testid="stac-browser-item"]`, `[data-testid="stac-browser-properties-stack"]` | click item, edit title, blur, reload browser, assert title updated, assert provenance entry |
| Override an auto-derived field survives updateTemporalMetadata | ActivityPanel (Properties section) | `[data-testid="properties-field-start_datetime"]`, `[data-testid="properties-chip-override"]` | edit `start_datetime`, blur, trigger features reload, assert override value survives + chip present |
| Stale-edit detection (FR-014) | ActivityPanel | error banner `[data-testid="properties-write-error"]` | out-of-band modify item.json, attempt commit, assert `StaleItemJsonError` banner renders and form reloads from disk |
| Schema-validation rejection | ActivityPanel | field error `[data-testid="properties-field-error"]` | commit an invalid datetime, assert no disk write, assert inline error, assert no provenance entry |

**Testing Strategy**:

- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated: new `PropertiesPanelPage` under `tests/e2e/pages/`
- [x] Screenshots captured for evidence (before/commit/after per scenario)
- [x] **Schema-evolution CI gate (Decision 11)**: dedicated test generates from `tests/fixtures/properties-panel/evolving-schema.yaml` and asserts a new field renders — locks in SC-003 as a CI invariant.

**Test File Location**: `tests/e2e/test-properties-panel.spec.ts`.

**Infrastructure**:

- Patches applied by `tests/e2e/scripts/patch-webview.sh` (no new patches — reuses ActivityPanel + StacBrowser patches).
- Content injection via `tests/e2e/helpers/webview-injector.ts`.
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test tests/e2e/test-properties-panel.spec.ts`.

## Complexity Tracking

No Constitution Check violations, so no entries required. Each abstraction introduced maps to a concrete requirement — `debrief:overrides`, `debrief:provenance_log`, `PropertiesProvenanceEntry`, `BrowserSelectionContext`, four sibling widgets, `updateItemMetadata` method, `updateTemporalMetadata` edit. No slices. No new global stores. No new form library. No new dependencies.
