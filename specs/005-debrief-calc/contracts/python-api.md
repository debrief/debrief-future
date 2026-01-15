# Python API Contract: debrief-calc

**Version**: 1.0.0
**Date**: 2026-01-15

## Public API

### Registry Module

```python
from debrief_calc import registry

# Decorator for registering tools
@registry.tool(
    name: str,
    description: str,
    input_kinds: list[str],
    output_kind: str,
    context_type: ContextType,
    parameters: list[ToolParameter] = None
)
def tool_handler(features: list[Feature], params: dict) -> ToolResult:
    ...

# Query tools
registry.find_tools(
    context: SelectionContext,
    kinds: list[str] = None
) -> list[Tool]

# Get specific tool
registry.get_tool(name: str) -> Tool
# Raises: ToolNotFoundError

# List all tools
registry.list_all() -> list[Tool]
```

### Executor Module

```python
from debrief_calc import executor

# Run a tool by name
executor.run(
    tool_name: str,
    features: list[Feature],
    params: dict = None
) -> ToolResult
# Raises: ToolNotFoundError, InvalidContextError, KindMismatchError, ExecutionError

# Run a tool directly
executor.run_tool(
    tool: Tool,
    context: SelectionContext,
    params: dict = None
) -> ToolResult
# Raises: InvalidContextError, KindMismatchError, ExecutionError
```

### Models Module

```python
from debrief_calc.models import (
    Tool,
    ToolParameter,
    ToolResult,
    ToolError,
    SelectionContext,
    ContextType,
    Provenance,
    SourceRef,
)

# Enums
class ContextType(str, Enum):
    SINGLE = "single"
    MULTI = "multi"
    REGION = "region"
    NONE = "none"
```

### Exceptions Module

```python
from debrief_calc.exceptions import (
    DebriefCalcError,      # Base exception
    ToolNotFoundError,     # Tool name not in registry
    InvalidContextError,   # Selection doesn't match tool requirement
    KindMismatchError,     # Feature kind not accepted
    ValidationError,       # Schema validation failed
    ExecutionError,        # Tool handler raised exception
)
```

### Validation Module

```python
from debrief_calc import validation

# Validate GeoJSON against schema
validation.validate_geojson(data: dict) -> bool
# Raises: ValidationError

# Validate tool output
validation.validate_output(result: ToolResult, tool: Tool) -> bool
# Raises: ValidationError
```

---

## Usage Examples

### Discovering Tools

```python
from debrief_calc import registry
from debrief_calc.models import SelectionContext, ContextType

# Find tools for a single track selection
context = SelectionContext(
    type=ContextType.SINGLE,
    features=[track_feature]
)
tools = registry.find_tools(context, kinds=["track"])

for tool in tools:
    print(f"{tool.name}: {tool.description}")
```

### Executing a Tool

```python
from debrief_calc import executor

result = executor.run(
    tool_name="track-stats",
    features=[track_feature],
    params={}
)

if result.success:
    for feature in result.features:
        print(f"Output kind: {feature['properties']['kind']}")
        print(f"Provenance: {feature['properties']['provenance']}")
else:
    print(f"Error: {result.error.message}")
```

### Registering a Custom Tool

```python
from debrief_calc import registry
from debrief_calc.models import ToolResult, Provenance, ContextType

@registry.tool(
    name="custom-analysis",
    description="Custom analysis for organization-specific needs",
    input_kinds=["track"],
    output_kind="custom-result",
    context_type=ContextType.SINGLE
)
def custom_analysis(features, params):
    track = features[0]

    # Perform analysis...
    result_geometry = {...}

    return ToolResult(
        tool="custom-analysis",
        success=True,
        features=[{
            "type": "Feature",
            "properties": {
                "kind": "custom-result",
                "provenance": Provenance(
                    tool="custom-analysis",
                    version="1.0.0",
                    sources=[{"id": track["id"], "kind": "track"}]
                ).model_dump()
            },
            "geometry": result_geometry
        }],
        duration_ms=150
    )
```

---

## Error Handling

```python
from debrief_calc import executor
from debrief_calc.exceptions import (
    ToolNotFoundError,
    InvalidContextError,
    KindMismatchError,
)

try:
    result = executor.run("track-stats", features, params)
except ToolNotFoundError as e:
    print(f"Tool not found: {e}")
except InvalidContextError as e:
    print(f"Wrong selection: {e}")
except KindMismatchError as e:
    print(f"Feature kind not supported: {e}")
```
