# Test Summary: SYSTEM Kind Discriminator

**Date**: 2026-01-23
**Feature**: 022-system-kind-discriminator
**Status**: All tests passing

## Test Results

```
======================== 124 passed, 6 warnings in 0.73s ========================
```

### SYSTEM State Fixtures Tested

| Fixture | Type | Result |
|---------|------|--------|
| system-state-temporal-01.json | Valid | ✅ PASSED |
| system-state-spatial-01.json | Valid | ✅ PASSED |
| system-state-selection-01.json | Valid | ✅ PASSED |
| system-state-invalid-geometry.json | Invalid | ✅ PASSED (correctly rejected) |
| system-state-invalid-id.json | Invalid | ✅ PASSED (correctly rejected) |

### Validation Details

- **Valid fixtures**: Pydantic models correctly validate all three state variants
- **Invalid fixtures**: Schema correctly rejects:
  - Non-null geometry on SYSTEM features
  - IDs not matching `^state\.[a-z]+$` pattern

### Known Warnings

6 warnings relate to LinkML's nested array limitation for GeoJSON coordinates (pre-existing issue, unrelated to SYSTEM features).

## Schema Generation

All generated outputs include SYSTEM kind:
- Python Pydantic models
- TypeScript interfaces
- JSON Schema
