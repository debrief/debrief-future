# Quickstart: STAC Extension + Mock Data Fixtures

**Feature**: 125-stac-extension-mock-data

## What This Feature Delivers

1. **STAC Extension Specification** — a formal JSON Schema defining the `debrief:` namespace properties for vessel class, tags, tracks, and nationalities
2. **LinkML Schema Module** — `stac-extension.yaml` in `shared/schemas/src/linkml/` generating Pydantic + TypeScript types
3. **100 Fixture Items** — realistic STAC item.json files in `shared/schemas/fixtures/stac-browser/`
4. **Fixture Generator** — deterministic Python script for regeneration if schema changes
5. **Vessel Taxonomy** — starter 4-level taxonomy (20 types including `unknown`) as a JSON reference file

## File Locations After Implementation

```
shared/schemas/
├── src/linkml/
│   ├── stac-extension.yaml          # NEW: LinkML schema for extension properties
│   └── debrief.yaml                 # MODIFIED: imports stac-extension
├── fixtures/stac-browser/
│   ├── catalog.json                 # NEW: STAC catalog referencing all items
│   ├── vessel-taxonomy.json         # NEW: Vessel classification hierarchy
│   ├── exercise-001/item.json       # NEW: 100 fixture items
│   ├── exercise-002/item.json
│   └── ...
├── scripts/
│   └── generate-stac-fixtures.py    # NEW: Deterministic fixture generator
└── tests/
    └── test_stac_extension.py       # NEW: Fixture validation tests
```

## Using the Extension Properties

### Reading extension properties (TypeScript)

```typescript
// Extension properties are available via the existing [key: string]: unknown index
const item: StacItem = await loadItem(path);
const vesselClasses = item.properties['debrief:vessel_classes'] as string[];
const tags = item.properties['debrief:tags'] as string[];
const nationalities = item.properties['debrief:nationalities'] as string[];
```

### Filtering by vessel class hierarchy

```typescript
// Find all items involving frigates (any type)
const frigateItems = items.filter(item => {
  const classes = item.properties['debrief:vessel_classes'] as string[];
  return classes?.some(c => c.startsWith('surface/warship/frigate'));
});
```

### Validating a fixture (Python)

```python
from debrief_schemas import StacExtensionProperties

# Pydantic model validates extension properties
props = StacExtensionProperties.model_validate(item["properties"])
assert all("/" in vc for vc in props.vessel_classes)
```

## Running the Generator

```bash
cd shared/schemas
uv run python scripts/generate-stac-fixtures.py
# Output: fixtures/stac-browser/exercise-{001..100}/item.json
```

## Integration with E08 Components

| Downstream Item | Uses These Extension Properties |
|----------------|-------------------------------|
| #126 Filter Bar | All properties (vessel_classes, tags, nationalities, track_names) + derived author |
| #127 List View | title, vessel_classes, tags, datetime range |
| #129 Map View | bbox, geometry, vessel_classes (for colour) |
| #130 Timeline | datetime range, vessel_classes (for colour) |
| #131 Colour Scheme | vessel_classes, tags (colour dimensions) |
| #133 CQL2 Filter | All properties (query predicates) |
| #134 Saved Filters | All properties (serialised filter configurations) |
