# Usage Example: STAC Collection Summaries

## Automatic Promotion on Plot Creation

```python
from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot

# Create a catalog (starts as type: "Catalog")
catalog_path = create_catalog("/data/analysis")
catalog = open_catalog(catalog_path)
assert catalog["type"] == "Catalog"

# Create a plot — catalog is automatically promoted to Collection
metadata = PlotMetadata(title="Day 1 Analysis", datetime="2024-01-15T08:00:00Z")
plot_id = create_plot(catalog_path, metadata)

catalog = open_catalog(catalog_path)
assert catalog["type"] == "Collection"
assert catalog["license"] == "proprietary"
assert "extent" in catalog
assert "summaries" in catalog
```

## Incremental Summary Updates on Feature Addition

```python
from debrief_stac.features import add_features

features = [
    {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
        "properties": {"name": "Point A"},
    },
    {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": [[-5.0, 50.0], [2.0, 58.5]]},
        "properties": {"name": "Track Alpha"},
    },
]
add_features(catalog_path, plot_id, features)

catalog = open_catalog(catalog_path)
# Extent now reflects the bbox of all features
print(catalog["extent"]["spatial"]["bbox"])
# [[-5.0, 50.0, 2.0, 58.5]]
```

## Reading Summaries for CQL2 Filter Engine

```python
from debrief_stac.collection import read_collection_summaries

result = read_collection_summaries(catalog_path)
if result is not None:
    extent, summaries = result
    print(f"Temporal: {extent.temporal_start} to {extent.temporal_end}")
    print(f"Bbox: {extent.bbox}")
    print(f"Vessel classes: {summaries.vessel_classes}")
    print(f"Nationalities: {summaries.nationalities}")
```

## Backwards Compatibility with Old Catalogs

```python
# Old catalog.json with type: "Catalog" loads without errors
catalog = open_catalog("/data/old-catalog")
assert catalog["type"] == "Catalog"  # No summaries yet

# On next write, it's automatically promoted
create_plot("/data/old-catalog", PlotMetadata(title="New Plot"))
catalog = open_catalog("/data/old-catalog")
assert catalog["type"] == "Collection"  # Now has summaries
```

## MCP Tool for VS Code Extension

```python
from debrief_stac.mcp_server import mcp_read_collection_summaries

result = mcp_read_collection_summaries("/data/analysis")
# Returns:
# {
#   "promoted": True,
#   "extent": {
#     "spatial": {"bbox": [[-5.0, 50.0, 2.0, 58.5]]},
#     "temporal": {"interval": [["2024-01-15T08:00:00Z", "2024-01-15T08:00:00Z"]]}
#   },
#   "summaries": {
#     "vessel_classes": [],
#     "tags": [],
#     "feature_tags": [],
#     "track_names": [],
#     "nationalities": []
#   }
# }
```
