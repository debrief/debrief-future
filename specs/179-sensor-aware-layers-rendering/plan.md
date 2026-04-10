# Implementation Plan: Sensor-Aware Track Rendering in the Layers Panel

**Branch**: `179-sensor-aware-layers-rendering` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/179-sensor-aware-layers-rendering/spec.md`

## Summary

Extend the `FeatureList` row-tree so tracks carrying embedded sensor data (`TrackFeature.properties.sensors`) render a virtual `Sensors (N)` grouping row alongside `Positions (N)` or `Track Segments (N)`, with each named sensor expanding to its `contacts[]` array. The implementation is a focused edit of `shared/components/src/FeatureList/flattenFeatures.ts` (row-kind discriminators, path-scheme extension, four-case dispatcher) plus small additions to `FeatureRow.tsx` (allow info icon on `contact` type rows), new Storybook fixtures, updated unit tests, and a deliberate format-refresh in `getPositionSublabel` to zero-pad course values alongside the new bearing formatting (FR-018). Zero schema changes, zero new runtime dependencies, zero changes to `FeatureList.tsx`'s selection/virtualisation/handler wiring.

## Technical Context

**Language/Version**: TypeScript 5.x (shared React component library)
**Primary Dependencies**: React 18.x, `@tanstack/react-virtual` (unchanged), `@debrief/schemas` (already supplies `SensorData` / `SensorContact` / `TrackProperties.sensors`)
**Storage**: N/A — this is an in-memory rendering change; no persistence
**Testing**: Vitest (unit tests for `flattenFeatures.test.ts` + `FeatureList.test.tsx`), Storybook (visual/interaction stories), Playwright (E2E via `shared/components/e2e/`)
**Target Platform**: Any environment consuming `@debrief/components` — primarily the VS Code extension's Activity Panel + web-shell demo
**Project Type**: Shared TypeScript component library (pnpm workspace package `@debrief/components`)
**Performance Goals**: Maintain current `FeatureList` virtualisation budget — a track with 10,000 sensor contacts must expand without degrading scroll FPS by more than 10% (SC-003)
**Constraints**: Constant row height (virtualiser contract FR-011); offline-capable (Article I); no schema changes (Article II — `TrackProperties.sensors` is already in the generated types); pure render-time logic — no side effects in `flattenFeatures`
**Scale/Scope**: ~150 lines added to `flattenFeatures.ts` (incl. `getRootFeatureId` utility), ~20 lines added to `FeatureRow.tsx`, ~20 lines added to `ActivityPanel.tsx` (contact info handler), ~200 lines of new unit tests, ~100 lines of new Storybook fixtures, 1-line change to `getPositionSublabel`. 8 files touched (review-amended from original 5).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---|---|---|---|
| **I — Defence-Grade Reliability** | Offline by default; no silent failures | PASS | Pure in-memory UI logic; zero network; zero-contact sensor renders an explicit "No contacts" placeholder (no silent drop) |
| **II — Schema Integrity** | Single source of truth, no hand-written schemas | PASS | Consumes existing generated `SensorData` / `SensorContact` types. No schema source edits. |
| **III — Data Sovereignty** | Provenance, audit trail, export-friendly | N/A | Rendering-only feature, does not transform data |
| **IV — Architectural Boundaries** | Services return data only; frontends don't persist | PASS | Component library never touches services or persistence |
| **V — Extensibility** | Fail-safe loading | PASS | Unknown future sensor fields are ignored; new row kinds coexist with existing ones |
| **VI — Testing** | Unit tests mandatory, CI green | PASS (planned) | Unit tests for all four cases (A/B/C/D) + edge cases in `flattenFeatures.test.ts`; Storybook stories with Playwright E2E coverage |
| **VII — Test-Driven AI Collaboration** | Tests define done | PASS (planned) | Spec SC-001..SC-009 are the definition of done; tests written before / alongside implementation |
| **VIII — Documentation** | Updated reference docs | PASS (planned) | New Storybook stories serve as living documentation; quickstart.md in this feature directory |
| **IX — Dependencies** | No new runtime deps unless justified | PASS | Zero new runtime dependencies |
| **X — Security** | Input validation, no injection surfaces | PASS | Pure presentation; no user-supplied HTML; sensor name and contact label rendered as text via React (auto-escaped) |

**Gate: PASS** — no violations; Complexity Tracking section left empty.

## Project Structure

### Documentation (this feature)

```text
specs/179-sensor-aware-layers-rendering/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output (prior-art + decisions)
├── data-model.md        # Phase 1 output (DisplayItem extension + path-scheme contract)
├── quickstart.md        # Phase 1 output (how to verify locally)
├── contracts/
│   └── flatten-features.md   # Phase 1 output (the extended flattenFeatures contract)
├── media/
│   ├── planning-post.md      # Planning announcement for debrief.github.io
│   └── linkedin-planning.md  # LinkedIn summary
└── tasks.md             # Phase 2 output (/speckit.tasks — not yet generated)
```

### Source Code (repository root)

```text
shared/components/src/FeatureList/
├── flattenFeatures.ts          # EXTEND — add group/sensor/contact row kinds, four-case dispatcher, zero-pad courses in getPositionSublabel
├── flattenFeatures.test.ts     # EXTEND — add tests for all 4 cases + edge cases; refresh existing course-format assertions
├── FeatureRow.tsx              # EXTEND — allow info icon on 'contact' type rows (add 'contact' to the existing type check); existing label/sublabel rendering covers group/sensor/contact rows unchanged
├── FeatureList.tsx             # UNCHANGED — all new behaviour rides on existing expandedIds / selectedIds / hiddenIds / handleRowClick wiring
├── FeatureList.test.tsx        # EXTEND — add integration tests for group-row selection and contact-row info icon
├── FeatureList.stories.tsx     # EXTEND — add fixtures for cases A/B/C/D + edge cases; new "TracksWithSensors" story
└── FeatureList.css             # UNCHANGED

shared/components/e2e/
└── FeatureList.spec.ts         # EXTEND (or create) — Playwright E2E covering the new story across light/dark/vscode themes

apps/vscode/src/panels/
├── ActivityPanel.tsx            # EXTEND — wire handleChildInfoClick for contact rows: resolve path via getRootFeatureId, look up SensorContact, populate info dialog (review decision 1A)
└── <InfoDialog types file>     # EXTEND — add optional `properties` field to InfoDialogState for contact data (review decision 4A)
```

**Structure Decision**: Single-package component library edit, plus two small host-app amendments. The core feature is contained to one directory (`shared/components/src/FeatureList/`) and touches no other package, service, or schema. The VS Code extension and web-shell consume `@debrief/components` and will pick up the new row kinds automatically on the next build — no coordinated changes required downstream. Review decision 1A adds the contact info handler in ActivityPanel.tsx now rather than deferring it, keeping the feature end-to-end complete.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| FeatureList — Tracks with Sensors | `shared/components/src/FeatureList/FeatureList.stories.tsx` (new story: `TracksWithSensors`) | `feature-list-sensors.js` | Demonstrate all four layout cases (A/B/C/D) and the sensor/contact expansion, using fixture tracks that carry `TOWED_ARRAY` + `HULL_ARRAY` sensors with representative contact counts |

**Inclusion Criteria Applied**:
- [x] New visual component (new row kinds + grouping behaviour)
- [x] Significant visual change (FR-018 course padding affects every existing position row)
- [x] Interactive demo adds narrative value (expand the tree to see sensor grouping in action)

**Bundleability Verified**:
- [x] Stories exist in Storybook (`FeatureList.stories.tsx` already bundles; adding a new story variant)
- [x] Components render standalone (no app context required — `FeatureList` takes props only)
- [x] Reasonable bundle size expected (< 500KB — existing `FeatureList` bundle is well under this ceiling)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-featurelist--tracks-with-sensors`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `FeatureList.stories.tsx` → `TracksWithSensors` | All 4 cases (A/B/C/D) render; group rows expand; sensor rows expand to contacts; contact rows show zero-padded bearings; group-row click adds single path ID to selection | light, dark, vscode | expand track → expand Sensors group → expand sensor → click contact → click group row |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants (light / dark / vscode)
- [x] Interactive elements respond to user input (chevron click expands; label click selects)
- [x] Accessibility attributes present (`data-testid="feature-row-${id}"` already on every row; no new additions required — the existing testid covers new row kinds automatically via `DisplayItem.id`)
- [x] Screenshots captured for evidence (saved to `specs/179-sensor-aware-layers-rendering/evidence/screenshots/`)

**Test File Location**: `shared/components/e2e/FeatureList.spec.ts` (extend existing file if present; otherwise create new)

**Theme Variant URLs**:
```
/iframe.html?id=components-featurelist--tracks-with-sensors&globals=theme:light
/iframe.html?id=components-featurelist--tracks-with-sensors&globals=theme:dark
/iframe.html?id=components-featurelist--tracks-with-sensors&globals=theme:vscode
```

## VS Code Webview E2E Testing

None — the VS Code extension consumes `@debrief/components` without modification. The Activity Panel's FeatureList instance will show the new row kinds on the next build automatically. No extension-side changes, no webview patch updates, no new extension-layer E2E coverage. (A follow-up feature wiring the contact-row info popover in the VS Code host can add webview E2E coverage at that time.)

## Review Decisions

*Recorded during `/speckit.review` — 2026-04-10*

| # | Question | Decision | Impact |
|---|---|---|---|
| 1 | Wire ActivityPanel contact info handler now or defer? | **1A: Wire now** | +1 file (ActivityPanel.tsx) |
| 2 | Add CSS class for contact rows in FeatureRow? | **2B: No new CSS** | No change |
| 3 | Case B (no sensors, >1 segment) adds Track Segments wrapper? | **3B: Yes** | Matches US4-AS2; T011 updated |
| 4 | How does contact handler pass properties to dialog? | **4A: Extend InfoDialogState** | +1 type file |
| 5 | How does handler resolve featureId from contact path? | **5A: Path-parsing utility** | +1 utility + tests (T051) |

### Test Gaps Identified

- **T050**: ActivityPanel contact handler test — proves path resolution and dialog population
- **T051**: `getRootFeatureId` utility tests — 3 assertions (simple ID, sensor path, contact path)

## Complexity Tracking

No constitution violations — section intentionally empty.
