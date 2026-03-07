# Implementation Plan: List View with Spatial Thumbnails

**Branch**: `129-list-view-thumbnails` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/129-list-view-thumbnails/spec.md`

## Summary

Build a scrollable exercise list component for the STAC Stack Browser (E08) that displays each exercise with title, metadata summary, date summary, and a spatial thumbnail rendered from GeoJSON track data. The list includes a prominent "Recently Opened" section for quick session resumption, flexible sorting (recency/title/duration), virtualised scrolling for 100+ items, and dynamic updates when shared filter state changes. The component follows existing patterns from CatalogOverview and FeatureList, using VS Code CSS custom properties for theme compatibility.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x shared component)
**Primary Dependencies**: `@tanstack/react-virtual` v3.0.0 (virtualisation), React 18.x (UI), VS Code CSS custom properties (theming)
**Storage**: N/A — component receives data via props; recent items persisted by `RecentPlotsService` in VS Code `workspaceState`
**Testing**: Vitest + React Testing Library (unit), Playwright (E2E/Storybook)
**Target Platform**: VS Code webview + Storybook (browser)
**Project Type**: Shared component library (`shared/components/`)
**Performance Goals**: <1s initial render for 100 items, smooth scrolling (no jank), <500ms filter response
**Constraints**: Offline-capable (no network), theme-aware (light/dark/vscode), virtualised for large lists
**Scale/Scope**: 100+ exercise items, 3 sort dimensions, up to 10 recent items

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All rendering client-side from local GeoJSON data |
| I.3 | No silent failures | PASS | Empty state, no-matches state, and missing-data states all explicitly handled |
| II. Schema Integrity | Single source of truth | PASS | Uses `debrief:*` extension properties defined by #125 |
| III. Data Sovereignty | Source preservation | PASS | Read-only display; no data modification |
| IV. Architectural Boundaries | Services never touch UI | PASS | Component is pure UI; data provided via props |
| IV.2 | Frontends never persist | PASS | Sort state is session-scoped in component; recent items persisted by extension host service |
| V. Extensibility | No vendor lock-in | PASS | Standard React + CSS; no proprietary dependencies |
| VI. Testing | Unit tests required | PASS | Vitest + RTL unit tests planned for all components |
| VII. Test-Driven AI | Tests before implementation | PASS | Test patterns defined in quickstart |
| VIII. Documentation | Specs before code | PASS | This specification and plan |
| IX. Dependencies | Minimal, vetted dependencies | PASS | Uses only existing project dependencies (@tanstack/react-virtual, react) |
| XI. Internationalisation | I18N from start | PASS | Duration and date formatting use locale-aware functions; sort uses localeCompare |
| XV. Strict Type Safety | Explicit types everywhere | PASS | Full TypeScript strict mode; typed props, typed messages, typed sort configuration |

**Post-Phase 1 Re-check**: All gates remain PASS. No new dependencies introduced. Design artifacts confirm typed contracts and offline-capable architecture.

## Project Structure

### Documentation (this feature)

```text
specs/129-list-view-thumbnails/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── messages.ts      # Webview message protocol types
│   └── component-props.ts  # Component prop interfaces
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/
├── ExerciseListView/
│   ├── ExerciseListView.tsx          # Main container with virtualisation + sort
│   ├── ExerciseListView.css          # Theme-aware styles (VS Code custom properties)
│   ├── ExerciseListItemRow.tsx       # Single exercise row component
│   ├── SpatialThumbnail.tsx          # SVG thumbnail from GeoJSON tracks
│   ├── SortControl.tsx               # Sort dimension + direction selector
│   ├── RecentlyOpenedSection.tsx     # Recently opened items section
│   ├── types.ts                      # ExerciseListItem, SortConfiguration, etc.
│   ├── utils.ts                      # Duration formatting, sort comparators, relative time
│   ├── ExerciseListView.test.tsx     # Unit tests
│   ├── SpatialThumbnail.test.tsx     # Thumbnail rendering tests
│   ├── ExerciseListView.stories.tsx  # Storybook stories (8 variants)
│   └── index.ts                      # Public exports
└── index.ts                          # Add ExerciseListView export

apps/vscode/src/
├── webview/messages.ts               # Add list-view message types
└── services/recentPlotsService.ts    # Existing (no changes needed)
```

**Structure Decision**: The ExerciseListView component lives in the shared component library (`shared/components/src/`), following the established pattern for CatalogOverview, FeatureList, MapView, etc. It is consumed by the VS Code extension webview and Storybook. No new packages or services are created.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ExerciseListView | `shared/components/src/ExerciseListView/ExerciseListView.stories.tsx` | `exercise-list-view.js` | Demonstrates scrollable exercise list with thumbnails and sorting |
| SpatialThumbnail | (same stories file) | (included in above) | Shows track pattern thumbnails in various exercises |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — props-based)
- [x] Reasonable bundle size expected (< 500KB — SVG rendering, no heavy deps)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-exerciselistview--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ExerciseListView.stories.tsx` — Default | List renders 100 items, thumbnails visible | light, dark, vscode | scroll, click item |
| `ExerciseListView.stories.tsx` — WithRecentItems | Recent section visible, relative times shown | light, dark, vscode | click recent item |
| `ExerciseListView.stories.tsx` — EmptyState | Empty state message displayed | light, dark, vscode | none |
| `ExerciseListView.stories.tsx` — SortByTitle | Items in alphabetical order | vscode | click sort control, toggle direction |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ExerciseListView.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-exerciselistview--default&globals=theme:light
/iframe.html?id=components-exerciselistview--default&globals=theme:dark
/iframe.html?id=components-exerciselistview--default&globals=theme:vscode
```

## VS Code Webview E2E Testing

None — no extension workflow changes in this feature. The list view component is developed in Storybook first; VS Code integration will be tested when the Stack Browser panel (#132) is assembled.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
