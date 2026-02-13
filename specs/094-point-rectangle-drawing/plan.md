# Implementation Plan: Point and Rectangle Drawing

**Branch**: `094-point-rectangle-drawing` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/094-point-rectangle-drawing/spec.md`

## Summary

Implement the business logic layer for point and rectangle drawing on the map. Feature 093 provides the drawing toolbar UI and Geoman mode activation; this feature adds the conversion pipeline that transforms raw Geoman output into schema-compliant GeoJSON features (ReferenceLocation for points, RectangleAnnotation for rectangles), adds them to the active feature collection, and auto-selects the new feature. Includes default styling, geometry validation, unit tests, and Storybook stories.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, VS Code extension webview)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, @geoman-io/leaflet-geoman-free ^2.19.2, Zustand ^5.0.0 (@debrief/session-state)
**Storage**: N/A — drawn features are held in-memory in the webview's React state; persistence is out of scope (future feature 096)
**Testing**: Vitest (shared/components), Storybook visual testing
**Target Platform**: VS Code extension webview (Chromium), Storybook (browser)
**Project Type**: Monorepo workspace (shared/components package, apps/vscode, services/session-state)
**Performance Goals**: Feature creation < 16ms (single frame); no perceptible delay between click/drag and feature appearing
**Constraints**: Offline-capable (no network calls), schema-compliant output, no new external dependencies
**Scale/Scope**: 3 new modules (~200 lines), 2 modified files, 1 new Storybook story, 2 test suites

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All core functionality works without network | PASS | Drawing is purely local — no network calls |
| I.3 No silent failures | Operations succeed fully or fail explicitly | PASS | Degenerate geometries silently discarded per spec (not a failure — user didn't intend a shape) |
| I.4 Reproducibility | Same inputs produce same results | PASS | Deterministic conversion (UUID is the only non-deterministic element, acceptable for IDs) |
| II.1 Single source of truth | LinkML schemas define structures | PASS | Uses existing ReferenceLocation and RectangleAnnotation schemas — no hand-written types |
| II.2 Schema tests mandatory | Derived schemas pass adherence tests | PASS | No schema changes — uses existing generated types |
| III.1 Provenance always | Transformations record lineage | N/A | Drawing is user-initiated creation, not a transformation of existing data |
| IV.1 Services never touch UI | Python services return data only | PASS | No Python services involved — pure TypeScript in shared components |
| IV.2 Frontends never persist | Data writes go through services | PASS | No persistence in this feature — drawn features are in-memory only |
| VI.2 Services require unit tests | No service code without tests | PASS | Unit tests for createDrawnFeature() and isValidDrawnGeometry() |
| VIII.1 Specs before code | Written specification exists | PASS | spec.md completed |
| IX.1 Minimal dependencies | External deps must be justified | PASS | No new dependencies — uses existing Geoman, Leaflet, and schema packages |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Default names ("Drawn Point", "Drawn Rectangle") are constants that can be externalised later |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/094-point-rectangle-drawing/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity definitions and validation rules
├── quickstart.md        # Implementation guide
├── contracts/           # API contracts
│   └── drawing-api.md   # Component and function contracts
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec quality checklist
└── media/               # Blog and social content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/MapView/
├── drawing/                              # NEW — drawing conversion module
│   ├── drawingDefaults.ts                # Default styling constants
│   ├── isValidDrawnGeometry.ts           # Geometry validation guard
│   ├── createDrawnFeature.ts             # Factory: raw GeoJSON → schema feature
│   ├── index.ts                          # Barrel export
│   └── __tests__/
│       ├── createDrawnFeature.test.ts    # Factory unit tests
│       └── isValidDrawnGeometry.test.ts  # Validation unit tests
├── Drawing.stories.tsx                   # NEW — Storybook story
├── LeafletToolbar/
│   └── LeafletToolbar.tsx                # MODIFIED — add onShapeCreated callback
└── MapView.tsx                           # MODIFIED — add onShapeCreated prop

apps/vscode/src/webview/web/
└── mapView.tsx                           # MODIFIED — handle drawn features
```

**Structure Decision**: New code lives in `shared/components/src/MapView/drawing/` as a sub-module of the MapView component. This co-locates drawing logic with the map rendering it serves, following the existing pattern (e.g., `GeomanControl/`, `LeafletToolbar/`).

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| Drawing Demo | `shared/components/src/MapView/Drawing.stories.tsx` | `drawing-demo.js` | Interactive demo of point placement and rectangle drawing with live feature list |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of this feature)
- [x] Components render standalone (MapView + Geoman are self-contained in Storybook)
- [x] Reasonable bundle size expected (< 500KB — reuses existing MapView + Geoman bundles)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-drawing--point-and-rectangle`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `Drawing.stories.tsx` — PointAndRectangle | Feature creation, schema validation, auto-selection | light, dark, vscode | Click (point), click+drag (rectangle), Escape (cancel) |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/Drawing.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=mapview-drawing--point-and-rectangle&globals=theme:light
/iframe.html?id=mapview-drawing--point-and-rectangle&globals=theme:dark
/iframe.html?id=mapview-drawing--point-and-rectangle&globals=theme:vscode
```

## Complexity Tracking

No constitution violations to justify. Feature is straightforward — 3 new pure modules, 2 modified components, 1 story.
