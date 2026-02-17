# Implementation Plan: Feature Info Button

**Branch**: `098-feature-info-button` | **Date**: 2026-02-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/098-feature-info-button/spec.md`

## Summary

Add an "info" button to each feature row in the Layers panel (to the right of the existing format button) that opens a geometry dialog showing type and coordinates. This enables Playwright and other test frameworks to verify feature data without parsing the map canvas. Implementation extends the existing FeatureRow component and follows the established format-button/menu pattern for state management, positioning, dismissal, and accessibility.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components), React 18.x
**Primary Dependencies**: React 18.x, @tanstack/react-virtual (virtualised FeatureList), Vitest + @testing-library/react (unit tests), Playwright (E2E), Storybook 8.x
**Storage**: N/A — reads geometry from in-memory GeoJSON features
**Testing**: Vitest (unit), Playwright (E2E), Storybook (visual/interactive)
**Target Platform**: VS Code webview (Electron) + browser (Storybook, demo)
**Project Type**: Shared React component library (pnpm workspace package `@debrief/components`)
**Performance Goals**: Instant dialog open (< 50ms) — geometry is already in memory
**Constraints**: Offline-capable (no network calls); must work in VS Code webview sandbox; must follow existing theme system (dark/light/vscode variants via CSS custom properties)
**Scale/Scope**: ~4 modified files, ~2 new files, ~200 lines of new code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network calls; reads in-memory data only |
| II. Schema Integrity | Schema compliance | PASS | Reads existing GeoJSON geometry; no schema changes |
| III. Data Sovereignty | Provenance, source preservation | PASS | Read-only — displays geometry, does not modify data |
| IV. Architectural Boundaries | Services never touch UI | PASS | Pure frontend component; no service interaction |
| VI. Testing | Unit tests required | PASS | Unit tests for component + Storybook story + E2E planned |
| VII. Test-Driven AI | Tests before implementation | PASS | Tests will be written first per constitution |
| VIII. Documentation | Specs before code | PASS | Spec written and validated |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies required |
| XI. Internationalisation | I18N from the start | PASS | User-facing strings (button label, dialog title) will use externalisable constants |
| XII. Community Engagement | Public by default, beta previews | PASS | Feature will be visible in Storybook for preview |
| XIII. Contribution Standards | Atomic commits, PR review | PASS | Standard workflow |
| XIV. Pre-Release Freedom | Breaking changes permitted | N/A | Feature is additive, non-breaking |

**Gate result: PASS** — No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/098-feature-info-button/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research
├── data-model.md        # Phase 1: Data model for info dialog
├── quickstart.md        # Phase 1: Getting started guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── contracts/
│   └── info-dialog.md   # Component contract (props, behaviour)
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/
├── FeatureList/
│   ├── FeatureRow.tsx           # MODIFY: Add info button alongside format button
│   ├── FeatureList.css          # MODIFY: Add info-icon styles (clone format-icon pattern)
│   ├── FeatureList.tsx          # REVIEW: May need to pass geometry data through
│   ├── FeatureList.test.tsx     # MODIFY: Add info button tests
│   └── FeatureList.stories.tsx  # MODIFY: Add info button stories
├── GeometryDialog/              # NEW: Geometry display dialog component
│   ├── GeometryDialog.tsx       # NEW: Dialog component
│   ├── GeometryDialog.css       # NEW: Dialog styles
│   ├── GeometryDialog.test.tsx  # NEW: Dialog unit tests
│   └── index.ts                 # NEW: Exports
└── ActivityPanel/
    └── ActivityPanel.tsx        # MODIFY: Add info dialog state management (same pattern as formatMenuState)

shared/components/e2e/
└── GeometryDialog.spec.ts       # NEW: Playwright E2E tests
```

**Structure Decision**: Extends existing `shared/components/src/` package. The GeometryDialog is a new component alongside existing CascadingMenu/ContextMenu/FormatMenu patterns. The info button itself is embedded in the existing FeatureRow component, following the established format-icon pattern.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| GeometryDialog | `shared/components/src/GeometryDialog/GeometryDialog.stories.tsx` | `geometry-dialog.js` | Demonstrates info button click → geometry dialog for all feature types |
| FeatureList (updated) | `shared/components/src/FeatureList/FeatureList.stories.tsx` | `feature-list.js` | Shows info button alongside format button in layers panel |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/layers-featurelist--with-info-button`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `GeometryDialog.stories.tsx` | Rendering, accessibility, content correctness | light, dark, vscode | click info button, read geometry, dismiss dialog, switch features |
| `FeatureList.stories.tsx` (updated) | Info button visibility, click behaviour | light, dark, vscode | hover to reveal, click to open, escape to close |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*, role)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/GeometryDialog.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=layers-geometrydialog--track-geometry&globals=theme:light
/iframe.html?id=layers-geometrydialog--track-geometry&globals=theme:dark
/iframe.html?id=layers-geometrydialog--track-geometry&globals=theme:vscode
```

## Complexity Tracking

> No violations found. This section is empty.
