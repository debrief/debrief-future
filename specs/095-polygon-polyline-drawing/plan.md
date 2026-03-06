# Implementation Plan: [E05] Polygon and Polyline Drawing

**Branch**: `095-polygon-polyline-drawing` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/095-polygon-polyline-drawing/spec.md`

## Summary

Extend the drawing infrastructure established by #094 (point/rectangle) to support multi-vertex polygon and polyline creation. Polygons produce `PolyAnnotation` features with `kind: "POLY"` and polylines produce `LineAnnotation` features with `kind: "LINE"`. Six existing files are modified; zero new files created. The toolbar, Geoman integration, session state, and schema types already support these modes — the work is pure conversion logic, validation, and styling defaults.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview, shared components)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, @geoman-io/leaflet-geoman-free ^2.19.2, Zustand ^5.0.0 (@debrief/session-state), @debrief/schemas (generated types), Storybook 8.x
**Storage**: N/A — drawn features are held in-memory in webview React state; persistence is out of scope (future #096)
**Testing**: Vitest (unit tests in shared/components), Storybook (visual testing), Playwright (e2e)
**Target Platform**: VS Code extension webview (Chromium), Storybook browser
**Project Type**: Monorepo — shared component library + VS Code extension
**Performance Goals**: Feature creation is instantaneous (<16ms frame budget) — pure function, no async
**Constraints**: Offline-capable (no network); all changes in existing modules (no new files)
**Scale/Scope**: 6 files modified, ~100 lines added across all files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network calls — pure in-memory feature creation |
| II. Schema Integrity | Schema-compliant output | PASS | Uses existing PolyAnnotation and LineAnnotation from generated schemas |
| III. Data Sovereignty | Provenance always | PASS | Features record `kind` and styling; source provenance N/A for user-drawn shapes |
| IV. Architectural Boundaries | Services never touch UI | PASS | No service changes — all work is in shared components and webview |
| VI. Testing | Tests required | PASS | Unit tests for validation/creation, Storybook stories for visual verification |
| VII. Test-Driven AI | Tests before implementation | PASS | Test cases defined in quickstart.md before implementation |
| VIII. Documentation | Specs before code | PASS | Spec created and approved before planning |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies — uses existing Geoman, Leaflet, schemas |
| XIII. Contribution Standards | Atomic commits | PASS | One logical change per file group |

**Post-design re-check**: All gates still pass. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/095-polygon-polyline-drawing/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output — research findings
├── data-model.md        # Phase 1 output — entity documentation
├── quickstart.md        # Phase 1 output — implementation guide
├── contracts/
│   └── drawing-api.md   # Phase 1 output — API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md # Blog post draft
│   └── linkedin-planning.md # LinkedIn summary
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/components/src/MapView/drawing/
├── drawingDefaults.ts       # ADD: DEFAULT_DRAWN_POLYGON_STYLE, DEFAULT_DRAWN_POLYLINE_STYLE
├── isValidDrawnGeometry.ts  # EXTEND: polygon + polyline validation cases
├── createDrawnFeature.ts    # EXTEND: polygon + polyline creation cases, expanded types
└── index.ts                 # EXTEND: export new constants

shared/components/src/MapView/
└── Drawing.stories.tsx      # EXTEND: add polygon/polyline story

apps/vscode/src/webview/web/
└── mapView.tsx              # EXTEND: prompt mapping for polygon/polyline modes
```

**Structure Decision**: This feature modifies existing files only, following the established drawing module pattern from #094. No new source files or directories are created.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| Drawing (all shapes) | `shared/components/src/MapView/Drawing.stories.tsx` | `drawing-all-shapes.js` | Interactive demo of polygon and polyline drawing alongside point/rectangle |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-mapview-drawing--all-shapes`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `Drawing.stories.tsx` — AllShapes | Polygon/polyline creation, feature list, JSON inspector | vscode | Click toolbar '+', select polygon/polyline, place vertices, double-click to complete |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/Drawing.spec.ts` (extend existing if present)

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-mapview-drawing--all-shapes&globals=theme:vscode
```

## Complexity Tracking

No constitution violations — this section is not applicable.
