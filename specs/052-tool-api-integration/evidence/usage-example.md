# Usage Example: Tool Discovery to Execution

**Feature**: 052-tool-api-integration

## Step 1: Tool Discovery (US1)

Query the MCP `tools/list` endpoint to discover available tools:

```python
from debrief_calc import registry
import debrief_calc.tools  # imports all tools

for tool in registry.list_all():
    mcp_def = tool.to_mcp_tool()
    print(f"Tool: {mcp_def['name']}")
    print(f"  Requirements: {mcp_def['annotations']['debrief:selectionRequirements']}")
```

**Output**:
```
Tool: apply-symbol-style
  Requirements: [{'kind': 'TRACK', 'min': 1}]
Tool: label-interval
  Requirements: [{'kind': 'TRACK', 'min': 1}]
Tool: set-track-color
  Requirements: [{'kind': 'TRACK', 'min': 1}]
Tool: symbol-interval
  Requirements: [{'kind': 'TRACK', 'min': 1}]
Tool: track-stats
  Requirements: [{'kind': 'TRACK', 'min': 1, 'max': 1}]
Tool: range-bearing
  Requirements: [{'kind': 'TRACK', 'min': 1}, {'kind': 'SHAPE', 'min': 1}]
Tool: area-summary
  Requirements: [{'kind': 'REGION', 'min': 1, 'max': 1}]
```

## Step 2: Tool Filtering (US2)

The shared `ToolMatchService` filters tools based on current selection:

```typescript
import { ToolMatchService } from '@debrief/components/ToolMatch';
import { fromMCPTools } from '@debrief/components/ToolMatch/mcpAdapter';

// Adapt MCP tools for matching
const tools = fromMCPTools(mcpToolDefinitions);
const matcher = new ToolMatchService(tools);

// With 2 TRACK features selected:
const selection = { TRACK: 2 };
const active = matcher.getActiveTools(selection);
// Result: all 4 styling tools + track-stats enabled

// With 0 features selected:
const empty = {};
const none = matcher.getActiveTools(empty);
// Result: no tools enabled
```

## Step 3: Tool Execution (US3)

Execute a styling tool via the Python calc service:

```python
from debrief_calc.models import SelectionContext, ContextType
from debrief_calc.tools.track.styling.set_track_color import set_track_color
from debrief_calc.result_builder import build_mutation, build_response

# Create context with selected features
context = SelectionContext(
    type=ContextType.MULTI,
    features=[track_feature_a, track_feature_b],
)

# Execute tool
modified_features = set_track_color(context, {"color": "#FF0000"})

# Build MCP response with provenance
content_items = build_mutation(
    features=modified_features,
    result_subtype="track/styled",
    source_feature_ids=["track-001", "track-002"],
    label="Set track color to #FF0000 for 2 track(s)",
)
response = build_response(content_items)
```

**Response**:
```json
{
  "content": [
    {
      "type": "resource",
      "resource": {
        "uri": "feature://track-001",
        "mimeType": "application/geo+json",
        "text": "{...modified feature with color=#FF0000...}"
      },
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001", "track-002"],
        "debrief:label": "Set track color to #FF0000 for 2 track(s)"
      }
    },
    {
      "type": "resource",
      "resource": {
        "uri": "feature://track-002",
        "mimeType": "application/geo+json",
        "text": "{...modified feature with color=#FF0000...}"
      },
      "annotations": {
        "debrief:resultType": "mutation/track/styled",
        "debrief:sourceFeatures": ["track-001", "track-002"],
        "debrief:label": "Set track color to #FF0000 for 2 track(s)"
      }
    }
  ]
}
```

## Step 4: Web-Shell Execution (US5)

The web-shell executes the same tools directly in TypeScript:

```typescript
import { execute } from './tools/track/styling/setTrackColor';

const modified = execute(trackFeatures, { color: '#FF0000' });
// Returns same modified features as Python
```

Both Python and TypeScript produce identical output for the same inputs (verified by cross-language parity tests).
