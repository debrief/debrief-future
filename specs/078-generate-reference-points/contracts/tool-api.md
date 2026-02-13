# API Contract: Generate Reference Points

**Feature**: 078-generate-reference-points
**Date**: 2026-02-13

## MCP Tool Definition

```json
{
  "name": "generate-reference-points",
  "description": "Generates a grid or scatter pattern of reference points within a bounding box.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "pattern": {
        "type": "string",
        "enum": ["grid", "scatter"],
        "description": "Generation pattern: 'grid' for evenly spaced rows/columns, 'scatter' for random distribution"
      },
      "bounds": {
        "type": "array",
        "items": { "type": "number" },
        "minItems": 4,
        "maxItems": 4,
        "description": "Bounding box [west, south, east, north] in WGS84 decimal degrees"
      },
      "rows": {
        "type": "integer",
        "minimum": 1,
        "description": "Number of rows (grid pattern only)"
      },
      "cols": {
        "type": "integer",
        "minimum": 1,
        "description": "Number of columns (grid pattern only)"
      },
      "count": {
        "type": "integer",
        "minimum": 1,
        "description": "Number of points to generate (scatter pattern only)"
      },
      "seed": {
        "type": "integer",
        "description": "Random seed for reproducible scatter generation (scatter pattern only)"
      }
    },
    "required": ["pattern", "bounds"]
  },
  "annotations": {
    "debrief:selectionRequirements": [],
    "debrief:category": "reference/generation",
    "debrief:version": "1.0.0",
    "debrief:outputKind": "addition/reference/generated_points"
  }
}
```

## Python API

### Registration

```python
@tool(
    name="generate-reference-points",
    description="Generates a grid or scatter pattern of reference points within a bounding box.",
    input_kinds=[],
    output_kind="reference/generated_points",
    context_type=ContextType.NONE,
    parameters=[
        ToolParameter(name="pattern", type="enum", description="Generation pattern", choices=["grid", "scatter"], required=True),
        ToolParameter(name="bounds", type="array", description="Bounding box [west, south, east, north]", required=True),
        ToolParameter(name="rows", type="number", description="Number of rows (grid only)", default=5),
        ToolParameter(name="cols", type="number", description="Number of columns (grid only)", default=5),
        ToolParameter(name="count", type="number", description="Number of points (scatter only)", default=25),
        ToolParameter(name="seed", type="number", description="Random seed (scatter only)"),
    ],
)
def generate_reference_points(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    ...
```

### Return Value

Returns `list[dict]` — a list of GeoJSON Point Feature dicts. The executor wraps these in a ToolResponse with `addition/reference/generated_points` result type.

### Error Responses

| Condition | Error Category | Message |
|-----------|---------------|---------|
| Missing pattern | `invalid_input` | "Parameter 'pattern' is required" |
| Invalid pattern value | `invalid_input` | "Pattern must be 'grid' or 'scatter'" |
| Missing bounds | `invalid_input` | "Parameter 'bounds' is required" |
| Bounds not 4-element array | `invalid_input` | "Bounds must be [west, south, east, north]" |
| south >= north | `invalid_input` | "South ({s}) must be less than north ({n})" |
| Zero-area bounds | `invalid_input` | "Bounding box must have positive area" |
| Grid: missing rows/cols | `invalid_input` | "Grid pattern requires 'rows' and 'cols' parameters" |
| Grid: rows/cols < 1 | `invalid_input` | "Grid dimensions must be positive integers" |
| Scatter: missing count | `invalid_input` | "Scatter pattern requires 'count' parameter" |
| Scatter: count < 1 | `invalid_input` | "Count must be a positive integer" |

## TypeScript API

### Tool Definition

```typescript
export const toolDefinition: MCPToolDefinition = {
  name: 'generate-reference-points',
  description: 'Generates a grid or scatter pattern of reference points within a bounding box.',
  inputSchema: { /* same as MCP schema above */ },
  annotations: {
    'debrief:selectionRequirements': [],
    'debrief:category': 'reference/generation',
    'debrief:version': '1.0.0',
    'debrief:outputKind': 'addition/reference/generated_points',
  },
};
```

### Execute Function

```typescript
export interface GenerateReferencePointsParams {
  pattern: 'grid' | 'scatter';
  bounds: [number, number, number, number];
  rows?: number;
  cols?: number;
  count?: number;
  seed?: number;
}

export function execute(
  features: GeoJSONFeature[],  // ignored — ContextType.NONE
  params: GenerateReferencePointsParams
): GeoJSONFeature[];
```

Returns an array of GeoJSON Point Features. The caller (toolService or calcService) wraps them in an MCPToolResponse envelope.
