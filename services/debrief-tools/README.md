# debrief-tools

Tool specification decorator for linking Python implementations to their language-neutral specifications.

## Installation

```bash
uv pip install -e services/debrief-tools
```

## Usage

```python
from debrief_tools import tool_spec

@tool_spec("track/styling/set-track-color.1.0")
def set_track_color(features, color):
    """Set track color implementation."""
    # Implementation here
    pass
```

## Features

- **Spec Path Validation**: Validates that the referenced specification file exists at decoration time
- **Introspection**: Decorated functions expose `__tool_spec__` attribute with the spec path
- **Fail-Fast**: Import-time validation catches missing specs early

## Decorator API

### `@tool_spec(spec_path, *, validate=True)`

- `spec_path`: Relative path to spec file from `shared/tools/` (e.g., `"track/styling/set-track-color.1.0"`)
- `validate`: Whether to validate spec existence (default: `True`)

### Introspection

```python
@tool_spec("track/styling/set-track-color.1.0")
def my_function():
    pass

# Access spec path
print(my_function.__tool_spec__)  # "track/styling/set-track-color.1.0"
```

## Testing

```bash
cd services/debrief-tools
pytest
```
