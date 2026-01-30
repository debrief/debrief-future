# Data Model: STAC Store Reorganization

No new data models are introduced. This feature reorganizes the filesystem layout of existing STAC data.

## Filesystem Layout (Target)

```
{catalog_root}/
├── catalog.json                    # STAC Catalog
│   └── links[]
│       ├── {rel: "root", href: "./catalog.json"}
│       ├── {rel: "self", href: "./catalog.json"}
│       └── {rel: "item", href: "./{item_id}/item.json"}  ← per-item link
│
└── {item_id}/                      # Per-item folder
    ├── item.json                   # STAC Item (renamed from {id}.json)
    │   └── links[]
    │       ├── {rel: "root", href: "../catalog.json"}
    │       ├── {rel: "parent", href: "../catalog.json"}
    │       └── {rel: "self", href: "./item.json"}
    ├── {item_id}.geojson           # GeoJSON FeatureCollection (data asset)
    └── assets/                     # Source files directory
        └── {original_filename}     # Preserved source files
```

## Migration Function Signature

```python
def migrate_flat_store(catalog_path: Path) -> list[str]:
    """Returns list of migrated item IDs."""
```

No new Pydantic models, schemas, or types required.
