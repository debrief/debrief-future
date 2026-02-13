# [E05] Extend FeatureKindEnum for drawable shapes

## Epic
Part of **E05: Shape Drawing Tools**

## Problem
The FeatureKindEnum may not include all shape kinds needed for user-drawn shapes. POLY and POLYLINE were planned in Phase 2 shape types (spec 020) but may not be in the current LinkML schema enum. User-drawn shapes need proper kind discriminators to round-trip through the schema validation pipeline.

## Proposed Solution
- Audit current FeatureKindEnum values in `shared/schemas/src/linkml/common.yaml`
- Add POLY (arbitrary polygon) and POLYLINE kinds if not already present
- Add annotation property classes in `annotations.yaml` for new kinds
- Regenerate Pydantic, JSON Schema, and TypeScript types
- Add valid/invalid fixture files for new kinds
- Run schema adherence tests

## Success Criteria
- POLY and POLYLINE exist in FeatureKindEnum
- Generated Pydantic/TypeScript types include new kinds
- Valid fixture JSON files pass schema validation
- All existing schema tests still pass

## Dependencies
None

## Complexity
Low
