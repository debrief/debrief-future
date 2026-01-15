# Implementation Plan: debrief-calc — Context-Sensitive Analysis Tools

**Branch**: `005-debrief-calc` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-debrief-calc/spec.md`

## Summary

Implement a context-sensitive analysis tool service for the Debrief maritime tactical analysis platform. The service provides:

1. **Tool Registry** — catalog of analysis tools queryable by selection context and feature kind
2. **Tool Execution** — run tools on selections, returning validated GeoJSON with provenance
3. **MCP Integration** — remote tool access following mcp-common patterns
4. **CLI Package** — `debrief-cli` for verification, power users, and automation

The implementation uses Python with a plugin-style tool architecture, enabling future extensibility while keeping the core minimal.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: Pydantic >=2.0.0, debrief-schemas (workspace), mcp >=1.0.0 (optional), click (CLI)
**Storage**: N/A (pure transformation service — no persistence)
**Testing**: pytest with GeoJSON fixtures
**Target Platform**: Desktop (VS Code extension, Electron Loader, Jupyter) via MCP or direct import
**Project Type**: Single Python package (debrief-calc) + separate CLI package (debrief-cli)
**Performance Goals**: Tool discovery < 1 second, tool execution varies by algorithm
**Constraints**: Offline-capable, no network dependencies, synchronous execution only
**Scale/Scope**: 3+ representative tools initially, extensible to organization-specific tools via /contrib

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | Core works without network | ✅ PASS | No network dependencies in tool execution |
| I.3 No silent failures | Explicit success/failure | ✅ PASS | Descriptive error messages required (FR-009) |
| I.4 Reproducibility | Same inputs → same outputs | ✅ PASS | Tools are deterministic; provenance tracked |
| II.1 Schema source of truth | Use LinkML-derived schemas | ✅ PASS | Uses debrief-schemas for GeoJSON profile |
| II.2 Schema tests mandatory | Derived schemas tested | ✅ PASS | Output validation against schema (SC-003) |
| III.1 Provenance always | Record lineage | ✅ PASS | FR-005 requires provenance in all outputs |
| IV.1 Services never touch UI | Return data only | ✅ PASS | Returns GeoJSON features; no UI code |
| IV.3 Zero MCP dependency | Domain logic in pure Python | ✅ PASS | MCP wrapper is thin layer over core library |
| VI.2 Services require tests | Unit tests required | ✅ PASS | pytest with fixtures for all tools |
| VII.1 Tests before implementation | Define tests first | ✅ PASS | Acceptance scenarios define expected behavior |
| VIII.1 Specs before code | Written specification | ✅ PASS | This plan follows completed spec |
| IX.1 Minimal dependencies | Justify external deps | ✅ PASS | Only Pydantic (validation), click (CLI) |

**Gate Result**: ✅ All gates pass. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-debrief-calc/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API definitions)
├── tasks.md             # Phase 2 output (/speckit.tasks command)
├── checklists/          # Quality checklists
│   └── requirements.md
├── prd-debrief-cli.md   # CLI product requirements
└── media/               # Phase 2 media content
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
services/
├── calc/                    # debrief-calc package
│   ├── __init__.py
│   ├── registry.py          # Tool registry and discovery
│   ├── executor.py          # Tool execution engine
│   ├── models.py            # Tool, ToolMetadata, ToolResult models
│   ├── provenance.py        # Provenance tracking
│   ├── validation.py        # Input/output validation
│   ├── mcp/                  # MCP wrapper (thin layer)
│   │   ├── __init__.py
│   │   └── server.py
│   └── tools/               # Built-in representative tools
│       ├── __init__.py
│       ├── track_stats.py   # Single track analysis
│       ├── range_bearing.py # Two-track comparison
│       └── area_summary.py  # Regional analysis
└── cli/                     # debrief-cli package (separate)
    ├── __init__.py
    ├── main.py              # Entry point
    ├── tools.py             # tools subcommand group
    ├── validate.py          # validate command
    ├── catalog.py           # catalog subcommand group
    └── output.py            # Human/JSON output formatting

tests/
├── calc/
│   ├── fixtures/            # GeoJSON test fixtures
│   │   ├── track-single.geojson
│   │   ├── tracks-pair.geojson
│   │   └── zone-region.geojson
│   ├── test_registry.py
│   ├── test_executor.py
│   ├── test_provenance.py
│   ├── test_validation.py
│   └── tools/
│       ├── test_track_stats.py
│       ├── test_range_bearing.py
│       └── test_area_summary.py
└── cli/
    ├── test_tools_commands.py
    ├── test_validate_command.py
    └── test_catalog_commands.py
```

**Structure Decision**: Two separate packages following the architectural principle of thick services with thin frontends. The `debrief-calc` package contains all domain logic; `debrief-cli` is a thin integration layer that depends on calc, io, stac, and config packages.

## Complexity Tracking

> No constitution violations requiring justification. All gates pass.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | — | — |
