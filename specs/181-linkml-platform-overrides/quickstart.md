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

### Step 3: Add PlatformRecord and Replace Flat Fields

1. Open `shared/schemas/src/linkml/stac-extension.yaml`
2. Add `PlatformRecord` class with fields: `id` (required), `name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain` (all optional)
3. Add `platforms` field to `StacExtensionProperties` (optional, multivalued PlatformRecord)
4. **Remove** `vessel_classes`, `nationalities`, `track_names` from `StacExtensionProperties`
5. Add `platforms` field to `StacItemSummary` (optional, multivalued PlatformRecord)
6. **Remove** `vessel_classes`, `nationalities`, `track_names` from `StacItemSummary`

### Step 4: Regenerate Types

```bash
cd shared/schemas
make generate
```

### Step 5: Update Golden Fixtures

1. Add valid TrackFeature fixtures with override fields to `shared/schemas/src/fixtures/valid/`
2. Add invalid TrackFeature fixtures to `shared/schemas/src/fixtures/invalid/`
3. Update existing STAC extension valid/invalid fixtures to use `platforms` instead of flat fields
4. Add new STAC extension fixtures (`extension-platforms-full.json`, `extension-platforms-sparse.json`)
5. Update exercise fixture generation script to produce `debrief:platforms` format
6. Regenerate all 100 exercise fixtures

### Step 6: Migrate TypeScript Consumer Code

Update all TypeScript files that reference the removed flat fields:

1. **Types**: Replace `vesselClasses`, `nationalities`, `trackNames` with `platforms` array on:
   - `apps/vscode/src/types/stac.ts` (StacBrowserItem)
   - `shared/components/src/filter-engine/types.ts` (CatalogOverviewItem)
   - `shared/components/src/ExerciseListView/types.ts`
   - `apps/vscode/src/webview/messages.ts` (CatalogItem)

2. **Services**: Update to read/write `debrief:platforms`:
   - `apps/vscode/src/services/stacService.ts`
   - `apps/vscode/src/panels/catalogOverviewPanel.ts`
   - `apps/web-shell/src/App.tsx`

3. **Filter engine**: Derive flat values from `platforms[]`:
   - `shared/components/src/filter-engine/matchers.ts`
   - `shared/components/src/filter-engine/cql2-json.ts`
   - `shared/components/src/FilterBar/useDistinctValues.ts`
   - `shared/components/src/FilterBar/useTaxonomyMatchCounts.ts`

4. **Mocks and stories**: Update mock data:
   - `apps/web-shell/src/mocks/stacService.ts`
   - All Storybook `.stories.tsx` files with STAC mock data

### Step 7: Migrate Python Consumer Code

1. `services/stac/src/debrief_stac/collection.py` -- summaries aggregate from `platforms`
2. `services/stac/src/debrief_stac/models.py` -- CatalogSummaries uses `platforms`
3. `scripts/enrich-legacy-catalog.py` -- write `debrief:platforms` instead of flat properties

### Step 8: Update Tests

1. `shared/schemas/tests/test_stac_extension.py` -- remove flat-field assertions, add platforms tests
2. `services/stac/tests/test_collection.py` -- update summary assertions
3. All TypeScript test files with mock STAC data (see plan.md Layer 6 for full list)

### Step 9: Run Verification

```bash
task verify
```

This runs lint, typecheck, and test. All must pass.

## Verification Checklist

- [ ] `VesselDomainEnum` is in `common.yaml`, not in `stac-extension.yaml`
- [ ] `TrackProperties` has 6 new optional fields in `geojson.yaml`
- [ ] `PlatformRecord` class defined in `stac-extension.yaml`
- [ ] `platforms` field on `StacExtensionProperties` and `StacItemSummary`
- [ ] `vessel_classes`, `nationalities`, `track_names` REMOVED from StacExtensionProperties and StacItemSummary
- [ ] Generated Pydantic models reflect removals and additions
- [ ] Generated TypeScript types reflect removals and additions
- [ ] Generated JSON Schema reflects removals and additions
- [ ] All STAC extension fixtures use `platforms`, no flat aggregate fields remain
- [ ] All 100 exercise fixtures regenerated with `debrief:platforms`
- [ ] All TypeScript consumer code compiles (no references to removed fields)
- [ ] All Python consumer code passes type checking
- [ ] New valid fixtures pass validation
- [ ] New invalid fixtures fail validation
- [ ] `task verify` passes with zero failures
