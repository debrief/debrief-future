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

## Decision 4: Remove Flat Aggregate Fields (No Backward Compatibility)

**Context**: Existing STAC items use flat aggregate fields (`debrief:vessel_classes`, `debrief:nationalities`, `debrief:track_names`). The new `debrief:platforms` array replaces them entirely.

**Decision**: Remove `vessel_classes`, `nationalities`, and `track_names` from StacExtensionProperties and StacItemSummary. Replace with `platforms` only. Update all consumers and fixtures atomically.

**Rationale**:
- Constitution Article XIV (Pre-Release Freedom) explicitly permits breaking changes before v4.0.0. We are not in production.
- Keeping dead fields alongside their replacement creates ambiguity about which is authoritative and confuses developers.
- A clean break now avoids the tech debt of maintaining two parallel representations and a future deprecation/migration cycle.
- All 100 exercise fixtures are script-generated and can be regenerated. The preview/workspace/samples data is regenerated separately in #184.

**Blast radius** (from codebase analysis):
- 3 LinkML schema files (source of truth)
- ~15 TypeScript consumer files (types, services, filter engine, stories, mocks)
- ~5 Python consumer files (stac service, enrichment script, collection summaries)
- ~10 test files (assertions, mock data)
- ~100 exercise fixture JSON files (script-regenerated)
- ~7 STAC browser valid/invalid fixtures

**Alternatives Considered**:
1. **Keep flat fields during transition** -- Rejected. Creates dual-representation cruft with no production users to protect. Every downstream item would need to handle both formats.
2. **Deprecation period** -- Rejected. Constitution XIV suspends deprecation rules before v4.0.0.

## Decision 5: Fixture Coverage Strategy

**Context**: Need to add fixtures for new structures AND migrate all existing fixtures away from removed flat fields.

**Decision**: Full fixture migration:

1. **Core fixtures** (`shared/schemas/src/fixtures/`):
   - `valid/track-feature-platform-overrides-01.json` -- TrackFeature with all six override fields populated
   - `valid/track-feature-platform-overrides-minimal-01.json` -- TrackFeature with only `display_name` (partial overrides)
   - `invalid/track-feature-invalid-nationality.json` -- Three-letter nationality code
   - `invalid/track-feature-invalid-domain.json` -- Domain value outside enum

2. **STAC extension fixtures** (`shared/schemas/fixtures/stac-browser/`):
   - `valid/extension-platforms-full.json` -- StacExtensionProperties with fully-populated platforms array
   - `valid/extension-platforms-sparse.json` -- StacExtensionProperties with sparse record (id-only)
   - `invalid/invalid-platform-nationality.json` -- Platform record with invalid nationality
   - Update existing valid fixtures (`extension-basic.json`, `extension-partial-path.json`, `extension-empty-arrays.json`) to use `platforms` instead of flat fields
   - Update existing invalid fixtures to test new structure constraints
   - Remove `invalid-uppercase-vessel.json` (tests a removed field) or repurpose for `platforms[].vessel_class`

3. **Exercise fixtures** (100 items): Update the fixture generation script (`shared/schemas/scripts/generate-stac-fixtures.py`) to produce `debrief:platforms` format, then regenerate all 100 exercises.

**Rationale**: All fixtures must conform to the current schema. Leaving old-format fixtures would cause validation failures.

## Decision 6: Consumer Migration Strategy

**Context**: Removing the flat fields from the schema means all consumers must migrate atomically or `task verify` fails. Key consumers:
- `apps/vscode/src/types/stac.ts` -- local camelCase `StacBrowserItem` type
- `apps/vscode/src/services/stacService.ts` -- reads `debrief:` properties from STAC items
- `shared/components/src/filter-engine/` -- types, matchers, CQL2 JSON serialization
- `shared/components/src/FilterBar/` -- distinct value extraction, taxonomy counts
- `shared/components/src/ExerciseListView/` -- display types
- `apps/web-shell/src/` -- mock service, App.tsx
- `services/stac/src/debrief_stac/` -- collection summaries, models
- `scripts/enrich-legacy-catalog.py` -- enrichment script

**Decision**: Migrate all consumers in this feature. For filter engine matchers and display code that need flat lists, derive them from the `platforms` array at the point of use.

**Rationale**:
- `task verify` must pass -- leaving broken references is not an option.
- The derivation pattern is simple: `items.flatMap(i => i.platforms ?? []).map(p => p.nationality).filter(Boolean)` for nationalities, similar for vessel classes and names.
- The filter engine's `CatalogOverviewItem` type gains a `platforms` field. Matchers that currently match on `vesselClasses[]` and `nationalities[]` will match on `platforms[].vessel_class` and `platforms[].nationality` instead.
- The CQL2 array_filter evaluator (#185) is a more sophisticated version of this matching -- what we build here is straightforward property access on the platforms array, not the compound predicate engine.

**Consumer-specific notes**:
- `stacService.ts`: Read `debrief:platforms` from item properties instead of three separate fields. Map to camelCase `platforms` on `StacBrowserItem`.
- `CatalogOverviewItem` / `StacBrowserItem`: Replace `vesselClasses`, `nationalities`, `trackNames` with `platforms` array.
- Filter matchers: Update to iterate `platforms[]` for vessel class and nationality matching.
- `useDistinctValues`: Extract distinct values from `platforms` array.
- Collection summaries (`debrief_stac`): Aggregate from `platforms` arrays instead of flat fields.
- Enrichment script: Write `debrief:platforms` instead of three separate properties.

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
- `test_stac_extension.py` -- must be updated: remove flat-field assertions, add platforms round-trip test, update exercise fixture validation
- `test_roundtrip.py` -- existing TrackFeature round-trip tests should pass (new fields are optional)
- `test_collection.py` -- must be updated: collection summary tests reference flat fields
- Filter engine tests (`matchers.test.ts`, `cql2-json.test.ts`, `useBrowserFilter.test.ts`, `useDistinctValues.test.ts`, `useTaxonomyMatchCounts.test.ts`) -- mock data and assertions must use `platforms`
- `stacTreeProvider.test.ts`, `messages.test.ts` -- mock data must use `platforms`

### Platform Registry Note
The `vessel_classes` root key in `shared/data/platform-registry.json` is the **registry's own structure**, not the STAC flat aggregate field. It is NOT being renamed or removed. The registry defines a tree of vessel classes; the STAC extension fields that aggregate class paths into flat lists are what's being removed.
