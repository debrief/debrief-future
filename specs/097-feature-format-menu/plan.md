# Implementation Plan: Feature Format Menu

**Branch**: `097-feature-format-menu` | **Date**: 2026-02-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/097-feature-format-menu/spec.md`

## Summary

Add a cascading format menu to the Layers panel that lets analysts change visual style properties (colour, line weight, dash pattern, symbol shape, opacity) on individual features, individual track points, or batches of selected features. Format changes are applied immediately to the map and recorded in the provenance log. The menu is accessible both from a per-row icon on each feature and from a toolbar button operating on the current selection.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, session-state, VS Code extension webview)
**Primary Dependencies**: React 18.x (shared components), Zustand ^5.0.0 (session-state store), Leaflet 1.9.x (map rendering), VS Code Extension API ^1.85.0, existing `@debrief/session-state` (Log Service), existing `stacService` (file I/O)
**Storage**: Local filesystem — GeoJSON files within STAC Item directories (read/write via stacService)
**Testing**: Storybook stories for component UI, Playwright for Storybook e2e, unit tests for style resolution logic
**Target Platform**: VS Code extension webview (Chromium-based), web-shell demo
**Project Type**: Multi-package monorepo (shared components + session-state + VS Code extension)
**Performance Goals**: Style changes render on map within 100ms; batch formatting 20 features completes within 1 second
**Constraints**: Offline-capable (no network calls), works within webview sandboxing, no new external dependencies
**Scale/Scope**: ~10-50 features per plot, up to ~500 track positions per track

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All formatting is in-memory + local filesystem. No network calls. |
| I. Defence-Grade Reliability | No silent failures | PASS | Persistence errors show warning notification. In-memory change still applies. |
| II. Schema Integrity | Single source of truth | PASS | Uses existing LinkML styling schemas (styling.yaml). No hand-written schemas. |
| III. Data Sovereignty | Provenance always | PASS | Every format change creates a provenance log entry via LogService. |
| III. Data Sovereignty | Source preservation | PASS | Original source files are never modified. Formatting changes are written to derived GeoJSON. |
| IV. Architectural Boundaries | Services never touch UI | PASS | Format changes are applied in the TypeScript frontend; persisted via stacService. No Python service needed for style changes. |
| IV. Architectural Boundaries | Frontends never persist | PASS | Persistence goes through stacService (the established I/O service). |
| VI. Testing | Services require unit tests | PASS | Style property mapping, cascading menu logic, and provenance recording all testable. |
| VIII. Documentation | Specs before code | PASS | This plan and spec exist before implementation. |
| IX. Dependencies | Minimal dependencies | PASS | No new external dependencies. Uses existing React, Leaflet, Zustand. |
| XI. Internationalisation | I18N from the start | PASS | All menu labels externalisable per FR-018. |

**Gate result: ALL PASS** — no violations, no complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/097-feature-format-menu/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── format-service.ts  # TypeScript interface contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
shared/components/src/
├── CascadingMenu/
│   ├── CascadingMenu.tsx       # New cascading menu component
│   ├── CascadingMenu.css       # Styles
│   ├── CascadingMenu.stories.tsx
│   └── index.ts
├── FormatMenu/
│   ├── FormatMenu.tsx          # Format-specific menu wrapping CascadingMenu
│   ├── FormatMenu.css
│   ├── FormatMenu.stories.tsx
│   ├── formatMenuItems.ts      # Property-to-menu-item mapping per feature kind
│   ├── presetPalette.ts        # Colour and value presets
│   └── index.ts
├── FeatureList/
│   └── FeatureRow.tsx          # Modified: add format icon button
├── LayersToolbar/
│   └── LayersToolbar.tsx       # Modified: add format toolbar button
└── MapView/
    └── MapView.tsx             # Modified: re-render on style changes

services/session-state/src/
├── store/slices/
│   └── features.ts             # Modified: add updateFeatureStyle action
└── format/
    ├── formatService.ts        # Style update logic + provenance recording
    ├── stylePropertyMap.ts     # Maps feature kinds to editable style properties
    └── index.ts
```

**Structure Decision**: This feature spans three existing packages — shared components (UI), session-state (state + format logic), and the VS Code extension (integration). No new packages are created.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| CascadingMenu | `shared/components/src/CascadingMenu/CascadingMenu.stories.tsx` | `cascading-menu.js` | Demonstrates hover-cascade menu interaction |
| FormatMenu | `shared/components/src/FormatMenu/FormatMenu.stories.tsx` | `format-menu.js` | Shows format property selection with preset palettes |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created during implementation)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/formatting-cascadingmenu--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `CascadingMenu.stories.tsx` | Rendering, keyboard nav, viewport repositioning | light, dark, vscode | hover submenu, click item, Escape dismiss, arrow key nav |
| `FormatMenu.stories.tsx` | Property list by feature kind, colour palette, batch greyed-out | light, dark, vscode | hover property, select colour, mixed-type greyed-out |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/CascadingMenu.spec.ts`, `shared/components/e2e/FormatMenu.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=formatting-cascadingmenu--default&globals=theme:light
/iframe.html?id=formatting-cascadingmenu--default&globals=theme:dark
/iframe.html?id=formatting-cascadingmenu--default&globals=theme:vscode
```

## Complexity Tracking

No constitution violations. No complexity tracking needed.
