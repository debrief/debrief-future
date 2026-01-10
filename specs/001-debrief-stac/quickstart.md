# Quickstart: debrief-stac

## Installation

```bash
# From workspace root
uv pip install -e services/stac

# With MCP support
uv pip install -e "services/stac[mcp]"
```

## Basic Usage

### Create a Catalog

```python
from debrief_stac.catalog import create_catalog

# Create a new STAC catalog
catalog_path = create_catalog(
    "/path/to/analysis",
    catalog_id="exercise-alpha",
    description="Exercise Alpha Analysis"
)
print(f"Created catalog at: {catalog_path}")
```

### Create a Plot

```python
from debrief_stac.catalog import create_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot

# Create catalog first
catalog_path = create_catalog("/path/to/analysis")

# Create a plot with metadata
metadata = PlotMetadata(
    title="Track Analysis Day 1",
    description="Initial analysis of vessel tracks from Exercise Alpha"
)
plot_id = create_plot(catalog_path, metadata)
print(f"Created plot: {plot_id}")
```

### Add Features to a Plot

```python
from debrief_stac.features import add_features

# GeoJSON features to add
features = [
    {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[-5.0, 50.0], [-4.5, 50.2], [-4.0, 50.5]]
        },
        "properties": {
            "name": "Track Alpha",
            "mmsi": "123456789"
        }
    },
    {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-4.5, 50.1]},
        "properties": {"name": "Reference Point", "type": "waypoint"}
    }
]

# Add to plot (creates FeatureCollection if needed)
count = add_features(catalog_path, plot_id, features)
print(f"Plot now has {count} features")
```

### Add Source Asset with Provenance

```python
from debrief_stac.assets import add_asset

# Add original source file to plot
asset_key = add_asset(
    catalog_path,
    plot_id,
    "/path/to/source/data.rep"
)
print(f"Added asset: {asset_key}")
# Provenance automatically recorded: source path, timestamp, tool version
```

### Read a Plot

```python
from debrief_stac.plot import read_plot

# Read complete STAC Item
item = read_plot(catalog_path, plot_id)
print(f"Plot: {item['properties']['title']}")
print(f"BBox: {item['bbox']}")
print(f"Assets: {list(item['assets'].keys())}")
```

### List All Plots

```python
from debrief_stac.catalog import list_plots

# Get plot summaries (sorted by datetime, newest first)
plots = list_plots(catalog_path)
for plot in plots:
    print(f"{plot.id}: {plot.title} ({plot.feature_count} features)")
```

## Complete Workflow Example

```python
from pathlib import Path
from debrief_stac.catalog import create_catalog, list_plots
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.features import add_features
from debrief_stac.assets import add_asset

# 1. Create catalog
catalog = create_catalog(
    Path.home() / "debrief-data" / "exercise-alpha",
    catalog_id="exercise-alpha",
    description="Exercise Alpha Analysis"
)

# 2. Create plot
metadata = PlotMetadata(
    title="Day 1 Track Analysis",
    description="Vessel tracks from exercise day 1"
)
plot_id = create_plot(catalog, metadata)

# 3. Add features
track_features = [
    {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [[-5.0, 50.0], [-4.0, 51.0], [-3.0, 50.5]]
        },
        "properties": {"name": "Track Alpha", "vessel_type": "cargo"}
    }
]
add_features(catalog, plot_id, track_features)

# 4. Add source file
add_asset(catalog, plot_id, "/data/source/tracks.rep")

# 5. Verify
item = read_plot(catalog, plot_id)
print(f"Created plot '{item['properties']['title']}' with:")
print(f"  - BBox: {item['bbox']}")
print(f"  - Assets: {list(item['assets'].keys())}")

# 6. List all plots
for plot in list_plots(catalog):
    print(f"  - {plot.id}: {plot.title}")
```

## MCP Tool Usage (VS Code Extension)

When running the MCP server, tools are available for external invocation:

```bash
# Start MCP server
python -m debrief_stac.mcp_server
```

Tools available via MCP:
- `create_catalog_tool` - Create new catalog
- `create_plot_tool` - Create plot in catalog
- `read_plot_tool` - Read plot by ID
- `add_features_tool` - Add GeoJSON features
- `add_asset_tool` - Add source file asset
- `list_plots_tool` - List catalog contents

## Error Handling

```python
from debrief_stac.exceptions import (
    CatalogExistsError,
    CatalogNotFoundError,
    PlotNotFoundError,
)

try:
    catalog_path = create_catalog("/existing/catalog")
except CatalogExistsError as e:
    print(f"Catalog already exists at: {e.path}")

try:
    item = read_plot("/data/catalog", "nonexistent-plot")
except PlotNotFoundError as e:
    print(f"Plot '{e.plot_id}' not found in {e.catalog_path}")
```

## File Structure After Usage

```
/path/to/analysis/
├── catalog.json              # STAC Catalog
└── {plot-id}/
    ├── item.json            # STAC Item
    ├── features.geojson     # GeoJSON FeatureCollection
    └── assets/
        └── tracks.rep       # Source file (copied)
```
