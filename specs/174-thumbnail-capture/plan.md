# Implementation Plan: Thumbnail Capture and Gallery Preview

**Branch**: `174-thumbnail-capture` | **Date**: 2026-03-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/174-thumbnail-capture/spec.md`

## Summary

Add persistent PNG thumbnail capture to the STAC catalog. On Save, the Leaflet map view is captured via `modern-screenshot`, downscaled to two sizes (800x600 and 200x150), and stored as STAC thumbnail assets. The catalog browser gains a gallery preview pane (GoldenLayout panel) for rapid visual scanning with prev/next keyboard navigation. A Playwright-based CLI script backfills thumbnails for all existing plots.

## Technical Context

**Language/Version**: Python 3.11 (STAC service), TypeScript 5.x (components, VS Code extension, web-shell)
**Primary Dependencies**: `modern-screenshot` (DOM-to-PNG capture), `sharp` (Node.js image resize for backfill), Playwright (backfill browser automation), GoldenLayout (preview panel layout)
**Storage**: Local filesystem STAC catalog (JSON + GeoJSON + PNG)
**Testing**: pytest (Python), vitest (TypeScript components), Playwright (E2E backfill)
**Target Platform**: VS Code extension webview, web-shell browser app, Node.js CLI
**Project Type**: Monorepo (Python services + TypeScript frontends)
**Performance Goals**: Thumbnail capture < 2 seconds added to Save; gallery navigation instant (pre-loaded images)
**Constraints**: Basemap tiles required (needs CORS-enabled tile provider); offline capture not guaranteed if tiles not cached
**Scale/Scope**: 50-200 plots per catalog; ~150-350KB additional storage per plot

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core functionality works without network | PASS | Thumbnail capture is best-effort — Save always succeeds. Gallery shows SVG fallback when no PNG exists. |
| II.1 Single source of truth | Schema-first | PASS | Thumbnail assets follow standard STAC convention (`"thumbnail"` role). No new schema types needed — uses existing STAC asset structure. |
| III.1 Provenance always | Transformations record lineage | PASS | Thumbnails are display artifacts, not analysis results. No provenance needed (same as UI rendering). |
| III.2 Source preservation | Original files retained | PASS | Thumbnails are additive — no existing files modified. |
| IV.1 Services never touch UI | Python services return data only | PASS | `store_thumbnail()` writes bytes and metadata. All rendering happens in the frontend. |
| IV.2 Frontends never persist | Frontends call services for writes | PASS | Webview captures image data and sends to extension host. Extension host calls STAC service for persistence. |
| VI.2 Services require unit tests | Tests for service code | PASS | `test_thumbnails.py` covers store, overwrite, and metadata. |
| VIII.1 Specs before code | Written specification exists | PASS | This spec and plan. |
| IX.1 Minimal dependencies | External deps justified | PASS | `modern-screenshot` replaces unmaintained `leaflet-image`. `sharp` is dev-only for backfill script. |
| XIII.1 Atomic commits | One logical change per commit | PASS | Phased implementation with clear commit boundaries. |
| XV Strict type safety | Explicit types, no `any` | PASS | All new interfaces fully typed. Message protocol uses discriminated unions. |

No violations. All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/174-thumbnail-capture/
├── spec.md
├── plan.md              # This file
├── research.md          # Capture library evaluation
├── data-model.md        # STAC asset schema, TypeScript types, message protocol
├── quickstart.md        # How to test and use
├── contracts/
│   ├── webview-messages.md    # Thumbnail capture request/response
│   └── thumbnail-storage.md  # Python storage API and STAC asset format
├── checklists/
│   └── requirements.md  # Spec quality validation
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/stac/src/debrief_stac/
└── thumbnails.py                    # NEW: store_thumbnail() function

services/stac/tests/
└── test_thumbnails.py               # NEW: unit tests for thumbnail storage

shared/components/src/
├── MapView/
│   ├── captureMap.ts                # NEW: modern-screenshot wrapper
│   └── resizeImage.ts               # NEW: offscreen canvas downscaler
├── StacBrowser/
│   ├── ThumbnailPreview.tsx         # NEW: gallery preview panel component
│   └── ThumbnailPreview.css         # NEW: preview panel styles
│   └── StacBrowser.tsx              # MODIFY: add preview panel to GoldenLayout
├── ExerciseListView/
│   └── ExerciseListItemRow.tsx      # MODIFY: render PNG thumbnail when available
└── filter-engine/
    └── types.ts                     # MODIFY: add thumbnailHref fields

apps/vscode/src/
├── webview/
│   ├── messages.ts                  # MODIFY: add capture message types
│   └── mapPanel.ts                  # MODIFY: handle capture request
├── commands/
│   └── saveSession.ts               # MODIFY: trigger capture after save
└── services/
    └── stacService.ts               # MODIFY: extract thumbnail hrefs in listItems()

apps/web-shell/
├── scripts/
│   └── generate-thumbnails.ts       # NEW: Playwright backfill script
├── src/mocks/
│   └── stacService.ts               # MODIFY: populate thumbnailHref from fixtures
└── playwright/pages/
    └── AnalysisPage.ts              # MODIFY: add fitToWindow() method
```

**Structure Decision**: This feature touches multiple existing packages across the monorepo. No new packages are created. The `thumbnails.py` module follows the existing `artifacts.py` pattern in `debrief-stac`. The `ThumbnailPreview` component lives alongside the existing `StacBrowser` components.

## Media Components

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| ThumbnailPreview | `shared/components/src/StacBrowser/ThumbnailPreview.stories.tsx` | `thumbnail-preview.js` | Demonstrates gallery preview with prev/next navigation |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [ ] Stories exist in Storybook (will be created)
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/stacbrowser-thumbnailpreview--default`

## Storybook E2E Testing

| Story | Test Coverage | Theme Variants | Interactions |
|-------|--------------|----------------|--------------|
| `ThumbnailPreview.stories.tsx` | Rendering, fallback states | light, dark, vscode | click prev/next, keyboard arrows, empty state |

**Testing Strategy**:
- [x] Component renders correctly in all theme variants
- [x] Interactive elements respond to user input
- [x] Accessibility attributes present (data-testid, aria-*)
- [x] Screenshots captured for evidence

**Test File Location**: `shared/components/e2e/ThumbnailPreview.spec.ts`

## VS Code Webview E2E Testing

| Workflow | Panels Involved | Key Selectors | Interactions |
|----------|----------------|---------------|--------------|
| Save generates thumbnails | Map Panel | `.leaflet-container` | Save command, verify PNG files created |
| Gallery preview browse | Catalog Browser | `[data-testid="thumbnail-preview"]` | Click item, verify preview, arrow through |

**Testing Strategy**:
- [x] Extension workflow works end-to-end in code-server
- [x] Webview content accessible via `frameLocator` chaining
- [x] Page objects updated for new selectors
- [x] Screenshots captured for evidence

**Test File Location**: `apps/web-shell/playwright/tests/thumbnail-preview.spec.ts`

**Infrastructure**:
- Patches applied by `tests/e2e/scripts/patch-webview.sh`
- Content injection via `tests/e2e/helpers/webview-injector.ts`
- Headed Chromium required: `xvfb-run --auto-servernum npx playwright test ...`

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.
