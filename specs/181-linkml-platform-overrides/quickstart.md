# Quickstart: LinkML Per-Platform Override Fields

**Feature**: 181-linkml-platform-overrides  
**Date**: 2026-04-13

## Prerequisites

- Python 3.11+ with `uv` installed
- Node.js 18+ with `pnpm` installed
- Feature #180 (platform registry) complete on `main`

## Implementation Steps

### Step 1: Move VesselDomainEnum to common.yaml

1. Open `shared/schemas/src/linkml/common.yaml`
2. Add `VesselDomainEnum` to the `enums` section (copy definition from stac-extension.yaml)
3. Open `shared/schemas/src/linkml/stac-extension.yaml`
4. Remove `VesselDomainEnum` from the `enums` section
5. Add `common` to the `imports` list

### Step 2: Add Override Fields to TrackProperties

1. Open `shared/schemas/src/linkml/geojson.yaml`
2. Add six optional fields to `TrackProperties.attributes` after the existing `tuas` field:
   - `display_name` (string, optional)
   - `nationality` (string, optional, pattern `^[A-Z]{2}$`)
   - `vessel_class` (string, optional, pattern `^[a-z0-9-]+(/[a-z0-9-]+){0,3}$`)
   - `vessel_type` (string, optional, pattern `^[a-z0-9-]+$`)
   - `vessel_role` (string, optional, pattern `^[a-z0-9-]+$`)
   - `domain` (VesselDomainEnum, optional)

### Step 3: Add PlatformRecord and Platforms Field

1. Open `shared/schemas/src/linkml/stac-extension.yaml`
2. Add `PlatformRecord` class with fields: `id` (required), `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain` (all optional)
3. Add `platforms` field to `StacExtensionProperties` (optional, multivalued PlatformRecord)
4. Add `platforms` field to `StacItemSummary` (optional, multivalued PlatformRecord)

### Step 4: Regenerate Types

```bash
cd shared/schemas
make generate
```

This runs `generate-pydantic`, `generate-jsonschema`, and `generate-typescript` in sequence.

### Step 5: Add Golden Fixtures

1. Add valid TrackFeature fixtures with override fields to `shared/schemas/src/fixtures/valid/`
2. Add invalid TrackFeature fixtures to `shared/schemas/src/fixtures/invalid/`
3. Add valid/invalid STAC extension fixtures with platforms to `shared/schemas/fixtures/stac-browser/valid/` and `invalid/`

### Step 6: Run Tests

```bash
# Schema tests (Python)
cd shared/schemas
uv run pytest tests/ -v

# TypeScript type checking
pnpm -r typecheck

# Full verification
cd ../..
task verify
```

## Verification Checklist

- [ ] `VesselDomainEnum` is in `common.yaml`, not in `stac-extension.yaml`
- [ ] `TrackProperties` has 6 new optional fields in `geojson.yaml`
- [ ] `PlatformRecord` class defined in `stac-extension.yaml`
- [ ] `platforms` field on `StacExtensionProperties` and `StacItemSummary`
- [ ] Generated Pydantic models include new fields
- [ ] Generated TypeScript types include new fields
- [ ] Generated JSON Schema includes new fields
- [ ] New valid fixtures pass validation
- [ ] New invalid fixtures fail validation
- [ ] Existing fixtures still pass (backward compatibility)
- [ ] `task verify` passes
