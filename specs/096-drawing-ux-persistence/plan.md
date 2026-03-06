# Implementation Plan: Drawing UX Guidance and STAC Persistence

**Branch**: `096-drawing-ux-persistence` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/096-drawing-ux-persistence/spec.md`

## Summary

Add three capabilities to the E05 drawing toolchain: (1) a context-sensitive guidance overlay that shows mode-specific instruction text and a cancellation hint while any drawing mode is active, (2) a sequential drawing palette that assigns visually distinct default colours to consecutively drawn shapes, and (3) automatic persistence of user-drawn features to the active STAC Item with provenance metadata (source="user-drawn", timestamp, operator), ensuring drawn shapes survive close-reopen cycles. The guidance overlay is a new React component positioned over the map, the palette replaces the fixed per-type defaults in `drawingDefaults.ts`, and persistence hooks into the existing `stacService.addFeatures()` + `appendProvenance()` write path.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, VS Code extension webview, session-state)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, @geoman-io/leaflet-geoman-free ^2.19.2, Zustand ^5.0.0
**Storage**: Local filesystem STAC catalogs (JSON + GeoJSON) via `stacService`
**Testing**: Vitest (unit), Playwright ^1.57.0 (E2E), Storybook 8.x (visual verification)
**Target Platform**: VS Code extension webview + web-shell demo
**Project Type**: Monorepo with pnpm workspaces — shared components, services, apps
**Performance Goals**: Guidance overlay appears within 1 frame of mode activation; STAC write completes within 500ms for typical feature count
**Constraints**: Offline-capable (no network), must work in VS Code webview sandbox, must support light/dark/vscode themes
**Scale/Scope**: Single-user, single-plot at a time; drawing palette of 8 colours; typical session draws 1-20 shapes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | PASS | STAC persistence targets local filesystem only |
| I.3 No silent failures | Operations succeed or fail explicitly | PASS | FR-016: non-blocking notification on persistence failure |
| II.1 Single source of truth | Derived schemas from LinkML | PASS | Uses existing schema types (ReferenceLocation, RectangleAnnotation, etc.) |
| III.1 Provenance always | Every transformation records lineage | PASS | FR-012: source="user-drawn", timestamp, operator recorded |
| III.2 Source preservation | Original files never modified | PASS | Drawn features appended alongside existing data, not replacing |
| III.4 Data stays local | No telemetry or external calls | PASS | All persistence local |
| IV.1 Services never touch UI | Python services return data only | PASS | All UI in TypeScript/React; stacService is a Node.js service |
| IV.2 Frontends never persist | All data writes through services | PASS | Persistence goes through stacService |
| VI.2 Services require unit tests | Unit tests for service code | PASS | Tests for guidance overlay, palette cycling, persistence |
| VII.1 Tests before implementation | Define expected behaviour first | PASS | Acceptance scenarios defined in spec; tests written first |
| VIII.1 Specs before code | Written specification required | PASS | spec.md complete and validated |
| IX.1 Minimal dependencies | Prefer standard library | PASS | No new dependencies — uses existing React, Zustand, stacService |
| XI.1 I18N from the start | User-facing strings externalisable | PASS | Guidance strings extracted to constants file for future i18n |
| XIII.1 Atomic commits | One logical change per commit | PASS | Planned as phased implementation |

**Gate result: PASS** — No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/096-drawing-ux-persistence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── drawing-persistence-api.md
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/MapView/
├── drawing/
│   ├── createDrawnFeature.ts          # Existing — add provenance metadata injection
│   ├── drawingDefaults.ts             # Existing — replace with drawing palette
│   ├── drawingPalette.ts              # NEW — sequential colour palette with cycling
│   ├── drawingGuidance.ts             # NEW — guidance text constants per mode
│   └── isValidDrawnGeometry.ts        # Existing — no changes
├── DrawingGuidanceOverlay/
│   ├── DrawingGuidanceOverlay.tsx      # NEW — React component for guidance text overlay
│   └── DrawingGuidanceOverlay.css      # NEW — Overlay positioning and theming
├── LeafletToolbar/
│   ├── LeafletToolbar.tsx             # Existing — add cursor crosshair management
│   └── LeafletToolbar.css             # Existing — add crosshair cursor rule
└── MapView.tsx                        # Existing — integrate DrawingGuidanceOverlay

shared/components/src/MapView/
└── Drawing.stories.tsx                # Existing — add guidance + persistence stories

apps/vscode/src/services/
└── stacService.ts                     # Existing — add addDrawnFeature() convenience method

apps/vscode/src/webview/web/
└── mapView.tsx                        # Existing — wire persistence on shape creation

apps/web-shell/src/
└── App.tsx                            # Existing — wire persistence + guidance in web-shell

shared/components/e2e/
└── DrawingGuidance.spec.ts            # NEW — E2E tests for guidance overlay + persistence
```

**Structure Decision**: This feature adds a new UI component (DrawingGuidanceOverlay) in the shared components package and extends existing drawing infrastructure. No new packages or services — all changes within existing project boundaries.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| DrawingGuidanceOverlay | `shared/components/src/MapView/Drawing.stories.tsx` | `drawing-guidance.js` | Demonstrates guidance text appearing/disappearing per drawing mode |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (to be created)
- [x] Components render standalone (no app context required — uses drawingMode prop)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-drawing--guidance-overlay`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `Drawing.stories.tsx` (guidance variant) | Guidance text display, mode switching, cursor change | light, dark, vscode | Activate each mode, verify text, press Esc |
| `Drawing.stories.tsx` (palette variant) | Sequential colour assignment, cycling | light, dark, vscode | Draw 3+ shapes, verify colours differ |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/DrawingGuidance.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=mapview-drawing--guidance-overlay&globals=theme:light
/iframe.html?id=mapview-drawing--guidance-overlay&globals=theme:dark
/iframe.html?id=mapview-drawing--guidance-overlay&globals=theme:vscode
```

## Complexity Tracking

No violations requiring justification.
