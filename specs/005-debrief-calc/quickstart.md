# Quickstart: debrief-calc

Get started with context-sensitive analysis tools in 5 minutes.

## Installation

```bash
# Install debrief-calc (Python library)
pip install debrief-calc

# Install debrief-cli (command-line interface)
pip install debrief-cli
```

## CLI Usage

### List Available Tools

```bash
# See all tools
debrief-cli tools list

# See tools for a specific file
debrief-cli tools list --input track.geojson
```

### Run a Tool

```bash
# Analyze a track file
debrief-cli tools run track-stats --input track.geojson > result.geojson

# Compare two tracks from STAC catalog
debrief-cli tools run range-bearing \
  --store my-catalog \
  --item track-001 \
  --item track-002 > bearing.geojson
```

### Validate GeoJSON

```bash
debrief-cli validate track.geojson
```

## Python Usage

### Discover Tools

```python
from debrief_calc import registry
from debrief_calc.models import SelectionContext, ContextType

# Create a selection context
context = SelectionContext(
    type=ContextType.SINGLE,
    features=[my_track_feature]
)

# Find applicable tools
tools = registry.find_tools(context, kinds=["track"])

for tool in tools:
    print(f"{tool.name}: {tool.description}")
```

### Execute a Tool

```python
from debrief_calc import executor

# Run the tool
result = executor.run(
    tool_name="track-stats",
    features=[track_feature]
)

if result.success:
    output = result.features[0]
    print(f"Statistics: {output['properties']['statistics']}")
else:
    print(f"Error: {result.error.message}")
```

### Register a Custom Tool

```python
from debrief_calc import registry
from debrief_calc.models import ContextType, ToolResult

@registry.tool(
    name="my-tool",
    description="Custom analysis",
    input_kinds=["track"],
    output_kind="custom-result",
    context_type=ContextType.SINGLE
)
def my_tool(features, params):
    track = features[0]
    # ... your analysis logic ...
    return ToolResult(
        tool="my-tool",
        success=True,
        features=[result_feature],
        duration_ms=100
    )
```

## MCP Usage

Start the MCP server:

```bash
python -m debrief_calc.mcp
```

Connect from your MCP client and call:

```json
// List tools
{"method": "tools/call", "params": {"name": "list_tools"}}

// Run a tool
{"method": "tools/call", "params": {
  "name": "run_tool",
  "arguments": {
    "tool": "track-stats",
    "features": [...]
  }
}}
```

## What's Next?

- See [Python API](contracts/python-api.md) for full API reference
- See [MCP Tools](contracts/mcp-tools.md) for remote integration
- See [CLI Commands](contracts/cli-commands.md) for all CLI options

## Built-in Tools

| Tool | Input | Output | Description |
|------|-------|--------|-------------|
| `track-stats` | 1 track | analysis-result | Calculate track statistics |
| `range-bearing` | 2 tracks | bearing | Compute range/bearing between tracks |
| `area-summary` | 1 zone | analysis-result | Summarize features in region |
