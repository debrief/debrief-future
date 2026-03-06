# Implementation Plan: Move Track Tool

**Branch**: `079-move-track` | **Date**: 2026-03-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/079-move-track/spec.md`

## Summary

Implement a move-track tool that offsets track features by compass bearing and distance using the Vincenty destination formula. The tool accepts `direction` (degrees) and `range_nm` (nautical miles), translates all coordinates in LineString/MultiLineString geometries, and returns mutated features with provenance. This is step 2 of the E03 Buffer Zone Analysis Demo cascade. Python and TypeScript implementations follow the established `@tool` decorator and `toolDefinition` patterns respectively.

## Technical Context

**Language/Version**: Python 3.11 (service), TypeScript 5.x (VS Code + web-shell frontends)
**Primary Dependencies**: debrief-calc (Python tool framework), VS Code Extension API (TypeScript)
**Storage**: N/A — tool is stateless; PROV system handles persistence via STAC
**Testing**: pytest (Python), vitest (TypeScript)
**Target Platform**: Cross-platform (offline-capable)
**Project Type**: Multi-workspace (services + apps)
**Performance Goals**: < 1 second for tracks up to 1,000 positions
**Constraints**: Offline-capable, deterministic output, great-circle accuracy
**Scale/Scope**: Single tool with Python + TypeScript dual implementation + tool spec

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status |
|---------|------|--------|
| I.1 Offline by default | Tool uses local math only, no network | PASS |
| I.4 Reproducibility | Vincenty formula is deterministic | PASS |
| II.1 Single source of truth | Tool spec in `shared/tools/` is the source; Python/TS implement it | PASS |
| III.1 Provenance always | Executor auto-attaches LogEntry with parameters and input_state | PASS |
| IV.1 Services never touch UI | Tool returns data only; map drag is frontend concern | PASS |
| IV.3 Zero MCP dependency | Tool logic is pure Python; MCP wrapper is separate layer | PASS |
| VI.2 Services require unit tests | Tests planned for both Python and TypeScript | PASS |
| VII.1 Tests before implementation | Golden examples define expected behaviour | PASS |
| VIII.1 Specs before code | Tool spec (move-track.1.0.md) written first | PASS |
| XIII.1 Atomic commits | One logical change per commit | PASS |
| XV.1 Explicit types everywhere | Full type annotations in both languages | PASS |
| XV.2 Any prohibited | No Any/any in production code | PASS |

**Post-design re-check**: All gates still pass. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/079-move-track/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity and algorithm design
├── quickstart.md        # Usage examples
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md
    └── linkedin-planning.md
```

### Source Code (repository root)

```text
# Python tool implementation
services/calc/debrief_calc/tools/track/manipulation/
├── __init__.py          # UPDATE: add move_track import
└── move_track.py        # NEW: @tool handler + translate_point

services/calc/tests/tools/track/manipulation/
└── test_move_track.py   # NEW: unit tests

# TypeScript tool implementation (VS Code)
apps/vscode/src/tools/track/manipulation/
└── moveTrack.ts         # NEW: toolDefinition + execute

# TypeScript tool implementation (web-shell)
apps/web-shell/src/tools/track/manipulation/
└── moveTrack.ts         # NEW: toolDefinition + execute

# Tool specification (language-neutral)
shared/tools/track/manipulation/
├── move-track.1.0.md              # NEW: 9-section tool spec
├── move-track.basic.input.json    # NEW: golden example input
└── move-track.basic.output.json   # NEW: golden example output
```

**Structure Decision**: Follows established dual-implementation pattern. Python in `services/calc/`, TypeScript mirrored in both `apps/vscode/` and `apps/web-shell/`. Tool spec in `shared/tools/` is the language-neutral source of truth.

## Media Components

None — backend/infrastructure feature. The move-track tool has no visual components. Map drag interaction is a frontend concern handled by #084 (E03 end-to-end wiring).

## Storybook E2E Testing

None — no interactive UI components.

## VS Code Webview E2E Testing

None — no extension workflow changes. The tool is invoked via existing tool execution infrastructure; no new UI panels or webview changes.

## Complexity Tracking

No violations to justify. All constitution gates pass.
