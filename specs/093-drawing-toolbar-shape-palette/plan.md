# Implementation Plan: Drawing Toolbar with Shape Palette

**Branch**: `093-drawing-toolbar-shape-palette` | **Date**: 2026-02-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/093-drawing-toolbar-shape-palette/spec.md`

## Summary

Add a '+' button to the LeafletToolbar that opens a shape palette dropdown (Point, Rectangle, Polygon, Polyline). Selecting a shape activates Geoman drawing mode on the map. Drawing mode is tracked as an ephemeral field in the session-state Zustand store. The existing proof-of-concept single-shape button from #092 is replaced. Cancellation via Escape key or '+' button click resets state.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, session-state, VS Code extension webview)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, @geoman-io/leaflet-geoman-free ^2.19.2, Zustand ^5.0.0
**Storage**: N/A — ephemeral in-memory state only (drawing mode is not persisted)
**Testing**: Vitest (unit tests for session-state and shared-components), Storybook (visual verification)
**Target Platform**: VS Code webview (esbuild IIFE bundle), Storybook (Vite dev/build)
**Project Type**: Monorepo — changes span `services/session-state` and `shared/components`
**Performance Goals**: Dropdown opens instantly on click; drawing mode activates without perceptible delay
**Constraints**: Offline-capable (Constitution Art. I); no new dependencies beyond those already installed by #092
**Scale/Scope**: 4 shape types, ~6 files modified, ~200 lines added, ~80 lines removed (PoC cleanup)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | No network calls. Geoman and all assets bundled locally. |
| II. Schema Integrity | Schema changes use LinkML | N/A | No schema changes. DrawingMode is ephemeral session state, not data model. |
| III. Data Sovereignty | Provenance recorded | N/A | Drawing mode is UI state, not data transformation. Downstream features (#094, #095) handle shape persistence. |
| IV. Architectural Boundaries | Services never touch UI | PASS | Session-state is a state management service returning data. LeafletToolbar is frontend-only. |
| VI. Testing | Tests required | PASS | Unit tests for session-state ephemeral behavior. Storybook story for visual verification. |
| VII. Test-Driven AI | Tests before implementation | PASS | Acceptance scenarios defined in spec. Tests written before implementation per quickstart order. |
| VIII. Documentation | Specs before code | PASS | This plan and spec exist before implementation. |
| IX. Dependencies | Minimal, vetted | PASS | No new dependencies. Uses existing Geoman (#092), Zustand, Leaflet. |
| XI. Internationalisation | Strings externalisable | NOTED | Shape labels (Point, Rectangle, Polygon, Polyline) and tooltips should be constants, ready for future i18n. Not fully externalized in this iteration (pre-v4.0.0 freedom, Art. XIV). |
| XIII. Contribution Standards | Atomic commits | PASS | Feature broken into logical commits per implementation phase. |

**Post-Phase 1 Re-check**: All gates still pass. No new dependencies, no schema changes, no persistence changes.

## Project Structure

### Documentation (this feature)

```text
specs/093-drawing-toolbar-shape-palette/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Research decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Implementation guide
├── contracts/
│   ├── session-state-api.md   # State API contract
│   └── toolbar-ui-api.md      # UI component contract
├── checklists/
│   └── requirements.md        # Quality checklist
└── media/
    ├── planning-post.md       # Blog post draft
    └── linkedin-planning.md   # LinkedIn summary
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   ├── types/
│   │   └── spatial.ts          # ADD: DrawingMode type, drawingMode field
│   ├── store/
│   │   ├── slices/
│   │   │   └── spatial.ts      # ADD: setDrawingMode action
│   │   ├── middleware/
│   │   │   └── partialize.ts   # ADD: 'drawingMode' to EPHEMERAL_FIELDS
│   │   └── index.ts            # VERIFY: not in UNDO_TRACKED_FIELDS
│   └── persistence/
│       └── save.ts             # VERIFY: not in extractPersistentState
└── tests/
    └── unit/
        └── spatial.test.ts     # ADD: drawingMode ephemeral tests

shared/components/
├── src/
│   └── MapView/
│       ├── LeafletToolbar/
│       │   ├── LeafletToolbar.tsx   # MODIFY: replace PoC, add shape palette
│       │   ├── LeafletToolbar.css   # ADD: dropdown styles
│       │   └── index.ts            # VERIFY: exports
│       ├── MapView.tsx              # MODIFY: wire drawingMode props
│       └── DrawingToolbar.stories.tsx  # ADD: Storybook stories
└── tests/
    └── unit/
        └── LeafletToolbar.test.tsx  # ADD: toolbar tests
```

**Structure Decision**: Existing monorepo structure. Changes span two packages: `services/session-state` for state management and `shared/components` for UI. No new packages or projects.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| DrawingToolbar | `shared/components/src/MapView/DrawingToolbar.stories.tsx` | `drawing-toolbar.js` | Demonstrates shape palette dropdown and drawing mode activation |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of this feature)
- [x] Components render standalone (MapView with toolbar is self-contained in Storybook)
- [x] Reasonable bundle size expected (< 500KB — reuses existing MapView + Geoman)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/mapview-drawingtoolbar--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `DrawingToolbar.stories.tsx` — Default | Rendering, dropdown open/close | light, dark, vscode | Click '+', select shape, verify active state |
| `DrawingToolbar.stories.tsx` — Active | Active state rendering | light, dark, vscode | Verify highlighted button, click to cancel |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/DrawingToolbar.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=mapview-drawingtoolbar--default&globals=theme:light
/iframe.html?id=mapview-drawingtoolbar--default&globals=theme:dark
/iframe.html?id=mapview-drawingtoolbar--default&globals=theme:vscode
```

## Complexity Tracking

No constitution violations requiring justification. All gates pass.
