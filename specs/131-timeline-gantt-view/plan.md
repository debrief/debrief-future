# Implementation Plan: Timeline/Gantt View with Temporal Filtering

**Branch**: `131-timeline-gantt-view` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/131-timeline-gantt-view/spec.md`

## Summary

Build an interactive Timeline/Gantt view component for the E08 STAC Stack Browser Discovery UI. The component displays horizontal temporal extent bars for exercises, provides draggable time range handles that act as a live temporal filter (narrowing list and map views), supports exercise selection via double-click, and integrates with the colour scheme engine (#134). The implementation extracts reusable timeline utilities from the existing CatalogOverview component and builds the new component as a sibling in `shared/components`.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x component)
**Primary Dependencies**: React 18.x, react-leaflet 4.2 (peer — not directly used), vitest (testing), Storybook (visual dev)
**Storage**: N/A (stateless component; filter state owned by #132's store)
**Testing**: vitest (unit + component), Playwright (Storybook E2E)
**Target Platform**: VS Code webview, web-shell (browser)
**Project Type**: Shared component library (`shared/components`)
**Performance Goals**: 100 items rendered responsively; filter updates < 200ms
**Constraints**: Offline-capable (no network calls); SVG rendering; no new runtime dependencies
**Scale/Scope**: 1 React component + 1 utility module; ~8 source files, ~6 test files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | No network calls | PASS | SVG rendering from local data only |
| II.1 Single source of truth | Uses `StacBrowserItem` from filter-engine types | PASS | No new type definitions that shadow schema types |
| III.1 Provenance | Component is read-only display | PASS | No data transformation; provenance not applicable to UI rendering |
| IV.1 Services never touch UI | This is a frontend component | PASS | Pure UI component; no service logic |
| IV.2 Frontends never persist | Component emits filter state via callback | PASS | No persistence; stateless |
| VI.2 Unit tests required | Tests planned for all utilities and components | PASS | See quickstart.md |
| VII.1 Tests before implementation | Test-first approach planned | PASS | See quickstart.md step 3 |
| VIII.1 Specs before code | This plan follows the specification | PASS | spec.md complete |
| IX.1 Minimal dependencies | No new runtime dependencies | PASS | Uses React + SVG only |
| XI.2 Locale-aware formatting | `Intl.DateTimeFormat` for axis labels | PASS | Locale-aware date formatting |
| XIII.1 Atomic commits | One logical change per commit | PASS | Feature branch workflow |
| XV.1 Explicit types | All types explicitly annotated | PASS | TypeScript strict mode; see contracts/ |
| XV.2 No any | No `any` in component or utility code | PASS | `StacBrowserItem` is fully typed |

**Post-design re-check**: All gates pass. No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/131-timeline-gantt-view/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── timeline-view.ts # Component API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/
├── timeline-utils/                    # NEW: Extracted shared utilities
│   ├── index.ts
│   ├── time-helpers.ts
│   ├── format-helpers.ts
│   └── __tests__/
│       └── time-helpers.test.ts
├── TimelineView/                      # NEW: Timeline/Gantt component
│   ├── TimelineView.tsx
│   ├── TimelineView.css
│   ├── TimelineView.stories.tsx
│   ├── TimeBrush.tsx
│   ├── types.ts
│   ├── index.ts
│   └── __tests__/
│       ├── TimelineView.test.tsx
│       └── TimeBrush.test.tsx
├── CatalogOverview/
│   ├── CatalogOverview.tsx            # MODIFIED: Import from timeline-utils
│   └── __tests__/
│       └── timeline.test.ts           # MODIFIED: Import from timeline-utils
└── index.ts                           # MODIFIED: Export TimelineView
```

**Structure Decision**: Component lives in `shared/components` alongside CatalogOverview and filter-engine, following the established monorepo pattern. Timeline utilities are extracted into a peer module to enable reuse without circular dependencies.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| TimelineView | `shared/components/src/TimelineView/TimelineView.stories.tsx` | `timeline-view.js` | Interactive Gantt chart with temporal filtering demo |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required — accepts items as props)
- [x] Reasonable bundle size expected (< 500KB) — SVG-only, no heavy dependencies

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/browser-timelineview--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `TimelineView.stories.tsx` — Default | Bar rendering, axis labels, tooltips | light, dark, vscode | hover for tooltip, double-click to select |
| `TimelineView.stories.tsx` — WithBrush | Brush handles, filter emission | light, dark, vscode | drag handle, drag brush body, reset |
| `TimelineView.stories.tsx` — Empty | Empty state message | light, dark, vscode | none |
| `TimelineView.stories.tsx` — ManyItems | Scroll behaviour, performance | vscode | scroll, hover |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/TimelineView.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=browser-timelineview--default&globals=theme:light
/iframe.html?id=browser-timelineview--default&globals=theme:dark
/iframe.html?id=browser-timelineview--default&globals=theme:vscode
```

## VS Code Webview E2E Testing

None - no extension workflow changes. The TimelineView component is a shared component that will be integrated into the VS Code webview by #132 (three-view synchronisation).

## Complexity Tracking

No violations to justify.
