# Implementation Plan: Move Shape Tool Spec + Implementation

**Branch**: `claude/move-shape-RoMbS` | **Date**: 2026-02-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/056-move-shape/spec.md`

## Summary

Create a language-neutral tool specification for the move-shape tool following the #049 tool documentation model, then implement it in both Python (debrief-calc service) and TypeScript (VS Code extension + web-shell). Deliverables: markdown spec, golden I/O fixtures, Python tool with tests, TypeScript tool with registration in both frontends.

## Technical Context

**Language/Version**: Python 3.11 (debrief-calc service), TypeScript 5.x (VS Code extension, web-shell)
**Primary Dependencies**: `debrief_calc` registry + `@tool` decorator (Python), `MCPToolDefinition` types (TypeScript). Standard library `math` module for trig functions — no external geo libraries.
**Storage**: N/A — pure transformation tool, no persistence (caller handles STAC writes)
**Testing**: pytest (Python golden example tests), golden I/O JSON fixture validation
**Target Platform**: VS Code extension (via Python MCP subprocess), web-shell (in-browser TypeScript), Storybook (via ToolMatchService)
**Project Type**: Service tool — Python in `services/calc/`, TypeScript in `apps/vscode/src/tools/` and `apps/web-shell/src/tools/`
**Performance Goals**: N/A — single-shot coordinate transformation, sub-millisecond per feature
**Constraints**: Must follow #049 template; great-circle math (Vincenty spherical, not planar); offline-only; standard library math only (no numpy/geopy)
**Scale/Scope**: 1 tool spec + 2 golden example pairs + 1 Python module + 1 TypeScript module + tests + frontend registration

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Relevant? | Status | Notes |
|---------|-----------|--------|-------|
| I. Defence-Grade Reliability | Yes | PASS | Offline-only, standard library math, no network |
| II. Schema Integrity | Yes | PASS | References LinkML annotation schemas; tool uses `@tool` decorator with MCP annotations |
| III. Data Sovereignty | Yes | PASS | Provenance annotations record direction + distance; ToolResponse includes sourceFeatures |
| IV. Architectural Boundaries | Yes | PASS | Python service returns data only; TypeScript tool returns features; no UI in either |
| V. Extensibility | Yes | PASS | Registered via `@tool` decorator; auto-discovered by CalcService and web-shell registry |
| VI. Testing | Yes | PASS | Python pytest tests against golden fixtures; golden I/O JSON pairs for cross-language validation |
| VII. Test-Driven AI Collaboration | Yes | PASS | Golden examples define expected output; tests written before implementation |
| VIII. Documentation | Yes | PASS | Spec written first (#049 template), then implementation |
| IX. Dependencies | Yes | PASS | Standard library `math` only — no external dependencies |
| X. Security | N/A | PASS | No secrets, no network, no file I/O |
| XI. Internationalisation | Marginal | PASS | Provenance labels in English; i18n deferred |

**Gate Result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/056-move-shape/
├── spec.md              # Feature specification (done)
├── plan.md              # This file
├── research.md          # Phase 0 output (done)
├── data-model.md        # Phase 1 output (done)
├── quickstart.md        # Phase 1 output (done)
└── tasks.md             # Task breakdown
```

### Tool Specification

```text
shared/tools/shape/manipulation/
├── move-shape.1.0.md                        # Tool specification (9 sections)
├── move-shape.basic-polygon.input.json      # Golden example: polygon translation
├── move-shape.basic-polygon.output.json     # Golden example: polygon ToolResponse
├── move-shape.vector.input.json             # Golden example: vector translation
└── move-shape.vector.output.json            # Golden example: vector ToolResponse
```

### Python Implementation

```text
services/calc/debrief_calc/tools/
├── __init__.py                              # Update: import shape module
└── shape/
    ├── __init__.py                          # Import manipulation subpackage
    └── manipulation/
        ├── __init__.py                      # Import move_shape
        └── move_shape.py                    # @tool-decorated implementation

services/calc/tests/tools/shape/
└── manipulation/
    └── test_move_shape.py                   # Golden example tests
```

### TypeScript Implementation

```text
apps/vscode/src/tools/shape/manipulation/
└── moveShape.ts                             # MCPToolDefinition + execute function

apps/web-shell/src/tools/shape/manipulation/
└── moveShape.ts                             # Same implementation for web-shell

apps/web-shell/src/services/
└── toolService.ts                           # Update: register move-shape
```

**Structure Decision**: Mirrors the existing `track/styling/` pattern for both Python and TypeScript. New `shape/manipulation/` hierarchy in both languages. Web-shell gets its own TypeScript copy (no Python subprocess available in browser).

## Media Components

None — backend service tool. No visual components, no Storybook stories.

## Storybook E2E Testing

None — no interactive UI components. The tool appears in the VS Code tools sidebar and web-shell Run dropdown automatically via ToolMatchService, but these are existing UI components that don't need new stories.

## Complexity Tracking

No violations to justify — all constitution gates pass cleanly.
