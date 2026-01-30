# Implementation Plan: Tool Results Architecture

**Branch**: `041-document-tool-results` | **Date**: 2026-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/041-document-tool-results/spec.md`

## Summary

Implement a typed result system for debrief-calc tools with four top-level types (mutation, addition, deletion, artifact), MCP-compliant response formatting with Debrief annotations, persistence through debrief-stac (including feature updates/deletions and artifact file writes), a shared FeatureCollection diff utility, and hierarchical type degradation for extensibility.

## Technical Context

**Language/Version**: Python 3.11 (LinkML schemas, debrief-calc, debrief-stac), TypeScript 5.x (shared diff utility, VS Code extension)
**Primary Dependencies**: LinkML (schema), Pydantic v2 (Python models), MCP SDK (tool responses), pystac concepts (manual STAC JSON)
**Storage**: Local filesystem STAC catalog (JSON + GeoJSON files)
**Testing**: pytest (Python), vitest or VS Code test runner (TypeScript)
**Target Platform**: Desktop (VS Code on Linux/macOS/Windows)
**Project Type**: Multi-package monorepo (uv workspaces + pnpm workspaces)
**Performance Goals**: Result persistence completes in < 2 seconds for typical result sizes
**Constraints**: Offline-capable, no network dependencies, fail-fast on errors (no partial results)
**Scale/Scope**: Single-user local catalog, tens of results per session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✅ Pass | All operations are local filesystem |
| I.3 | No silent failures | ✅ Pass | Fail-fast, structured MCP errors |
| I.4 | Reproducibility | ✅ Pass | Same inputs + tool version = same result |
| II.1 | Single source of truth | ✅ Pass | Result types defined in LinkML, generated to Python + TypeScript |
| II.2 | Schema tests mandatory | ✅ Pass | Golden fixtures + round-trip tests planned |
| III.1 | Provenance always | ✅ Pass | PROV recorded in feature properties on every persist |
| III.2 | Source preservation | ✅ Pass | Mutations update in-place but provenance traces back to originals |
| IV.1 | Services never touch UI | ✅ Pass | Tools return data; frontends handle rendering |
| IV.2 | Frontends never persist | ✅ Pass | Persistence goes through debrief-stac service |
| IV.3 | Zero MCP in core | ✅ Pass | Core logic is pure Python; MCP wrappers are thin layers |
| V.2 | Schema compliance | ✅ Pass | Contrib extensions validated at top-level; convention-based below |
| VI.2 | Services require unit tests | ✅ Pass | Tests planned for all new modules |
| VIII.1 | Specs before code | ✅ Pass | This spec and plan exist |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/041-document-tool-results/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── python-api.md    # debrief-calc + debrief-stac API contracts
│   └── typescript-api.md # Shared diff utility + frontend integration
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
shared/schemas/src/linkml/
└── tool-result.yaml          # NEW: Result type schema (mutation/addition/deletion/artifact)

shared/schemas/fixtures/
└── tool-result/
    ├── valid/                # Golden fixture files for each result type
    └── invalid/              # Invalid result type examples

services/calc/debrief_calc/
├── result_types.py           # NEW: Result type enum + hierarchy matcher
├── result_builder.py         # NEW: MCP response builder with annotations
├── mcp/
│   └── server.py             # MODIFY: Use result_builder for tool responses
└── tests/
    ├── test_result_types.py  # NEW: Type classification + hierarchy tests
    └── test_result_builder.py # NEW: MCP response construction tests

services/stac/src/debrief_stac/
├── features.py               # MODIFY: Add update_features(), delete_features()
├── artifacts.py              # NEW: store_artifact() — file write + item.json update
├── provenance.py             # NEW: Write PROV to feature properties
├── mcp/
│   └── server.py             # MODIFY: Add atomic STAC operation tools
└── tests/
    ├── test_features.py      # MODIFY: Add tests for update + delete
    ├── test_artifacts.py     # NEW: Artifact storage tests
    └── test_provenance.py    # NEW: Provenance writing tests

shared/components/
└── diff/
    ├── src/
    │   └── diffFeatureCollections.ts  # NEW: Shared diff utility
    └── tests/
        └── diffFeatureCollections.test.ts  # NEW: Diff utility tests
```

**Structure Decision**: Cross-cutting feature spanning three existing packages (shared/schemas, services/calc, services/stac) plus a new shared utility (shared/components/diff). No new top-level packages needed.

## Media Components

None — backend/infrastructure feature with no visual components.

## Complexity Tracking

No Constitution violations to justify.
