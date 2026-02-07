# Implementation Plan: Save Analysis Results to STAC

**Branch**: `001-save-calc-results-stac` | **Date**: 2026-01-29 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-save-calc-results-stac/spec.md`

## Summary

Persist calc tool results (currently transient in-memory ResultLayers) as STAC Items in the local catalog with provenance links to source items. Involves adding a `create_result()` function to debrief-stac (Python), exposing it via MCP, and adding a "Save Result" command to the VS Code extension with idempotency and UI feedback.

## Technical Context

**Language/Version**: Python 3.11 (debrief-stac service), TypeScript 5.x (VS Code extension)
**Primary Dependencies**: pystac concepts (manual STAC JSON), MCP SDK, VS Code extension API
**Storage**: Local filesystem STAC catalog (JSON + GeoJSON files)
**Testing**: pytest (Python), VS Code extension test runner (TypeScript)
**Target Platform**: Desktop (VS Code on Linux/macOS/Windows)
**Project Type**: Multi-package monorepo (uv workspaces + pnpm workspaces)
**Performance Goals**: Save completes in < 2 seconds for typical result sizes
**Constraints**: Offline-capable, no network dependencies
**Scale/Scope**: Single-user local catalog, tens of results per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✅ Pass | All operations are local filesystem |
| I.3 | No silent failures | ✅ Pass | Save reports success/failure via notifications |
| I.4 | Reproducibility | ✅ Pass | Same inputs + tool version = same result features |
| II.1 | Single source of truth | ✅ Pass | No schema changes; uses existing GeoJSON structures |
| III.1 | Provenance always | ✅ Pass | Core purpose of this feature |
| III.2 | Source preservation | ✅ Pass | Original files untouched; results are new items |
| III.3 | Audit trail immutable | ✅ Pass | Result items are write-once |
| IV.1 | Services never touch UI | ✅ Pass | Python creates STAC item; TypeScript handles UI |
| IV.2 | Frontends never persist | ✅ Pass | Save goes through debrief-stac Python service |
| IV.3 | Zero MCP in core | ✅ Pass | `create_result()` is pure Python; MCP wrapper is separate |
| VI.2 | Services require unit tests | ✅ Pass | Tests planned for `create_result()` and MCP tool |
| VIII.1 | Specs before code | ✅ Pass | This spec exists |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/001-save-calc-results-stac/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── python-api.md    # debrief-stac API contract
│   └── typescript-api.md # VS Code extension contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
services/stac/
├── src/debrief_stac/
│   ├── results.py           # NEW: create_result(), result_exists()
│   └── mcp/
│       └── server.py        # MODIFY: add save_result tool
└── tests/
    └── test_results.py      # NEW: unit tests for results module

apps/vscode/
├── src/
│   ├── types/
│   │   └── tool.ts          # MODIFY: extend ToolProvenance, ResultLayer
│   ├── services/
│   │   └── stacService.ts   # MODIFY: add saveResult() method
│   ├── commands/
│   │   └── saveResult.ts    # NEW: save result command
│   └── providers/
│       └── layersTreeProvider.ts  # MODIFY: saved indicator on result items
├── package.json             # MODIFY: add command and context menu
└── tests/
    └── saveResult.test.ts   # NEW: command tests
```

**Structure Decision**: Cross-cutting feature spanning two existing packages (services/stac and apps/vscode). No new packages needed.

## Media Components

None — this feature's visual footprint is a context menu item and a notification. No Storybook-renderable components.

## Complexity Tracking

No Constitution violations to justify.
