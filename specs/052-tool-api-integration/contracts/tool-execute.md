# Contract: Tool Execution (MCP tools/call)

**Protocol**: MCP (Model Context Protocol)
**Direction**: Client → Server → Client
**Used by**: VS Code extension (via Python MCP server), Web-shell (direct TypeScript call)

## Request

MCP `tools/call`:

```json
{
  "name": "set-track-color",
  "arguments": {
    "features": [
      {
        "type": "Feature",
        "id": "track-001",
        "geometry": { "type": "LineString", "coordinates": [[0,0],[1,1]] },
        "properties": { "kind": "TRACK", "name": "HMS Example" }
      }
    ],
    "params": {
      "color": "#FF0000"
    }
  }
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Tool name from tool-list |
| arguments.features | GeoJSON Feature[] | Yes | Input features matching selection requirements |
| arguments.params | object | No | Tool-specific parameters (matches inputSchema) |

## Success Response

```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "debrief://result/set-track-color/track-001",
        "mimeType": "application/geo+json",
        "text": "{\"type\":\"Feature\",\"id\":\"track-001\",\"geometry\":{...},\"properties\":{\"kind\":\"TRACK\",\"color\":\"#FF0000\"}}"
      },
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001"],
        "debrief:label": "Set track colour to #FF0000"
      }
    }
  ],
  "duration_ms": 12.5
}
```

## Error Response

```json
{
  "error": {
    "code": -32000,
    "message": "Invalid colour value: 'not-a-colour'",
    "data": {
      "debrief:errorCategory": "invalid_input",
      "debrief:affectedFeatures": ["track-001"]
    }
  },
  "duration_ms": 2.1
}
```

## Result Types

The `debrief:resultType` annotation determines how the UI handles the result:

| Top-Level Type | UI Behaviour |
|----------------|-------------|
| `mutation/*` | Updates existing features in-place on the map |
| `addition/*` | Adds new features as a result layer |
| `deletion/*` | Removes features from the map |
| `artifact/*` | Creates a downloadable file (chart, report, etc.) |

## Provenance Attachment

The executing environment (Python executor or TypeScript wrapper) attaches provenance to each result feature:

```json
{
  "properties": {
    "provenance": {
      "tool": "set-track-color",
      "version": "1.0.0",
      "timestamp": "2026-02-06T14:30:00Z",
      "sources": [
        { "id": "track-001", "kind": "TRACK" }
      ],
      "parameters": { "color": "#FF0000" }
    }
  }
}
```

## Error Categories

| Category | Description | User-Facing Message Style |
|----------|-------------|---------------------------|
| `invalid_input` | Features don't meet tool requirements | "This tool requires [X]. Please check your selection." |
| `algorithm_failure` | Tool logic encountered an error | "The tool encountered an error processing your data." |
| `resource_not_found` | Referenced data not available | "Required data could not be found." |
| `timeout` | Execution exceeded time limit | "The operation took too long. Try with fewer features." |

## Web-Shell Variant

The web-shell does not use MCP protocol. Instead, it calls the TypeScript tool's `execute()` function directly and wraps the result in the same `ToolResponse` envelope:

```
// Direct call (no MCP transport)
const result = tool.execute(features, params);
// result has same shape as MCP tools/call response
```

This ensures the Layers Toolbar and result display code work identically regardless of execution path.
