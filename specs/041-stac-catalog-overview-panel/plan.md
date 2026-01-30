# Implementation Plan: STAC Catalog Overview Panel

**Branch**: `claude/speckit-start-041-GPj21` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/041-stac-catalog-overview-panel/spec.md`

## Summary

Add a read-only overview panel to the VS Code extension that displays all items in a STAC catalog on a Leaflet map (bounding boxes) and SVG timeline (temporal bars). Opened via double-click or context menu on a catalog node in the STAC Stores tree view. Uses vanilla JS + Leaflet + SVG following the existing map webview pattern.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code extension webview)
**Primary Dependencies**: Leaflet ^1.9.4 (already in project), VS Code extension API, esbuild
**Storage**: Local filesystem STAC catalogs (read-only)
**Testing**: Manual verification + unit tests for metadata extraction
**Target Platform**: VS Code desktop (Windows, macOS, Linux)
**Project Type**: VS Code extension webview (single project)
**Performance Goals**: Load overview for catalogs with up to 500 items in <2s
**Constraints**: Offline-capable for rendering (tiles optional), read-only panel
**Scale/Scope**: Single new webview panel + 4 new files + modifications to 4 existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | Bbox/timeline renders without network; tiles are additive |
| I.3 | No silent failures | PASS | Missing metadata shown as "no data", not hidden |
| II. Schema Integrity | Single source of truth | N/A | No new schemas; reads existing STAC item.json |
| III. Data Sovereignty | Provenance always | N/A | Read-only panel, no data transformation |
| III.4 | Data stays local | PASS | Reads local STAC catalog only |
| IV. Architectural Boundaries | Services never touch UI | PASS | stacService returns data; webview handles display |
| IV.2 | Frontends never persist | PASS | Panel is read-only |
| VI. Testing | Services require unit tests | PASS | Unit tests for metadata extraction |
| VII. Test-Driven | Tests before implementation | PASS | Acceptance criteria defined in spec |
| VIII. Documentation | Specs before code | PASS | Spec created |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies; reuses Leaflet |
| XI. Internationalisation | Locale-aware formatting | NOTED | Timeline date labels should respect locale |

**Post-design re-check**: All gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/041-stac-catalog-overview-panel/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research
├── data-model.md        # Data model
├── quickstart.md        # Implementation quickstart
├── contracts/           # Message contracts
│   └── messages.ts      # TypeScript message interfaces
└── media/               # Blog/social content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/components/src/
├── CatalogOverview/
│   ├── CatalogOverview.tsx            # NEW — React component (map + timeline + drag bar)
│   ├── CatalogOverview.css            # NEW — styles with CSS custom properties
│   ├── CatalogOverview.stories.tsx    # NEW — Storybook stories
│   ├── types.ts                       # NEW — component prop types
│   └── index.ts                       # NEW — public export

apps/vscode/
├── src/
│   ├── panels/
│   │   └── catalogOverviewPanel.ts    # NEW — WebviewPanel lifecycle + message bridge
│   ├── services/
│   │   └── stacService.ts             # MODIFY — extend StacItemSummary
│   ├── providers/
│   │   └── stacTreeProvider.ts        # MODIFY — add catalog open command
│   ├── types/
│   │   └── stac.ts                    # MODIFY — add bbox/temporal fields
│   ├── webview/
│   │   └── web/
│   │       └── catalogOverview.tsx    # NEW — webview entry (renders React component)
│   └── extension.ts                   # MODIFY — register command + panel
└── package.json                       # MODIFY — add command + esbuild entry
```

**Structure Decision**: The UI is a shared React component in `shared/components/` (like TimeController), tested via Storybook. The VS Code extension provides a thin webview wrapper. Panel lifecycle goes in `src/panels/` to distinguish from the existing `src/webview/mapPanel.ts`.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

| Component | Story Source | Bundle Name | Purpose |
|-----------|--------------|-------------|---------|
| CatalogOverview | `shared/components/src/CatalogOverview/CatalogOverview.stories.tsx` | `catalog-overview.js` | Map + timeline overview of STAC catalog items |

**Inclusion Criteria Applied**:
- [x] New visual component
- [x] Significant visual change
- [x] Interactive demo adds narrative value

**Bundleability Verified**:
- [x] Stories exist in Storybook
- [x] Components render standalone (no app context required)
- [x] Reasonable bundle size expected (< 500KB)

**Storybook Link**: `https://debrief.github.io/debrief-future/storybook/?path=/story/catalogoverview--default`

## Complexity Tracking

No constitution violations requiring justification.
