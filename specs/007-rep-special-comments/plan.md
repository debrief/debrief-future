# Implementation Plan: REP File Special Comments

**Branch**: `007-rep-special-comments` | **Date**: 2026-01-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-rep-special-comments/spec.md`

## Summary

Extend the existing REP file handler in `debrief-io` to parse all special comment types (NARRATIVE, CIRCLE, RECT, LINE, TEXT, VECTOR, POLY, POLYLINE, ELLIPSE, TIMETEXT, PERIODTEXT, DYNAMIC_*, SENSOR, TMA, etc.), producing GeoJSON features that conform to the annotation schemas defined in `shared/schemas/src/linkml/annotations.yaml`. The parser will fail-fast on invalid data with clear error messages, map REP symbol codes to concrete CSS colors, and preserve legacy symbol names in a new `legacyStyle` attribute.

## Technical Context

**Language/Version**: Python 3.11+ (matches existing debrief-io service)
**Primary Dependencies**: Pydantic v2 (validation), debrief-schemas (annotation models), regex (parsing)
**Storage**: N/A (pure transformation service - no persistence)
**Testing**: pytest (existing test infrastructure in services/io/tests/)
**Target Platform**: Cross-platform Python library (Linux, macOS, Windows)
**Project Type**: Single library (extends existing service)
**Performance Goals**: Parse within 10% of current track-only parsing time (SC-005)
**Constraints**: Offline-capable, fail-fast on invalid data, no external dependencies
**Scale/Scope**: Handle REP files with thousands of annotations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| I.1 Offline by default | All parsing works without network | PASS | Local file parsing only |
| I.3 No silent failures | Fail-fast with clear error messages | PASS | FR-007 requires fail-fast |
| I.4 Reproducibility | Same input produces same output | PASS | Deterministic parsing |
| II.1 Single source of truth | Uses LinkML-derived schemas | PASS | Uses debrief-schemas from annotations.yaml |
| II.2 Schema tests mandatory | Annotations validated against Pydantic | PASS | FR-010 requires validation |
| III.1 Provenance always | Source file and line number recorded | PASS | FR-006 requires provenance |
| III.2 Source preservation | Original REP files unchanged | PASS | Parse-only, no modification |
| IV.1 Services never touch UI | Returns GeoJSON data only | PASS | No UI dependencies |
| IV.3 Services have zero MCP dependency | Pure Python library | PASS | No MCP in parser |
| VI.2 Services require unit tests | Tests required before merge | PASS | Test fixtures exist |
| VIII.1 Specs before code | This spec exists | PASS | Spec complete |
| IX.1 Minimal dependencies | Uses existing dependencies only | PASS | No new dependencies |

**Gate Status**: PASS - All constitution requirements satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/007-rep-special-comments/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
services/io/
├── src/debrief_io/
│   ├── __init__.py              # Public API (unchanged)
│   ├── parser.py                # Main entry points (unchanged)
│   ├── models.py                # ParseResult, ParseWarning (unchanged)
│   ├── exceptions.py            # ParseError (extend with annotation errors)
│   ├── symbology.py             # NEW: Color code mapping (A-Q → CSS)
│   └── handlers/
│       ├── base.py              # BaseHandler (unchanged)
│       ├── rep.py               # REP handler (modify to call annotation parser)
│       └── annotations/         # NEW: Annotation parsing module
│           ├── __init__.py      # Module exports
│           ├── parser.py        # Main annotation parser
│           ├── patterns.py      # Regex patterns for each comment type
│           ├── coordinates.py   # DMS coordinate parsing (extract from rep.py)
│           ├── timestamps.py    # Timestamp parsing (extract from rep.py)
│           └── builders.py      # Feature builders for each annotation type
├── tests/
│   ├── test_annotations/        # NEW: Annotation-specific tests
│   │   ├── test_parser.py       # Annotation parser tests
│   │   ├── test_patterns.py     # Pattern matching tests
│   │   ├── test_symbology.py    # Color mapping tests
│   │   └── test_builders.py     # Feature builder tests
│   └── fixtures/
│       ├── valid/
│       │   ├── shapes.rep       # Existing (canonical annotation test file)
│       │   └── narrative.rep    # Existing (narrative annotations)
│       └── invalid/
│           └── bad_annotations.rep  # NEW: Invalid annotation test cases
└── pyproject.toml               # Update version
```

**Structure Decision**: Extends existing single-project structure in `services/io/`. Annotation parsing is isolated in a new `handlers/annotations/` submodule to maintain separation of concerns while keeping all REP-related code together.

## Media Components

*Identify Storybook stories to bundle for blog post demos.*

None - backend/infrastructure feature (no visual components).

## Complexity Tracking

No constitution violations requiring justification.
