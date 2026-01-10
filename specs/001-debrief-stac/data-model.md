# Data Model: debrief-stac

**Feature**: Local STAC Catalog Operations
**Date**: 2026-01-09

## Entity Overview

```
┌─────────────┐      1:N      ┌─────────────┐      1:N      ┌─────────────┐
│   Catalog   │──────────────▶│    Plot     │──────────────▶│   Asset     │
│  (STAC Cat) │               │ (STAC Item) │               │             │
└─────────────┘               └─────────────┘               └─────────────┘
                                    │
                                    │ 1:1
                                    ▼
                              ┌─────────────┐
                              │FeatureCol- │
                              │  lection    │
                              └─────────────┘
```

## Entities

### Catalog (STAC Catalog)

A STAC Catalog is the root container for plots. Stored as `catalog.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Always "Catalog" |
| stac_version | string | Yes | "1.0.0" |
| id | string | Yes | Unique catalog identifier |
| description | string | Yes | Human-readable description |
| links | Link[] | Yes | References to child items |

**STAC Link Structure**:
```json
{
  "rel": "item",
  "href": "./plot-id/item.json",
  "type": "application/geo+json"
}
```

### Plot (STAC Item)

A Plot is a STAC Item representing an analysis session. Stored as `{plot-id}/item.json`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Always "Feature" |
| stac_version | string | Yes | "1.0.0" |
| id | string | Yes | Unique plot identifier |
| geometry | GeoJSON | Yes | Bounding polygon or null |
| bbox | number[4] | No | [minLon, minLat, maxLon, maxLat] |
| properties | Properties | Yes | Plot metadata |
| links | Link[] | Yes | Self and parent references |
| assets | Asset{} | Yes | Map of asset key → Asset |

**Properties Structure**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| datetime | string (ISO8601) | Yes | Plot timestamp |
| title | string | No | Human-readable title |
| description | string | No | Detailed description |

### Asset

An Asset is a file associated with a plot (features, source data).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| href | string | Yes | Relative path to asset file |
| type | string | Yes | MIME type |
| title | string | No | Human-readable title |
| roles | string[] | No | Asset roles ["data", "source"] |
| debrief:provenance | Provenance | No | Source tracking metadata |

**Asset Roles**:
- `data`: Primary data asset (FeatureCollection)
- `source`: Original source file with provenance

### Provenance

Provenance metadata for source assets (Constitution Article III compliance).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source_path | string | Yes | Original file path |
| load_timestamp | string (ISO8601) | Yes | When file was loaded |
| tool_version | string | Yes | debrief-stac version |

### FeatureCollection

GeoJSON FeatureCollection containing plot features. Stored as `{plot-id}/features.geojson`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Always "FeatureCollection" |
| features | Feature[] | Yes | Array of GeoJSON Features |

## Internal Models (Pydantic)

### PlotMetadata

Input model for creating plots.

```python
class PlotMetadata(BaseModel):
    title: str = Field(..., min_length=1)
    description: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
```

### PlotSummary

Output model for listing plots.

```python
class PlotSummary(BaseModel):
    id: str
    title: str
    timestamp: datetime  # alias="datetime" for STAC
    feature_count: int = 0
```

### AssetProvenance

Provenance tracking for source assets.

```python
class AssetProvenance(BaseModel):
    source_path: str
    load_timestamp: datetime
    tool_version: str = "0.1.0"
```

## Validation Rules

### Catalog Validation
- `id` must be non-empty string
- `type` must be "Catalog"
- `stac_version` must be "1.0.0"
- `links` must be array (can be empty)

### Plot Validation
- `id` must be non-empty string, no path separators
- `type` must be "Feature"
- `properties.datetime` must be valid ISO8601
- `bbox` if present must be [minLon, minLat, maxLon, maxLat]
- Coordinates must be valid WGS84 (-180 to 180, -90 to 90)

### Feature Validation
- `type` must be "Feature"
- `geometry` must be present (can be null)
- `properties` must be present (can be empty object)
- Geometry type must be valid GeoJSON type

## State Transitions

### Catalog Lifecycle
```
[Not Exists] ──create_catalog()──▶ [Empty Catalog]
                                         │
                                   create_plot()
                                         │
                                         ▼
                                  [Catalog with Plots]
```

### Plot Lifecycle
```
[Not Exists] ──create_plot()──▶ [Empty Plot]
                                     │
                              add_features()
                                     │
                                     ▼
                              [Plot with Features]
                                     │
                               add_asset()
                                     │
                                     ▼
                              [Plot with Assets]
```

## File System Layout

```
{catalog_path}/
├── catalog.json              # STAC Catalog
├── {plot-id-1}/
│   ├── item.json            # STAC Item (plot)
│   ├── features.geojson     # FeatureCollection asset
│   └── assets/
│       └── source.rep       # Source file asset
├── {plot-id-2}/
│   ├── item.json
│   ├── features.geojson
│   └── assets/
│       └── data.csv
└── ...
```

## Relationships

| From | To | Cardinality | Description |
|------|----|-------------|-------------|
| Catalog | Plot | 1:N | Catalog contains many plots |
| Plot | Asset | 1:N | Plot has many assets |
| Plot | FeatureCollection | 1:1 | Each plot has one features file |
| Asset | Provenance | 1:0..1 | Source assets have provenance |
