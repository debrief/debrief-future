# Implementation Plan: Map View with Live Spatial Filtering

**Branch**: `130-map-spatial-filtering` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/130-map-spatial-filtering/spec.md`

## Summary

Add live spatial filtering to the STAC browser Discovery UI. The existing `CatalogOverview` component renders exercise footprints (bounding boxes) on a Leaflet map — this feature extends it to emit viewport-change events so that panning/zooming the map acts as a spatial filter, dynamically narrowing the list and timeline views. A new `bboxOverlapsViewport` utility handles intersection testing. Exercise footprints gain per-exercise colour support (pluggable, defaulting to accent colour until #134 lands). Double-click opens an exercise; hover shows a tooltip (both already exist). Cross-view synchronisation is achieved through the existing session-state Zustand store's spatial slice.

## Technical Context

**Language/Version**: TypeScript 5.x (shared components, VS Code extension webview)
**Primary Dependencies**: React 18.x, react-leaflet 4.2, Leaflet 1.9.x, Zustand ^5.0.0, CQL2 Filter Engine (#126)
**Storage**: N/A (read-only display of STAC catalog items already loaded by the extension)
**Testing**: vitest (unit), Playwright via `@sparticuz/chromium` (E2E / Storybook)
**Target Platform**: VS Code webview (Chromium), browser (web-shell)
**Project Type**: Shared component library + VS Code extension integration
**Performance Goals**: 200 exercise footprints rendering under 2s; pan/zoom interactions at 30+ fps; spatial filter update within 300ms after debounce
**Constraints**: Offline-capable (tile layer is additive), debounce rapid interactions (150ms), no new runtime dependencies
**Scale/Scope**: Up to 200 simultaneous exercise footprints; 3 views synchronised (map, list, timeline)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Tile layer optional; filtering logic is pure client-side | PASS | Tile layer degrades gracefully when offline |
| I.3 No silent failures | Empty viewport shows "no matches" indicator | PASS | FR-011 |
| I.4 Reproducibility | Same viewport bounds + same items = same filter result | PASS | Pure function |
| II.1 Schema integrity | No schema changes — consumes existing CatalogOverviewItem / StacBrowserItem | PASS | |
| IV.1 Services never touch UI | Spatial filtering is a client-side utility, not a service | PASS | |
| IV.2 Frontends never persist | No data writes; viewport state in session store only | PASS | |
| VI.2 Services require unit tests | All new utilities (bboxOverlaps, debounce hook) have unit tests | PASS | |
| VI.4 CI must pass | vitest + Playwright E2E | PASS | |
| IX.1 Minimal dependencies | Zero new runtime dependencies — uses React, Leaflet, Zustand already in project | PASS | |
| XV.1 Explicit types | All new functions fully typed, no `any` | PASS | |
| XV.3 Strict mode | Shared components already `strict: true` | PASS | |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/130-map-spatial-filtering/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── catalog-overview-props.ts   # Updated component contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
shared/components/src/
├── CatalogOverview/
│   ├── CatalogOverview.tsx          # MODIFY — add onViewportChange, colour prop, empty overlay
│   ├── CatalogOverview.stories.tsx  # MODIFY — add spatial filter stories
│   ├── CatalogOverview.test.tsx     # NEW — unit tests for spatial filtering logic
│   ├── CatalogOverview.css          # MODIFY — empty state overlay styles
│   └── types.ts                     # MODIFY — extend props with viewport/colour callbacks
├── filter-engine/
│   └── spatial.ts                   # NEW — bboxOverlapsViewport, filterBySpatialExtent
└── utils/
    └── useDebouncedCallback.ts      # NEW — reusable debounce hook

apps/vscode/src/
├── webview/web/
│   └── catalogOverview.tsx          # MODIFY — wire viewport events to extension host
└── panels/
    └── catalogOverviewPanel.ts      # MODIFY — handle viewport messages, open exercise
```

**Structure Decision**: Extends the existing shared component library and VS Code extension. No new packages or projects — all changes fit within `shared/components` and `apps/vscode`. The spatial intersection utility lives alongside the existing CQL2 filter engine in `filter-engine/spatial.ts` as a composable, orthogonal filter dimension.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| CatalogOverview (spatial filtering) | `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx` | `catalog-overview.js` | Demonstrates live map viewport filtering of exercise footprints |

**Inclusion Criteria Applied**:
- [ ] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/components-catalogoverview`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `CatalogOverview.stories.tsx` — SpatialFilter | Rendering, viewport callback, empty state | light, dark, vscode | pan, zoom, hover tooltip, double-click |
| `CatalogOverview.stories.tsx` — ColourScheme | Colour assignment rendering | light, dark, vscode | visual comparison |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input (pan/zoom triggers callback)
- [x] Accessibility attributes present (data-testid on overlay, aria-label on footprints)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/CatalogOverview.spec.ts`

**Theme Variant URLs** (for Storybook):
```
/iframe.html?id=components-catalogoverview--spatial-filter&globals=theme:light
/iframe.html?id=components-catalogoverview--spatial-filter&globals=theme:dark
/iframe.html?id=components-catalogoverview--spatial-filter&globals=theme:vscode
```

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Pan map to filter exercises | CatalogOverview Panel | `.leaflet-container`, `.catalog-overview`, `[data-testid="no-matches-overlay"]` | pan map, verify list/timeline update |
| Double-click to open exercise | CatalogOverview Panel | `.leaflet-interactive` (Rectangle) | double-click footprint, verify editor tab opens |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `tests/e2e/test-catalog-spatial-filter.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

No constitution violations — section not applicable.
