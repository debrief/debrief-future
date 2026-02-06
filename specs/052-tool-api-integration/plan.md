# Implementation Plan: Tool API Integration

**Branch**: `052-tool-api-integration` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/052-tool-api-integration/spec.md`

## Summary

Implement 4 migrated tools (set-track-color, apply-symbol-style, label-interval, symbol-interval) in both Python and TypeScript, expose them via MCP's `tools/list` with Debrief-specific annotations for selection requirements, and wire both the VS Code extension and web-shell application to discover, filter, and execute tools through the Layers Toolbar's Run dropdown. The common contract is the MCP tool definition format — each language generates its own tool-list independently but in the same shape, enabling identical UI logic in both apps.

## Technical Context

**Language/Version**: Python 3.11 (calc service), TypeScript 5.x (VS Code extension, web-shell, shared components)
**Primary Dependencies**: Pydantic v2 (Python models), MCP SDK (Python server), VS Code Extension API ^1.85.0, React 18 (shared components), Leaflet 1.9.x (map rendering)
**Storage**: Local filesystem STAC catalogs (for persisted results via existing stacService)
**Testing**: pytest (Python), vitest/jest (TypeScript), Playwright (E2E), golden example JSON fixtures
**Target Platform**: VS Code desktop (Windows/macOS/Linux), static web (GitHub Pages for web-shell)
**Project Type**: Multi-workspace (services/calc + apps/vscode + apps/web-shell + shared/components)
**Performance Goals**: Tool execution < 5 seconds for datasets under 1000 features; tool-list fetch < 1 second
**Constraints**: Offline-capable (no cloud dependencies), static hosting for web-shell (no backend)
**Scale/Scope**: 4 initial tools, ~8 new Python files, ~8 new TypeScript files, ~4 modified existing files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Gate | Status | Evidence |
|---------|------|--------|----------|
| I. Defence-Grade Reliability | Offline by default | PASS | All tools execute locally. Python runs via subprocess, TypeScript runs in-browser. No cloud dependencies. |
| I.4 | Reproducibility | PASS | Golden examples verify identical results across languages (1e-9 tolerance). |
| II. Schema Integrity | Single source of truth | PASS | Tool definitions auto-generated from code annotations — no hand-written duplicates. |
| III.1 | Provenance always | PASS | Every ToolResponse includes provenance metadata (tool, version, sources, timestamp). FR-020/021/022. |
| III.2 | Source preservation | PASS | Tools produce result layers; source features are never modified. |
| IV.1 | Services never touch UI | PASS | Python calc service returns data only (MCP content items). All display decisions in frontends. |
| IV.2 | Frontends never persist | PASS | Results persisted via stacService (a service), not directly by frontends. |
| IV.3 | Services have zero MCP dependency | PASS | Domain logic in pure Python (executor, tools). MCP server is a thin wrapper. |
| V.1 | Fail-safe loading | PASS | A broken tool cannot crash the service — executor catches all exceptions. UI shows error state. |
| VI.2 | Services require unit tests | PASS | Each tool has golden example tests. Cross-language parity verified. |
| VIII.1 | Specs before code | PASS | 4 tool specs exist in shared/tools/ before implementation. |
| IX.1 | Minimal dependencies | PASS | Uses existing MCP SDK (already in project). No new external dependencies. |
| XI.1 | I18N from the start | PASS | Tool descriptions and error messages are externalisable strings. |

**Post-Phase 1 Re-check**: All gates remain PASS. No new dependencies introduced; architecture follows existing patterns.

## Project Structure

### Documentation (this feature)

```text
specs/052-tool-api-integration/
├── plan.md              # This file
├── research.md          # Phase 0: technical decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: architecture overview
├── contracts/
│   ├── tool-list.md     # MCP tools/list contract
│   └── tool-execute.md  # MCP tools/call contract
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── media/
│   ├── planning-post.md
│   └── linkedin-planning.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
services/calc/debrief_calc/
├── models.py                          # MODIFY: add to_mcp_tool() method
├── mcp/server.py                      # MODIFY: emit annotations in tools/list
├── tools/track/styling/
│   ├── __init__.py                    # NEW: package init
│   ├── set_track_color.py            # NEW: from spec
│   ├── apply_symbol_style.py         # NEW: from spec
│   ├── label_interval.py             # NEW: from spec
│   └── symbol_interval.py            # NEW: from spec
└── tests/tools/track/styling/
    ├── test_set_track_color.py        # NEW: golden example tests
    ├── test_apply_symbol_style.py     # NEW
    ├── test_label_interval.py         # NEW
    └── test_symbol_interval.py        # NEW

apps/vscode/src/
├── tools/track/styling/
│   ├── setTrackColor.ts               # NEW: TypeScript implementation
│   ├── applySymbolStyle.ts            # NEW
│   ├── labelInterval.ts              # NEW
│   ├── symbolInterval.ts             # NEW
│   └── index.ts                       # NEW: barrel/registry
├── services/
│   ├── calcService.ts                 # MODIFY: use MCP tools/list
│   └── mcpToolAdapter.ts             # NEW: MCP → ToolMatchService adapter
└── types/tool.ts                      # MODIFY: add MCPToolDefinition type

shared/components/src/ToolMatch/
└── mcpAdapter.ts                      # NEW: shared MCP → Tool adapter

apps/web-shell/src/
└── services/toolService.ts            # NEW: TypeScript tool registry + execution
```

**Structure Decision**: Multi-workspace layout following existing project conventions. Python tools in `services/calc/`, TypeScript tools in `apps/vscode/src/tools/` (importable by web-shell via workspace reference), shared matching logic in `shared/components/`.

## Media Components

None — this feature is primarily backend/service infrastructure with integration wiring. The Layers Toolbar UI already exists (feature 045). No new visual components are being created.

## Storybook E2E Testing

None — no interactive UI components created by this feature. The Layers Toolbar and ToolMatch harness already have their own Storybook stories and tests.

## Complexity Tracking

No constitution violations to justify.
