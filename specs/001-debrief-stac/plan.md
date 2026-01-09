# Implementation Plan: debrief-stac

**Branch**: `001-debrief-stac` | **Date**: 2026-01-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-debrief-stac/spec.md`

## Summary

Local STAC catalog operations for Debrief v4.x. Provides Python library for creating and managing STAC catalogs containing analysis plots (STAC Items) with GeoJSON features and source file assets. All operations exposed via MCP tools for VS Code extension integration.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: Pydantic >=2.0.0, debrief-schemas (workspace), mcp >=1.0.0 (optional)
**Storage**: STAC 1.0.0 catalogs with GeoJSON files (local filesystem)
**Testing**: pytest with pytest-cov (>90% coverage required)
**Target Platform**: Desktop (Windows, macOS, Linux), offline-capable
**Project Type**: Python library (uv workspace member)
**Performance Goals**: <100ms catalog operations, <500ms for 1000 features
**Constraints**: Offline-first (Constitution I.1), no cloud dependencies
**Scale/Scope**: Thousands of features per plot, hundreds of plots per catalog

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✓ PASS | All operations local filesystem |
| I.2 | No cloud dependencies | ✓ PASS | Pure Python, no network calls |
| I.3 | No silent failures | ✓ PASS | Explicit exceptions for all errors |
| I.4 | Reproducibility | ✓ PASS | Same inputs → same outputs |
| II.1 | Single schema source | ✓ PASS | Uses debrief-schemas |
| II.2 | Schema tests mandatory | ✓ PASS | Pydantic validation throughout |
| III.1 | Provenance always | ✓ PASS | AssetProvenance for sources |
| III.2 | Source preservation | ✓ PASS | Source files copied as assets |
| III.4 | Data stays local | ✓ PASS | No telemetry, no external calls |
| IV.1 | Services never touch UI | ✓ PASS | Returns data only |
| IV.3 | Zero MCP in core | ✓ PASS | MCP wrappers separate module |
| VI.2 | Services require tests | ✓ PASS | >90% coverage target |
| VIII.1 | Specs before code | ✓ PASS | This plan + spec.md |
| IX.1 | Minimal dependencies | ✓ PASS | Only Pydantic + workspace |

**Post-Design Re-check**: All gates passed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-debrief-stac/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions
├── data-model.md        # Entity definitions
├── quickstart.md        # Usage examples
├── contracts/
│   └── python-api.md    # API contract
└── tasks.md             # Implementation tasks
```

### Source Code

```text
services/stac/
├── pyproject.toml           # Package configuration (uv workspace)
├── README.md                # Package documentation
└── src/debrief_stac/
    ├── __init__.py          # Package exports
    ├── py.typed             # PEP 561 marker
    ├── models.py            # Pydantic models (PlotMetadata, etc.)
    ├── exceptions.py        # Domain exceptions
    ├── types.py             # Type aliases
    ├── catalog.py           # create_catalog, open_catalog, list_plots
    ├── plot.py              # create_plot, read_plot
    ├── features.py          # add_features
    ├── assets.py            # add_asset
    └── mcp_server.py        # MCP tool wrappers (optional)

services/stac/tests/
├── conftest.py              # Shared fixtures
├── fixtures.py              # Test data factories
├── test_catalog.py          # Catalog operation tests
├── test_plot.py             # Plot operation tests
├── test_features.py         # Feature operation tests
├── test_assets.py           # Asset operation tests
├── test_mcp.py              # MCP tool tests
├── test_integration.py      # End-to-end workflow tests
├── test_coverage.py         # Additional coverage tests
└── test_stac_validation.py  # STAC spec validation
```

**Structure Decision**: Python library in uv workspace at `services/stac/`. Follows existing project pattern from `shared/schemas/`.

## Implementation Phases

### Phase 1: Setup (Project Infrastructure)
- Create service directory structure
- Configure pyproject.toml for uv workspace
- Set up pytest configuration
- Create package scaffolding

### Phase 2: Foundational (Core Types & Exceptions)
- Define Pydantic models (PlotMetadata, PlotSummary, AssetProvenance)
- Create exception hierarchy
- Define type aliases for STAC structures
- Create test fixtures

### Phase 3-6: MVP User Stories (US1-US4)
- US1: Create Local STAC Catalog
- US2: Create Plot (STAC Item)
- US3: Read Plot
- US4: Add Features to Plot

### Phase 7-9: P2 User Stories (US5-US7)
- US5: Add Source Asset to Plot
- US6: List Catalog Contents
- US7: MCP Tool Exposure

### Phase 10: Polish & Integration
- Integration tests
- STAC validation tests
- Documentation
- Coverage verification (>90%)

## Key Implementation Details

### STAC Structure Generation
- Catalog: `catalog.json` at root with links to items
- Item: `{plot-id}/item.json` with properties, bbox, assets
- Assets: `{plot-id}/features.geojson` and `{plot-id}/assets/*`

### BBox Calculation
- Extract coordinates from all geometry types
- Calculate min/max for lon/lat
- Update item geometry to bounding polygon

### Provenance Tracking
- Record source_path, load_timestamp, tool_version
- Store in asset's `debrief:provenance` extension field

### MCP Integration
- FastMCP for tool registration
- Thin wrappers calling core functions
- Structured error responses

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| pydantic | >=2.0.0 | Data validation |
| debrief-schemas | workspace | Generated models |
| mcp | >=1.0.0 | MCP server (optional) |
| pytest | >=7.0.0 | Testing (dev) |
| pytest-cov | >=4.0.0 | Coverage (dev) |
| stac-validator | >=3.0.0 | STAC validation (dev) |

## Success Metrics

- [ ] >90% code coverage
- [ ] All STAC outputs pass stac-validator
- [ ] Integration test covers full workflow
- [ ] MCP tools match Python API behavior
- [ ] Documentation complete with examples

## Related Documents

- [spec.md](./spec.md) - Feature specification
- [research.md](./research.md) - Technical decisions
- [data-model.md](./data-model.md) - Entity definitions
- [contracts/python-api.md](./contracts/python-api.md) - API contract
- [quickstart.md](./quickstart.md) - Usage examples
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Project architecture
- [CONSTITUTION.md](../../CONSTITUTION.md) - Governing principles
