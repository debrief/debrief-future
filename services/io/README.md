# debrief-io

File parsing service for Debrief v4.x. Provides pure Python transformations from legacy file formats to validated GeoJSON features conforming to Stage 0 schemas.

## Features

- **REP Format Parsing**: Parse Debrief's legacy REP (Replay) format files
- **GeoJSON Output**: All features validated against Stage 0 Pydantic models
- **Extensible**: Handler registry pattern for adding new file formats
- **Error Context**: Line numbers in all parse errors and warnings

## Installation

```bash
# In workspace root
uv sync
```

## Usage

```python
from debrief_io import parse

# Parse a REP file
result = parse("/path/to/track.rep")

# Access features
for feature in result.features:
    print(f"Track: {feature['properties']['platform_id']}")

# Check warnings
for warning in result.warnings:
    print(f"Warning at line {warning.line_number}: {warning.message}")
```

## Supported Formats

| Format | Extension | Handler |
|--------|-----------|---------|
| REP | `.rep` | REPHandler |

## Development

```bash
# Run tests
uv run pytest services/io/tests/ -v

# Run with coverage
uv run pytest services/io/tests/ --cov=debrief_io --cov-report=term-missing
```

## License

MIT
