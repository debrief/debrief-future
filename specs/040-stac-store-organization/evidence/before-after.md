# Before/After: STAC Store Migration

## Before (flat `items/` directory)

```
local-store/
├── catalog.json
└── items/
    ├── exercise-alpha.geojson
    ├── exercise-alpha.json
    ├── training-run-1.geojson
    └── training-run-1.json
```

Catalog links:
- `./items/exercise-alpha.json`
- `./items/training-run-1.json`

## After (per-item folders)

```
local-store/
├── catalog.json
├── exercise-alpha/
│   ├── assets/
│   ├── exercise-alpha.geojson
│   └── item.json
└── training-run-1/
    ├── assets/
    ├── item.json
    └── training-run-1.geojson
```

Catalog links:
- `./exercise-alpha/item.json`
- `./training-run-1/item.json`

Item self-links: `./item.json`
Item parent/root links: `../catalog.json`
