# Contract: Tool List (MCP tools/list)

**Protocol**: MCP (Model Context Protocol)
**Direction**: Server → Client
**Used by**: VS Code extension (via Python MCP server), Web-shell (via TypeScript registry)

## Request

MCP `tools/list` — no parameters.

## Response

```json
{
  "tools": [
    {
      "name": "set-track-color",
      "description": "Set the display colour for one or more track features",
      "inputSchema": {
        "type": "object",
        "properties": {
          "features": {
            "type": "array",
            "description": "GeoJSON features to process",
            "items": { "type": "object" }
          },
          "params": {
            "type": "object",
            "properties": {
              "color": {
                "type": "string",
                "description": "CSS colour value (e.g., '#FF0000', 'red')"
              }
            },
            "required": ["color"]
          }
        },
        "required": ["features", "params"]
      },
      "annotations": {
        "debrief:selectionRequirements": [
          { "kind": "TRACK", "min": 1 }
        ],
        "debrief:category": "track/styling",
        "debrief:version": "1.0.0",
        "debrief:outputKind": "mutation/track/styled"
      }
    },
    {
      "name": "range-bearing",
      "description": "Calculate range and bearing between two or more tracks",
      "inputSchema": {
        "type": "object",
        "properties": {
          "features": {
            "type": "array",
            "items": { "type": "object" },
            "minItems": 2
          },
          "params": { "type": "object" }
        },
        "required": ["features"]
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
  ]
}
```

## Adapter: MCP Tool → ToolMatchService Input

The shared `ToolMatchService` accepts `Tool[]` with `requirements: SelectionRequirement[]`. A thin adapter extracts the Debrief annotations:

```
Input:  MCPToolDefinition (from tools/list response)
Output: Tool (for ToolMatchService)

Mapping:
  tool.id          = mcpTool.name
  tool.name        = mcpTool.name
  tool.description = mcpTool.description
  tool.version     = mcpTool.annotations["debrief:version"]
  tool.requirements = mcpTool.annotations["debrief:selectionRequirements"]
```

## Error Cases

| Condition | Behaviour |
|-----------|-----------|
| MCP server unreachable | Client returns empty tool list; UI shows "Tools unavailable" |
| MCP server returns malformed response | Client logs warning, returns empty list |
| Tool missing annotations | Tool included in list but with empty requirements (always active) |
