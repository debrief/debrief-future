# Implementation Plan: STAC Collection Summaries for Browser Backend

**Branch**: `136-stac-collection-summaries` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/136-stac-collection-summaries/spec.md`

## Summary

Promote STAC Catalogs to Collections with auto-generated summaries (temporal range, spatial extent, extension property enumerations) when items are added. Summary updates are incremental for additions and full-recomputation for deletions. This enables the CQL2 filter engine and Browser Discovery UI to query aggregate metadata without loading individual items.

## Technical Context

**Language/Version**: Python 3.11 (service), TypeScript 5.x (VS Code extension consumer)
**Primary Dependencies**: Pydantic v2 (models), existing `debrief-stac` service module, `mcp.server.fastmcp` (MCP exposure)
**Storage**: Local filesystem STAC catalogs (JSON files — `catalog.json`, `item.json`)
**Testing**: pytest (Python unit + integration), vitest (TypeScript types)
**Target Platform**: Linux (CI), macOS/Windows (dev), offline-capable
**Project Type**: Monorepo with `services/stac/` (Python) and `apps/vscode/` (TypeScript)
**Performance Goals**: O(1) catalog reads for summary queries; O(1) item reads for incremental additions
**Constraints**: Offline-only (no network calls); backwards-compatible with existing catalogs
**Scale/Scope**: Catalogs with 1–1000 items; typical analyst use: 5–50 items per catalog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All operations are local filesystem — no network calls |
| I. Defence-Grade Reliability | No silent failures | PASS | Promotion errors surface explicitly; existing operations unchanged |
| II. Schema Integrity | Schema tests mandatory | PASS | Collection JSON validated against contract schema |
| III. Data Sovereignty | Provenance always | PASS | Summaries are derived metadata, not source data; provenance unchanged |
| III. Data Sovereignty | Source preservation | PASS | Original items untouched; catalog.json is metadata only |
| IV. Architectural Boundaries | Services never touch UI | PASS | Summary computation returns data only; no UI rendering |
| IV. Architectural Boundaries | Services have zero MCP dependency | PASS | Summary logic lives in pure Python; MCP wrapper is thin |
| VI. Testing | Services require unit tests | PASS | Unit tests for summary computation, integration tests for promotion flow |
| VII. Test-Driven AI | Tests before implementation | PLAN | Test fixtures and expected outputs defined in contracts |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies — uses existing json, pathlib, pydantic |
| XV. Strict Type Safety | Explicit types | NOTE | Existing `STACCatalog: TypeAlias = dict[str, Any]` pattern preserved — `Any` is at JSON boundary |

**Post-Phase 1 Re-check**: All gates pass. No new violations introduced by design artifacts. The `dict[str, Any]` type aliases follow the established project pattern for STAC JSON structures at the serialisation boundary.

## Project Structure

### Documentation (this feature)

```text
specs/136-stac-collection-summaries/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── collection-schema.json  # JSON Schema for Collection validation
│   └── python-api.md    # Python API contract
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
services/stac/src/debrief_stac/
├── catalog.py           # MODIFIED: add promotion logic, summary updates
├── collection.py        # NEW: Collection-specific functions (summaries, rebuild)
├── types.py             # MODIFIED: add STACCollection type alias
├── models.py            # MODIFIED: add CollectionSummaries model
├── plot.py              # MODIFIED: hook summary update into create_plot
├── features.py          # MODIFIED: hook summary update into add/update/delete_features
└── mcp_server.py        # MODIFIED: expose read_collection_summaries tool

services/stac/tests/
├── test_collection.py   # NEW: unit tests for Collection summaries
├── test_catalog.py      # MODIFIED: test backwards compatibility
└── test_integration.py  # MODIFIED: end-to-end promotion flow

apps/vscode/src/types/
└── stac.ts              # MODIFIED: add StacCollection interface
```

**Structure Decision**: This feature modifies the existing `services/stac/` package. A new `collection.py` module isolates Collection-specific logic (summary computation, rebuild) from the existing `catalog.py` (which handles creation, opening, saving). This keeps the existing module focused while adding new functionality in a testable unit.

## Media Components

None — backend/infrastructure feature. No visual components or Storybook stories.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes. TypeScript type changes are consumed by the filter bar (#127) which is a separate feature.

## Complexity Tracking

No constitution violations requiring justification.
