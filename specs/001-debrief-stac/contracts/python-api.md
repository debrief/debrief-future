# Python API Contract: debrief-stac

**Package**: `debrief_stac`
**Version**: 0.1.0

## Module: `catalog`

### `create_catalog(path, catalog_id=None, description=None) -> Path`

Create a new STAC catalog at the specified path.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| path | PathLike | Yes | - | Directory path for catalog |
| catalog_id | str | No | Directory name | Unique catalog identifier |
| description | str | No | "Debrief analysis catalog" | Catalog description |

**Returns**: `Path` - Absolute path to created catalog directory

**Raises**:
| Exception | Condition |
|-----------|-----------|
| CatalogExistsError | Catalog already exists at path |
| PermissionError | Cannot write to path |
| OSError | File system error |

**Example**:
```python
from debrief_stac import catalog

catalog_path = catalog.create_catalog(
    "/data/analysis",
    catalog_id="exercise-alpha",
    description="Exercise Alpha Analysis"
)
```

---

### `open_catalog(path) -> dict`

Open and validate an existing STAC catalog.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | PathLike | Yes | Path to catalog directory |

**Returns**: `dict` - Parsed catalog.json content

**Raises**:
| Exception | Condition |
|-----------|-----------|
| CatalogNotFoundError | No catalog at path |
| ValidationError | Invalid STAC structure |

---

### `list_plots(path) -> list[PlotSummary]`

List all plots in a catalog with summary information.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| path | PathLike | Yes | Path to catalog directory |

**Returns**: `list[PlotSummary]` - Plot summaries sorted by datetime descending

**Raises**:
| Exception | Condition |
|-----------|-----------|
| CatalogNotFoundError | No catalog at path |

---

## Module: `plot`

### `create_plot(catalog_path, metadata, plot_id=None) -> str`

Create a new plot (STAC Item) in a catalog.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| catalog_path | PathLike | Yes | - | Path to catalog directory |
| metadata | PlotMetadata | Yes | - | Plot metadata |
| plot_id | str | No | UUID | Custom plot identifier |

**Returns**: `str` - Created plot ID

**Raises**:
| Exception | Condition |
|-----------|-----------|
| CatalogNotFoundError | No catalog at path |
| PlotExistsError | Plot ID already exists |
| ValidationError | Invalid metadata |

**Example**:
```python
from debrief_stac.plot import create_plot
from debrief_stac.models import PlotMetadata

metadata = PlotMetadata(
    title="Track Analysis Day 1",
    description="Initial analysis of vessel tracks"
)
plot_id = create_plot("/data/analysis", metadata)
```

---

### `read_plot(catalog_path, plot_id) -> dict`

Read a plot (STAC Item) from a catalog.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | PathLike | Yes | Path to catalog directory |
| plot_id | str | Yes | Plot identifier |

**Returns**: `dict` - Complete STAC Item with properties and assets

**Raises**:
| Exception | Condition |
|-----------|-----------|
| CatalogNotFoundError | No catalog at path |
| PlotNotFoundError | Plot ID not found |

---

## Module: `features`

### `add_features(catalog_path, plot_id, features) -> int`

Add GeoJSON features to a plot's FeatureCollection.

**Parameters**:
| Name | Type | Required | Description |
|------|------|----------|-------------|
| catalog_path | PathLike | Yes | Path to catalog directory |
| plot_id | str | Yes | Plot identifier |
| features | Sequence[dict] | Yes | GeoJSON Feature dictionaries |

**Returns**: `int` - Total feature count after adding

**Raises**:
| Exception | Condition |
|-----------|-----------|
| PlotNotFoundError | Plot ID not found |
| ValueError | Invalid GeoJSON feature |

**Example**:
```python
from debrief_stac.features import add_features

features = [
    {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [-4.5, 50.3]},
        "properties": {"name": "Reference Point"}
    }
]
count = add_features("/data/analysis", "plot-1", features)
```

---

## Module: `assets`

### `add_asset(catalog_path, plot_id, source_path, asset_key=None, media_type=None) -> str`

Add a source file as an asset to a plot with provenance tracking.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| catalog_path | PathLike | Yes | - | Path to catalog directory |
| plot_id | str | Yes | - | Plot identifier |
| source_path | PathLike | Yes | - | Path to source file |
| asset_key | str | No | "source-{stem}" | Asset identifier |
| media_type | str | No | Auto-detected | MIME type |

**Returns**: `str` - Asset key used

**Raises**:
| Exception | Condition |
|-----------|-----------|
| PlotNotFoundError | Plot ID not found |
| FileNotFoundError | Source file not found |
| IOError | Copy failed (e.g., disk full) |

---

## Module: `models`

### `PlotMetadata`

Input model for plot creation.

```python
class PlotMetadata(BaseModel):
    title: str = Field(..., min_length=1, description="Plot title")
    description: Optional[str] = Field(default=None, description="Plot description")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        alias="datetime"
    )
```

### `PlotSummary`

Output model for plot listing.

```python
class PlotSummary(BaseModel):
    id: str
    title: str
    timestamp: datetime = Field(alias="datetime")
    feature_count: int = 0
```

### `AssetProvenance`

Provenance tracking for source assets.

```python
class AssetProvenance(BaseModel):
    source_path: str
    load_timestamp: datetime
    tool_version: str = "0.1.0"
```

---

## Module: `exceptions`

### Exception Hierarchy

```
DebriefStacError (base)
├── CatalogExistsError
├── CatalogNotFoundError
├── PlotExistsError
├── PlotNotFoundError
├── AssetNotFoundError
└── ValidationError
```

### Exception Attributes

| Exception | Attributes |
|-----------|------------|
| CatalogExistsError | path: str |
| CatalogNotFoundError | path: str |
| PlotNotFoundError | plot_id: str, catalog_path: str |
| PlotExistsError | plot_id: str |
| AssetNotFoundError | asset_key: str, plot_id: str |
| ValidationError | message: str, details: dict |

---

## MCP Tools (Optional Module)

### Tool: `create_catalog_tool`

MCP wrapper for `catalog.create_catalog()`.

**Input Schema**:
```json
{
  "path": "string (required)",
  "catalog_id": "string (optional)",
  "description": "string (optional)"
}
```

**Output Schema**:
```json
{
  "path": "string",
  "catalog_id": "string"
}
```
or
```json
{
  "error": "string"
}
```

### Tool: `create_plot_tool`

MCP wrapper for `plot.create_plot()`.

**Input**: catalog_path, title, description (optional), plot_id (optional)
**Output**: plot_id or error

### Tool: `read_plot_tool`

MCP wrapper for `plot.read_plot()`.

**Input**: catalog_path, plot_id
**Output**: STAC Item dict or error

### Tool: `add_features_tool`

MCP wrapper for `features.add_features()`.

**Input**: catalog_path, plot_id, features
**Output**: feature_count or error

### Tool: `add_asset_tool`

MCP wrapper for `assets.add_asset()`.

**Input**: catalog_path, plot_id, source_path, asset_key (optional), media_type (optional)
**Output**: asset_key or error

### Tool: `list_plots_tool`

MCP wrapper for `catalog.list_plots()`.

**Input**: catalog_path
**Output**: plots list or error
