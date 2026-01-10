# Quickstart: debrief-io

**Package**: `debrief_io`
**Purpose**: Parse legacy file formats into validated GeoJSON features

## Installation

```bash
# From workspace root
uv sync

# Or install just this package
uv pip install -e services/io
```

## Basic Usage

### Parse a REP File

```python
from debrief_io import parse

# Parse a REP file
result = parse("/path/to/exercise.rep")

# Check results
print(f"Parsed {len(result.features)} features")
print(f"Encoding: {result.encoding}")
print(f"Parse time: {result.parse_time_ms:.1f}ms")

# Access features
for feature in result.features:
    print(f"- {feature.id}: {feature.properties}")
```

### Handle Warnings

```python
from debrief_io import parse

result = parse("/path/to/legacy_file.rep")

# Parsing succeeded, but check for issues
if result.warnings:
    print(f"Parsed with {len(result.warnings)} warnings:")
    for warning in result.warnings:
        if warning.line_number:
            print(f"  Line {warning.line_number}: {warning.message}")
        else:
            print(f"  {warning.message}")
```

### Handle Errors

```python
from debrief_io import parse
from debrief_io.exceptions import UnsupportedFormatError, ParseError

try:
    result = parse("/path/to/file.unknown")
except FileNotFoundError:
    print("File not found")
except UnsupportedFormatError as e:
    print(f"Unsupported format: {e.extension}")
    print(f"Supported formats: {', '.join(e.supported)}")
except ParseError as e:
    print(f"Parse failed: {e}")
    if e.line_number:
        print(f"  at line {e.line_number}")
```

## Working with Features

### Filter by Track Type

```python
from debrief_io import parse
from debrief_schemas import TrackFeature

result = parse("/path/to/exercise.rep")

# Get only track features
tracks = [f for f in result.features if isinstance(f, TrackFeature)]

# Filter by track type
ownship = [t for t in tracks if t.properties.track_type == "OWNSHIP"]
contacts = [t for t in tracks if t.properties.track_type == "CONTACT"]

print(f"Own ship tracks: {len(ownship)}")
print(f"Contact tracks: {len(contacts)}")
```

### Access Position Data

```python
from debrief_io import parse

result = parse("/path/to/exercise.rep")

for feature in result.features:
    if hasattr(feature.properties, 'positions'):
        positions = feature.properties.positions
        print(f"Track {feature.properties.platform_id}:")
        print(f"  Positions: {len(positions)}")
        print(f"  Start: {positions[0].time}")
        print(f"  End: {positions[-1].time}")
```

### Get Reference Locations

```python
from debrief_io import parse
from debrief_schemas import ReferenceLocation

result = parse("/path/to/exercise.rep")

# Get reference locations
refs = [f for f in result.features if isinstance(f, ReferenceLocation)]

for ref in refs:
    print(f"Reference: {ref.properties.name}")
    print(f"  Type: {ref.properties.location_type}")
    print(f"  Position: {ref.geometry.coordinates}")
```

## Handler Registry

### List Available Handlers

```python
from debrief_io.registry import list_handlers

handlers = list_handlers()
for h in handlers:
    print(f"{h.extension}: {h.name} (v{h.version})")
    print(f"  {h.description}")
```

### Register Custom Handler

```python
from debrief_io.registry import register_handler
from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult

class MyFormatHandler(BaseHandler):
    name = "My Custom Format"
    description = "Handler for .myformat files"
    version = "1.0.0"
    extensions = [".myformat"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        features = []
        warnings = []

        # Parse content and build features...

        return ParseResult(
            features=features,
            warnings=warnings,
            source_file=source_file,
            encoding="utf-8",
            parse_time_ms=0.0,
            handler=self.name,
        )

# Register the handler
register_handler(".myformat", MyFormatHandler)

# Now parse() will use it automatically
result = parse("/path/to/data.myformat")
```

## Integration with debrief-stac

### Load Parsed Features into STAC Plot

```python
from pathlib import Path
from debrief_io import parse
from debrief_stac import create_catalog, create_plot, add_features, add_asset
from debrief_stac.models import PlotMetadata

# Parse source file
source_path = Path("/path/to/exercise.rep")
result = parse(source_path)

# Create catalog and plot
catalog_path = create_catalog(Path("/path/to/analysis"))
metadata = PlotMetadata(
    title="Exercise Analysis",
    description=f"Loaded from {source_path.name}",
)
plot_id = create_plot(catalog_path, metadata)

# Add features to plot
add_features(catalog_path, plot_id, result.features)

# Add source file as asset (for provenance)
add_asset(catalog_path, plot_id, source_path)

print(f"Loaded {len(result.features)} features into plot {plot_id}")
```

## MCP Tools

When running with MCP enabled, these tools are available:

### parse_file

Parse a file and return GeoJSON features.

```json
{
  "name": "parse_file",
  "arguments": {
    "path": "/path/to/exercise.rep"
  }
}
```

Response:
```json
{
  "features": [...],
  "warnings": [],
  "source_file": "/path/to/exercise.rep",
  "encoding": "utf-8",
  "handler": "Debrief REP Format"
}
```

### list_handlers

List available format handlers.

```json
{
  "name": "list_handlers",
  "arguments": {}
}
```

Response:
```json
{
  "handlers": [
    {
      "extension": ".rep",
      "name": "Debrief REP Format",
      "description": "Legacy Debrief replay file format",
      "version": "1.0.0"
    }
  ]
}
```

## Sample REP File

For testing, here's a minimal valid REP file:

```
;; Sample REP file for testing
//OWNSHIP TYPE:OWNSHIP COLOR:RED
951212 120000 50.5 -1.2 045 12.5 0
951212 120100 50.52 -1.18 047 12.8 0
951212 120200 50.54 -1.16 046 12.6 0

//CONTACT_1 TYPE:CONTACT COLOR:BLUE
951212 120030 50.48 -1.25 180 8.0 0
951212 120130 50.46 -1.27 182 7.8 0

REF:ALPHA 50.6 -1.0 WAYPOINT
```

This file contains:
- One ownship track (3 positions)
- One contact track (2 positions)
- One reference location (waypoint)

## Common Issues

### UnsupportedFormatError

File extension not recognized. Check `list_handlers()` for supported formats.

### Encoding Warnings

If you see `ENCODING_FALLBACK` warning, the file was not UTF-8. Content is decoded as Latin-1 but characters may display incorrectly.

### Invalid Coordinates

Coordinates outside valid ranges (-180 to 180 lon, -90 to 90 lat) are skipped with warnings. The feature is still created if enough valid positions remain.

### Truncated File

If file ends mid-record, incomplete data is discarded with a warning. Valid records are still returned.
