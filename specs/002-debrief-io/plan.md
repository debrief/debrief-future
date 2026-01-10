# Implementation Plan: debrief-io

**Branch**: `002-debrief-io` | **Date**: 2026-01-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-debrief-io/spec.md`

## Summary

File parsing service for Debrief v4.x. Provides pure Python transformations from legacy file formats (starting with REP) to validated GeoJSON features conforming to Stage 0 schemas. Implements extensible handler registry for multiple file formats. All operations exposed via MCP tools for loader app integration.

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**: Pydantic >=2.0.0, debrief-schemas (workspace), mcp >=1.0.0 (optional)
**Storage**: N/A (pure transformation service - no persistence)
**Testing**: pytest with pytest-cov (>90% coverage required)
**Target Platform**: Desktop (Windows, macOS, Linux), offline-capable
**Project Type**: Python library (uv workspace member)
**Performance Goals**: <100ms for typical REP file, <500ms for files with 10k+ positions
**Constraints**: Offline-first (Constitution I.1), pure transformation (no side effects), encoding detection (UTF-8, Latin-1)
**Scale/Scope**: REP files typically <10MB, <1000 tracks, <100k positions total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 | Offline by default | ✓ PASS | All operations local, no network calls |
| I.2 | No cloud dependencies | ✓ PASS | Pure Python, filesystem only |
| I.3 | No silent failures | ✓ PASS | Parse errors include line numbers |
| I.4 | Reproducibility | ✓ PASS | Same file → same output |
| II.1 | Single schema source | ✓ PASS | Uses debrief-schemas from Stage 0 |
| II.2 | Schema tests mandatory | ✓ PASS | All output validated against Pydantic models |
| III.1 | Provenance always | ✓ PASS | Source file path in feature properties |
| III.2 | Source preservation | N/A | Parser doesn't modify source files |
| III.4 | Data stays local | ✓ PASS | No telemetry, no external calls |
| IV.1 | Services never touch UI | ✓ PASS | Returns data only |
| IV.3 | Zero MCP in core | ✓ PASS | MCP wrappers in separate module |
| V.1 | Fail-safe loading | ✓ PASS | Handler errors don't crash core |
| V.2 | Schema compliance | ✓ PASS | Extensions produce validated features |
| VI.2 | Services require tests | ✓ PASS | >90% coverage target |
| VIII.1 | Specs before code | ✓ PASS | This plan + spec.md |
| IX.1 | Minimal dependencies | ✓ PASS | Only Pydantic + workspace dep |
| FR-009 | Pure transformation | ✓ PASS | No side effects, no file writes |

**Post-Design Re-check**: All gates passed. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-debrief-io/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Technical decisions (Phase 0)
├── data-model.md        # Entity definitions (Phase 1)
├── quickstart.md        # Usage examples (Phase 1)
├── contracts/
│   └── python-api.md    # API contract (Phase 1)
└── tasks.md             # Implementation tasks (/speckit.tasks)
```

### Source Code

```text
services/io/
├── pyproject.toml           # Package configuration (uv workspace)
├── README.md                # Package documentation
└── src/debrief_io/
    ├── __init__.py          # Package exports
    ├── py.typed             # PEP 561 marker
    ├── models.py            # Pydantic models (ParseResult, ParseError)
    ├── exceptions.py        # Domain exceptions
    ├── types.py             # Type aliases
    ├── registry.py          # Handler registry and discovery
    ├── parser.py            # Main parse() entry point
    ├── handlers/
    │   ├── __init__.py      # Handler base class
    │   ├── base.py          # Abstract handler interface
    │   └── rep.py           # REP format handler
    └── mcp_server.py        # MCP tool wrappers (optional)

services/io/tests/
├── conftest.py              # Shared fixtures
├── fixtures/                # Test data files
│   ├── valid/               # Valid REP samples
│   └── invalid/             # Invalid/malformed samples
├── test_registry.py         # Handler registry tests
├── test_parser.py           # Main parser tests
├── test_rep_handler.py      # REP format tests
├── test_validation.py       # Schema validation tests
├── test_mcp.py              # MCP tool tests
└── test_integration.py      # End-to-end workflow tests
```

**Structure Decision**: Python library in uv workspace at `services/io/`. Follows existing project patterns from `services/stac/` and `shared/schemas/`.

## Implementation Phases

### Phase 1: Setup (Project Infrastructure)
- Create service directory structure
- Configure pyproject.toml for uv workspace
- Set up pytest configuration
- Create package scaffolding

### Phase 2: Foundational (Core Types & Exceptions)
- Define Pydantic models (ParseResult, ParseError, ParseWarning)
- Create exception hierarchy
- Define type aliases
- Create handler base class

### Phase 3-5: MVP User Stories (US1-US3)
- US1: Parse REP File to GeoJSON (tracks, reference locations)
- US2: Validate Parsed Features against schemas
- US3: Parse Sensor Contacts (P2, may defer)

### Phase 6-7: Extensibility (US4-US5)
- US4: Handler Discovery and Registration
- US5: MCP Tool Exposure

### Phase 8: Polish & Integration
- Integration tests with debrief-stac
- Error handling edge cases
- Documentation
- Coverage verification (>90%)

## Key Implementation Details

### REP Format Parsing
- Line-based format with record type indicators
- Track positions: timestamp, lat/lon, course, speed, depth
- Reference locations: name, position, type
- Sensor contacts: bearing, range, timestamp, parent track

### Handler Registry Pattern
```python
# Register handler for extension
register_handler(".rep", REPHandler)

# Parse file (handler auto-selected)
result = parse(path)

# List available handlers
handlers = list_handlers()
```

### Parse Result Structure
```python
@dataclass
class ParseResult:
    features: list[TrackFeature | ReferenceLocation]
    warnings: list[ParseWarning]
    source_file: str
    parse_time_ms: float
```

### Encoding Detection
1. Try UTF-8 first (most common)
2. Fall back to Latin-1 (legacy files)
3. Report encoding in warnings if non-UTF-8

### Error Handling
- Line numbers in all parse errors
- Field names in validation errors
- Continue parsing after recoverable errors (collect warnings)

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| pydantic | >=2.0.0 | Data validation |
| debrief-schemas | workspace | Generated models (TrackFeature, etc.) |
| mcp | >=1.0.0 | MCP server (optional) |
| pytest | >=7.0.0 | Testing (dev) |
| pytest-cov | >=4.0.0 | Coverage (dev) |

## Success Metrics

- [ ] >90% code coverage
- [ ] Parse test REP file (two tracks + reference location)
- [ ] All output features pass Pydantic validation
- [ ] Parse errors include line numbers (80%+ cases)
- [ ] Handler registry routes by extension
- [ ] MCP tools match Python API behavior
- [ ] Integration test: parse → validate → store in STAC

## Related Documents

- [spec.md](./spec.md) - Feature specification
- [research.md](./research.md) - Technical decisions
- [data-model.md](./data-model.md) - Entity definitions
- [contracts/python-api.md](./contracts/python-api.md) - API contract
- [quickstart.md](./quickstart.md) - Usage examples
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Project architecture
- [CONSTITUTION.md](../../CONSTITUTION.md) - Governing principles
