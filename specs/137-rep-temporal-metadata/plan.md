# Implementation Plan: REP Loader Temporal Metadata

**Branch**: `137-rep-temporal-metadata` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/137-rep-temporal-metadata/spec.md`

## Summary

Add temporal extent computation to the STAC Item creation workflow. After REP track features are added to a plot, a new `update_temporal_metadata()` function scans all track features for their `start_time`/`end_time` properties, computes the global temporal extent, and writes `datetime`, `start_datetime`, `end_datetime` to the STAC Item. This enables accurate Timeline/Gantt rendering and temporal filtering.

## Technical Context

**Language/Version**: Python 3.11 (service), TypeScript 5.x (VS Code extension consumer)
**Primary Dependencies**: Pydantic v2 (models), existing `debrief-stac` service module, `mcp.server.fastmcp` (MCP exposure)
**Storage**: Local filesystem STAC catalogs (JSON + GeoJSON)
**Testing**: pytest (Python), vitest (TypeScript)
**Target Platform**: Linux, macOS, Windows (desktop)
**Project Type**: Multi-package monorepo (uv + pnpm workspaces)
**Performance Goals**: N/A — temporal computation is negligible (scan ~10-100 features)
**Constraints**: Offline-capable, no network dependencies
**Scale/Scope**: Operates on single plot (1-50 tracks typical)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Notes |
|---------|------|--------|-------|
| I. Defence-Grade Reliability | Offline by default | PASS | All computation local, no network |
| I. Defence-Grade Reliability | No silent failures | PASS | Returns None when no temporal data; doesn't silently corrupt |
| II. Schema Integrity | Schema tests mandatory | PASS | No schema changes — uses existing STAC properties |
| III. Data Sovereignty | Provenance always | PASS | Source REP file preserved as asset; temporal metadata is derived |
| III. Data Sovereignty | Source preservation | PASS | Original features unchanged; only Item-level metadata updated |
| IV. Architectural Boundaries | Services never touch UI | PASS | Python service computes; TS frontend delegates via MCP |
| IV. Architectural Boundaries | Frontends never persist | PASS — with fix | Existing TS implementation persists directly; this feature moves logic to Python service |
| VI. Testing | Services require unit tests | PASS | Test plan includes 6+ scenarios |
| VII. Test-Driven AI | Tests before implementation | PASS | Test scenarios defined in spec |
| VIII. Documentation | Specs before code | PASS | This spec/plan precedes implementation |
| IX. Dependencies | Minimal dependencies | PASS | No new dependencies |
| XV. Strict Type Safety | Explicit types everywhere | PASS | All new functions fully typed |

**Post-design re-check**: All gates still pass. The design moves temporal computation from TypeScript (frontend persistence violation) to Python (correct service boundary).

## Project Structure

### Documentation (this feature)

```text
specs/137-rep-temporal-metadata/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Data model changes
├── quickstart.md        # Implementation quickstart
├── contracts/           # API contracts
│   └── update-temporal-metadata.md
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
services/stac/src/debrief_stac/
├── plot.py              # MODIFY: add update_temporal_metadata()
├── models.py            # MODIFY: extend PlotMetadata with start/end_datetime
└── mcp_server.py        # MODIFY: add MCP tool wrapper

services/stac/tests/
├── test_plot.py         # MODIFY: add temporal metadata tests
└── test_integration.py  # MODIFY: add temporal step to workflow test

apps/vscode/src/services/
└── stacService.ts       # MODIFY: delegate updateTemporalMetadata() to MCP
```

**Structure Decision**: No new directories or packages. All changes are additions to existing modules in `services/stac/` and `apps/vscode/`.

## Media Components

None — backend/infrastructure feature. No visual components or Storybook stories.

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes. The existing `importRep.ts` flow already calls `updateTemporalMetadata()`; only the internal implementation changes (delegates to MCP instead of direct file I/O).

## Complexity Tracking

No constitution violations to justify. All changes align with existing patterns.
