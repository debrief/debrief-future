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
apps/vscode/
├── src/
│   ├── panels/
│   │   └── catalogOverviewPanel.ts    # NEW — WebviewPanel lifecycle
│   ├── services/
│   │   └── stacService.ts             # MODIFY — extend StacItemSummary
│   ├── providers/
│   │   └── stacTreeProvider.ts        # MODIFY — add catalog open command
│   ├── types/
│   │   └── stac.ts                    # MODIFY — add bbox/temporal fields
│   ├── webview/
│   │   └── web/
│   │       ├── catalogOverview.ts     # NEW — webview entry point
│   │       └── catalogOverview.css    # NEW — webview styles
│   └── extension.ts                   # MODIFY — register command + panel
└── package.json                       # MODIFY — add command contribution
```

**Structure Decision**: New panel files go in `src/panels/` (new directory) to distinguish from the existing `src/webview/mapPanel.ts` which mixes panel lifecycle with webview concerns. The webview entry point stays in `src/webview/web/` following established convention.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None — this feature is a VS Code extension webview panel. It cannot render standalone in Storybook because it depends on the VS Code webview API and local STAC catalog data. A screenshot/screencast in the blog post will be more effective than an interactive demo.

## Complexity Tracking

No constitution violations requiring justification.
