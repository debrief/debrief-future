# Implementation Plan: Debrief VS Code Extension

**Branch**: `006-speckit-vscode-extension` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-speckit-vscode-extension/spec.md`

## Summary

Build a VS Code extension for Debrief maritime tactical analysis that enables analysts to browse STAC catalogs from Explorer, display plots on interactive Leaflet maps with vessel tracks and reference locations, select data elements for analysis, discover context-sensitive tools via debrief-calc MCP, execute analysis tools, and view computed results as overlay layers.

## Technical Context

**Language/Version**: TypeScript 5.x (VS Code Extension API)
**Primary Dependencies**: @vscode/api (extension host), Leaflet (map rendering), debrief-config (TypeScript), debrief-stac (via IPC), debrief-calc (via MCP)
**Storage**: N/A (all persistence via debrief-stac service)
**Testing**: @vscode/test-electron, vitest (unit tests), Playwright (webview tests)
**Target Platform**: VS Code (Windows, macOS, Linux)
**Project Type**: VS Code Extension
**Performance Goals**: Render 10,000 track points without noticeable lag (<100ms frame time)
**Constraints**: Offline-capable, no external network dependencies for core functionality
**Scale/Scope**: Single extension, 1 webview panel type, 3 sidebar sections, ~15 commands

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✅ PASS | All operations use local STAC catalogs; no network required |
| I.2 | No cloud dependencies | ✅ PASS | Local file system only; cloud catalogs explicitly out of scope |
| I.3 | No silent failures | ✅ PASS | Error states defined for all failure modes (FR-014, error wireframes) |
| I.4 | Reproducibility | ✅ PASS | Tool execution delegates to debrief-calc which guarantees reproducibility |
| II.1 | Single source of truth (schema) | ✅ PASS | Uses shared schemas from Stage 0 |
| II.2 | Schema tests mandatory | ✅ PASS | Contract tests will validate GeoJSON/STAC structures |
| III.1 | Provenance always | ✅ PASS | Tool results include lineage via debrief-calc |
| III.2 | Source preservation | ✅ PASS | Extension is read-only; editing data is out of scope |
| III.4 | Data stays local | ✅ PASS | No telemetry; all data local |
| IV.1 | Services never touch UI | ✅ PASS | Extension is a frontend; services (debrief-calc, debrief-stac) are separate |
| IV.2 | Frontends never persist | ✅ PASS | Extension delegates all writes to debrief-stac |
| V.1 | Fail-safe loading | ✅ PASS | Extension loads in VS Code's isolation model |
| V.2 | Schema compliance | ✅ PASS | Consumes/produces schema-compliant data |
| VI.1 | Schema tests gate merges | ✅ PASS | Contract tests in CI |
| VI.2 | Services require unit tests | ✅ PASS | Extension code will have unit tests |
| VII.1 | Tests before implementation | ✅ PASS | Test-first approach in task breakdown |
| VIII.1 | Specs before code | ✅ PASS | This spec exists |
| IX.1 | Minimal dependencies | ✅ PASS | Only required: VS Code API, Leaflet, existing debrief packages |
| X.1 | No secrets in code | ✅ PASS | No credentials required |
| XI.1 | I18N from the start | ⚠️ DEFER | User-facing strings externalized; translations deferred to pre-release |
| XII.2 | Beta previews | ✅ PASS | SC-007 requires marketplace pre-release publication |

**Gate Status**: ✅ PASS — All critical constitution requirements satisfied. I18N deferred with justification (pre-release phase).

## Project Structure

### Documentation (this feature)

```text
specs/006-speckit-vscode-extension/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/vscode/
├── src/
│   ├── extension.ts         # Extension entry point, activation
│   ├── commands/            # Command implementations
│   │   ├── openPlot.ts
│   │   ├── addStore.ts
│   │   └── exportPng.ts
│   ├── providers/           # VS Code API providers
│   │   ├── stacTreeProvider.ts      # Explorer tree for STAC stores
│   │   ├── outlineProvider.ts       # Selection outline provider
│   │   └── virtualFolderProvider.ts # STAC virtual folder provider
│   ├── views/               # Sidebar views
│   │   ├── timeRangeView.ts
│   │   ├── toolsView.ts
│   │   └── layersView.ts
│   ├── webview/             # Map webview panel
│   │   ├── mapPanel.ts      # Webview panel controller
│   │   ├── messages.ts      # Extension ↔ webview protocol
│   │   └── web/             # Webview content (bundled separately)
│   │       ├── index.html
│   │       ├── map.ts       # Leaflet map logic
│   │       ├── selection.ts # Selection state/rendering
│   │       └── styles.css
│   ├── services/            # Service integrations
│   │   ├── stacService.ts   # debrief-stac wrapper
│   │   ├── configService.ts # debrief-config wrapper
│   │   └── calcService.ts   # debrief-calc MCP client
│   └── types/               # TypeScript interfaces
│       ├── plot.ts
│       ├── track.ts
│       └── tool.ts
├── package.json             # Extension manifest
├── tsconfig.json
├── esbuild.config.js        # Bundler config
└── tests/
    ├── unit/                # Unit tests (vitest)
    ├── integration/         # Integration tests
    └── e2e/                 # End-to-end tests (@vscode/test-electron)
```

**Structure Decision**: VS Code Extension structure under `apps/vscode/` following the planned repository layout from ARCHITECTURE.md. Webview content bundled separately from extension host code.

## Constitution Re-Check (Post-Design)

*Verification after Phase 1 design completion.*

| Article | Re-Check | Status | Design Evidence |
|---------|----------|--------|-----------------|
| I.1 | Offline by default | ✅ PASS | FileSystemProvider uses local paths; Leaflet bundled locally |
| I.3 | No silent failures | ✅ PASS | Error states in data-model.md (ToolExecution.status, StacStore.status) |
| II.2 | Schema tests | ✅ PASS | Contract tests defined in contracts/ directory |
| III.1 | Provenance | ✅ PASS | ResultLayer tracks executionId, toolName for lineage |
| IV.2 | Frontends never persist | ✅ PASS | MapViewState uses webview state; no direct file writes |
| VI.2 | Unit tests | ✅ PASS | Test structure in project layout (tests/unit/) |
| VII.1 | Tests before implementation | ✅ PASS | Test contracts in data-model.md validation rules |
| IX.1 | Minimal dependencies | ✅ PASS | research.md confirms only essential deps |

**Post-Design Gate Status**: ✅ PASS — Design artifacts align with constitution requirements.

## Complexity Tracking

> No constitution violations requiring justification.

*No entries required — all complexity within acceptable bounds.*

---

## Generated Artifacts

| Artifact | Path | Purpose |
|----------|------|---------|
| Research | [research.md](./research.md) | Technical decisions and rationale |
| Data Model | [data-model.md](./data-model.md) | Entity definitions and relationships |
| Webview Messages | [contracts/webview-messages.md](./contracts/webview-messages.md) | Extension ↔ webview protocol |
| Commands | [contracts/commands.md](./contracts/commands.md) | VS Code command definitions |
| Configuration | [contracts/configuration.md](./contracts/configuration.md) | Settings schema |
| Quickstart | [quickstart.md](./quickstart.md) | Developer onboarding guide |
