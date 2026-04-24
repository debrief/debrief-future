# Implementation Plan: LinkML Per-Platform Override Fields

**Branch**: `181-linkml-platform-overrides` | **Date**: 2026-04-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/181-linkml-platform-overrides/spec.md`

## Summary

Add optional per-platform override fields (`display_name`, `nationality`, `vessel_class`, `vessel_type`, `vessel_role`, `domain`) to TrackProperties in the LinkML schema. Define a new `PlatformRecord` entity and add a `debrief:platforms` structured array to the STAC extension. **Remove** the flat aggregate fields (`vessel_classes`, `nationalities`, `track_names`) from StacExtensionProperties and StacItemSummary -- they are replaced entirely by `platforms`. Regenerate all derived types, migrate all consumer code and fixtures, and ensure `task verify` passes.

## Technical Context

**Language/Version**: Python 3.11 (schema generation, services, tests), TypeScript 5.x (generated types, consumer code, tests)  
**Primary Dependencies**: LinkML >= 1.7.0 (schema source), Pydantic v2 (generated Python models), gen-pydantic/gen-typescript/gen-json-schema (code generators)  
**Storage**: N/A (schema definitions; no runtime storage changes)  
**Testing**: pytest (Python golden fixture + round-trip + service tests), vitest (TypeScript filter engine + component tests), tsc (type checking)  
**Target Platform**: Cross-platform (schema artifacts consumed by all services and frontends)  
**Project Type**: Monorepo -- changes span `shared/schemas/`, `shared/components/`, `shared/data/`, `apps/vscode/`, `apps/web-shell/`, `services/stac/`, `scripts/`  
**Performance Goals**: N/A (schema-time, not runtime)  
**Constraints**: `task verify` must pass with zero failures. No backward compatibility obligation (Constitution Article XIV).  
**Scale/Scope**: 3 LinkML YAML files modified, ~15 TypeScript consumer files migrated, ~5 Python consumer files migrated, ~10 test files updated, 100 exercise fixtures regenerated, 3 generated output directories regenerated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Status | Notes |
|---------|-------------|--------|-------|
| II.1 Single source of truth | LinkML master schemas define all data structures; derived types are never hand-written | PASS | All changes are to LinkML source; Pydantic/TS/JSON Schema are regenerated |
| II.2 Schema tests mandatory | Derived schemas must pass adherence tests before merge | PASS | Golden fixture tests, round-trip tests, and structural comparison all run in CI |
| II.3 Schema versioning | Breaking changes require version bump and migration path | PASS (XIV) | Breaking change permitted under Article XIV (pre-release freedom). No production users. |
| IV.1 Services never touch UI | Python services return data only | PASS | Service changes (collection.py, models.py) only affect data structures, not UI |
| VI.1 Schema tests gate merges | Derived schema adherence tests must pass | PASS | `task verify` runs lint + typecheck + test including schema tests |
| VII.1 Tests before implementation | Define expected behaviour as executable tests before implementing | PASS | Golden fixtures (expected valid/invalid) define acceptance criteria |
| VIII.1 Specs before code | No implementation without written specification | PASS | Spec written and approved before this plan |
| IX.1 Minimal dependencies | External dependencies must be justified | PASS | No new dependencies added |
| XIII.3 CI must pass | All automated checks green before merge | PASS | `task verify` is the gate |
| XIV Pre-release freedom | Breaking changes permitted before v4.0.0 | INVOKED | Flat aggregate field removal is a breaking schema change, permitted by this article |
| XV.1 Explicit types | All types must have explicit annotations | PASS | Generated types are fully typed by the LinkML generators |
| XV.4 Schema types canonical | Generated types must be fully typed with no Any/any | PASS | gen-pydantic uses `--extra-fields forbid`; post-processing replaces `dict[str, Any]` with `dict[str, object]` |

**Gate result**: PASS -- Article XIV invoked for breaking schema change. No other violations.

## Project Structure

### Documentation (this feature)

```text
specs/181-linkml-platform-overrides/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research decisions
├── data-model.md        # Entity changes and relationships
├── quickstart.md        # Step-by-step implementation guide
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── media/
    ├── planning-post.md # Blog post draft
    └── linkedin-planning.md # LinkedIn summary
```

### Source Code (repository root)

```text
# Layer 1: Schema (source of truth)
shared/schemas/src/linkml/
├── common.yaml              # MODIFIED: VesselDomainEnum moved here
├── geojson.yaml             # MODIFIED: 6 override fields on TrackProperties
├── stac-extension.yaml      # MODIFIED: PlatformRecord + platforms; REMOVED vessel_classes, nationalities, track_names
└── debrief.yaml             # UNCHANGED (imports all modules transitively)

# Layer 2: Generated types (auto-regenerated)
shared/schemas/src/generated/
├── python/debrief_schemas/__init__.py    # REGENERATED
├── typescript/types.ts                   # REGENERATED
└── json-schema/*.schema.json             # REGENERATED

# Layer 3: Fixtures (must match current schema)
shared/schemas/src/fixtures/
├── valid/
│   ├── track-feature-platform-overrides-01.json    # NEW
│   └── track-feature-platform-overrides-minimal-01.json  # NEW
└── invalid/
    ├── track-feature-invalid-nationality.json      # NEW
    └── track-feature-invalid-domain.json           # NEW

shared/schemas/fixtures/stac-browser/
├── valid/
│   ├── extension-basic.json           # MODIFIED: flat fields → platforms
│   ├── extension-partial-path.json    # MODIFIED: flat fields → platforms
│   ├── extension-empty-arrays.json    # MODIFIED: flat fields → platforms
│   ├── extension-platforms-full.json   # NEW
│   └── extension-platforms-sparse.json # NEW
├── invalid/
│   ├── invalid-platform-nationality.json  # NEW (or repurposed)
│   └── invalid-uppercase-vessel.json      # MODIFIED: test platforms[].vessel_class
└── exercise-*/item.json               # REGENERATED (100 items, via generation script)

# Layer 4: Schema tests
shared/schemas/tests/
├── test_golden.py              # UNCHANGED (auto-discovers fixtures)
├── test_stac_extension.py      # MODIFIED: remove flat-field assertions, add platforms tests
└── test_roundtrip.py           # UNCHANGED (auto-covers new optional fields)

# Layer 5: Consumer code — TypeScript
shared/components/src/filter-engine/
├── types.ts                    # MODIFIED: CatalogOverviewItem replaces flat fields with platforms
├── matchers.ts                 # MODIFIED: match on platforms[] instead of flat arrays
└── cql2-json.ts                # MODIFIED: STAC property name mappings

shared/components/src/FilterBar/
├── useDistinctValues.ts        # MODIFIED: derive values from platforms[]
└── useTaxonomyMatchCounts.ts   # MODIFIED: iterate platforms[].vessel_class

shared/components/src/ExerciseListView/
└── types.ts                    # MODIFIED: replace flat fields with platforms

apps/vscode/src/
├── types/stac.ts               # MODIFIED: StacBrowserItem replaces flat fields with platforms
├── services/stacService.ts     # MODIFIED: read debrief:platforms from item properties
├── panels/catalogOverviewPanel.ts  # MODIFIED: map platforms to message format
└── webview/messages.ts         # MODIFIED: CatalogItem type uses platforms

apps/web-shell/src/
├── App.tsx                     # MODIFIED: transform platforms to internal format
└── mocks/stacService.ts        # MODIFIED: mock data uses platforms

# Layer 5: Consumer code — Python
services/stac/src/debrief_stac/
├── collection.py               # MODIFIED: summaries use platforms
└── models.py                   # MODIFIED: CatalogSummaries uses platforms

scripts/
└── enrich-legacy-catalog.py    # MODIFIED: write debrief:platforms instead of flat fields

# Layer 6: Consumer tests
shared/components/src/filter-engine/__tests__/
├── matchers.test.ts            # MODIFIED: mock data + assertions
├── cql2-json.test.ts           # MODIFIED: property name changes
└── fixtures.ts                 # MODIFIED: mock item builder

shared/components/src/FilterBar/__tests__/
├── useDistinctValues.test.ts   # MODIFIED: mock data + assertions
└── useTaxonomyMatchCounts.test.ts  # MODIFIED: mock data + assertions

shared/components/src/StacBrowser/__tests__/
└── useBrowserFilter.test.ts    # MODIFIED: mock data

shared/components/src/ExerciseListView/
└── __fixtures__/mockData.ts    # MODIFIED: mock items use platforms

apps/vscode/
├── tests/unit/stacTreeProvider.test.ts  # MODIFIED: mock data
└── src/webview/messages.test.ts         # MODIFIED: mock data

services/stac/tests/
└── test_collection.py          # MODIFIED: summary assertions

# Storybook stories (mock data updates)
shared/components/src/StacBrowser/StacBrowser.stories.tsx   # MODIFIED
shared/components/src/FilterBar/FilterBar.stories.tsx       # MODIFIED
shared/components/src/FilterBar/SavedFilters.stories.tsx    # MODIFIED
shared/components/src/TimelineView/TimelineView.stories.tsx # MODIFIED
```

**Structure Decision**: Changes span 6 layers of the existing monorepo structure. No new directories or projects created. The schema module owns the source of truth; generated types propagate changes; consumers and fixtures are updated atomically.

## Media Components

None - backend/infrastructure feature. No visual components, Storybook stories, or UI changes.

## Storybook E2E Testing

None - no interactive UI components. Storybook story mock data is updated but no new visual behaviour to test.

## VS Code Webview E2E Testing

None - no extension workflow changes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Breaking schema change (Art. II.3) | Clean data model with one canonical representation for platform metadata | Keeping flat fields alongside `platforms` creates dual-representation cruft with no production users to protect. Article XIV explicitly permits this. |
