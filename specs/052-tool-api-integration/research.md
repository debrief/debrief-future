# Research: Tool API Integration (#052)

**Date**: 2026-02-06
**Feature**: 052-tool-api-integration

## Decision 1: MCP Annotations for Selection Requirements

**Decision**: Encode selection requirements in MCP tool annotations using a `debrief:selectionRequirements` key, alongside the standard `inputSchema`.

**Rationale**: The project already uses `debrief:*` annotation keys extensively (e.g., `debrief:resultType`, `debrief:sourceFeatures`, `debrief:label` in `result_builder.py`). MCP annotations are the official extension point for custom metadata. This keeps selection requirements co-located with tool definitions and visible to any MCP client, while only Debrief-aware UIs interpret them for filtering.

**Format**:
```json
{
  "name": "range-bearing",
  "description": "Calculate range and bearing between tracks",
  "inputSchema": {
    "type": "object",
    "properties": {
      "features": { "type": "array", "items": { "type": "object" } },
      "params": { "type": "object" }
    }
  },
  "annotations": {
    "debrief:selectionRequirements": [
      { "kind": "TRACK", "min": 2 }
    ],
    "debrief:category": "analysis",
    "debrief:version": "1.0.0",
    "debrief:outputKind": "dataset/range_bearing_series"
  }
}
```

**Alternatives considered**:
- Custom REST endpoint for tool metadata: Rejected — adds a non-MCP dependency and duplicates information already available via MCP.
- Encoding requirements in inputSchema `properties`: Rejected — JSON Schema describes parameter shapes, not semantic feature requirements. The UI would need to parse schema constraints to reconstruct kind/min/max, which is fragile.
- Separate tool-registry.json file: Rejected — would fall out of sync with implementations.

## Decision 2: Python @tool Decorator → MCP Tool Entry

**Decision**: Extend the existing `@tool` decorator in `registry.py` to auto-generate MCP-compatible tool definitions. Add a `to_mcp_tool()` method on the `Tool` model.

**Rationale**: The existing `Tool.to_metadata()` method already serializes tool metadata. Adding `to_mcp_tool()` produces the MCP wire format (name, description, inputSchema, annotations) from the same source data. The `ContextType` → `SelectionRequirement[]` conversion already exists in `calcService.ts`; this moves it to the Python side where it belongs.

**Mapping**:
| Python `Tool` field | MCP tool field |
|---------------------|----------------|
| `name` | `name` |
| `description` | `description` |
| `parameters` (ToolParameter[]) | `inputSchema.properties` |
| `input_kinds` + `context_type` | `annotations.debrief:selectionRequirements` |
| `version` | `annotations.debrief:version` |
| Category (from module path) | `annotations.debrief:category` |
| `output_kind` | `annotations.debrief:outputKind` |

**ContextType → SelectionRequirement conversion**:
| ContextType | Result |
|-------------|--------|
| SINGLE | `[{ kind: input_kinds[0], min: 1, max: 1 }]` |
| MULTI | `[{ kind: k, min: 1 } for k in input_kinds]` |
| REGION | `[{ kind: "REGION", min: 1, max: 1 }]` |
| NONE | `[]` (no requirements) |

**Alternatives considered**:
- Manual MCP definition files per tool: Rejected — violates FR-024 (analysts must not maintain separate definition files).
- Generate from language-agnostic specs: Rejected — clarification confirmed definitions come from code, not specs.

## Decision 3: TypeScript Tool Definition Pattern

**Decision**: TypeScript tool implementations export a `toolDefinition` constant conforming to the MCP tool format. A `registerTools()` function collects all definitions at build time.

**Rationale**: TypeScript has no runtime decorator introspection like Python. The simplest pattern is for each tool module to export its metadata as a constant. A barrel file collects them. This mirrors how the Python registry works but uses static imports instead of decorator registration.

**Pattern**:
```typescript
// tools/track/styling/setTrackColor.ts
export const toolDefinition: MCPToolDefinition = {
  name: "set-track-color",
  description: "Set display color for track features",
  inputSchema: { ... },
  annotations: {
    "debrief:selectionRequirements": [{ kind: "TRACK", min: 1 }],
    "debrief:category": "track/styling",
    "debrief:version": "1.0.0",
    "debrief:outputKind": "mutation/track/styled"
  }
};

export function execute(features: Feature[], params: Record<string, unknown>): ToolResponse { ... }
```

**Alternatives considered**:
- TypeScript decorators (experimental): Rejected — requires experimental flag, fragile, not widely supported.
- JSON tool-definition files: Rejected — separate files fall out of sync; violates single-source-of-truth.

## Decision 4: Shared ToolMatchService Consumption of MCP Annotations

**Decision**: Adapt the existing `ToolMatchService` (in `shared/components/src/ToolMatch/`) to accept MCP tool definitions and extract `selectionRequirements` from annotations.

**Rationale**: `ToolMatchService` already takes `Tool[]` with `requirements: SelectionRequirement[]`. We need a thin adapter that maps MCP tool definitions to this format. The adapter reads `annotations["debrief:selectionRequirements"]` and passes it through. Both UIs use the same shared `ToolMatchService` — only the source of tool definitions differs (Python MCP server for VS Code, TypeScript registry for web-shell).

**Alternatives considered**:
- Rewrite ToolMatchService to work directly with MCP format: Rejected — unnecessary coupling to MCP internals. The adapter pattern keeps ToolMatchService protocol-agnostic.

## Decision 5: CalcService MCP Alignment

**Decision**: Evolve `CalcService.listTools()` to use the MCP server's `tools/list` response directly, rather than running a custom Python extraction script.

**Rationale**: The Python MCP server (`debrief_calc/mcp/server.py`) already implements `@server.list_tools()`. Currently `CalcService` bypasses this and runs a separate script. Switching to the MCP `tools/list` call means the VS Code extension sees exactly the same tool metadata that any MCP client would see. This eliminates the custom conversion layer in `fetchToolsFromMcp()`.

**Migration path**: `CalcService` starts the MCP server (already available), calls `tools/list` via MCP protocol, then passes the result through the adapter to `ToolMatchService`.

**Alternatives considered**:
- Keep the custom Python script approach: Rejected — creates a second source of truth for tool metadata; any changes to the `@tool` decorator wouldn't propagate.

## Decision 6: Web-Shell Tool Execution Architecture

**Decision**: Web-shell executes TypeScript tool implementations directly in-browser. Each tool's `execute()` function runs synchronously on the main thread (tools are computational, not I/O-bound). Results follow the same `ToolResponse` envelope format as the Python side.

**Rationale**: The web-shell is a static GitHub Pages site with no backend. All tool execution must happen client-side. The 4 initial migrated tools (styling operations) are simple enough for in-browser execution. Future Python-only tools will not be available in the web-shell.

**Execution path**:
1. Web-shell loads TypeScript tool registry (static imports)
2. User selects features, picks tool from Layers Toolbar
3. Tool's `execute()` called with features + params
4. Result wrapped in ToolResponse envelope (same structure as Python side)
5. Result layer added to map

**Alternatives considered**:
- WebAssembly/Pyodide for running Python in browser: Rejected — massive bundle size, complexity; explicitly out of scope.
- Server proxy for tool execution: Rejected — web-shell has no backend.

## Decision 7: Tool Implementation Structure

**Decision**: Follow existing project conventions for file placement:
- Python: `services/calc/debrief_calc/tools/{category}/{tool_name}.py`
- TypeScript: `apps/vscode/src/tools/{category}/{toolName}.ts` (also imported by web-shell)

**Rationale**: These paths are already established by the `/tool.implement` command (feature 050). The TypeScript tools in `apps/vscode/src/tools/` can be imported by the web-shell via workspace reference, avoiding duplication.

**Alternatives considered**:
- Put TypeScript tools in `shared/tools/` alongside specs: Rejected — `shared/tools/` is for language-agnostic specs, not implementations.
- Separate TypeScript tools package: Possible future refinement if the tool count grows, but premature for 4 tools.
