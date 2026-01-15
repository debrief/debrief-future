# MCP Tools Contract: debrief-calc

**Version**: 1.0.0
**Date**: 2026-01-15
**Protocol**: Model Context Protocol (MCP)

## Overview

The debrief-calc MCP server exposes analysis tools via MCP, enabling remote tool discovery and execution from VS Code extension, Electron loader, and other MCP clients.

---

## Tools

### list_tools

List available analysis tools, optionally filtered by selection context.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "context_type": {
      "type": "string",
      "enum": ["single", "multi", "region", "none"],
      "description": "Filter by selection context type"
    },
    "kinds": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Filter by accepted feature kinds"
    }
  }
}
```

**Output**:
```json
{
  "tools": [
    {
      "name": "track-stats",
      "description": "Calculate statistics for a single track",
      "input_kinds": ["track"],
      "output_kind": "analysis-result",
      "context_type": "single",
      "parameters": []
    }
  ]
}
```

---

### describe_tool

Get detailed metadata for a specific tool.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "Tool name"
    }
  },
  "required": ["name"]
}
```

**Output**:
```json
{
  "name": "track-stats",
  "description": "Calculate statistics for a single track",
  "version": "1.0.0",
  "input_kinds": ["track"],
  "output_kind": "analysis-result",
  "context_type": "single",
  "parameters": [
    {
      "name": "include_segments",
      "type": "boolean",
      "description": "Include per-segment statistics",
      "required": false,
      "default": false
    }
  ]
}
```

**Errors**:
- Tool not found → `{"error": {"code": "TOOL_NOT_FOUND", "message": "..."}}`

---

### run_tool

Execute an analysis tool on provided features.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "tool": {
      "type": "string",
      "description": "Tool name to execute"
    },
    "features": {
      "type": "array",
      "items": {
        "type": "object",
        "description": "GeoJSON Feature"
      },
      "description": "Input features"
    },
    "parameters": {
      "type": "object",
      "description": "Tool-specific parameters"
    }
  },
  "required": ["tool", "features"]
}
```

**Output (success)**:
```json
{
  "success": true,
  "features": [
    {
      "type": "Feature",
      "id": "result-001",
      "properties": {
        "kind": "analysis-result",
        "provenance": {
          "tool": "track-stats",
          "version": "1.0.0",
          "timestamp": "2026-01-15T10:30:00Z",
          "sources": [{"id": "track-001", "kind": "track"}],
          "parameters": {}
        },
        "statistics": {
          "point_count": 1247,
          "duration_hours": 24.5,
          "distance_nm": 142.3
        }
      },
      "geometry": {"type": "Point", "coordinates": [0, 0]}
    }
  ],
  "duration_ms": 150
}
```

**Output (error)**:
```json
{
  "success": false,
  "error": {
    "code": "KIND_MISMATCH",
    "message": "Tool 'track-stats' requires features of kind 'track', got 'zone'",
    "details": {
      "expected_kinds": ["track"],
      "received_kind": "zone"
    }
  },
  "duration_ms": 5
}
```

---

## Error Codes

| Code | HTTP Equivalent | Description |
|------|-----------------|-------------|
| `TOOL_NOT_FOUND` | 404 | Tool name not in registry |
| `INVALID_CONTEXT` | 400 | Selection doesn't match tool requirement |
| `KIND_MISMATCH` | 400 | Feature kind not accepted by tool |
| `VALIDATION_FAILED` | 400 | Input/output failed schema validation |
| `EXECUTION_ERROR` | 500 | Tool handler raised exception |

---

## Server Configuration

```python
# mcp/server.py
from mcp import Server
from debrief_calc import registry, executor

server = Server("debrief-calc")

@server.tool("list_tools")
async def list_tools(context_type: str = None, kinds: list[str] = None):
    ...

@server.tool("describe_tool")
async def describe_tool(name: str):
    ...

@server.tool("run_tool")
async def run_tool(tool: str, features: list, parameters: dict = None):
    ...
```

---

## Client Usage Example

```typescript
// VS Code Extension
const client = new MCPClient("debrief-calc");

// List tools for current selection
const tools = await client.call("list_tools", {
  context_type: "single",
  kinds: ["track"]
});

// Run selected tool
const result = await client.call("run_tool", {
  tool: "track-stats",
  features: selectedFeatures,
  parameters: {}
});

if (result.success) {
  // Display result features on map
  displayFeatures(result.features);
} else {
  // Show error to user
  showError(result.error.message);
}
```
