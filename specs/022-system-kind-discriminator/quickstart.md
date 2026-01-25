# Quickstart: SYSTEM Kind Discriminator

**Feature**: 022-system-kind-discriminator
**Date**: 2026-01-23

## What This Feature Does

Adds a new `SYSTEM` kind to the GeoJSON feature discriminator, enabling storage of non-spatial application state (viewports, selections) as GeoJSON Features with null geometry.

## Key Files to Modify

| File | Change |
|------|--------|
| `shared/schemas/src/linkml/common.yaml` | Add SYSTEM to FeatureKindEnum, add SystemStateTypeEnum |
| `shared/schemas/src/linkml/geojson.yaml` | Add SystemState feature class |
| `shared/schemas/tests/test_golden.py` | Add SystemState to ENTITY_MAP |
| `shared/schemas/src/fixtures/valid/` | Add 3 valid fixtures |
| `shared/schemas/src/fixtures/invalid/` | Add 2 invalid fixtures |

## Implementation Steps

### 1. Update common.yaml

Add to `FeatureKindEnum`:
```yaml
SYSTEM:
  description: Non-spatial system state (null geometry)
```

Add new enum:
```yaml
SystemStateTypeEnum:
  description: Discriminator for system state variants
  permissible_values:
    temporal:
      description: Time viewport state
    spatial:
      description: Map viewport state
    selection:
      description: Feature selection state
```

### 2. Update geojson.yaml

Add `SystemStateProperties` and `SystemState` classes following the pattern of existing feature types (TrackFeature, ReferenceLocation).

### 3. Regenerate Schemas

```bash
cd shared/schemas
make generate  # Regenerates Python, TypeScript, JSON Schema
```

### 4. Add Fixtures

Create valid fixtures:
- `system-state-temporal-01.json`
- `system-state-spatial-01.json`
- `system-state-selection-01.json`

Create invalid fixtures:
- `system-state-invalid-geometry.json` (non-null geometry)
- `system-state-invalid-id.json` (wrong ID pattern)

### 5. Update Tests

Add to `test_golden.py` ENTITY_MAP:
```python
"system-state": SystemState,
```

### 6. Run Tests

```bash
cd shared/schemas
make test  # Runs all schema tests
```

## Verification Checklist

- [ ] `make generate` completes without errors
- [ ] All existing tests still pass
- [ ] New valid fixtures pass validation
- [ ] New invalid fixtures fail validation as expected
- [ ] TypeScript types include SYSTEM kind
- [ ] JSON Schema includes SYSTEM in enum
