# Python API Usage Example: debrief-calc

## Installation

```bash
pip install debrief-calc
```

## Tool Discovery

```python
from debrief_calc import registry
from debrief_calc.models import ContextType
from debrief_calc.tools import track_stats, range_bearing, area_summary  # Register tools

# List all available tools
all_tools = registry.list_all()
print(f"Found {len(all_tools)} tools")
# Output: Found 3 tools

# Find tools applicable to single track selection
single_track_tools = registry.find_tools(
    context_type=ContextType.SINGLE,
    kinds={"track"}
)
print([t.name for t in single_track_tools])
# Output: ['track-stats']

# Get tool metadata
tool = registry.get_tool("track-stats")
print(f"Tool: {tool.name}")
print(f"Description: {tool.description}")
print(f"Input kinds: {tool.input_kinds}")
print(f"Output kind: {tool.output_kind}")
# Output:
# Tool: track-stats
# Description: Calculate statistics for a single track...
# Input kinds: {'track'}
# Output kind: track-statistics
```

## Tool Execution

```python
from debrief_calc import run
from debrief_calc.models import ContextType, SelectionContext

# Sample track feature
track_feature = {
    "type": "Feature",
    "id": "track-001",
    "properties": {
        "kind": "track",
        "name": "HMS Example"
    },
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-5.0, 50.0, 0, 1609459200000],
            [-4.5, 50.3, 0, 1609462800000],
            [-4.0, 50.6, 0, 1609466400000]
        ]
    }
}

# Create context
context = SelectionContext(
    type=ContextType.SINGLE,
    features=[track_feature]
)

# Execute tool
result = run("track-stats", context)

if result.success:
    feature = result.features[0]
    stats = feature["properties"]["statistics"]

    print(f"Point count: {stats['point_count']}")
    print(f"Duration: {stats['duration_hours']} hours")
    print(f"Distance: {stats['distance_nm']} nm")
    print(f"Speed: {stats['average_speed_kts']} kts")

    # Provenance is automatically attached
    prov = feature["properties"]["provenance"]
    print(f"Tool: {prov['tool']} v{prov['version']}")
else:
    print(f"Error: {result.error.message}")

# Output:
# Point count: 3
# Duration: 2.0 hours
# Distance: 38.2 nm
# Speed: 19.1 kts
# Tool: track-stats v1.0.0
```

## Creating Custom Tools

```python
from debrief_calc.registry import tool
from debrief_calc.models import ContextType, ToolParameter, SelectionContext

@tool(
    name="my-custom-tool",
    description="Example custom analysis tool",
    version="1.0.0",
    context_type=ContextType.SINGLE,
    input_kinds={"track"},
    output_kind="custom-analysis",
    parameters=[
        ToolParameter(
            name="threshold",
            type="number",
            description="Analysis threshold value",
            default=10.0
        )
    ]
)
def my_custom_tool(context: SelectionContext, params: dict) -> list[dict]:
    """Custom tool implementation."""
    threshold = params.get("threshold", 10.0)
    feature = context.features[0]

    # Perform analysis...

    return [{
        "type": "Feature",
        "properties": {
            "analysis_result": "example",
            "threshold_used": threshold
        },
        "geometry": None
    }]

# Tool is now registered and available
tool = registry.get_tool("my-custom-tool")
```

## Error Handling

```python
from debrief_calc import run
from debrief_calc.exceptions import ToolNotFoundError, InvalidContextError

try:
    result = run("nonexistent-tool", context)
except ToolNotFoundError as e:
    print(f"Tool not found: {e.tool_name}")

try:
    # Wrong context type for tool
    result = run("track-stats", wrong_context)
except InvalidContextError as e:
    print(f"Context mismatch: expected {e.expected}, got {e.actual}")
```
