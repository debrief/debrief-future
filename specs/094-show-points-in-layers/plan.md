# Implementation Plan: Show Child Points in Layers Panel

**Branch**: `094-show-points-in-layers` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/094-show-points-in-layers/spec.md`

## Summary

The Layers panel (FeatureList component) currently renders a flat list of features with no way to view or select child elements within composite features. This feature adds expand/collapse functionality so that tracks reveal their positions, multi-point features reveal their individual points, and multi-polygon features reveal their individual polygons. Child rows produce RFC 6901 selection paths (e.g., `track-001/positions/4`) compatible with the existing nested child selection model (feature 053).

The approach uses a flattened-tree pattern: expansion state is tracked locally, and a flat array of `DisplayItem` objects is computed from `(features, expandedIds)` and fed to the existing virtualizer. Two new level names (`points`, `polygons`) are added to the selection path level registry. The `DebriefFeature` union is extended to include `MultiPointFeature` and `MultiPolygonFeature`.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, session-state, VS Code extension)
**Primary Dependencies**: React 18.x, @tanstack/react-virtual (existing), Zustand ^5.0.0 (session-state, existing), @debrief/schemas (existing)
**Storage**: N/A — expansion state is ephemeral UI state (not persisted)
**Testing**: Vitest + React Testing Library (unit), Storybook (visual), Playwright (E2E)
**Target Platform**: VS Code extension webview, browser (web-shell)
**Project Type**: Monorepo — changes span `shared/components` and `services/session-state`
**Performance Goals**: Expand/collapse of features with up to 10,000 children must remain responsive (<100ms)
**Constraints**: Offline-capable; no external dependencies added; shared/components must not depend on session-state
**Scale/Scope**: 4 files modified, 2 new types/type guards, 2 level registry entries, ~5 new Storybook stories

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All data is local; expansion is purely client-side |
| II. Schema Integrity | Schema tests mandatory | PASS | Level registry extension follows existing pattern; no schema generation changes |
| III. Data Sovereignty | Provenance always | N/A | No data transformations; read-only display feature |
| IV. Architectural Boundaries | Services never touch UI | PASS | Level registry is in session-state (data concern); expand/collapse is in shared/components (UI concern) |
| IV. Architectural Boundaries | Frontends never persist | PASS | Expansion state is ephemeral; not persisted |
| V. Extensibility | Fail-safe loading | PASS | Unknown feature kinds are simply not expandable (graceful degradation) |
| VI. Testing | Services require unit tests | PASS | Level registry additions have corresponding tests; component changes have unit + story tests |
| VII. Test-Driven AI | Tests before implementation | PASS | Test cases defined in quickstart; acceptance scenarios in spec |
| VIII. Documentation | Specs before code | PASS | Specification complete |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies; uses existing @tanstack/react-virtual |
| XI. Internationalisation | I18N from the start | PASS | Labels use locale-aware time formatting; UI strings are minimal and externalisable |
| XIV. Pre-Release Freedom | Breaking changes permitted | PASS | DebriefFeature union extension is additive, not breaking |

**Pre-design gate**: PASS (no violations)
**Post-design gate**: PASS (no violations)

## Project Structure

### Documentation (this feature)

```text
specs/094-show-points-in-layers/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── feature-list-api.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   └── utils/
│       └── selectionPath.ts          # Add points/polygons to LEVEL_REGISTRY
└── tests/
    └── unit/
        └── utils/
            └── selectionPath.test.ts  # Tests for new level entries

shared/components/
├── src/
│   ├── utils/
│   │   └── types.ts                  # Extend DebriefFeature union, add type guards
│   └── FeatureList/
│       ├── FeatureList.tsx           # Add expansion state, flattening, child rendering
│       ├── FeatureList.css           # Add chevron, depth, child-selected styles
│       ├── FeatureRow.tsx            # Add chevron, depth indentation, child variant
│       ├── FeatureList.stories.tsx   # Add expansion stories
│       ├── FeatureList.test.tsx      # Add expansion tests
│       └── flattenFeatures.ts        # New: pure function for flattening tree to list
└── e2e/
    └── FeatureList.spec.ts           # E2E expansion tests (optional)
```

**Structure Decision**: Existing monorepo workspace structure. Changes are scoped to two packages: `services/session-state` (level registry) and `shared/components` (UI). The flattening logic is extracted to a new `flattenFeatures.ts` file for testability and separation of concerns.

## Media Components

| Component    | Story Source                                                                | Bundle Name          | Purpose                                            |
|--------------|-----------------------------------------------------------------------------|----------------------|----------------------------------------------------|
| FeatureList  | `shared/components/src/FeatureList/FeatureList.stories.tsx` (`WithExpansion`) | `feature-list.js`    | Demonstrates expand/collapse of tracks with positions |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [ ] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-featurelist--with-expansion`

## Storybook E2E Testing

| Story                               | Test Coverage                          | Theme Variants       | Interactions                      |
|--------------------------------------|----------------------------------------|----------------------|-----------------------------------|
| `FeatureList--with-expansion`        | Expand/collapse, child rendering       | light, dark, vscode  | click chevron, click child row    |
| `FeatureList--mixed-selection`       | Multi-select across parents/children   | light, dark, vscode  | click, ctrl+click                 |
| `FeatureList--large-track`           | Performance with many children         | vscode               | expand, scroll                    |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/FeatureList.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-featurelist--with-expansion&globals=theme:light
/iframe.html?id=components-featurelist--with-expansion&globals=theme:dark
/iframe.html?id=components-featurelist--with-expansion&globals=theme:vscode
```
