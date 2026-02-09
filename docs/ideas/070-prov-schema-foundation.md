# [E02] Implement PROV schema foundation

## Epic
Part of **E02: PROV Logging Implementation** — Phase 0

## Problem
The current codebase has two separate provenance implementations (`properties.provenance` from debrief-calc and `properties.prov` from debrief-stac) with a flat, limited model. The SRD requires a unified PROV-aligned schema with structured change tracking. All subsequent PROV phases depend on these foundational schema changes.

## Proposed Solution
1. Create LinkML schema for Log Entry (`shared/schemas/src/linkml/log-entry.yaml`)
2. Expand ToolResult Python model with `modifiedFeatures`, `createdFeatures`, `createdAssets`, typed `parameters`, `toolVersion`
3. Add supporting types: `ModifiedFeature`, `PropertyDelta`, `CreatedAsset`, `ParameterValue`
4. Replace `attach_provenance()` with `attach_log_entry()` producing PROV-aligned format
5. Remove `services/stac/src/debrief_stac/provenance.py` (duplicate)
6. Add system record schema (non-spatial Feature with Point/empty coordinates)
7. Update all fixtures and sample data

## Success Criteria
- All existing calc tests pass with updated models
- LinkML schema generates valid Pydantic models
- New provenance format matches SRD Annex A.3 structure
- `properties.prov` no longer exists anywhere in codebase
- System record schema validates correctly

## Dependencies
- #062 (FeatureKindEnum values for tool migration)

## Complexity
High

## Reference
- [Transition Plan: Phase 0](docs/architecture/prov-transition-plan.md#phase-0-schema-foundation)
- [SRD Annex A.3, A.4, A.8](docs/srd-prov-undo.md)
