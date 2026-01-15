# Test Summary: debrief-calc

**Date**: 2026-01-15
**Branch**: `005-debrief-calc`

## Test Results

| Package | Tests | Passed | Failed | Skipped |
|---------|-------|--------|--------|---------|
| debrief-calc | 157 | 157 | 0 | 1 |
| debrief-cli | 42 | 42 | 0 | 0 |
| **Total** | **199** | **199** | **0** | **1** |

**Pass Rate**: 100%

## Test Categories

### debrief-calc Tests

| Category | Tests | Status |
|----------|-------|--------|
| Models (test_models.py) | 26 | PASS |
| Exceptions (test_exceptions.py) | 20 | PASS |
| Registry (test_registry.py) | 20 | PASS |
| Executor (test_executor.py) | 10 | PASS |
| Provenance (test_provenance.py) | 12 | PASS |
| Metadata (test_metadata.py) | 17 | PASS |
| track-stats tool | 12 | PASS |
| range-bearing tool | 14 | PASS |
| area-summary tool | 12 | PASS |
| MCP server | 14 | SKIP (MCP SDK optional) |

### debrief-cli Tests

| Category | Tests | Status |
|----------|-------|--------|
| Tools commands | 17 | PASS |
| Validate command | 8 | PASS |
| Catalog commands | 13 | PASS |
| Help text | 4 | PASS |

## Coverage Notes

- **Core Models**: All Pydantic models have validation tests
- **Tool Registry**: Discovery by context type and kind both tested
- **Tool Execution**: Success/failure paths, provenance attachment tested
- **CLI Commands**: All subcommands tested with human and JSON output
- **MCP Server**: Tests skipped when MCP SDK not installed (optional dependency)

## Command Used

```bash
python -m pytest tests/calc/ tests/cli/ -v --tb=short
```

## Verification

```
======================== 199 passed, 1 skipped in 0.80s ========================
```
