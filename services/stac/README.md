# debrief-stac

Local STAC catalog operations for Debrief v4.x.

## Overview

This package provides functions for managing local STAC (SpatioTemporal Asset Catalog) catalogs, creating and reading plots (STAC Items), and managing GeoJSON feature assets with provenance tracking.

## Installation

```bash
uv pip install -e services/stac
```

## Quick Start

```python
from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata

# Create a new catalog
catalog_path = create_catalog("/path/to/analysis", catalog_id="exercise-alpha")

# Create a plot
metadata = PlotMetadata(title="Day 1 Analysis", description="Track analysis")
plot_id = create_plot(catalog_path, metadata)

# Add features to the plot
features = [...]  # GeoJSON features
add_features(catalog_path, plot_id, features)

# Read the plot back
plot = read_plot(catalog_path, plot_id)
```

## Features

- **Create Catalog**: Initialize local STAC catalogs
- **Create Plot**: Add STAC Items (plots) to catalogs
- **Read Plot**: Retrieve plots by ID
- **Add Features**: Append GeoJSON features to plots
- **Add Assets**: Copy source files with provenance tracking
- **List Plots**: Browse catalog contents

## Development

```bash
# Run tests
uv run pytest tests/ -v

# Run with coverage
uv run pytest tests/ --cov=src/debrief_stac --cov-report=term-missing
```

## License

MIT
