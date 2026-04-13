# Research: LinkML Per-Platform Override Fields

**Feature**: 181-linkml-platform-overrides  
**Date**: 2026-04-13

## Decision 1: Where to Define VesselDomainEnum for Cross-Module Use

**Context**: The `domain` field on TrackProperties (in `geojson.yaml`) needs the `VesselDomainEnum` (surface/subsurface/unknown), which is currently defined in `stac-extension.yaml`. However, `geojson.yaml` does not import `stac-extension.yaml`, and having GeoJSON depend on STAC extension is semantically wrong.

**Decision**: Move `VesselDomainEnum` from `stac-extension.yaml` to `common.yaml`.

**Rationale**:
- `common.yaml` is the shared foundation module already imported by both `geojson.yaml` and (after this change) `stac-extension.yaml`.
- VesselDomainEnum represents domain-level classification (like `TrackTypeEnum`, `FeatureKindEnum`), not STAC-specific semantics. It belongs alongside other domain enums.
- Moving it avoids creating a `geojson -> stac-extension` dependency, which would be semantically backwards (GeoJSON features should not depend on STAC extensions).
- `stac-extension.yaml` gains a `common` import, which is clean and consistent with the pattern used by other modules.

**Alternatives Considered**:
1. **Add `stac-extension` import to `geojson.yaml`** -- Rejected. Creates a backwards semantic dependency. GeoJSON features are more fundamental than STAC extensions.
2. **Duplicate the enum in both files** -- Rejected. Violates "single source of truth" (Constitution Article II.1).
3. **Use string with pattern constraint instead of enum** -- Rejected. Loses schema-level validation and type safety. Downstream consumers would need to validate domain values themselves.

## Decision 2: PlatformRecord Class Location

**Context**: The new `PlatformRecord` class (id, name, nationality, vessel_class, vessel_type, vessel_role, domain) is used by `StacExtensionProperties.platforms` and `StacItemSummary.platforms`. Need to decide which schema file defines it.

**Decision**: Define `PlatformRecord` in `stac-extension.yaml`.

**Rationale**:
- PlatformRecord is a STAC extension concept -- it represents the fully-resolved metadata that appears on STAC items.
- Both consumers (`StacExtensionProperties`, `StacItemSummary`) are already defined in `stac-extension.yaml`.
- After Decision 1, `stac-extension.yaml` will import `common.yaml`, giving it access to `VesselDomainEnum` for the `domain` field.

**Alternatives Considered**:
1. **Define in `common.yaml`** -- Rejected. PlatformRecord is STAC-specific (it represents resolved metadata on STAC items), not a general-purpose domain type.
2. **Define in `geojson.yaml`** -- Rejected. PlatformRecord is not a GeoJSON concept.

## Decision 3: TrackProperties Override Fields -- Pattern Constraints

**Context**: The six new fields on TrackProperties need appropriate validation constraints. The epic document specifies patterns but we need to decide on exact LinkML expressions.

**Decision**: Apply the following constraints:

| Field | Type | Constraint | Notes |
|-------|------|-----------|-------|
| `display_name` | string | None | Free-text, any human-readable name |
| `nationality` | string | `pattern: "^[A-Z]{2}$"` | ISO 3166-1 alpha-2 (matches existing `nationalities` pattern) |
| `vessel_class` | string | `pattern: "^[a-z0-9-]+(/[a-z0-9-]+){0,3}$"` | Matches existing `vessel_classes` pattern on StacExtensionProperties |
| `vessel_type` | string | `pattern: "^[a-z0-9-]+$"` | Leaf segment of class path -- single lowercase segment |
| `vessel_role` | string | `pattern: "^[a-z0-9-]+$"` | Parent of leaf -- single lowercase segment |
| `domain` | VesselDomainEnum | Enum constraint | Reuses moved enum from common.yaml |

**Rationale**: Reuses existing patterns where they exist (nationality, vessel_class) and derives new patterns (vessel_type, vessel_role) from the established convention of lowercase alphanumeric segments.

## Decision 4: Backward Compatibility Strategy for STAC Extension

**Context**: Existing STAC items use flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`). The new `debrief:platforms` array replaces the semantic role of these fields but we cannot break existing data.

**Decision**: Keep all existing flat aggregate fields. Add `platforms` as a new optional field alongside them. Do not remove any existing fields in this feature.

**Rationale**:
- All 100 exercise fixtures and any real catalog data use the flat aggregate fields.
- The save-time resolution handler (#183) will be responsible for populating `platforms` and deciding when to stop writing flat aggregates.
- Constitution Article XIV (Pre-Release Freedom) permits breaking changes, but there is no benefit to a breaking change here -- the additive approach is simpler and safer.
- The flat fields can be deprecated and removed in a later cleanup item after all consumers have migrated to `platforms`.

## Decision 5: Fixture Coverage Strategy

**Context**: Need to add fixtures covering the new schema structures without disrupting the existing 100-item exercise fixture set.

**Decision**: Add targeted fixtures in both fixture locations:

1. **Core fixtures** (`shared/schemas/src/fixtures/`):
   - `valid/track-feature-platform-overrides-01.json` -- TrackFeature with all six override fields populated
   - `valid/track-feature-platform-overrides-minimal-01.json` -- TrackFeature with only `display_name` (partial overrides)
   - `invalid/track-feature-invalid-nationality.json` -- Three-letter nationality code
   - `invalid/track-feature-invalid-domain.json` -- Domain value outside enum

2. **STAC extension fixtures** (`shared/schemas/fixtures/stac-browser/`):
   - `valid/extension-platforms-full.json` -- StacExtensionProperties with fully-populated platforms array
   - `valid/extension-platforms-sparse.json` -- StacExtensionProperties with sparse record (id-only)
   - `invalid/invalid-platform-nationality.json` -- Platform record with invalid nationality

3. **Existing exercise fixtures**: Not modified. They will gain `debrief:platforms` when the catalog is regenerated (#184).

**Rationale**: Targeted fixtures test the new fields without modifying the carefully-balanced 100-item exercise set. The exercise set is regenerated separately in #184.

## Decision 6: StacItemSummary Consumer Impact

**Context**: `StacItemSummary` has two representations:
- Generated snake_case version in `shared/schemas/src/generated/typescript/types.ts`
- Local camelCase version in `apps/vscode/src/types/stac.ts` (used by all VS Code consumers)

The filter engine uses its own `CatalogOverviewItem` interface.

**Decision**: This feature only updates the LinkML schema and regenerates types. Consumer updates (VS Code types, stacService, filter engine matchers) are out of scope and will be done in downstream features (#183 for stacService, #185 for filter engine).

**Rationale**: The spec explicitly scopes this feature to schema + generation + fixtures. Consumer code changes depend on the save-time resolution logic (#183) and CQL2 array_filter (#185), which are separate items.

## Technical Notes

### Schema Generation Pipeline
- **Script**: `shared/schemas/scripts/generate.py`
- **Master schema**: `shared/schemas/src/linkml/debrief.yaml` (imports all modules)
- **Makefile**: `shared/schemas/Makefile` with targets `generate-pydantic`, `generate-typescript`, `generate-jsonschema`
- **Post-processing**: The generate script applies coordinate type fixes, nullable array patches, and union type patches. No post-processing is expected for the new fields (they are simple optional scalars and arrays).

### Import Dependency Chain (after changes)
```
common.yaml (VesselDomainEnum moved here)
  ↑ imported by
geojson.yaml (TrackProperties gains override fields using VesselDomainEnum)
  ↑ imported by
stac-extension.yaml (gains common import; PlatformRecord + platforms field)
  ↑ imported by
debrief.yaml (master -- no changes needed)
```

### Test Files Affected
- `test_golden.py` -- will auto-discover new valid/invalid fixtures
- `test_stac_extension.py` -- will need new test for platforms round-trip
- `test_roundtrip.py` -- existing TrackFeature round-trip tests should pass (new fields are optional)
