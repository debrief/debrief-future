# Quickstart: Tool API Integration (#052)

**Date**: 2026-02-06

## Overview

This feature implements 4 migrated tools in both Python and TypeScript, exposes them via MCP's standard tool-list, and wires both the VS Code extension and web-shell to discover, filter, and execute tools through the Layers Toolbar.

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shared Layer                             │
│  ToolMatchService (shared/components)                           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Accepts Tool[] with SelectionRequirement[]              │    │
│  │ Returns MatchResult[] (active/inactive + explanations)  │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
   ┌───────────▼───────────┐      ┌───────────▼───────────┐
   │    VS Code Extension  │      │      Web-Shell         │
   │                       │      │                        │
   │  CalcService          │      │  TypeScript Registry   │
   │  ┌─────────────────┐  │      │  ┌──────────────────┐  │
   │  │ MCP tools/list  │──│──┐   │  │ Static imports   │  │
   │  │ MCP tools/call  │  │  │   │  │ Direct execute() │  │
   │  └─────────────────┘  │  │   │  └──────────────────┘  │
   │                       │  │   │                        │
   │  Layers Toolbar       │  │   │  Layers Toolbar        │
   │  (Run dropdown)       │  │   │  (Run dropdown)        │
   └───────────────────────┘  │   └────────────────────────┘
                              │
               ┌──────────────▼──────────────┐
               │     Python Calc Service     │
               │                             │
               │  @tool decorator            │
               │  → ToolRegistry             │
               │  → MCP Server               │
               │    (tools/list + tools/call) │
               │                             │
               │  Tool implementations:      │
               │  - set-track-color           │
               │  - apply-symbol-style        │
               │  - label-interval            │
               │  - symbol-interval           │
               │  - track-stats (existing)    │
               │  - range-bearing (existing)  │
               │  - area-summary (existing)   │
               └─────────────────────────────┘
```

## Key Integration Points

### 1. Python: @tool decorator → MCP tool entry

The existing `@tool` decorator in `services/calc/debrief_calc/registry.py` registers tools. A new `to_mcp_tool()` method on the `Tool` model converts the registration to MCP format:

```python
@tool(
    name="set-track-color",
    description="Set display colour for track features",
    input_kinds=["track"],
    output_kind="mutation/track/styled",
    context_type=ContextType.SINGLE,
    parameters=[ToolParameter(name="color", type="string", description="CSS colour", required=True)]
)
def set_track_color(context: SelectionContext, params: dict) -> list[dict]:
    ...
```

This auto-generates:
- MCP `tools/list` entry with `debrief:selectionRequirements` annotations
- MCP `tools/call` handler via the executor

### 2. TypeScript: Tool module → Registry

Each TypeScript tool exports a definition constant and an execute function:

```typescript
// apps/vscode/src/tools/track/styling/setTrackColor.ts
export const toolDefinition: MCPToolDefinition = { ... };
export function execute(features: Feature[], params: Record<string, unknown>): ToolResponse { ... }
```

A barrel file collects all definitions into a registry array.

### 3. Shared ToolMatchService adapter

A thin adapter converts MCP tool definitions to the `Tool[]` format that `ToolMatchService` expects:

```typescript
function adaptMCPTools(mcpTools: MCPToolDefinition[]): Tool[] {
  return mcpTools.map(t => ({
    id: t.name,
    name: t.name,
    description: t.description,
    version: t.annotations["debrief:version"],
    requirements: t.annotations["debrief:selectionRequirements"]
  }));
}
```

### 4. CalcService evolution

`CalcService.listTools()` switches from running a custom Python script to calling `tools/list` on the MCP server. The response is passed through the adapter to `ToolMatchService`.

### 5. Web-shell execution

Web-shell imports TypeScript tool implementations directly. No MCP transport — just function calls. The result is wrapped in the same `ToolResponse` envelope.

## File Layout

```
services/calc/debrief_calc/
├── models.py                      # Add to_mcp_tool() on Tool
├── tools/track/styling/
│   ├── set_track_color.py         # NEW - from spec
│   ├── apply_symbol_style.py      # NEW - from spec
│   ├── label_interval.py          # NEW - from spec
│   └── symbol_interval.py         # NEW - from spec
└── mcp/server.py                  # Update tools/list to use annotations

apps/vscode/src/
├── tools/track/styling/
│   ├── setTrackColor.ts           # NEW - TypeScript implementation
│   ├── applySymbolStyle.ts        # NEW
│   ├── labelInterval.ts           # NEW
│   ├── symbolInterval.ts          # NEW
│   └── index.ts                   # NEW - barrel/registry
├── services/
│   ├── calcService.ts             # MODIFY - use MCP tools/list
│   └── mcpToolAdapter.ts          # NEW - MCP → ToolMatchService
└── types/tool.ts                  # MODIFY - add MCPToolDefinition

shared/components/src/ToolMatch/
├── ToolMatchService.ts            # EXISTING - no changes needed
└── mcpAdapter.ts                  # NEW - shared MCP → Tool adapter

apps/web-shell/src/
├── services/toolService.ts        # NEW - TypeScript tool registry + execution
└── (Layers Toolbar integration)   # Via shared components
```

## Testing Strategy

1. **Python golden examples**: Each tool tested against `.input.json` / `.output.json` pairs
2. **TypeScript golden examples**: Same golden files, loaded as test fixtures
3. **Cross-language parity**: Verify Python and TypeScript produce identical output for same input
4. **ToolMatchService**: Existing shared test harness extended with MCP adapter tests
5. **CalcService integration**: Verify MCP `tools/list` returns expected annotations
6. **Web-shell E2E**: Playwright tests for tool execution via Layers Toolbar

## Implementation Order

1. Python `to_mcp_tool()` + 4 tool implementations + golden example tests
2. MCP server update to emit annotations in `tools/list`
3. Shared MCP adapter for ToolMatchService
4. CalcService evolution to use MCP `tools/list`
5. TypeScript 4 tool implementations + golden example tests
6. TypeScript tool registry barrel file
7. Web-shell tool service + Layers Toolbar wiring
8. Cross-language verification tests
