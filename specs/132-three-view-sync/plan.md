# Implementation Plan: Three-View Synchronization and Filter State

**Branch**: `132-three-view-sync` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/132-three-view-sync/spec.md`

## Summary

Add a shared filter state layer that coordinates the filter bar, list view, map view, and timeline view into a unified browsing experience. A new `BrowserFilterSlice` in the Zustand session-state store holds metadata, spatial, and temporal filter state. A `useBrowserFilter` composition hook computes the filtered exercise set (AND of all axes) and distributes it to child views. A new `StacBrowser` parent component replaces `CatalogOverview` as the top-level orchestrator. The CQL2 filter engine (#126) handles metadata evaluation; bounding-box intersection handles spatial; epoch-range overlap handles temporal. Zero-results state is coordinated across all views via a single derived `filteredItems` array.

## Technical Context

**Language/Version**: TypeScript 5.x (React 18.x components, Zustand store)
**Primary Dependencies**: Zustand ^5.0.0, React 18.x, react-leaflet 4.2, `@debrief/components` (FilterBar, CQL2 filter engine), `@debrief/session-state`
**Storage**: N/A (in-memory reactive state only)
**Testing**: vitest (unit + component), Storybook (visual), Playwright (E2E)
**Target Platform**: VS Code webview (Electron), browser (Storybook)
**Project Type**: Monorepo package (`shared/components` + `services/session-state`)
**Performance Goals**: 200ms filter propagation (metadata, temporal), 350ms spatial (including 150ms debounce), 60fps during pan/zoom
**Constraints**: Offline-capable (no network for filtering), <200ms p95 for 500 exercises, debounce spatial at 150ms
**Scale/Scope**: Up to 500 exercises per catalog; 4 synchronized views; 3 filter axes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All filtering is client-side; no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Zero-results state explicitly handled across all views |
| II. Schema Integrity | Schema-derived types | PASS | Exercise data uses `StacBrowserItem` from filter-engine types, which extends `CatalogOverviewItem` from schemas |
| IV. Architectural Boundaries | Services never touch UI | PASS | Session-state store is data-only; `StacBrowser` component handles display |
| IV. Architectural Boundaries | Frontends never persist | PASS | Filter state is ephemeral; no writes to disk |
| VI. Testing | Unit tests required | PASS | All filter logic (spatial intersection, temporal overlap, composition) unit-tested |
| VII. Test-Driven AI | Tests before implementation | PASS | Vitest specs for `useBrowserFilter` hook and intersection utilities written first |
| IX. Dependencies | Minimal dependencies | PASS | No new external dependencies; uses existing Zustand + filter-engine |
| XI. Internationalisation | I18N from the start | PASS | "No matching exercises" string externalisable; date formatting uses locale-aware `toLocaleDateString` |
| XV. Strict Type Safety | Explicit types everywhere | PASS | All filter state types explicitly defined; no `any` |

## Project Structure

### Documentation (this feature)

```text
specs/132-three-view-sync/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── browser-filter-slice.ts    # Zustand slice type contract
│   ├── stac-browser-props.ts      # StacBrowser component props
│   └── filter-utils.ts            # Spatial/temporal intersection utilities
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
services/session-state/
├── src/
│   ├── types/
│   │   └── browser-filter.ts        # BrowserFilterSlice + BrowserFilterActions types
│   └── store/
│       └── slices/
│           └── browser-filter.ts    # Zustand slice implementation
└── __tests__/
    └── browser-filter.test.ts       # Slice unit tests

shared/components/
├── src/
│   ├── StacBrowser/
│   │   ├── StacBrowser.tsx          # Parent orchestrator component
│   │   ├── StacBrowser.stories.tsx  # Storybook stories
│   │   ├── StacBrowser.css          # Layout styles
│   │   ├── StacBrowser.test.tsx     # Component tests
│   │   ├── types.ts                 # StacBrowser prop types
│   │   ├── useBrowserFilter.ts      # Composition hook
│   │   └── index.ts                 # Barrel export
│   └── utils/
│       ├── spatial-filter.ts        # Bbox intersection utility
│       ├── temporal-filter.ts       # Time range overlap utility
│       └── __tests__/
│           ├── spatial-filter.test.ts
│           └── temporal-filter.test.ts
└── e2e/
    └── StacBrowser.spec.ts          # Playwright E2E tests
```

**Structure Decision**: This feature spans two existing packages — `services/session-state` (new Zustand slice for browser filter state) and `shared/components` (new `StacBrowser` orchestrator component plus filter utilities). No new packages created; follows the existing monorepo pattern.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|-------------|-------------|---------|
| StacBrowser | `shared/components/src/StacBrowser/StacBrowser.stories.tsx` | `stac-browser.js` | Demonstrates synchronized filtering across map, list, and timeline |

**Inclusion Criteria Applied**:
- [x] New visual component
- [ ] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook (will be created as part of implementation)
- [x] Components render standalone (no app context required — uses mock data)
- [x] Reasonable bundle size expected (< 500KB — reuses existing components)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/browser-stacbrowser--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|-------------|----------------|--------------|
| `StacBrowser.stories.tsx` — Default | Rendering, filter sync, empty state | light, dark, vscode | Add filter, pan map, adjust timeline, verify sync |
| `StacBrowser.stories.tsx` — ZeroResults | Empty state rendering | light, dark, vscode | Apply restrictive filter, verify "no matches" |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/StacBrowser.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=browser-stacbrowser--default&globals=theme:light
/iframe.html?id=browser-stacbrowser--default&globals=theme:dark
/iframe.html?id=browser-stacbrowser--default&globals=theme:vscode
```

## VS Code Webview E2E Testing

None - the `StacBrowser` component is consumed by the VS Code extension's browser panel, but the synchronization logic is entirely within the component layer. Webview integration testing is deferred to the epic-level integration story.

## Complexity Tracking

No constitution violations to justify.
