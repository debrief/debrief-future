# Implementation Plan: PROV Log Input Snapshot for Mutation Replay

**Branch**: `116-fix-move-tool-bearing` | **Date**: 2026-03-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/116-fix-move-tool-bearing/spec.md`

## Summary

Coordinate-mutating tools (e.g., move-shape) must store pre-operation geometry in the PROV log entry so that parameter tuning replays against the *original* position, not the current one. The TypeScript session-state layer already captures and restores `inputState` during replay, but the canonical schema (LinkML) and Python service layer (debrief-calc) are missing this field entirely. This feature closes the gap by adding `InputFeatureState` to the LinkML schema, extending the Python `LogEntry` model, and having the Python executor capture pre-tool geometry for mutation tools server-side.

## Technical Context

**Language/Version**: Python 3.11, TypeScript 5.x
**Primary Dependencies**: Pydantic v2, LinkML >= 1.7.0, `debrief-schemas` (generated models)
**Storage**: Local filesystem STAC catalogs (GeoJSON payloads)
**Testing**: pytest (Python), vitest (TypeScript)
**Target Platform**: VS Code extension + Python MCP server
**Project Type**: Multi-package monorepo (uv + pnpm workspaces)
**Performance Goals**: N/A — no hot-path changes; inputState is written once per tool execution
**Constraints**: Offline-capable, no breaking schema changes (pre-release, Article XIV)
**Scale/Scope**: Affects 1 existing tool (move-shape) and sets convention for all future mutation tools

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|------------|--------|-------|
| I.4 Reproducibility | Same inputs + tool versions → identical results | PASS | inputState enables deterministic replay by anchoring to original geometry |
| II.1 Single source of truth | LinkML master schemas define all data structures | **FAIL → FIX** | `inputState` exists only in hand-written TypeScript types; must be added to LinkML schema |
| II.2 Schema tests mandatory | Derived schemas pass adherence tests | **REQUIRES** | New golden fixture with `inputState` needed; round-trip test required |
| III.1 Provenance always | Every transformation records lineage | PASS | This feature *enhances* provenance by adding input geometry |
| III.3 Audit trail immutable | Provenance records cannot be modified | PASS | inputState is write-once at execution time |
| IV.1 Services never touch UI | Services return data only | PASS | Pure data model + service changes |
| IV.3 Zero MCP dependency | Domain logic in pure Python | PASS | inputState captured in executor.py (pure Python), not MCP wrapper |
| VI.1–4 Testing | Schema, unit, integration tests required | **REQUIRES** | Tests for Python capture, serialisation round-trip, replay correctness |
| VII Test-driven | Tests before implementation | **REQUIRES** | Write acceptance tests first |
| VIII.1 Specs before code | Written specification required | PASS | This spec exists |
| XIV Pre-release freedom | Breaking changes permitted pre-v4.0.0 | PASS | Schema addition (not breaking) under pre-release rules |
| XV Strict type safety | No `Any`/`any` in production code | **REQUIRES** | New Python model fields must have concrete types; TypeScript `geometry: unknown` is existing pattern (GeoJSON has union geometry) |

**Gate Result**: PASS with required actions (II.1 fix, II.2/VI/VII test additions, XV type audit)

## Project Structure

### Documentation (this feature)

```text
specs/116-fix-move-tool-bearing/
├── plan.md              # This file
├── research.md          # Phase 0: Gap analysis and design decisions
├── data-model.md        # Phase 1: Entity model for InputFeatureState
├── quickstart.md        # Phase 1: Developer quick-start
├── contracts/           # Phase 1: API contract changes
│   └── log-entry-schema-diff.md  # LinkML schema additions
└── media/               # Phase 2: Planning announcement
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
shared/schemas/src/linkml/
└── log-entry.yaml                  # Add InputFeatureState class + inputState field

shared/schemas/src/fixtures/valid/
└── circle-annotation-input-state-01.json  # Golden fixture with inputState

services/calc/debrief_calc/
├── models.py                       # Add InputFeatureState + inputState to LogEntry
├── provenance.py                   # Add input_state param to create_log_entry()
└── executor.py                     # Capture pre-tool geometry for mutation tools

services/calc/tests/
├── test_provenance.py              # Test inputState creation and attachment
└── tools/shape/manipulation/
    └── test_move_shape.py          # Test inputState captured for move-shape

services/session-state/src/log/
└── types.ts                        # Already has InputFeatureState (no changes needed)
```

**Structure Decision**: Changes span three existing packages (`shared/schemas`, `services/calc`, `services/session-state`). No new packages or modules required. The TypeScript side is already complete; work focuses on LinkML schema and Python service layer.

## Media Components

None - backend/infrastructure feature

## Storybook E2E Testing

None - no interactive UI components

## VS Code Webview E2E Testing

None - no extension workflow changes (TypeScript replay already works)

## Complexity Tracking

No constitution violations requiring justification. All required actions (schema, tests) are additive.
