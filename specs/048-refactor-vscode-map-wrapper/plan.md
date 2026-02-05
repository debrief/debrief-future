# Implementation Plan: Refactor VS Code Map to Thin Wrapper

**Branch**: `048-refactor-vscode-map-wrapper` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/048-refactor-vscode-map-wrapper/spec.md`

## Summary

Refactor the VS Code map webview from a thick vanilla TypeScript/Leaflet implementation (~2000 lines across multiple files) to a thin React wrapper (~200 lines) that delegates rendering to the shared `@debrief/components/MapView` component. This improves testability, reduces code duplication, and establishes a single source of truth for map behavior.

**Technical Approach**: Follow the proven thin wrapper pattern already used by TimeController—import the shared React component, manage VS Code state/messages in the wrapper, and pass props + callbacks to MapView.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview)
**Primary Dependencies**: React 18, react-leaflet 4.2, @debrief/components, VS Code webview API
**Storage**: VS Code webview state persistence (setState/getState)
**Testing**: Vitest (shared components), manual verification (VS Code integration)
**Target Platform**: VS Code extension webview (Chromium-based)
**Project Type**: Monorepo with shared components + VS Code extension app
**Performance Goals**: Maintain current rendering performance (~60fps pan/zoom)
**Constraints**: Offline-capable (tile layer can be bundled), <200 lines wrapper code
**Scale/Scope**: Single webview panel refactoring

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✅ PASS | MapView uses same Leaflet; tiles can be bundled |
| IV.1 | Services never touch UI | ✅ PASS | Wrapper is UI-only, uses shared component |
| IV.2 | Frontends never persist | ✅ PASS | Uses VS Code state API, not direct persistence |
| VI.2 | Services require unit tests | ✅ PASS | Shared MapView has tests; wrapper is integration |
| VII.1 | Tests before implementation | ✅ PASS | MapView tests exist; wrapper validates via E2E |
| VIII.1 | Specs before code | ✅ PASS | This spec precedes implementation |

**Post-Design Re-check**: All gates still pass. No new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/048-refactor-vscode-map-wrapper/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Technical research findings
├── data-model.md        # Data model documentation
├── quickstart.md        # Implementation guide
├── contracts/           # Interface contracts
│   └── wrapper-interface.ts
├── checklists/
│   └── requirements.md  # Quality checklist
└── media/               # Blog content (created by Phase 2)
```

### Source Code (repository root)

```text
shared/components/
├── src/
│   └── MapView/
│       ├── MapView.tsx           # Shared React component (exists)
│       ├── MapView.test.tsx      # Unit tests (exists)
│       ├── MapView.stories.tsx   # Storybook stories (exists)
│       └── index.ts              # Exports (exists)
└── package.json                  # @debrief/components

apps/vscode/
├── src/
│   └── webview/
│       ├── web/
│       │   ├── mapView.tsx       # NEW: Thin wrapper
│       │   ├── mapView.html      # NEW: HTML entry point
│       │   ├── map.ts            # OLD: To be deprecated
│       │   ├── trackRenderer.ts  # OLD: To be deprecated
│       │   └── ...               # Other renderers to deprecate
│       └── messages.ts           # Message protocol (unchanged)
└── esbuild.config.js             # Build config (update)
```

**Structure Decision**: Using existing monorepo structure with `shared/components` for the React component and `apps/vscode` for the VS Code-specific wrapper. No new packages required.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| MapView | `shared/components/src/MapView/MapView.stories.tsx` | `mapview.js` | Demonstrates map rendering with features, selection, temporal |
| MapView (Exercise Alpha) | `shared/components/src/MapView/ExerciseAlpha.stories.tsx` | `mapview-exercise.js` | Shows realistic naval exercise scenario |

**Inclusion Criteria Applied**:
- [ ] New visual component (not new, but newly prominent)
- [x] Significant visual change (no visual change, but architectural)
- [x] Interactive demo adds narrative value (shows testable component)

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-mapview--default`

## Complexity Tracking

No constitution violations. No complexity justification needed.

## Implementation Phases

### Phase A: Preparation

1. Verify MapView component has all required props
2. Add any missing callback props (onZoomIn, onZoomOut, onFitBounds)
3. Verify result layer rendering works with merged features

### Phase B: Wrapper Implementation

1. Create `mapView.tsx` following TimeController pattern
2. Create `mapView.html` entry point
3. Implement message handlers for all ExtensionToWebviewMessage types
4. Implement callback handlers that postMessage to extension
5. Add state persistence via vscode.setState/getState

### Phase C: Integration

1. Update esbuild config to bundle new wrapper
2. Add feature flag to switch implementations in mapPanel.ts
3. Test both implementations side-by-side

### Phase D: Validation & Cutover

1. Complete verification checklist (see quickstart.md)
2. Remove feature flag, make React wrapper default
3. Deprecate old files (mark for removal in follow-up PR)

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Feature parity gaps | Complete verification checklist before cutover |
| Performance regression | Profile before/after; use React.memo for expensive renders |
| Message protocol mismatch | Preserve existing messages.ts types exactly |
| Style differences | Compare screenshots; use same CSS variables |
