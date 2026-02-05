# Implementation Plan: STAC Browser Web UI

**Branch**: `claude/stac-browser-web-ui-Agtt4` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-stac-browser-web-ui/spec.md`

## Summary

Create a standalone web application that composes existing `@debrief/components` (MapView, ActivityPanel, CatalogOverview, TimeController, FeatureList, ToolsPanel) backed by mock services. This enables browser-based integration review and Playwright E2E testing without requiring VS Code.

The web shell uses a two-view architecture:
1. **Welcome Page**: STAC Catalog Browser (`CatalogOverview`)
2. **Analysis View**: Activity Panel (left) + Map (right)

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: React 18+, Vite 5.x, @debrief/components, @debrief/session-state, Leaflet (via react-leaflet), @turf/turf (for mock tools)
**Storage**: N/A (in-memory only, fixture data bundled via Vite)
**Testing**: Playwright for E2E, Vitest for unit tests
**Target Platform**: Modern browsers (Chrome, Firefox, Safari), development tool only
**Project Type**: Web application (frontend only, no backend)
**Performance Goals**: N/A (development tool)
**Constraints**: Must work offline (bundled fixtures), reuse existing components without modification
**Scale/Scope**: 2 views, ~5 components composed, 2 mock services, 4+ Playwright tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | PASS | All fixtures bundled, no external calls |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | Mock services throw on unknown plots |
| II.1 Schema integrity | Use derived schemas, not hand-written | PASS | Uses existing types from @debrief/components |
| IV.1 Services never touch UI | Services return data only | PASS | Mock services return data, no UI logic |
| VI.2 Services require tests | Service code has tests | PASS | Mock services tested via Playwright E2E |
| VII.1 Tests before implementation | Define behaviour as tests | PASS | Playwright tests define acceptance criteria |
| VIII.1 Specs before code | Written specification exists | PASS | spec.md complete with clarifications |
| IX.1 Minimal dependencies | Prefer standard library | PASS | Only necessary deps (@turf for mock tools) |

**Gate Status**: PASS - No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/048-stac-browser-web-ui/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
apps/web-shell/
├── index.html                    # HTML entry point
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config with @test-data path
├── vite.config.ts                # Vite config with @test-data alias
├── src/
│   ├── main.tsx                  # React app entry
│   ├── App.tsx                   # Two-view shell layout
│   ├── App.css                   # Shell layout styles
│   └── mocks/
│       ├── stacService.ts        # Mock STAC service
│       └── calcService.ts        # Mock calc service with JS tools
└── playwright/
    ├── playwright.config.ts      # Playwright configuration
    └── tests/
        ├── catalog-browse.spec.ts
        ├── plot-load.spec.ts
        ├── selection-sync.spec.ts
        └── tool-execution.spec.ts

# Fixture data (existing, not created by this feature):
apps/vscode/test-data/local-store/
├── catalog.json
├── exercise-alpha/
│   ├── item.json
│   └── exercise-alpha.geojson
└── training-run-1/
    ├── item.json
    └── training-run-1.geojson
```

**Structure Decision**: Single web application under `apps/web-shell/`. No backend required — mock services are in-process JavaScript. Fixture data accessed via Vite path alias `@test-data` pointing to existing `apps/vscode/test-data/`.

## Media Components

*Components already exist in @debrief/components with Storybook stories. This feature composes them.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| MapView | `shared/components/src/MapView/MapView.stories.tsx` | N/A (existing) | Maritime track visualization |
| CatalogOverview | `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx` | N/A (existing) | STAC catalog browser |
| ActivityPanel | `shared/components/src/ActivityPanel/ActivityPanel.stories.tsx` | N/A (existing) | Unified sidebar |
| TimeController | `shared/components/src/TimeController/TimeController.stories.tsx` | N/A (existing) | Time scrubber |

**Inclusion Criteria Applied**:
- [ ] New visual component — No, composing existing
- [ ] Significant visual change — No, standard composition
- [x] Interactive demo adds narrative value — Yes, the integrated shell demonstrates component interop

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Note**: The web shell itself is the demo, not individual component bundles.

## Complexity Tracking

No constitution violations requiring justification.
